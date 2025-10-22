const axios = require('axios');
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

class AIVerificationService {
  constructor() {
    this.asiApiKey = process.env.ASI_API_KEY;
    this.asiEndpoint = process.env.ASI_ENDPOINT || 'https://api.asi.one';
    this.mettaUrl = process.env.METTA_KNOWLEDGE_GRAPH_URL || 'https://metta.asi.one';
    this.agentVerseUrl = process.env.AGENT_VERSE_URL || 'https://agentverse.asi.one';
    this.confidenceThreshold = parseFloat(process.env.CONFIDENCE_THRESHOLD) || 0.8;
    this.maxRetryAttempts = parseInt(process.env.MAX_RETRY_ATTEMPTS) || 3;
    this.verificationTimeout = parseInt(process.env.VERIFICATION_TIMEOUT) || 120000; // 2 minutes

    // Real-time data integrations
    this.pyusdApiUrl = process.env.PYUSD_API_URL || 'https://api.coinbase.com/v2/exchange-rates?currency=USD';
    this.blockscoutApiUrl = process.env.BLOCKSCOUT_API_URL || 'https://eth-sepolia.blockscout.com/api';
    this.cmcApiKey = process.env.COINMARKETCAP_API_KEY;
    this.cmcApiUrl = process.env.COINMARKETCAP_API_URL || 'https://pro-api.coinmarketcap.com/v1';

    // Real-time data caching and streaming
    this.realtimeData = {
      pyusdPrice: null,
      pyusdPriceLastUpdated: null,
      contributorStats: new Map(),
      verificationPatterns: [],
      marketData: {},
      blockchainState: {}
    };

    // Real-time update intervals
    this.priceUpdateInterval = null;
    this.blockchainUpdateInterval = null;
    this.patternAnalysisInterval = null;

    // WebSocket connections for real-time updates
    this.websocketConnections = new Set();
  }

  async initialize() {
    logger.info('Initializing AI Verification Service...');
    logger.info(`ASI API Key configured: ${this.asiApiKey ? 'YES' : 'NO'}`);
    logger.info(`ASI Endpoint: ${this.asiEndpoint}`);
    logger.info(`MeTTa URL: ${this.mettaUrl}`);
    logger.info(`AgentVerse URL: ${this.agentVerseUrl}`);

    if (!this.asiApiKey) {
      logger.warn('ASI_API_KEY not provided, using mock verification for development');
    } else {
      logger.info('ASI API key is configured - will use real ASI APIs for verification');
    }

    // Initialize real-time data services
    await this.startRealtimeServices();

    logger.info('AI Verification Service initialized');
  }

  /**
   * Start real-time data services
   */
  async startRealtimeServices() {
    logger.info('Starting real-time data services...');

    try {
      // Initial data fetch
      await this.updatePYUSDPrice();
      await this.updateBlockchainState();
      await this.updateMarketData();

      // Set up real-time updates
      this.priceUpdateInterval = setInterval(() => this.updatePYUSDPrice(), 30000); // 30 seconds
      this.blockchainUpdateInterval = setInterval(() => this.updateBlockchainState(), 15000); // 15 seconds
      this.patternAnalysisInterval = setInterval(() => this.analyzeVerificationPatterns(), 60000); // 1 minute

      logger.info('Real-time data services started');
    } catch (error) {
      logger.error('Failed to start real-time services:', error);
    }
  }

  /**
   * Real-time risk assessment
   */
  async performRealtimeRiskAssessment(submission, realtimeContext) {
    const risks = {
      contributorRisk: realtimeContext.contributorStats?.riskScore || 0.5,
      marketRisk: this.calculateMarketRisk(realtimeContext.marketData),
      pyusdStability: this.calculatePYUSDStability(realtimeContext.pyusdPrice),
      verificationPatternRisk: this.calculatePatternRisk(realtimeContext.verificationPatterns),
      campaignCreatorRisk: await this.calculateCampaignCreatorScamRisk(submission.campaignAddress, realtimeContext),
      overallRisk: 0
    };

    // Calculate overall risk as weighted average
    risks.overallRisk = (
      risks.contributionRisk * 0.2 +
      risks.marketRisk * 0.2 +
      risks.pyusdStability * 0.2 +
      risks.verificationPatternRisk * 0.15 +
      risks.campaignCreatorRisk * 0.25
    );

    // Add risk mitigation suggestions
    risks.suggestions = this.generateRiskMitigationSuggestions(risks);

    return risks;
  }

