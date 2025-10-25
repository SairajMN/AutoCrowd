const express = require('express');
const Joi = require('joi');
const winston = require('winston');
const kycVerificationService = require('../services/kycVerificationService');

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
const startVerificationSchema = Joi.object({
  walletAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  userData: Joi.object({
    firstName: Joi.string().optional(),
    lastName: Joi.string().optional(),
    email: Joi.string().email().optional(),
    country: Joi.string().optional()
  }).optional()
});

const statusCheckSchema = Joi.object({
  walletAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required()
});

/**
 * POST /api/kyc/start
 * Start KYC verification session using Ballerine only
 */
router.post('/start', async (req, res) => {
  try {
    // Validate request
    const { error, value } = startVerificationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details[0].message
      });
    }

    logger.info(`Starting Ballerine KYC verification for ${value.walletAddress}`);

    // Start verification using Ballerine only
    const verificationSession = await kycVerificationService.startVerification(
      value.walletAddress,
      value.userData || {}
    );

    res.json({
      success: true,
      data: verificationSession
    });

  } catch (error) {
    logger.error('KYC start failed:', error);
    res.status(500).json({
      error: 'KYC verification start failed',
      message: error.message
    });
  }
});

/**
 * GET /api/kyc/status/:walletAddress
 * Get KYC verification status for wallet address
 */
router.get('/status/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;

    // Validate wallet address
    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({
        error: 'Invalid wallet address format'
      });
    }

    logger.info(`Checking KYC status for ${walletAddress}`);

    // Get verification status
    const status = await kycVerificationService.getVerificationStatus(walletAddress);

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    logger.error('KYC status check failed:', error);
    res.status(500).json({
      error: 'KYC status check failed',
      message: error.message
    });
  }
});

/**
 * GET /api/kyc/session/:sessionId
 * Get verification session status
 */
router.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({
        error: 'Session ID is required'
      });
    }

    logger.info(`Checking KYC session status for ${sessionId}`);

    // Get session status
    const status = await kycVerificationService.checkVerificationStatus(sessionId);

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    logger.error('KYC session check failed:', error);
    res.status(500).json({
      error: 'KYC session check failed',
      message: error.message
    });
  }
});

/**
 * POST /api/kyc/ballerine-callback
 * Handle Ballerine verification callback
 */
router.post('/ballerine-callback', async (req, res) => {
  try {
    const signature = req.headers['x-signature'];
    const timestamp = req.headers['x-timestamp'];

    logger.info('Received Ballerine callback', {
      hasSignature: !!signature,
      hasTimestamp: !!timestamp,
      contentType: req.headers['content-type'],
      userAgent: req.headers['user-agent']
    });

    // Handle callback with signature verification
    const ballerineSDKService = require('../services/ballerineSDKService');
    const result = await ballerineSDKService.handleVerificationResult(
      req.body.sessionId || req.body.id,
      req.body
    );

    // Always return 200 OK to prevent retries
    res.status(200).json({
      success: true,
      message: 'Callback processed',
      data: result
    });

  } catch (error) {
    logger.error('Ballerine callback processing failed:', error);

    // Return 200 OK even on error to prevent retries
    res.status(200).json({
      success: false,
      message: 'Callback processing failed',
      error: error.message
    });
  }
});

/**
 * POST /api/kyc/veriff-callback
 * Handle Veriff verification callback with signature verification (legacy)
 */
router.post('/veriff-callback', async (req, res) => {
  try {
    const signature = req.headers['x-signature'];
    const timestamp = req.headers['x-timestamp'];

    logger.info('Received Veriff callback (legacy)', {
      hasSignature: !!signature,
      hasTimestamp: !!timestamp,
      contentType: req.headers['content-type'],
      userAgent: req.headers['user-agent']
    });

    // Handle callback with signature verification
    const result = await kycVerificationService.handleVerificationCallback(req.body, signature, timestamp);

    // Always return 200 OK to prevent retries for invalid signatures
    // Veriff expects 200 OK even for invalid requests to stop retries
    res.status(200).json({
      success: true,
      message: 'Callback processed',
      data: result
    });

  } catch (error) {
    logger.error('Veriff callback processing failed:', error);

    // Return 200 OK even on error to prevent Veriff from retrying
    // This is important because Veriff will retry failed webhooks
    res.status(200).json({
      success: false,
      message: 'Callback processing failed',
      error: error.message
    });
  }
});

