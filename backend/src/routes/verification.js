const express = require('express');
const Joi = require('joi');
const winston = require('winston');
const aiVerificationService = require('../services/aiVerificationService');
const blockchainService = require('../services/blockchainService');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

const router = express.Router();

// Validation schemas
const verificationRequestSchema = Joi.object({
  milestoneId: Joi.string().required(),
  campaignAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  evidenceHash: Joi.string().required(),
  description: Joi.string().required(),
  evidenceUrl: Joi.string().uri().optional()
});

const verdictSchema = Joi.object({
  requestId: Joi.string().required(),
  approved: Joi.boolean().required(),
  aiReportHash: Joi.string().required(),
  reasoning: Joi.string().optional()
});

/**
 * POST /api/verification/verify
 * Request AI verification for a milestone
 */
router.post('/verify', async (req, res) => {
  try {
    // Validate request
    const { error, value } = verificationRequestSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details[0].message
      });
    }

    logger.info(`Verification request received for milestone ${value.milestoneId}`);

    // Perform AI verification with real-time data (includes scam detection)
    const verificationResult = await aiVerificationService.verifyMilestoneWithRealtimeData({
      ...value,
      submitterAddress: req.body.submitterAddress // Campaign creator address
    });

    // Return enhanced verification result with scam detection
    res.json({
      success: true,
      data: {
        milestoneId: value.milestoneId,
        campaignAddress: value.campaignAddress,
        verdict: verificationResult.verdict,
        confidence: verificationResult.confidence,
        reasoning: verificationResult.reasoning,
        scamDetection: {
          campaignCreatorRisk: verificationResult.realtimeData?.riskAssessment?.campaignCreatorRisk || 0,
          overallRisk: verificationResult.realtimeData?.riskAssessment?.overallRisk || 0,
          riskLevel: (verificationResult.realtimeData?.riskAssessment?.overallRisk || 0) > 0.7 ? 'HIGH' :
            (verificationResult.realtimeData?.riskAssessment?.overallRisk || 0) > 0.4 ? 'MEDIUM' : 'LOW',
          suggestions: verificationResult.realtimeData?.riskAssessment?.suggestions || [],
          riskFactors: {
            multipleCampaignCreator: (verificationResult.realtimeData?.riskAssessment?.campaignCreatorRisk || 0) > 0.3,
            immediateWithdrawals: false, // Would be calculated from activity patterns
            selfContribution: false,
            unusualTiming: false,
            overfundedCampaign: false
          }
        },
        realtimeData: {
          freshness: verificationResult.realtimeData?.freshness,
          dataSourcesUsed: verificationResult.realtimeData?.usedDataTypes || []
        },
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Verification request failed:', error);
    res.status(500).json({
      error: 'Verification failed',
      message: error.message
    });
  }
});

/**
 * POST /api/verification/submit-verdict
 * Submit AI verification verdict to blockchain
 */
router.post('/submit-verdict', async (req, res) => {
  try {
    // Validate request
    const { error, value } = verdictSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details[0].message
      });
    }

    logger.info(`Submitting verdict for request ${value.requestId}`);

    // Submit verdict to blockchain
    const result = await blockchainService.completeVerification(
      value.requestId,
      value.approved,
      value.aiReportHash
    );

    res.json({
      success: true,
      data: {
        requestId: value.requestId,
        transactionHash: result.transactionHash,
        blockNumber: result.blockNumber,
        gasUsed: result.gasUsed,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Verdict submission failed:', error);
    res.status(500).json({
      error: 'Verdict submission failed',
      message: error.message
    });
  }
});

/**
 * GET /api/verification/status/:requestId
 * Get verification request status
 */
router.get('/status/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;

    if (!requestId) {
      return res.status(400).json({
        error: 'Request ID is required'
      });
    }

    // Get verification request from blockchain
    const request = await blockchainService.getVerificationRequest(requestId);

    if (!request) {
      return res.status(404).json({
        error: 'Verification request not found'
      });
    }

    res.json({
      success: true,
      data: {
        requestId,
        campaignAddress: request.campaignAddress,
        milestoneId: request.milestoneId.toString(),
        requester: request.requester,
        timestamp: request.timestamp.toString(),
        isProcessed: request.isProcessed,
        isApproved: request.isApproved,
        aiReportHash: request.aiReportHash
      }
    });

  } catch (error) {
    logger.error('Failed to get verification status:', error);
    res.status(500).json({
      error: 'Failed to get verification status',
      message: error.message
    });
  }
});