  /**
   * Calculate campaign creator scam risk
   */
  async calculateCampaignCreatorScamRisk(campaignAddress, realtimeContext) {
    let scamRisk = 0; // Start with no risk

    try {
      // Analyze creator reputation and patterns
      const creatorAnalysis = await this.analyzeCampaignCreator(campaignAddress);
      const activityPatterns = this.analyzeCampaignActivity(creatorAnalysis);

      // Multiple campaign penalty (potential spam/scam)
      if (creatorAnalysis.totalCampaigns > 5) scamRisk += 0.3;

      // High failure rate penalty
      if (creatorAnalysis.successRate < 0.3) scamRisk += 0.4;

      // New creator penalty (limited track record)
      if (creatorAnalysis.totalCampaigns < 2) scamRisk += 0.2;

      // Immediate withdrawal pattern (scam indicator)
      if (activityPatterns.immediateWithdrawals > 0.8) scamRisk += 0.5;

      // Connected wallet analysis (self-dealing detection)
      if (activityPatterns.selfContributionRatio > 0.5) scamRisk += 0.4;

      // Timing patterns (out of hours activity can be suspicious)
      if (activityPatterns.unusualTiming > 0.7) scamRisk += 0.3;

      // Amount raised vs goal analysis
      if (activityPatterns.overfundedRatio > 2) scamRisk += 0.2; // Over-funded campaigns can be scams

    } catch (error) {
      logger.warn('Failed to analyze campaign creator risk:', error);
      // Return moderate risk on analysis failure
      return 0.5;
    }

    return Math.min(1, Math.max(0, scamRisk)); // Clamp between 0 and 1
  }

  /**
   * Analyze campaign creator patterns
   */
  async analyzeCampaignCreator(campaignAddress) {
    // This would query campaign history in production
    // For now, return mock analysis based on campaign address

    // Use campaign address hash to simulate different creator profiles
    const addressHash = campaignAddress.toLowerCase().split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const riskProfile = addressHash % 5; // 0-4 scale

    const profiles = [
      { totalCampaigns: 15, successRate: 0.85, reputation: 'excellent' }, // Low risk
      { totalCampaigns: 8, successRate: 0.60, reputation: 'good' },
      { totalCampaigns: 3, successRate: 0.40, reputation: 'moderate' },
      { totalCampaigns: 12, successRate: 0.25, reputation: 'poor' }, // High risk
      { totalCampaigns: 1, successRate: 0.0, reputation: 'unknown' } // Very high risk
    ];

    return profiles[riskProfile];
  }

  /**
   * Analyze campaign activity patterns for scam detection
   */
  analyzeCampaignActivity(creatorAnalysis) {
    // Mock analysis - in production, analyze real campaign data

    const patterns = {
      immediateWithdrawals: Math.random() * 0.5, // Fraction of funds withdrawn immediately
      selfContributionRatio: Math.random() * 0.3, // Self-contribution percentage
      unusualTiming: Math.random() * 0.4, // Unusual timing patterns
      overfundedRatio: 1 + Math.random() * 1, // How much over/under funded
      contributorDiversity: Math.random(), // Diversity of contributor base
      milestoneCompletion: Math.random(), // Milestone completion rate
      socialProofScore: Math.random() // External validation score
    };

    return patterns;
  }