/**
 * GET /api/kyc/nft/:walletAddress
 * Get NFT details for a verified wallet address
 */
router.get('/nft/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;

    // Validate wallet address
    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({
        error: 'Invalid wallet address format'
      });
    }

    logger.info(`Getting NFT details for ${walletAddress}`);

    // Get NFT details from blockchain service
    const blockchainService = require('../services/blockchainService');
    const nftDetails = await blockchainService.getVerificationNFTDetails(walletAddress);

    if (!nftDetails) {
      return res.status(404).json({
        success: false,
        error: 'No NFT found for this wallet address'
      });
    }

    res.json({
      success: true,
      data: nftDetails
    });

  } catch (error) {
    logger.error('Failed to get NFT details:', error);
    res.status(500).json({
      error: 'Failed to get NFT details',
      message: error.message
    });
  }
});

/**
 * GET /api/kyc/sdk-config
 * Get Ballerine SDK configuration for frontend
 */
router.get('/sdk-config', async (req, res) => {
  try {
    const ballerineSDKService = require('../services/ballerineSDKService');

    const sdkConfig = {
      apiKey: process.env.BALLERINE_API_KEY || '',
      endpoint: process.env.BALLERINE_ENDPOINT || 'https://api.ballerine.io',
      flowName: 'kyc-flow',
      elements: {
        document: {
          name: 'document',
          type: 'document',
          options: {
            documents: [
              { type: 'passport', category: 'travel_document' },
              { type: 'drivers_license', category: 'government_id' },
              { type: 'id_card', category: 'government_id' },
              { type: 'visa', category: 'travel_document' }
            ]
          }
        },
        selfie: {
          name: 'selfie',
          type: 'selfie',
          options: {
            requireQuality: true,
            maxRetries: 3
          }
        }
      },
      sdkScript: ballerineSDKService.getSDKScript(),
      stats: ballerineSDKService.getStats()
    };

    res.json({
      success: true,
      data: sdkConfig
    });

  } catch (error) {
    logger.error('Failed to get SDK config:', error);
    res.status(500).json({
      error: 'Failed to get SDK configuration',
      message: error.message
    });
  }
});

/**
 * POST /api/kyc/reset
 * Reset all KYC verification data (for development/testing)
 */
router.post('/reset', async (req, res) => {
  try {
    logger.info('Resetting all KYC verification data');

    // Reset all verification data using KYC service
    const result = await kycVerificationService.resetAllVerifications();

    res.json({
      success: true,
      message: 'All verification data reset successfully',
      data: result
    });

  } catch (error) {
    logger.error('Failed to reset all verifications:', error);
    res.status(500).json({
      error: 'Failed to reset all verifications',
      message: error.message
    });
  }
});

/**
 * POST /api/kyc/reset/:walletAddress
 * Reset KYC verification data for a specific wallet address
 */
router.post('/reset/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;

    // Validate wallet address
    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({
        error: 'Invalid wallet address format'
      });
    }

    logger.info(`Resetting KYC verification data for wallet ${walletAddress}`);

    // Reset verification data for specific wallet
    const result = await kycVerificationService.resetWalletVerification(walletAddress);

    res.json({
      success: true,
      message: `Verification data reset for wallet ${walletAddress}`,
      data: result
    });

  } catch (error) {
    logger.error(`Failed to reset verification for wallet ${req.params.walletAddress}:`, error);
    res.status(500).json({
      error: 'Failed to reset wallet verification',
      message: error.message
    });
  }
});

/**
 * GET /api/kyc/stats
 * Get KYC verification statistics
 */
router.get('/stats', async (req, res) => {
  try {
    logger.info('Getting KYC verification statistics');

    // Get verification statistics
    const stats = await kycVerificationService.getVerificationStats();

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Failed to get verification stats:', error);
    res.status(500).json({
      error: 'Failed to get verification statistics',
      message: error.message
    });
  }
});

module.exports = router;