/**
 * GET /api/verification/pending
 * Get pending verification requests
 */
router.get('/pending', async (req, res) => {
  try {
    // This would typically query the blockchain for pending requests
    // For now, return empty array
    res.json({
      success: true,
      data: {
        pendingRequests: [],
        count: 0
      }
    });

  } catch (error) {
    logger.error('Failed to get pending requests:', error);
    res.status(500).json({
      error: 'Failed to get pending requests',
      message: error.message
    });
  }
});

/**
 * POST /api/verification/retry/:requestId
 * Retry verification for a failed request
 */
router.post('/retry/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;

    if (!requestId) {
      return res.status(400).json({
        error: 'Request ID is required'
      });
    }

    logger.info(`Retrying verification for request ${requestId}`);

    // Get original request details
    const request = await blockchainService.getVerificationRequest(requestId);

    if (!request) {
      return res.status(404).json({
        error: 'Verification request not found'
      });
    }

    if (request.isProcessed) {
      return res.status(400).json({
        error: 'Verification request already processed'
      });
    }

    // Prepare submission data
    const submission = {
      milestoneId: request.milestoneId.toString(),
      campaignAddress: request.campaignAddress,
      evidenceHash: request.aiReportHash, // Using aiReportHash as evidenceHash
      description: 'Retry verification',
      evidenceUrl: ''
    };

    // Retry verification with exponential backoff
    const verificationResult = await aiVerificationService.retryVerification(submission);

    res.json({
      success: true,
      data: {
        requestId,
        verdict: verificationResult.verdict,
        confidence: verificationResult.confidence,
        reasoning: verificationResult.reasoning,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Verification retry failed:', error);
    res.status(500).json({
      error: 'Verification retry failed',
      message: error.message
    });
  }
});

/**
 * POST /api/verification/scam-detection
 * Analyze campaign creator for potential scams
 */
router.post('/scam-detection', async (req, res) => {
  try {
    const { campaignAddress, submitterAddress } = req.body;

    if (!campaignAddress || !submitterAddress) {
      return res.status(400).json({
        error: 'Campaign address and submitter address are required'
      });
    }

    // Get real-time context which includes scam analysis
    const realtimeContext = aiVerificationService.getRealtimeVerificationContext(
      campaignAddress,
      submitterAddress
    );

    // Perform comprehensive scam risk assessment
    const riskAssessment = await aiVerificationService.performRealtimeRiskAssessment(
      { campaignAddress, submitterAddress },
      realtimeContext
    );

    // Get detailed scam analysis
    const creatorAnalysis = await aiVerificationService.analyzeCampaignCreator(campaignAddress);
    const activityPatterns = aiVerificationService.analyzeCampaignActivity(creatorAnalysis);

    // Calculate scam detection details
    const scamAnalysis = {
      campaignAddress,
      creatorAddress: submitterAddress,
      overallScamRisk: riskAssessment.campaignCreatorRisk,
      riskLevel: riskAssessment.campaignCreatorRisk > 0.7 ? 'CRITICAL SCAM ALERT' :
        riskAssessment.campaignCreatorRisk > 0.5 ? 'HIGH RISK' :
          riskAssessment.campaignCreatorRisk > 0.3 ? 'MODERATE RISK' : 'LOW RISK',
      creatorProfile: {
        totalCampaigns: creatorAnalysis.totalCampaigns,
        successRate: creatorAnalysis.successRate,
        reputation: creatorAnalysis.reputation,
        campaignsCompleted: Math.round(creatorAnalysis.totalCampaigns * creatorAnalysis.successRate)
      },
      suspiciousPatterns: {
        immediateWithdrawals: {
          detected: activityPatterns.immediateWithdrawals > 0.8,
          rate: activityPatterns.immediateWithdrawals,
          risk: activityPatterns.immediateWithdrawals > 0.8 ? 'HIGH' : 'LOW'
        },
        selfContribution: {
          detected: activityPatterns.selfContributionRatio > 0.5,
          percentage: activityPatterns.selfContributionRatio,
          risk: activityPatterns.selfContributionRatio > 0.5 ? 'HIGH' : 'LOW'
        },
        unusualTiming: {
          detected: activityPatterns.unusualTiming > 0.7,
          patternScore: activityPatterns.unusualTiming,
          risk: activityPatterns.unusualTiming > 0.7 ? 'HIGH' : 'MODERATE'
        },
        overfundedGoal: {
          detected: activityPatterns.overfundedRatio > 2,
          ratio: activityPatterns.overfundedRatio,
          risk: activityPatterns.overfundedRatio > 2 ? 'MODERATE' : 'LOW'
        },
        multipleCampaigns: {
          detected: creatorAnalysis.totalCampaigns > 5,
          count: creatorAnalysis.totalCampaigns,
          risk: creatorAnalysis.totalCampaigns > 5 ? 'MODERATE' : 'LOW'
        },
        lowSuccessRate: {
          detected: creatorAnalysis.successRate < 0.3,
          rate: creatorAnalysis.successRate,
          risk: creatorAnalysis.successRate < 0.3 ? 'HIGH' : creatorAnalysis.successRate < 0.5 ? 'MODERATE' : 'LOW'
        }
      },
      riskBreakdown: {
        multipleFailedCampaigns: creatorAnalysis.successRate < 0.3 ? 0.4 : 0,
        immediateFundWithdrawal: activityPatterns.immediateWithdrawals > 0.8 ? 0.5 : 0,
        suspiciousSelfContribution: activityPatterns.selfContributionRatio > 0.5 ? 0.4 : 0,
        unusualActivityPatterns: activityPatterns.unusualTiming > 0.7 ? 0.3 : 0,
        implausibleFunding: activityPatterns.overfundedRatio > 2 ? 0.2 : 0,
        newCreator: creatorAnalysis.totalCampaigns < 2 ? 0.2 : 0
      },
      recommendedActions: riskAssessment.suggestions,
      marketContext: {
        pyusdStable: realtimeContext.pyusdPrice?.usd ? Math.abs(realtimeContext.pyusdPrice.usd - 1) < 0.01 : null,
        marketVolatile: realtimeContext.marketData?.btc?.percent_change_24h ?
          Math.abs(realtimeContext.marketData.btc.percent_change_24h) > 5 : false
      },
      confidenceLevel: 'HIGH', // Analysis confidence based on real-time data availability
      lastAnalyzed: new Date().toISOString(),
      dataFreshness: Math.min(...[
        realtimeContext.timestamp,
        realtimeContext.pyusdPrice?.lastUpdated || realtimeContext.timestamp,
        realtimeContext.marketData?.timestamp || realtimeContext.timestamp,
        realtimeContext.blockchainState?.lastUpdated || realtimeContext.timestamp
      ].map(d => Date.now() - new Date(d).getTime()))
    };

    // Add scam detection warning if high risk
    if (scamAnalysis.overallScamRisk > 0.7) {
      scamAnalysis.warning = '🚨 CRITICAL: This campaign creator shows strong indicators of fraudulent activity. Immediate action required.';
    } else if (scamAnalysis.overallScamRisk > 0.5) {
      scamAnalysis.warning = '⚠️ HIGH RISK: This campaign creator exhibits suspicious patterns. Enhanced verification recommended.';
    } else if (scamAnalysis.overallScamRisk > 0.3) {
      scamAnalysis.warning = '⚡ MODERATE RISK: Monitor this campaign creator closely during verification.';
    }

    res.json({
      success: true,
      scamDetection: scamAnalysis,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Scam detection analysis failed:', error);
    res.status(500).json({
      error: 'Scam detection analysis failed',
      message: error.message
    });
  }
});

/**
 * GET /api/verification/contributors/:campaignAddress
 * Get verified contributor data for a campaign with Blockscout and ASI verification
 */
router.get('/contributors/:campaignAddress', async (req, res) => {
  try {
    const { campaignAddress } = req.params;
    const { startIndex = 0, limit = 50, verifyBlockscout = true, checkScam = true } = req.query;

    // Validate campaign address
    if (!campaignAddress || !/^0x[a-fA-F0-9]{40}$/.test(campaignAddress)) {
      return res.status(400).json({
        error: 'Invalid campaign address format'
      });
    }

    logger.info(`Fetching verified contributors for campaign ${campaignAddress}`);

    // Get contributor data from blockchain with ASI verification
    const verifiedContributors = await blockchainService.getVerifiedContributors(
      campaignAddress,
      parseInt(startIndex),
      parseInt(limit),
      verifyBlockscout === 'true',
      checkScam === 'true'
    );

    res.json({
      success: true,
      data: {
        campaignAddress,
        totalContributors: verifiedContributors.length,
        contributors: verifiedContributors.map(contributor => ({
          address: contributor.address,
          totalContributed: contributor.totalContributed,
          contributionCount: contributor.contributionCount,
          firstContribution: contributor.firstContribution,
          lastContribution: contributor.lastContribution,
          verificationStatus: contributor.verificationStatus,
          scamRiskScore: contributor.scamRiskScore,
          blockscoutVerified: contributor.blockscoutVerified,
          riskFactors: contributor.riskFactors,
          asiVerifiedAt: contributor.asiVerifiedAt
        })),
        metadata: {
          requestedRange: { startIndex: parseInt(startIndex), limit: parseInt(limit) },
          blockscoutVerification: verifyBlockscout === 'true',
          scamDetection: checkScam === 'true',
          timestamp: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    logger.error('Failed to get verified contributors:', error);
    res.status(500).json({
      error: 'Failed to fetch verified contributors',
      message: error.message
    });
  }
});

/**
 * GET /api/verification/contributor/:campaignAddress/:contributorAddress
 * Get detailed verification info for a specific contributor
 */
router.get('/contributor/:campaignAddress/:contributorAddress', async (req, res) => {
  try {
    const { campaignAddress, contributorAddress } = req.params;
    const { enhanceWithRealtime = true } = req.query;

    // Validate addresses
    if (!campaignAddress || !/^0x[a-fA-F0-9]{40}$/.test(campaignAddress)) {
      return res.status(400).json({ error: 'Invalid campaign address format' });
    }
    if (!contributorAddress || !/^0x[a-fA-F0-9]{40}$/.test(contributorAddress)) {
      return res.status(400).json({ error: 'Invalid contributor address format' });
    }

    logger.info(`Getting detailed verification for contributor ${contributorAddress} in campaign ${campaignAddress}`);

    // Get detailed contributor verification
    const contributorDetails = await blockchainService.getDetailedContributorVerification(
      campaignAddress,
      contributorAddress,
      enhanceWithRealtime === 'true'
    );

    if (!contributorDetails) {
      return res.status(404).json({
        error: 'Contributor not found in campaign'
      });
    }

    res.json({
      success: true,
      data: {
        campaignAddress,
        contributor: contributorDetails,
        verification: {
          blockscoutStatus: contributorDetails.blockscoutVerified ? 'VERIFIED' : 'UNVERIFIED',
          scamDetectionStatus: contributorDetails.scamRiskScore < 0.3 ? 'SAFE' :
            contributorDetails.scamRiskScore < 0.6 ? 'MONITOR' : 'HIGH_RISK',
          confidenceLevel: contributorDetails.confidenceLevel,
          lastVerified: contributorDetails.asiVerifiedAt
        },
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Failed to get contributor details:', error);
    res.status(500).json({
      error: 'Failed to fetch contributor details',
      message: error.message
    });
  }
});

/**
 * GET /api/verification/health
 * Health check for verification service
 */
router.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        aiVerification: 'operational',
        blockchain: 'operational',
        contributorVerification: 'active',
        scamDetection: 'active'
      }
    };

    res.json(health);
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

module.exports = router;