  /**
   * Stop real-time data services
   */
  async stopRealtimeServices() {
    logger.info('Stopping real-time data services...');

    if (this.priceUpdateInterval) {
      clearInterval(this.priceUpdateInterval);
      this.priceUpdateInterval = null;
    }
    if (this.blockchainUpdateInterval) {
      clearInterval(this.blockchainUpdateInterval);
      this.blockchainUpdateInterval = null;
    }
    if (this.patternAnalysisInterval) {
      clearInterval(this.patternAnalysisInterval);
      this.patternAnalysisInterval = null;
    }

    // Close WebSocket connections
    for (const ws of this.websocketConnections) {
      if (ws.readyState === 1) { // OPEN
        ws.close();
      }
    }
    this.websocketConnections.clear();

    logger.info('Real-time data services stopped');
  }
}

  /**
   * Update live PYUSD pricing data
   */
  async updatePYUSDPrice() {
  try {
    logger.debug('Updating PYUSD price data...');

    // Fetch from Coinbase API (primary)
    let priceData;
    try {
      const response = await axios.get(this.pyusdApiUrl, { timeout: 5000 });
      priceData = response.data;
    } catch (error) {
      logger.warn('Coinbase PYUSD API failed, trying fallback...');

      // Fallback to CoinMarketCap if API key available
      if (this.cmcApiKey) {
        const cmcResponse = await axios.get(
          `${this.cmcApiUrl}/cryptocurrency/quotes/latest?symbol=PYUSD`,
          {
            headers: { 'X-CMC_PRO_API_KEY': this.cmcApiKey },
            timeout: 5000
          }
        );
        priceData = cmcResponse.data;
      } else {
        throw error;
      }
    }

    // Extract PYUSD price (against USD)
    let usdPrice = 1.0; // PYUSD is pegged 1:1 with USD

    if (priceData?.data?.rates) {
      // Coinbase format
      usdPrice = parseFloat(priceData.data.rates.USD) || 1.0;
    } else if (priceData?.data?.PYUSD?.quote?.USD?.price) {
      // CMC format
      usdPrice = priceData.data.PYUSD.quote.USD.price;
    }

    // Also get PYUSD/ETH rate for better context
    let ethPrice = null;
    try {
      const ethResponse = await axios.get(
        `${this.cmcApiUrl}/cryptocurrency/quotes/latest?symbol=ETH`,
        {
          headers: { 'X-CMC_PRO_API_KEY': this.cmcApiKey },
          timeout: 3000
        }
      );
      if (ethResponse.data?.data?.ETH?.quote?.USD?.price) {
        ethPrice = ethResponse.data.data.ETH.quote.USD.price;
      }
    } catch (error) {
      logger.debug('ETH price fetch failed:', error.message);
    }

    // Update cached data
    this.realtimeData.pyusdPrice = {
      usd: usdPrice,
      eth: ethPrice,
      lastUpdated: new Date(),
      volatility: this.calculateVolatility(),
      marketCap: priceData?.data?.PYUSD?.quote?.USD?.market_cap || null
    };

    this.realtimeData.pyusdPriceLastUpdated = new Date();

    // Notify WebSocket clients
    this.broadcastRealtimeUpdate('pyusd_price', this.realtimeData.pyusdPrice);

    logger.debug(`PYUSD price updated: $${usdPrice.toFixed(4)}`);

  } catch (error) {
    logger.error('Failed to update PYUSD price:', error);
    // Keep stale data but mark as outdated
    if (this.realtimeData.pyusdPrice) {
      this.realtimeData.pyusdPrice.stale = true;
    }
  }
}

/**
 * Calculate price volatility based on recent data
 */
calculateVolatility() {
  // Simple volatility calculation - in production, this would analyze
  // price changes over time windows
  return Math.random() * 0.05; // Mock: 0-5% volatility
}

  /**
   * Update real-time blockchain state
   */
  async updateBlockchainState() {
  try {
    logger.debug('Updating blockchain state...');

    const currentData = await this.fetchBlockchainData();

    // Update contributor statistics
    this.realtimeData.contributorStats = this.analyzeContributorActivity(currentData.transactions);

    // Update contract state
    this.realtimeData.blockchainState = {
      latestBlock: currentData.latestBlock,
      activeContributors: currentData.activeContributors,
      recentTransactions: currentData.recentTransactions,
      contractBalances: currentData.contractBalances,
      networkStats: currentData.networkStats,
      lastUpdated: new Date()
    };

    // Broadcast updates
    this.broadcastRealtimeUpdate('blockchain_state', this.realtimeData.blockchainState);

    logger.debug(`Blockchain state updated: ${currentData.activeContributors.length} active contributors`);

  } catch (error) {
    logger.error('Failed to update blockchain state:', error);
  }
}

  /**
   * Fetch current blockchain data from multiple sources
   */
  async fetchBlockchainData() {
  const data = {
    latestBlock: null,
    activeContributors: [],
    recentTransactions: [],
    contractBalances: {},
    networkStats: {}
  };

  try {
    // Get latest block from Blockscout
    const blockResponse = await axios.get(
      `${this.blockscoutApiUrl}?module=block&action=getblocknobytime&timestamp=${Math.floor(Date.now() / 1000)}&closest=before`,
      { timeout: 5000 }
    );

    if (blockResponse.data?.result) {
      data.latestBlock = parseInt(blockResponse.data.result);
    }

    // Get recent transactions for PYUSD token
    const pyusdAddress = '0x8a4712c2d7c4f9b8a1e6a2c7b0f6e9a3'; // PYUSD on Sepolia
    const txResponse = await axios.get(
      `${this.blockscoutApiUrl}?module=account&action=txlist&address=${pyusdAddress}&page=1&offset=20`,
      { timeout: 5000 }
    );

    if (txResponse.data?.result) {
      data.recentTransactions = txResponse.data.result.map(tx => ({
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: tx.value,
        timestamp: new Date(parseInt(tx.timeStamp) * 1000),
        blockNumber: parseInt(tx.blockNumber),
        gasUsed: tx.gasUsed
      }));

      // Extract unique contributors from recent transactions
      const contributors = new Set();
      data.recentTransactions.forEach(tx => {
        contributors.add(tx.from);
        contributors.add(tx.to);
      });
      data.activeContributors = Array.from(contributors).filter(addr =>
        addr && addr !== pyusdAddress && addr !== '0x0000000000000000000000000000000000000000'
      );
    }

    // Get network stats
    const statsResponse = await axios.get(
      `${this.blockscoutApiUrl}?module=stats&action=ethsupply`,
      { timeout: 3000 }
    );

    if (statsResponse.data?.result) {
      data.networkStats.ethSupply = parseInt(statsResponse.data.result);
    }

  } catch (error) {
    logger.warn('Failed to fetch some blockchain data:', error.message);
  }

  return data;
}

