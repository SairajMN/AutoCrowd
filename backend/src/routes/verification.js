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

    // Perform AI verification
    const verificationResult = await aiVerificationService.verifyMilestone(value);

    // Return verification result
    res.json({
      success: true,
      data: {
        milestoneId: value.milestoneId,
        campaignAddress: value.campaignAddress,
        verdict: verificationResult.verdict,
        confidence: verificationResult.confidence,
        reasoning: verificationResult.reasoning,
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
        blockchain: 'operational'
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
