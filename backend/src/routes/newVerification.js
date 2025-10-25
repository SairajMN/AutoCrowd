const express = require('express');
const Joi = require('joi');
const winston = require('winston');
const newVerificationService = require('../services/newVerificationService');

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
const contributorVerificationRequestSchema = Joi.object({
  contributorAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  campaignAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  level: Joi.string().valid('basic', 'advanced', 'expert').default('basic')
});

const challengeSolutionSchema = Joi.object({
  contributorAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  campaignAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  challengeId: Joi.string().required(),
  solution: Joi.string().required()
});

const verifyContributorSchema = Joi.object({
  contributorAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  campaignAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  verificationLevel: Joi.string().valid('basic', 'advanced', 'expert').required(),
  verifierAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required()
});

const milestoneVerificationRequestSchema = Joi.object({
  milestoneId: Joi.number().integer().min(0).required(),
  contributorAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  campaignAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  evidence: Joi.string().required(),
  description: Joi.string().required(),
  evidenceUrl: Joi.string().uri().optional()
});

const milestoneVerificationSchema = Joi.object({
  verificationId: Joi.string().required(),
  verdict: Joi.string().valid('approved', 'rejected', 'uncertain').required(),
  confidenceScore: Joi.number().min(0).max(1000).required(),
  verifierAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  reasoning: Joi.string().optional()
});

/**
 * POST /api/verification/contributor/verify
 * Request contributor verification
 */
router.post('/contributor/verify', async (req, res) => {
  try {
    const { error, value } = contributorVerificationRequestSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details[0].message
      });
    }

    const result = await newVerificationService.requestContributorVerification(
      value.contributorAddress,
      value.campaignAddress,
      value.level
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Contributor verification request failed:', error);
    res.status(500).json({
      error: 'Verification request failed',
      message: error.message
    });
  }
});

/**
 * POST /api/verification/challenge/submit
 * Submit solution for verification challenge
 */
router.post('/challenge/submit', async (req, res) => {
  try {
    const { error, value } = challengeSolutionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details[0].message
      });
    }

    const result = await newVerificationService.submitChallengeSolution(
      value.contributorAddress,
      value.campaignAddress,
      value.challengeId,
      value.solution
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Challenge submission failed:', error);
    res.status(500).json({
      error: 'Challenge submission failed',
      message: error.message
    });
  }
});

/**
 * POST /api/verification/contributor/confirm
 * Confirm contributor verification (verifier action)
 */
router.post('/contributor/confirm', async (req, res) => {
  try {
    const { error, value } = verifyContributorSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details[0].message
      });
    }

    const result = await newVerificationService.verifyContributor(
      value.contributorAddress,
      value.campaignAddress,
      value.verificationLevel,
      value.verifierAddress
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Contributor verification confirmation failed:', error);
    res.status(500).json({
      error: 'Verification confirmation failed',
      message: error.message
    });
  }
});

/**
 * POST /api/verification/milestone/verify
 * Request milestone verification
 */
router.post('/milestone/verify', async (req, res) => {
  try {
    const { error, value } = milestoneVerificationRequestSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details[0].message
      });
    }

    const result = await newVerificationService.requestMilestoneVerification(
      value.milestoneId,
      value.contributorAddress,
      value.campaignAddress,
      {
        evidence: value.evidence,
        description: value.description,
        evidenceUrl: value.evidenceUrl
      }
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Milestone verification request failed:', error);
    res.status(500).json({
      error: 'Milestone verification request failed',
      message: error.message
    });
  }
});

/**
 * POST /api/verification/milestone/confirm
 * Confirm milestone verification (verifier action)
 */
router.post('/milestone/confirm', async (req, res) => {
  try {
    const { error, value } = milestoneVerificationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details[0].message
      });
    }

    const result = await newVerificationService.verifyMilestone(
      value.verificationId,
      value.verdict,
      value.confidenceScore,
      value.verifierAddress,
      value.reasoning
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Milestone verification confirmation failed:', error);
    res.status(500).json({
      error: 'Milestone verification confirmation failed',
      message: error.message
    });
  }
});

/**
 * GET /api/verification/contributor/status/:contributorAddress/:campaignAddress
 * Get contributor verification status
 */
router.get('/contributor/status/:contributorAddress/:campaignAddress', async (req, res) => {
  try {
    const { contributorAddress, campaignAddress } = req.params;

    if (!contributorAddress || !campaignAddress) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const status = await newVerificationService.getContributorVerificationStatus(
      contributorAddress,
      campaignAddress
    );

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('Failed to get contributor verification status:', error);
    res.status(500).json({
      error: 'Failed to get verification status',
      message: error.message
    });
  }
});

/**
 * GET /api/verification/challenges/:contributorAddress/:campaignAddress
 * Get pending verification challenges for contributor
 */
router.get('/challenges/:contributorAddress/:campaignAddress', async (req, res) => {
  try {
    const { contributorAddress, campaignAddress } = req.params;

    if (!contributorAddress || !campaignAddress) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const challenges = await newVerificationService.getPendingChallenges(
      contributorAddress,
      campaignAddress
    );

    res.json({
      success: true,
      data: {
        challenges,
        count: challenges.length
      }
    });
  } catch (error) {
    logger.error('Failed to get pending challenges:', error);
    res.status(500).json({
      error: 'Failed to get challenges',
      message: error.message
    });
  }
});

/**
 * GET /api/verification/verifier/stats/:verifierAddress
 * Get verifier statistics
 */
router.get('/verifier/stats/:verifierAddress', async (req, res) => {
  try {
    const { verifierAddress } = req.params;

    if (!verifierAddress) {
      return res.status(400).json({ error: 'Verifier address is required' });
    }

    const stats = await newVerificationService.getVerifierStats(verifierAddress);

    if (!stats) {
      return res.status(404).json({ error: 'Verifier not found' });
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Failed to get verifier stats:', error);
    res.status(500).json({
      error: 'Failed to get verifier stats',
      message: error.message
    });
  }
});

/**
 * GET /api/verification/contributor/nfts/:address
 * Get all verification NFTs owned by a contributor address
 */
router.get('/contributor/nfts/:address', async (req, res) => {
  try {
    const { address } = req.params;

    // Validate address
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({ error: 'Invalid address format' });
    }

    logger.info(`Getting verification NFTs for contributor ${address}`);

    // Get contributor verification NFTs from blockchain
    const contributorNfts = await blockchainService.getContributorVerificationNFTs(address);

    res.json({
      success: true,
      data: {
        address,
        nfts: contributorNfts,
        count: contributorNfts.length
      }
    });
  } catch (error) {
    logger.error('Failed to get contributor NFTs:', error);
    res.status(500).json({
      error: 'Failed to get contributor NFTs',
      message: error.message
    });
  }
});

/**
 * GET /api/verification/health
 * Health check for new verification service
 */
router.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'new_verification_system',
      version: '1.0.0',
      features: [
        'contributor_verification',
        'milestone_verification',
        'challenge_based_system',
        'nft_verification_tokens',
        'verifier_reputation'
      ]
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