/**
 * Analyze contributor activity patterns
 */
analyzeContributorActivity(transactions) {
  const contributorStats = new Map();

  if (!transactions || !Array.isArray(transactions)) {
    return contributorStats;
  }

  // Group transactions by contributor
  const contributorTxs = {};

  transactions.forEach(tx => {
    [tx.from, tx.to].forEach(addr => {
      if (!contributorTxs[addr]) {
        contributorTxs[addr] = [];
      }
      contributorTxs[addr].push(tx);
    });
  });

  // Calculate statistics for each contributor
  Object.entries(contributorTxs).forEach(([address, txs]) => {
    const stats = {
      totalTransactions: txs.length,
      totalVolume: txs.reduce((sum, tx) => sum + parseInt(tx.value || '0'), 0),
      firstTransaction: txs.reduce((earliest, tx) => tx.timestamp < earliest ? tx.timestamp : earliest, txs[0].timestamp),
      lastTransaction: txs.reduce((latest, tx) => tx.timestamp > latest ? tx.timestamp : latest, txs[0].timestamp),
      avgTransactionValue: txs.reduce((sum, tx) => sum + parseInt(tx.value || '0'), 0) / txs.length,
      transactionFrequency: txs.length / Math.max(1, (Date.now() - txs[0].timestamp.getTime()) / (1000 * 60 * 60 * 24)), // txs per day
      riskScore: this.calculateContributorRisk(address, txs)
    };

    contributorStats.set(address.toLowerCase(), stats);
  });

  return contributorStats;
}

/**
 * Calculate risk score for a contributor based on behavior
 */
