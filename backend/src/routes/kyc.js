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
 * GET /api/kyc/status/:walletAddress
 * Get NFT verification status for wallet address
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

    logger.info(`Checking NFT verification status for ${walletAddress}`);

    // Check if user has completed verification (NFT minted)
    const databaseService = require('../services/databaseService');
    const { data: verification, error } = await databaseService.supabase
      .from('creator_verifications')
      .select('*')
      .eq('wallet_address', walletAddress.toLowerCase())
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error(`Database error checking KYC for ${walletAddress}:`, error);
      // Fallback: assume unverified if database fails
      return res.json({
        success: true,
        data: {
          isValid: false,
          walletAddress,
          verificationType: null,
          provider: null,
          completedAt: null,
          verificationData: null,
          databaseError: error.message
        }
      });
    }

    const isValid = verification !== null;

    res.json({
      success: true,
      data: {
        isValid,
        walletAddress,
        verificationType: verification?.verification_type || null,
        provider: verification?.provider || null,
        completedAt: verification?.completed_at || null,
        verificationData: verification?.verification_data || null
      }
    });

  } catch (error) {
    logger.error('NFT verification status check failed:', error);
    res.status(500).json({
      error: 'Verification status check failed',
      message: error.message
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

/**
 * POST /api/kyc/submit-form
 * Submit custom KYC form data
 */
router.post('/submit-form', async (req, res) => {
    try {
        const {
            walletAddress,
            firstName,
            lastName,
            email,
            phone,
            country,
            dateOfBirth
        } = req.body;

        // Validate required fields
        if (!walletAddress || !firstName || !lastName || !email || !country || !dateOfBirth) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'walletAddress, firstName, lastName, email, country, and dateOfBirth are required'
            });
        }

        // Validate wallet address format
        if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
            return res.status(400).json({
                error: 'Invalid wallet address format'
            });
        }

        logger.info(`Submitting custom KYC form for ${walletAddress}`);

        const databaseService = require('../services/databaseService');

        // Store the verification data in database
        const { data: verification, error: insertError } = await databaseService.supabase
            .from('creator_verifications')
            .insert({
                wallet_address: walletAddress.toLowerCase(),
                status: 'completed',
                verification_type: 'custom_form',
                provider: 'custom_form',
                verification_data: {
                    firstName,
                    lastName,
                    email,
                    phone,
                    country,
                    dateOfBirth
                },
                completed_at: new Date().toISOString(),
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (insertError) {
            logger.error('Failed to store verification data:', insertError);
            return res.status(500).json({
                error: 'Failed to store verification data',
                message: insertError.message
            });
        }

        logger.info(`Custom KYC form submitted successfully for ${walletAddress}`);

        res.json({
            success: true,
            message: 'KYC form submitted successfully',
            data: {
                id: verification.id,
                walletAddress,
                status: 'completed',
                provider: 'custom_form',
                submittedAt: verification.created_at
            }
        });

    } catch (error) {
        logger.error('Failed to submit KYC form:', error);
        res.status(500).json({
            error: 'Failed to submit KYC form',
            message: error.message
        });
    }
});

/**
 * POST /api/kyc/verify-and-mint
 * Mint NFT and update KYC status on blockchain for verified user
 */
router.post('/verify-and-mint', async (req, res) => {
    try {
        const { walletAddress, kycProvider, verificationLevel, metadataURI, userData } = req.body;

        // Validate required fields
        if (!walletAddress || !kycProvider || !verificationLevel) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'walletAddress, kycProvider, and verificationLevel are required'
            });
        }

        // Validate wallet address format
        if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
            return res.status(400).json({
                error: 'Invalid wallet address format'
            });
        }

        logger.info(`Processing NFT mint and KYC update for ${walletAddress} with provider ${kycProvider}`);

        const blockchainService = require('../services/blockchainService');

        // Check if user already has NFT
        const hasExistingNFT = await blockchainService.hasVerificationNFT(walletAddress);

        if (hasExistingNFT) {
            logger.info(`User ${walletAddress} already has NFT, updating KYC status only`);

            // Just update KYC status since NFT already exists
            const kycResult = await blockchainService.setKYCStatus(walletAddress, true);

            return res.json({
                success: true,
                message: 'KYC status updated successfully',
                transactionHash: kycResult.transactionHash,
                tokenId: null,
                kycStatusUpdated: true,
                alreadyExists: true,
                walletAddress,
                kycProvider,
                verificationLevel,
                metadataURI
            });
        }

        // Generate metadata URI if not provided and we have user data
        let finalMetadataURI = metadataURI;
        if (!finalMetadataURI && userData) {
            finalMetadataURI = `data:application/json;base64,${Buffer.from(JSON.stringify({
                name: "AutoCrowd Creator Verification",
                description: "Verified creator badge for AutoCrowd platform",
                external_url: "https://autocrowd.app",
                attributes: [
                    {
                        trait_type: "Verification Provider",
                        value: kycProvider
                    },
                    {
                        trait_type: "Verification Level",
                        value: verificationLevel
                    },
                    {
                        trait_type: "Verified Name",
                        value: `${userData.firstName} ${userData.lastName}`
                    },
                    {
                        trait_type: "Country",
                        value: userData.country
                    }
                ]
            })).toString('base64')}`;
        }

        // Mint new NFT and update KYC status
        logger.info(`Minting new NFT for ${walletAddress}`);
        const mintResult = await blockchainService.mintVerificationNFT(
            walletAddress,
            kycProvider,
            verificationLevel,
            finalMetadataURI
        );

        logger.info(`NFT minted successfully for ${walletAddress}, updating KYC status`);
        const kycResult = await blockchainService.setKYCStatus(walletAddress, true);

        logger.info(`KYC status updated successfully for ${walletAddress}`);

        res.json({
            success: true,
            message: 'NFT minted and KYC status updated successfully',
            transactionHash: mintResult.transactionHash,
            tokenId: mintResult.tokenId,
            kycStatusUpdated: true,
            walletAddress,
            kycProvider,
            verificationLevel,
            metadataURI: finalMetadataURI,
            mintResult,
            kycResult: {
                transactionHash: kycResult.transactionHash,
                blockNumber: kycResult.blockNumber,
                gasUsed: kycResult.gasUsed
            }
        });

    } catch (error) {
        logger.error('Failed to mint NFT and update KYC status:', error);
        res.status(500).json({
            error: 'Failed to mint NFT and update KYC status',
            message: error.message
        });
    }
});



