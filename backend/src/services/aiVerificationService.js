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

    logger.info('AI Verification Service initialized');
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