calculateContributorRisk(address, transactions) {
  let riskScore = 0.5; // Base neutral risk

  // Factors that decrease risk (good behavior)
  if (transactions.length >= 50) riskScore -= 0.2; // High volume contributor
  const uniqueInteractions = new Set(transactions.map(tx => tx.from === address ? tx.to : tx.from)).size;
  if (uniqueInteractions >= 10) riskScore -= 0.15; // Diverse interactions

  const avgTxValue = transactions.reduce((sum, tx) => sum + parseInt(tx.value || '0'), 0) / transactions.length;
  const highValueTxs = transactions.filter(tx => parseInt(tx.value || '0') > avgTxValue * 2).length;
  if (highValueTxs >= 3) riskScore -= 0.1; // Consistent high-value contributions

  // Factors that increase risk (bad behavior)
  if (transactions.length < 3) riskScore += 0.3; // New/unproven contributor
  const timeSpan = Date.now() - transactions[0].timestamp.getTime();
  const txsPerDay = transactions.length / (timeSpan / (1000 * 60 * 60 * 24));
  if (txsPerDay > 10) riskScore += 0.2; // Excessive activity (potential spam)

  const failedTxs = transactions.filter(tx => !tx.status).length;
  const failureRate = failedTxs / transactions.length;
  if (failureRate > 0.3) riskScore += 0.25; // High failure rate

  return Math.max(0, Math.min(1, riskScore)); // Clamp between 0 and 1
}

  /**
   * Update market data for risk assessment
   */
  async updateMarketData() {
  try {
    logger.debug('Updating market data...');

    // Get cryptocurrency market data
    if (this.cmcApiKey) {
      const response = await axios.get(
        `${this.cmcApiUrl}/cryptocurrency/quotes/latest?symbol=BTC,ETH,PYUSD`,
        {
          headers: { 'X-CMC_PRO_API_KEY': this.cmcApiKey },
          timeout: 5000
        }
      );

      if (response.data?.data) {
        this.realtimeData.marketData = {
          btc: response.data.BTC?.quote?.USD,
          eth: response.data.ETH?.quote?.USD,
          pyusd: response.data.PYUSD?.quote?.USD,
          timestamp: new Date(),
          globalMetrics: response.data.metadata || {}
        };

        // Broadcast market updates
        this.broadcastRealtimeUpdate('market_data', this.realtimeData.marketData);
      }
    }

  } catch (error) {
    logger.error('Failed to update market data:', error);
  }
}

  /**
   * Analyze verification patterns for predictive modeling
   */
  async analyzeVerificationPatterns() {
  try {
    logger.debug('Analyzing verification patterns...');

    // Get recent verification history (mock for now - in production, query database)
    const recentVerifications = await this.getRecentVerificationHistory();

    // Analyze patterns
    const patterns = {
      averageConfidence: recentVerifications.reduce((sum, v) => sum + v.confidence, 0) / recentVerifications.length,
      approvalRate: recentVerifications.filter(v => v.verdict === 'approved').length / recentVerifications.length,
      commonRejectionReasons: this.extractCommonRejectionReasons(recentVerifications),
      timePatterns: this.analyzeTimePatterns(recentVerifications),
      confidenceTrends: this.calculateConfidenceTrends(recentVerifications),
      lastUpdated: new Date()
    };

    this.realtimeData.verificationPatterns = patterns;

    // Broadcast pattern updates
    this.broadcastRealtimeUpdate('verification_patterns', patterns);

    logger.debug('Verification patterns analyzed and updated');

  } catch (error) {
    logger.error('Failed to analyze verification patterns:', error);
  }
}

  /**
   * Get recent verification history for pattern analysis
   */
  async getRecentVerificationHistory() {
  // Mock recent verification data - in production, query database
  return [
    { verdict: 'approved', confidence: 0.85, timestamp: new Date(Date.now() - 1000 * 60 * 30) },
    { verdict: 'rejected', confidence: 0.25, timestamp: new Date(Date.now() - 1000 * 60 * 20) },
    { verdict: 'uncertain', confidence: 0.65, timestamp: new Date(Date.now() - 1000 * 60 * 15) },
    // Add more mock data for pattern analysis
  ];
}

/**
 * Extract common rejection reasons from verification history
 */
extractCommonRejectionReasons(verifications) {
  const rejected = verifications.filter(v => v.verdict === 'rejected');
  // Simple analysis - in production, use NLP/ML
  return {
    insufficientEvidence: rejected.filter(v => v.confidence < 0.3).length / rejected.length,
    authenticityIssues: 0.2, // Mock
    incompleteSubmission: 0.15 // Mock
  };
}

/**
 * Analyze time-based patterns in verifications
 */
analyzeTimePatterns(verifications) {
  const hours = verifications.map(v =>
    new Date(v.timestamp).getHours()
  );

  return {
    peakHours: hours.filter(h => h >= 9 && h <= 17), // Business hours
    lowActivityHours: hours.filter(h => h >= 0 && h <= 6), // Night hours
    averageResponseTime: 45 * 60 * 1000 // 45 minutes average mock
  };
}

/**
 * Calculate confidence score trends
 */
calculateConfidenceTrends(verifications) {
  if (verifications.length < 2) return { trend: 'stable', change: 0 };

  const sorted = verifications.sort((a, b) => a.timestamp - b.timestamp);
  const recent = sorted.slice(-5); // Last 5 verifications
  const previous = sorted.slice(-10, -5); // Previous 5

  const recentAvg = recent.reduce((sum, v) => sum + v.confidence, 0) / recent.length;
  const previousAvg = previous.reduce((sum, v) => sum + v.confidence, 0) / previous.length;

  const change = recentAvg - previousAvg;
  let trend = 'stable';
  if (change > 0.05) trend = 'increasing';
  else if (change < -0.05) trend = 'decreasing';

  return { trend, change, recentAvg, previousAvg };
}

/**
 * Broadcast real-time updates to WebSocket clients
 */
broadcastRealtimeUpdate(type, data) {
  // Use the realtime data service if available, fallback to direct WebSocket connections
  try {
    const realtimeDataService = require('./realtimeDataService');
    if (realtimeDataService && typeof realtimeDataService.handleRealtimeUpdate === 'function') {
      realtimeDataService.handleRealtimeUpdate(type, data);
      return;
    }
  } catch (error) {
    logger.debug('Realtime data service not available, using fallback WebSocket connections');
  }

  // Fallback to direct WebSocket connections
  const update = {
    type,
    data,
    timestamp: new Date().toISOString()
  };

  for (const ws of this.websocketConnections) {
    if (ws.readyState === 1) { // OPEN
      try {
        ws.send(JSON.stringify(update));
      } catch (error) {
        logger.warn('Failed to send update to WebSocket client:', error);
        this.websocketConnections.delete(ws);
      }
    }
  }
}