/**
 * POST /api/kyc/test-set-kyc-status
 * Manually set KYC status for testing/development (DO NOT USE IN PRODUCTION)
 */
router.post('/test-set-kyc-status', async (req, res) => {
  try {
    const { walletAddress, isVerified = true } = req.body;

    // Validate required fields
    if (!walletAddress) {
      return res.status(400).json({
        error: 'walletAddress is required'
      });
    }

    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({
        error: 'Invalid wallet address format'
      });
    }

    logger.warn(`TEST ENDPOINT: Manually setting KYC status for ${walletAddress} to ${isVerified}`);

    const blockchainService = require('../services/blockchainService');

    // Set KYC status on-chain
    const result = await blockchainService.setKYCStatus(walletAddress, isVerified);

    // Also update database for consistency
    const databaseService = require('../services/databaseService');
    try {
      await databaseService.supabase
        .from('creator_verifications')
        .upsert({
          session_id: `manual_kyc_${walletAddress.toLowerCase()}_${Date.now()}`,
          wallet_address: walletAddress.toLowerCase(),
          status: isVerified ? 'completed' : 'unverified',
          verification_type: 'manual_test',
          provider: 'test_oracle',
          verification_data: {
            manuallySet: true,
            setAt: new Date().toISOString(),
            blockchainTx: result.transactionHash
          },
          completed_at: isVerified ? new Date().toISOString() : null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
    } catch (dbError) {
      logger.warn('Database update failed, but blockchain update succeeded:', dbError.message);
    }

    res.json({
      success: true,
      message: `KYC status manually set to ${isVerified} for ${walletAddress}`,
      data: {
        walletAddress,
        isVerified,
        transactionHash: result.transactionHash,
        testEndpoint: true,
        warning: 'This is a test endpoint and should not be used in production'
      }
    });

  } catch (error) {
    logger.error('Failed to manually set KYC status:', error);
    res.status(500).json({
      error: 'Failed to set KYC status',
      message: error.message
    });
  }
});

module.exports = router;
