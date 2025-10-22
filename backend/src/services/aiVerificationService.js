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
   * Analyze real campaign contract activity patterns for onchain scam detection
   */
  async analyzeCampaignActivity(campaignAddress, realtimeContext) {
    try {
      // Get real campaign contract interactions from blockchain
      const campaignTxs = await this.getCampaignContractTransactions(campaignAddress);
      const campaignStats = this.calculateCampaignStatistics(campaignTxs);

      // Analyze contribution patterns
      const contributionPatterns = this.analyzeContributionPatterns(campaignTxs, campaignStats);

      // Check creator interactions within campaign
      const creatorInteractions = await this.analyzeCreatorInteractions(campaignAddress, campaignTxs);

      // Analyze fund flow patterns
      const fundFlowAnalysis = this.analyzeFundFlowPatterns(campaignTxs, campaignStats);

      // Time-based behavior analysis
      const temporalPatterns = this.analyzeTemporalPatterns(campaignTxs);

      return {
        campaignStats,
        contributionPatterns,
        creatorInteractions,
        fundFlowAnalysis,
        temporalPatterns,
        riskIndicators: this.generateOnchainRiskIndicators(contributionPatterns, creatorInteractions, fundFlowAnalysis, temporalPatterns),
        explanation: this.generateOnchainAnalysisExplanation(contributionPatterns, creatorInteractions)
      };
    } catch (error) {
      logger.warn('Failed to analyze campaign activity:', error);
      return this.getFallbackAnalysis(campaignAddress);
    }
  }

  /**
   * Get all transactions for a specific campaign contract
   */
  async getCampaignContractTransactions(campaignAddress) {
    try {
      // Query Blockscout for campaign contract transactions
      const response = await axios.get(
        `${this.blockscoutApiUrl}?module=account&action=txlist&address=${campaignAddress}&page=1&offset=50`,
        { timeout: 10000 }
      );

      if (response.data?.result) {
        return response.data.result.map(tx => ({
          hash: tx.hash,
          from: tx.from.toLowerCase(),
          to: tx.to.toLowerCase(),
          value: tx.value,
          timestamp: new Date(parseInt(tx.timeStamp) * 1000),
          blockNumber: parseInt(tx.blockNumber),
          gasUsed: tx.gasUsed,
          function: this.decodeTransactionFunction(tx.input), // Decode contract call
          contractAddress: campaignAddress.toLowerCase()
        }));
      }
    } catch (error) {
      logger.warn(`Failed to get campaign transactions for ${campaignAddress}:`, error.message);
    }

    return [];
  }

  /**
   * Decode transaction function calls (simplified)
   */
  decodeTransactionFunction(input) {
    // In production, this would use ethers.js to decode contract calls
    if (!input || input === '0x') return 'native_transfer';

    // Look for common function signatures
    const functionSignatures = {
      '0xa9059cbb': 'transfer',
      '0x095ea7b3': 'approve',
      '0x23b872dd': 'transferFrom',
      'contribute': 'contribute',
      'withdraw': 'withdraw',
      'votemileston': 'voteMilestone',
      'releasemiles': 'releaseMilestone'
    };

    const signature = input.slice(0, 10); // First 4 bytes + 0x
    return functionSignatures[signature] || 'unknown';
  }

  /**
   * Calculate comprehensive campaign statistics from onchain data
   */
  calculateCampaignStatistics(txs) {
    const now = Date.now();
    const campaignStart = Math.min(...txs.map(tx => tx.timestamp.getTime()));
    const campaignDuration = Math.max(0, now - campaignStart);

    const contributions = txs.filter(tx => tx.function === 'contribute' || (tx.to === tx.contractAddress && parseInt(tx.value) > 0));
    const withdrawals = txs.filter(tx => tx.function === 'withdraw' || tx.from === tx.contractAddress);

    // Calculate actual volumes
    const totalContributions = contributions.reduce((sum, tx) => sum + parseInt(tx.value || '0'), 0);
    const totalWithdrawals = withdrawals.reduce((sum, tx) => sum + parseInt(tx.value || '0'), 0);

    // Unique contributors (exclude creator and contract itself)
    const contributors = new Set(contributions.map(tx => tx.from));
    const creator = this.identifyCampaignCreator(txs);
    if (creator) contributors.delete(creator);

    return {
      totalContributions,
      totalWithdrawals,
      netBalance: totalContributions - totalWithdrawals,
      uniqueContributors: contributors.size,
      totalTxCount: txs.length,
      contributionTxCount: contributions.length,
      withdrawalTxCount: withdrawals.length,
      averageContribution: contributors.size > 0 ? totalContributions / contributors.size : 0,
      campaignDurationDays: campaignDuration / (1000 * 60 * 60 * 24),
      firstContribution: campaignStart,
      lastActivity: Math.max(...txs.map(tx => tx.timestamp.getTime())),
      creatorAddress: creator
    };
  }

  /**
   * Identify campaign creator from contract deployment or initial setup
   */
  identifyCampaignCreator(txs) {
    // Find the address that called factory functions or deployed the contract
    const deploymentTx = txs.find(tx => tx.function === 'createCampaign' || tx.to === '0x0000000000000000000000000000000000000000');
    if (deploymentTx) return deploymentTx.from;

    // Alternatively, find the address with most administrative actions
    const adminActions = txs.filter(tx => ['setGoal', 'addMilestone', 'updateCampaign'].includes(tx.function));
    if (adminActions.length > 0) {
      // Group by sender and find most active administrative address
      const adminFreq = {};
      adminActions.forEach(tx => {
        adminFreq[tx.from] = (adminFreq[tx.from] || 0) + 1;
      });

      const adminAddresses = Object.entries(adminFreq).sort(([, a], [, b]) => b - a);
      return adminAddresses[0]?.[0];
    }

    return null;
  }

  /**
   * Analyze real contribution patterns from onchain data
   */
  analyzeContributionPatterns(txs, stats) {
    const contributionTxs = txs.filter(tx => tx.function === 'contribute' || (tx.to === tx.contractAddress && parseInt(tx.value) > 0));
    const withdrawals = txs.filter(tx => tx.function === 'withdraw' || tx.from === tx.contractAddress);

    // Time analysis
    const contributionTimes = contributionTxs.map(tx => tx.timestamp.getTime());
    const withdrawalTimes = withdrawals.map(tx => tx.timestamp.getTime());

    // Amount distribution analysis
    const amounts = contributionTxs.map(tx => parseInt(tx.value));
    const avgAmount = amounts.length > 0 ? amounts.reduce((a, b) => a + b, 0) / amounts.length : 0;
    const largeContributions = amounts.filter(amount => amount > avgAmount * 2).length;
    const smallContributions = amounts.filter(amount => amount < avgAmount * 0.1).length;

    // Contributor concentration
    const contributorCounts = {};
    contributionTxs.forEach(tx => {
      contributorCounts[tx.from] = (contributorCounts[tx.from] || 0) + 1;
    });

    const top10Contributors = Object.entries(contributorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    const top10ContributionPercent = stats.uniqueContributors > 0 ?
      top10Contributors.reduce((sum, [, count]) => sum + count, 0) / stats.totalTxCount : 0;

    // Temporal patterns
    const firstContribution = contributionTimes.length > 0 ? Math.min(...contributionTimes) : null;
    const lastContribution = contributionTimes.length > 0 ? Math.max(...contributionTimes) : null;
    const peakActivity = this.findPeakActivityHours(contributionTxs);

    return {
      totalContributions: stats.totalContributions,
      uniqueContributors: stats.uniqueContributors,
      averageContribution: stats.averageContribution,
      concentrationRatio: top10ContributionPercent,
      largeContributorRatio: stats.uniqueContributors > 0 ? largeContributions / stats.uniqueContributors : 0,
      microContributorRatio: stats.uniqueContributors > 0 ? smallContributions / stats.uniqueContributors : 0,
      fundingVelocity: this.calculateFundingVelocity(contributionTxs),
      temporalDistribution: this.analyzeTemporalDistribution(contributionTxs),
      peakActivityHours: peakActivity,
      firstContribution,
      lastContribution,
      fundraisingDuration: lastContribution && firstContribution ? lastContribution - firstContribution : 0,
      withdrawalPatterns: this.analyzeWithdrawalPatterns(withdrawals, contributionTxs),
      contributorDiversity: this.calculateDiversityScore(contributorCounts)
    };
  }

  /**
   * Analyze creator's interactions within the campaign
   */
  async analyzeCreatorInteractions(campaignAddress, txs) {
    const creator = this.identifyCampaignCreator(txs);
    if (!creator) return { creatorFound: false };

    // Filter creator's transactions with this campaign
    const creatorTxs = txs.filter(tx => tx.from === creator || tx.to === creator);

    // Analyze creator's contribution
    const creatorContributions = creatorTxs.filter(tx => tx.function === 'contribute' || (tx.to === campaignAddress && parseInt(tx.value) > 0));
    const creatorWithdrawals = creatorTxs.filter(tx => tx.from === campaignAddress || tx.function === 'withdraw');

    const creatorContributionTotal = creatorContributions.reduce((sum, tx) => sum + parseInt(tx.value || '0'), 0);
    const creatorWithdrawalTotal = creatorWithdrawals.reduce((sum, tx) => sum + parseInt(tx.value || '0'), 0);

    const totalCampaignContributions = txs.reduce((sum, tx) =>
      sum + (tx.function === 'contribute' || (tx.to === campaignAddress && parseInt(tx.value) > 0) ? parseInt(tx.value || '0') : 0), 0);

    // Timing analysis for creator actions
    const firstCreatorAction = creatorTxs.length > 0 ? Math.min(...creatorTxs.map(tx => tx.timestamp.getTime())) : null;
    const lastCreatorAction = creatorTxs.length > 0 ? Math.max(...creatorTxs.map(tx => tx.timestamp.getTime())) : null;

    const campaignStart = txs.length > 0 ? Math.min(...txs.map(tx => tx.timestamp.getTime())) : Date.now();
    const timeToFirstCreatorContribution = firstCreatorAction ? firstCreatorAction - campaignStart : null;

    return {
      creatorFound: true,
      creatorAddress: creator,
      selfContributionRatio: totalCampaignContributions > 0 ? creatorContributionTotal / totalCampaignContributions : 0,
      withdrawalRatio: creatorContributionTotal > 0 ? creatorWithdrawalTotal / Math.max(creatorContributionTotal, 1) : 0,
      interactionFrequency: creatorTxs.length,
      firstInteraction: firstCreatorAction ? new Date(firstCreatorAction) : null,
      lastInteraction: lastCreatorAction ? new Date(lastCreatorAction) : null,
      timeToFirstContribution: timeToFirstCreatorContribution,
      adminActions: creatorTxs.filter(tx => ['setGoal', 'addMilestone', 'updateCampaign'].includes(tx.function)).length,
      earlyWithdrawals: this.detectEarlyWithdrawals(creatorWithdrawals, campaignStart),
      contributionPatterns: {
        contributedBeforeOthers: this.didCreatorContributeFirst(creatorContributions, txs),
        withdrewEarly: this.analyzeEarlyWithdrawal(creatorWithdrawals, campaignStart),
        maintainedParticipation: creatorTxs.length > 2
      }
    };
  }

  /**
   * Analyze fund flow patterns
   */
  analyzeFundFlowPatterns(txs, stats) {
    const inflows = txs.filter(tx => tx.to === stats.contractAddress && parseInt(tx.value) > 0);
    const outflows = txs.filter(tx => tx.from === stats.contractAddress || tx.function === 'withdraw');

    // Flow rate analysis
    const inflowRate = stats.campaignDurationDays > 0 ? stats.totalContributions / stats.campaignDurationDays : 0;
    const outflowRate = stats.campaignDurationDays > 0 ? stats.totalWithdrawals / stats.campaignDurationDays : 0;

    // Sudden flow changes (potential manipulation indicators)
    const suddenLargeWithdrawal = this.detectSuddenLargeMovements(outflows, 'out');
    const suddenLargeContribution = this.detectSuddenLargeMovements(inflows, 'in');

    return {
      inflowRate, // PYUSD per day
      outflowRate, // PYUSD per day
      retentionRatio: stats.totalContributions > 0 ? (stats.totalContributions - stats.totalWithdrawals) / stats.totalContributions : 0,
      flowRatio: stats.totalWithdrawals > 0 ? stats.totalContributions / stats.totalWithdrawals : stats.totalContributions,
      suddenMovements: {
        largeWithdrawals: suddenLargeWithdrawal.count,
        largeContributions: suddenLargeContribution.count,
        withdrawalSpikes: suddenLargeWithdrawal.detected,
        contributionDumps: suddenLargeContribution.detected
      },
      flowRegularity: this.calculateFlowRegularity(inflows, outflows)
    };
  }

  /**
   * Analyze temporal patterns in transactions
   */
  analyzeTemporalPatterns(txs) {
    const contributions = txs.filter(tx => tx.function === 'contribute');
    const withdrawals = txs.filter(tx => tx.function === 'withdraw');

    // Hourly distribution
    const hourDistribution = new Array(24).fill(0);
    contributions.forEach(tx => {
      const hour = tx.timestamp.getHours();
      hourDistribution[hour]++;
    });

    const peakHour = hourDistribution.indexOf(Math.max(...hourDistribution));
    const valleyHour = hourDistribution.indexOf(Math.min(...hourDistribution));

    // Weekend vs weekday analysis
    const weekendCount = contributions.filter(tx => {
      const day = tx.timestamp.getDay();
      return day === 0 || day === 6; // Sunday = 0, Saturday = 6
    }).length;

    const weekdayCount = contributions.length - weekendCount;
    const weekendRatio = contributions.length > 0 ? weekendCount / contributions.length : 0;

    // Burst activity detection
    const activityBursts = this.detectActivityBursts(contributions);

    return {
      peakHour,
      valleyHour,
      weekendActivity: weekendRatio,
      weekdayActivity: 1 - weekendRatio,
      activityBursts: activityBursts.count,
      burstIntensity: activityBursts.intensity,
      temporalRegularity: this.calculateTemporalRegularity(contributions),
      unusualTiming: weekendRatio > 0.3 || hourDistribution[peakHour] > contributions.length * 0.5
    };
  }

  /**
   * Generate risk indicators based on onchain analysis
   */
  generateOnchainRiskIndicators(contributionPatterns, creatorInteractions, fundFlow, temporalPatterns) {
    const indicators = [];

    // Creator self-contribution risk
    if (creatorInteractions.selfContributionRatio > 0.5) {
      indicators.push({
        type: 'creator_self_contribution',
        severity: 'high',
        description: `Creator contributed ${Math.round(creatorInteractions.selfContributionRatio * 100)}% of total funds - potential self-dealing`,
        score: Math.min(1, creatorInteractions.selfContributionRatio * 2)
      });
    }

    // Fund concentration risk
    if (contributionPatterns.concentrationRatio > 0.8) {
      indicators.push({
        type: 'fund_concentration',
        severity: 'high',
        description: `Top 10 contributors hold ${(contributionPatterns.concentrationRatio * 100).toFixed(1)}% of activity - manipulation risk`,
        score: Math.min(1, contributionPatterns.concentrationRatio)
      });
    }

    // Early withdrawal risk
    if (creatorInteractions.earlyWithdrawals) {
      indicators.push({
        type: 'early_withdrawal',
        severity: 'critical',
        description: 'Creator withdrew funds within 48 hours of campaign start - scam pattern',
        score: 1.0
      });
    }

    // Unusual timing risk
    if (temporalPatterns.unusualTiming) {
      indicators.push({
        type: 'unusual_timing',
        severity: 'medium',
        description: `${Math.round(temporalPatterns.weekendActivity * 100)}% activity occurs during unusual hours`,
        score: temporalPatterns.unusualTiming ? 0.6 : 0.2
      });
    }

    // Flow irregularity risk
    if (fundFlow.flowRegularity < 0.3) {
      indicators.push({
        type: 'irregular_flows',
        severity: 'medium',
        description: 'Irregular fund flows detected - may indicate manipulation',
        score: Math.max(0.3, (1 - fundFlow.flowRegularity))
      });
    }

    return indicators;
  }

  /**
   * Generate human-readable explanation of onchain analysis
   */
  generateOnchainAnalysisExplanation(contributionPatterns, creatorInteractions) {
    const explanations = [];

    if (creatorInteractions.creatorFound) {
      explanations.push(`Creator ${creatorInteractions.creatorAddress} has ${creatorInteractions.interactionFrequency} interactions with this campaign`);

      if (creatorInteractions.selfContributionRatio > 0) {
        explanations.push(`Creator contributed ${(creatorInteractions.selfContributionRatio * 100).toFixed(1)}% of total campaign funds`);
      }

      if (creatorInteractions.earlyWithdrawals) {
        explanations.push('⚠️ Creator made early withdrawals - potential scam pattern');
      }
    }

    if (contributionPatterns.uniqueContributors > 0) {
      explanations.push(`${contributionPatterns.uniqueContributors} unique contributors with average contribution of $${(contributionPatterns.averageContribution / 1e18).toFixed(2)}`);
    }

    if (contributionPatterns.concentrationRatio > 0.7) {
      explanations.push(`High contributor concentration detected (${(contributionPatterns.concentrationRatio * 100).toFixed(1)}% from top 10)`);
    }

    return explanations.join('. ');
  }

  /**
   * Helper functions for advanced analysis
   */
  calculateFundingVelocity(contributions) {
    if (contributions.length < 2) return 0;

    const timespan = (contributions[contributions.length - 1].timestamp.getTime() -
      contributions[0].timestamp.getTime()) / (1000 * 60 * 60); // hours

    return timespan > 0 ? contributions.length / timespan : 0; // contributions per hour
  }

  analyzeTemporalDistribution(contributions) {
    // Calculate inter-arrival times and analyze distribution
    if (contributions.length < 3) return { regularity: 0, pattern: 'insufficient_data' };

    const times = contributions.sort((a, b) => a.timestamp - b.timestamp)
      .map(tx => tx.timestamp.getTime());

    const intervals = [];
    for (let i = 1; i < times.length; i++) {
      intervals.push((times[i] - times[i - 1]) / (1000 * 60)); // minutes
    }

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
    const regularity = Math.max(0, 1 - Math.sqrt(variance) / avgInterval);

    return {
      regularity: Math.max(0, Math.min(1, regularity)),
      pattern: regularity > 0.7 ? 'regular' : regularity > 0.4 ? 'moderate' : 'irregular',
      avgIntervalMinutes: avgInterval
    };
  }

  findPeakActivityHours(txs) {
    const hourCounts = new Array(24).fill(0);
    txs.forEach(tx => {
      const hour = tx.timestamp.getHours();
      hourCounts[hour]++;
    });

    const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
    const totalTxs = txs.length;
    const peakPercentage = totalTxs > 0 ? hourCounts[peakHour] / totalTxs : 0;

    return {
      hour: peakHour,
      percentage: peakPercentage,
      count: hourCounts[peakHour],
      isUnusual: peakPercentage > 0.5 // More than half activity in one hour
    };
  }

  detectSuddenLargeMovements(txs, direction) {
    if (txs.length < 2) return { detected: false, count: 0 };

    const values = txs.map(tx => parseInt(tx.value || '0'));
    const avgValue = values.reduce((a, b) => a + b, 0) / values.length;

    const largeMovements = values.filter(value => value > avgValue * 3); // 3x average

    return {
      detected: largeMovements.length > 0,
      count: largeMovements.length,
      ratio: largeMovements.length / values.length,
      largest: Math.max(...values)
    };
  }

  calculateDiversityScore(contributorCounts) {
    const totalContributions = Object.values(contributorCounts).reduce((a, b) => a + b, 0);
    const uniqueContributors = Object.keys(contributorCounts).length;

    if (uniqueContributors <= 1) return 0;

    // Gini coefficient approximation for contribution diversity
    const values = Object.values(contributorCounts).sort((a, b) => a - b);
    let cumulative = 0;
    let gini = 0;

    values.forEach((val, i) => {
      cumulative += val;
      gini += (2 * (i + 1) - uniqueContributors - 1) * (val / totalContributions);
    });

    return Math.max(0, Math.min(1, 1 - gini / uniqueContributors)); // Higher = more diverse
  }

  detectActivityBursts(contributions) {
    if (contributions.length < 5) return { detected: false, count: 0, intensity: 0 };

    // Group contributions by hour
    const hourlyActivity = {};
    contributions.forEach(tx => {
      const hourKey = tx.timestamp.toISOString().slice(0, 13); // YYYY-MM-DDTHH
      hourlyActivity[hourKey] = (hourlyActivity[hourKey] || 0) + 1;
    });

    const activities = Object.values(hourlyActivity);
    const avgActivity = activities.reduce((a, b) => a + b, 0) / activities.length;
    const stdDev = Math.sqrt(
      activities.reduce((sum, activity) => sum + Math.pow(activity - avgActivity, 2), 0) / activities.length
    );

    const bursts = activities.filter(activity => activity > avgActivity + 2 * stdDev);
    const burstIntensity = bursts.length > 0 ? Math.max(...bursts) / avgActivity : 0;

    return {
      detected: burstIntensity > 3,
      count: bursts.length,
      intensity: Math.min(5, burstIntensity) / 5, // Normalize to 0-1
      maxBurst: Math.max(...bursts, 0)
    };
  }

  didCreatorContributeFirst(creatorContributions, allTxs) {
    if (creatorContributions.length === 0 || allTxs.length === 0) return false;

    const firstContribution = allTxs
      .filter(tx => tx.function === 'contribute')
      .sort((a, b) => a.timestamp - b.timestamp)[0];

    const creatorFirstContribution = creatorContributions
      .sort((a, b) => a.timestamp - b.timestamp)[0];

    return creatorFirstContribution?.hash === firstContribution?.hash;
  }

  analyzeEarlyWithdrawal(withdrawals, campaignStart) {
    const earlyWithdrawals = withdrawals.filter(tx =>
      tx.timestamp.getTime() - campaignStart < 48 * 60 * 60 * 1000 // Within 48 hours
    );

    return {
      count: earlyWithdrawals.length,
      ratio: withdrawals.length > 0 ? earlyWithdrawals.length / withdrawals.length : 0,
      detected: earlyWithdrawals.length > 0
    };
  }

  detectEarlyWithdrawals(withdrawals, campaignStart) {
    if (withdrawals.length === 0) return false;

    // Check if any withdrawal happened very early
    const earliestWithdrawal = Math.min(...withdrawals.map(tx => tx.timestamp.getTime()));
    const hoursSinceStart = (earliestWithdrawal - campaignStart) / (1000 * 60 * 60);

    return hoursSinceStart < 24; // Withdrawal within 24 hours = early
  }

  calculateFlowRegularity(inflows, outflows) {
    if (inflows.length < 3 && outflows.length < 3) return 0;

    const allFlows = [...inflows, ...outflows].sort((a, b) => a.timestamp - b.timestamp);
    const times = allFlows.map(tx => tx.timestamp.getTime());
    const values = allFlows.map(tx => parseInt(tx.value || '0'));

    // Calculate coefficients of variation for timing and amount
    const timeCv = this.calculateCoefficientOfVariation(times);
    const valueCv = this.calculateCoefficientOfVariation(values);

    // Regularity is inverse of variation (1 = perfectly regular, 0 = highly irregular)
    const regularity = Math.max(0, Math.min(1, 2 - (timeCv + valueCv)));

    return regularity;
  }

  calculateCoefficientOfVariation(values) {
    if (values.length < 2) return 1;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    if (mean === 0) return 1;

    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return stdDev / mean;
  }

  analyzeWithdrawalPatterns(withdrawals, contributions) {
    if (withdrawals.length === 0) return { pattern: 'no_withdrawals' };

    const totalContributed = contributions.reduce((sum, tx) => sum + parseInt(tx.value || '0'), 0);
    const totalWithdrawn = withdrawals.reduce((sum, tx) => sum + parseInt(tx.value || '0'), 0);

    const withdrawalRate = totalContributed > 0 ? totalWithdrawn / totalContributed : 0;
    const avgTimeBetweenWithdrawals = this.calculateAvgTimeBetweenTransactions(withdrawals);

    return {
      withdrawalRate,
      totalWithdrawn,
      withdrawalFrequency: withdrawals.length,
      avgTimeBetweenWithdrawals,
      pattern: withdrawalRate > 0.8 ? 'rapid_exhaustion' :
        withdrawalRate > 0.5 ? 'moderate_withdrawal' :
          withdrawalRate > 0.2 ? 'controlled_withdrawal' : 'conservative'
    };
  }

  calculateAvgTimeBetweenTransactions(txs) {
    if (txs.length < 2) return null;

    const sortedTxs = txs.sort((a, b) => a.timestamp - b.timestamp);
    const intervals = [];

    for (let i = 1; i < sortedTxs.length; i++) {
      intervals.push(sortedTxs[i].timestamp.getTime() - sortedTxs[i - 1].timestamp.getTime());
    }

    return intervals.reduce((a, b) => a + b, 0) / intervals.length / (1000 * 60 * 60); // hours
  }

  getFallbackAnalysis(campaignAddress) {
    // Return safe defaults when analysis fails
    return {
      campaignStats: { totalContributions: 0, uniqueContributors: 0 },
      contributionPatterns: { totalContributions: 0, uniqueContributors: 0, averageContribution: 0 },
      creatorInteractions: { creatorFound: false },
      fundFlowAnalysis: { retentionRatio: 0, flowRegularity: 0 },
      temporalPatterns: { unusualTiming: false },
      riskIndicators: [],
      explanation: 'Analysis unavailable - using conservative approach'
    };
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
 * Generate risk mitigation suggestions with AI-human hybrid approach
 */
generateRiskMitigationSuggestions(risks) {
  const suggestions = [];

  // AI-Generated Automated Recommendations
  if (risks.contributorRisk > 0.7) {
    suggestions.push({
      type: 'AI_AUTOMATED',
      action: 'Require additional identity verification for high-risk contributor',
      reason: 'Statistical anomaly detected in contributor behavior patterns',
      confidence: 'High',
      escalationLevel: 'MODERATE'
    });
  }

  if (risks.marketRisk > 0.6) {
    suggestions.push({
      type: 'AI_AUTOMATED',
      action: 'Consider delaying high-value milestones during market volatility',
      reason: 'Real-time market analysis indicates elevated risk conditions',
      confidence: 'Medium',
      escalationLevel: 'LOW'
    });
  }

  if (risks.pyusdStability > 0.4) {
    suggestions.push({
      type: 'AI_AUTOMATED',
      action: 'Monitor PYUSD peg stability closely during verification',
      reason: 'Stablecoin depegging risk requires enhanced monitoring',
      confidence: 'High',
      escalationLevel: 'MODERATE'
    });
  }

  // Human Oversight Triggers
  if (risks.overallRisk > 0.8) {
    suggestions.push({
      type: 'HUMAN_OVERRIDE_REQUIRED',
      action: '🚨 MANUAL HUMAN REVIEW REQUIRED: Campaign requires immediate human moderator attention',
      reason: 'Risk score exceeds automated threshold - human expertise required for final decision',
      confidence: 'N/A - Human Judgment Required',
      escalationLevel: 'CRITICAL',
      requiredAction: 'Full manual investigation and human decision-making'
    });
  } else if (risks.overallRisk > 0.6) {
    suggestions.push({
      type: 'HUMAN_ESCALATION',
      action: '⚠️ ESCALATE TO HUMAN REVIEW: Awaiting human moderator verification for high-risk scenario',
      reason: 'AI confidence insufficient for automated decision - requires human expertise',
      confidence: 'Low - Human Oversight Needed',
      escalationLevel: 'HIGH',
      requiredAction: 'Human reviewer must validate AI findings'
    });
  } else if (risks.overallRisk > 0.4) {
    suggestions.push({
      type: 'HUMAN_MONITORING',
      action: '👁️ HUMAN MONITORING REQUIRED: Regular human oversight recommended for moderate-risk campaign',
      reason: 'Pattern requires ongoing human supervision alongside AI monitoring',
      confidence: 'Medium',
      escalationLevel: 'MODERATE',
      requiredAction: 'Add to human monitoring queue for periodic review'
    });
  }

  // AI Continuous Learning Suggestions
  if (risks.overallRisk > 0.5) {
    suggestions.push({
      type: 'AI_LEARNING_FEEDBACK',
      action: 'COLLECT GROUND TRUTH DATA: This case should be reviewed to improve future AI detection accuracy',
      reason: 'High-confidence AI decisions help train better detection models',
      confidence: 'Meta-Analysis',
      escalationLevel: 'LOW',
      requiredAction: 'Store outcome for AI model training'
    });
  }

  // Transparency and Explainability (Human Trust Building)
  suggestions.push({
    type: 'TRANSPARENCY_INFO',
    action: 'DISPLAY AI DECISIONS TRANSPARENTLY: Show contributors and creators AI risk assessment reasoning',
    reason: 'Building trust requires explainable AI decisions and audit trails',
    confidence: 'Policy Requirement',
    escalationLevel: 'COMPLIANCE',
    requiredAction: 'Ensure all AI decisions are logged and explainable to humans'
  });

  if (suggestions.length === 0) {
    suggestions.push({
      type: 'AI_AUTOMATED',
      action: 'No significant risks detected at this time',
      reason: 'All automated checks passed successfully',
      confidence: 'High',
      escalationLevel: 'NONE'
    });
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