/**
 * Get real-time data for verification context
 */
getRealtimeVerificationContext(campaignAddress, contributorAddress) {
  const contributor = contributorAddress ? contributorAddress.toLowerCase() : null;

  return {
    pyusdPrice: this.realtimeData.pyusdPrice,
    contributorStats: contributor ? this.realtimeData.contributorStats.get(contributor) : null,
    verificationPatterns: this.realtimeData.verificationPatterns,
    marketData: this.realtimeData.marketData,
    blockchainState: this.realtimeData.blockchainState,
    timestamp: new Date().toISOString()
  };
}

  /**
   * Enhanced verification with real-time context
   */
  async verifyMilestoneWithRealtimeData(submission) {
  logger.info(`Starting enhanced AI verification with real-time data for milestone ${submission.milestoneId}`);

  // Get real-time context
  const realtimeContext = this.getRealtimeVerificationContext(
    submission.campaignAddress,
    submission.submitterAddress
  );

  // Enhance submission with real-time data
  const enhancedSubmission = {
    ...submission,
    realtimeContext,
    riskAssessment: await this.performRealtimeRiskAssessment(submission, realtimeContext)
  };

  // Use enhanced AI verification (existing ASI services with realtime context)
  const verificationResult = await this.verifyMilestone(enhancedSubmission);

  // Add real-time insights to reasoning
  const enhancedReasoning = this.enhanceReasoningWithRealtimeData(
    verificationResult.reasoning,
    realtimeContext,
    verificationResult.confidence
  );

  return {
    ...verificationResult,
    reasoning: enhancedReasoning,
    realtimeData: {
      usedDataTypes: ['pyusd_price', 'contributor_stats', 'verification_patterns', 'market_data'],
      freshness: realtimeContext.timestamp,
      riskAssessment: enhancedSubmission.riskAssessment
    }
  };
}

  /**
   * Perform real-time risk assessment
   */
  async performRealtimeRiskAssessment(submission, realtimeContext) {
  const risks = {
    contributorRisk: realtimeContext.contributorStats?.riskScore || 0.5,
    marketRisk: this.calculateMarketRisk(realtimeContext.marketData),
    pyusdStability: this.calculatePYUSDStability(realtimeContext.pyusdPrice),
    verificationPatternRisk: this.calculatePatternRisk(realtimeContext.verificationPatterns),
    overallRisk: 0
  };

  // Calculate overall risk as weighted average
  risks.overallRisk = (
    risks.contributorRisk * 0.3 +
    risks.marketRisk * 0.25 +
    risks.pyusdStability * 0.25 +
    risks.verificationPatternRisk * 0.2
  );

  // Add risk mitigation suggestions
  risks.suggestions = this.generateRiskMitigationSuggestions(risks);

  return risks;
}

/**
 * Calculate market risk based on current market conditions
 */
calculateMarketRisk(marketData) {
  if (!marketData?.btc?.price || !marketData?.eth?.price) {
    return 0.5; // Neutral risk
  }

  // Use BTC and ETH volatility as market risk indicator
  let marketRisk = 0.1; // Base risk

  // High volatility increases risk
  if (marketData.btc.percent_change_24h > 5) marketRisk += 0.2;
  if (marketData.eth.percent_change_24h > 7) marketRisk += 0.2;

  return Math.min(1, marketRisk);
}

/**
 * Calculate PYUSD stability risk
 */
calculatePYUSDStability(pyusdPrice) {
  if (!pyusdPrice) return 0.5;

  // PYUSD depegging risk (should be ~1.00 USD)
  const deviation = Math.abs(1 - pyusdPrice.usd);
  if (deviation < 0.005) return 0.1; // Very stable
  if (deviation < 0.01) return 0.2; // Stable
  if (deviation < 0.05) return 0.4; // Moderate deviation
  return 0.8; // Significant depegging
}

/**
 * Calculate risk based on verification patterns
 */
calculatePatternRisk(patterns) {
  if (!patterns) return 0.5;

  // Lower confidence trends increase risk
  if (patterns.confidenceTrends?.trend === 'decreasing') {
    return Math.min(1, 0.5 + Math.abs(patterns.confidenceTrends.change));
  }

  return 0.3; // Baseline pattern risk
}

/**
 * Generate risk mitigation suggestions
 */
generateRiskMitigationSuggestions(risks) {
  const suggestions = [];

  if (risks.contributorRisk > 0.7) {
    suggestions.push('Require additional identity verification for high-risk contributor');
  }

  if (risks.marketRisk > 0.6) {
    suggestions.push('Consider delaying high-value milestones during market volatility');
  }

  if (risks.pyusdStability > 0.4) {
    suggestions.push('Monitor PYUSD peg stability closely during verification');
  }

  if (suggestions.length === 0) {
    suggestions.push('No significant risks detected at this time');
  }

  return suggestions;
}

/**
 * Enhance reasoning with real-time data insights
 */
enhanceReasoningWithRealtimeData(reasoning, realtimeContext, confidence) {
  let enhancedReasoning = reasoning;

  // Add market stability context
  if (realtimeContext.pyusdPrice && realtimeContext.pyusdPrice.usd) {
    enhancedReasoning += ` PYUSD currently trading at $${realtimeContext.pyusdPrice.usd.toFixed(4)} with ${this.getStabilityText(this.calculatePYUSDStability(realtimeContext.pyusdPrice))} stability.`;
  }

  // Add contributor reputation context
  if (realtimeContext.contributorStats) {
    const stats = realtimeContext.contributorStats;
    enhancedReasoning += ` Contributor has ${stats.totalTransactions} total transactions with ${(stats.transactionFrequency * 7).toFixed(1)} weekly activity.`;
  }

  // Add market conditions
  if (realtimeContext.marketData?.btc?.price && realtimeContext.marketData?.eth?.price) {
    const btcChange = realtimeContext.marketData.btc.percent_change_24h || 0;
    const ethChange = realtimeContext.marketData.eth.percent_change_24h || 0;
    enhancedReasoning += ` Market conditions: BTC ${btcChange >= 0 ? '+' : ''}${btcChange.toFixed(2)}%, ETH ${ethChange >= 0 ? '+' : ''}${ethChange.toFixed(2)}% (24h).`;
  }

  // Add verification pattern insights
  if (realtimeContext.verificationPatterns?.confidenceTrends) {
    const trends = realtimeContext.verificationPatterns.confidenceTrends;
    enhancedReasoning += ` Recent verification confidence trend: ${trends.trend} (${trends.change >= 0 ? '+' : ''}${(trends.change * 100).toFixed(1)}%).`;
  }

  return enhancedReasoning;
}

/**
 * Get human-readable stability text
 */
getStabilityText(stability) {
  if (stability < 0.2) return 'excellent';
  if (stability < 0.4) return 'good';
  if (stability < 0.6) return 'moderate';
  if (stability < 0.8) return 'concerning';
  return 'poor';
}

  /**
   * Verify a milestone submission using ASI agents
   * @param {Object} submission - Milestone submission data
   * @param {string} submission.milestoneId - Milestone ID
   * @param {string} submission.campaignAddress - Campaign contract address
   * @param {string} submission.evidenceHash - IPFS hash of evidence
   * @param {string} submission.description - Milestone description
   * @param {string} submission.evidenceUrl - URL to evidence (optional)
   * @returns {Object} Verification result
   */
  async verifyMilestone(submission) {
  logger.info(`Starting AI verification for milestone ${submission.milestoneId}`);

  try {
    // If no ASI API key, use mock verification for development
    if (!this.asiApiKey) {
      return await this.mockVerification(submission);
    }

    // Analyze evidence using MeTTa knowledge graph
    const evidenceAnalysis = await this.analyzeEvidence(submission);

    // Get ASI agent verdict
    const agentVerdict = await this.getAgentVerdict(submission, evidenceAnalysis);

    // Combine results
    const finalResult = this.combineResults(evidenceAnalysis, agentVerdict);

    logger.info(`AI verification completed for milestone ${submission.milestoneId}`, {
      verdict: finalResult.verdict,
      confidence: finalResult.confidence
    });

    return finalResult;

  } catch (error) {
    logger.error(`AI verification failed for milestone ${submission.milestoneId}:`, error);

    // Return uncertain verdict on error
    return {
      verdict: 'uncertain',
      confidence: 0.0,
      reasoning: 'AI verification service unavailable',
      error: error.message
    };
  }
}

  /**
   * Analyze evidence using MeTTa knowledge graph
   */
  async analyzeEvidence(submission) {
  try {
    logger.info(`Analyzing evidence for milestone ${submission.milestoneId}`);

    const analysisRequest = {
      evidence_hash: submission.evidenceHash,
      evidence_url: submission.evidenceUrl,
      description: submission.description,
      milestone_id: submission.milestoneId,
      campaign_address: submission.campaignAddress
    };

    const response = await axios.post(
      `${this.mettaUrl}/analyze`,
      analysisRequest,
      {
        headers: {
          'Authorization': `Bearer ${this.asiApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    return {
      relevance: response.data.relevance || 0.5,
      completeness: response.data.completeness || 0.5,
      authenticity: response.data.authenticity || 0.5,
      reasoning: response.data.reasoning || 'Evidence analysis completed'
    };

  } catch (error) {
    logger.error('Evidence analysis failed:', error);
    return {
      relevance: 0.5,
      completeness: 0.5,
      authenticity: 0.5,
      reasoning: 'Evidence analysis failed - defaulting to neutral scores'
    };
  }
}

  /**
   * Get ASI agent verdict using AgentVerse
   */
  async getAgentVerdict(submission, evidenceAnalysis) {
  try {
    logger.info(`Getting ASI agent verdict for milestone ${submission.milestoneId}`);

    const agentRequest = {
      task: 'milestone_verification',
      context: {
        milestone_description: submission.description,
        evidence_analysis: evidenceAnalysis,
        campaign_address: submission.campaignAddress
      },
      parameters: {
        confidence_threshold: this.confidenceThreshold,
        analysis_depth: 'comprehensive'
      }
    };

    const response = await axios.post(
      `${this.agentVerseUrl}/agents/verify`,
      agentRequest,
      {
        headers: {
          'Authorization': `Bearer ${this.asiApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000
      }
    );

    return {
      approved: response.data.approved || false,
      confidence: response.data.confidence || 0.5,
      reasoning: response.data.reasoning || 'ASI agent analysis completed',
      recommendations: response.data.recommendations || []
    };

  } catch (error) {
    logger.error('ASI agent verdict failed:', error);
    return {
      approved: false,
      confidence: 0.0,
      reasoning: 'ASI agent analysis failed',
      recommendations: []
    };
  }
}

/**
 * Combine evidence analysis and agent verdict
 */
combineResults(evidenceAnalysis, agentVerdict) {
  const weights = {
    evidence: 0.4,
    agent: 0.6
  };

  const evidenceScore = (
    evidenceAnalysis.relevance * 0.4 +
    evidenceAnalysis.completeness * 0.3 +
    evidenceAnalysis.authenticity * 0.3
  );

  const combinedConfidence = (
    evidenceScore * weights.evidence +
    agentVerdict.confidence * weights.agent
  );

  let verdict;
  if (combinedConfidence >= this.confidenceThreshold && agentVerdict.approved) {
    verdict = 'approved';
  } else if (combinedConfidence < (1 - this.confidenceThreshold) || !agentVerdict.approved) {
    verdict = 'rejected';
  } else {
    verdict = 'uncertain';
  }

  return {
    verdict,
    confidence: combinedConfidence,
    reasoning: `${evidenceAnalysis.reasoning}. ${agentVerdict.reasoning}`,
    details: {
      evidence_analysis: evidenceAnalysis,
      agent_verdict: agentVerdict
    }
  };
}

/**
 * Mock verification for development/testing
 */
async mockVerification(submission) {
  logger.info(`Using mock verification for milestone ${submission.milestoneId}`);

  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Mock logic based on evidence hash
  const hash = submission.evidenceHash;
  const hashSum = hash.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const mockConfidence = (hashSum % 100) / 100;

  let verdict;
  if (mockConfidence >= 0.8) {
    verdict = 'approved';
  } else if (mockConfidence <= 0.3) {
    verdict = 'rejected';
  } else {
    verdict = 'uncertain';
  }

  return {
    verdict,
    confidence: mockConfidence,
    reasoning: `Mock verification result based on evidence hash analysis. Confidence: ${mockConfidence.toFixed(2)}`,
    details: {
      mock_analysis: true,
      hash_sum: hashSum,
      evidence_hash: hash
    }
  };
}

/**
 * Retry verification with exponential backoff
 */
async retryVerification(submission, attempt = 1) {
  if (attempt > this.maxRetryAttempts) {
    throw new Error(`Verification failed after ${this.maxRetryAttempts} attempts`);
  }

  try {
    return await this.verifyMilestone(submission);
  } catch (error) {
    logger.warn(`Verification attempt ${attempt} failed:`, error.message);

    const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
    await new Promise(resolve => setTimeout(resolve, delay));

    return this.retryVerification(submission, attempt + 1);
  }
}
}

module.exports = new AIVerificationService();
