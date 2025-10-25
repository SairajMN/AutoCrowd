const axios = require('axios');
const winston = require('winston');
const crypto = require('crypto');
const databaseService = require('./databaseService');
const ballerineSDKService = require('./ballerineSDKService');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

/**
 * KYC Verification Service for campaign creators using Ballerine only
 * Integrates with Ballerine for comprehensive identity verification
 */
class KYCVerificationService {
  constructor() {
    // Only Ballerine for real KYC verification
    this.ballerineApiKey = process.env.BALLERINE_API_KEY;
    this.ballerineEndpoint = process.env.BALLERINE_ENDPOINT || 'https://api.ballerine.io';

    // Verification storage (in production, use database)
    this.verificationStore = new Map();

    // Verification timeouts
    this.verificationTimeout = parseInt(process.env.KYC_TIMEOUT) || 300000; // 5 minutes
    this.maxRetries = parseInt(process.env.KYC_MAX_RETRIES) || 3;

    logger.info('KYC Verification Service initialized with Ballerine only', {
      ballerineConfigured: !!this.ballerineApiKey,
      endpoint: this.ballerineEndpoint
    });

    if (!this.ballerineApiKey) {
      logger.warn('BALLERINE_API_KEY not configured - will use mock verification');
      this.developmentMode = true; // Force development mode if no API key
    }

    // Development mode flag for when Veriff is not accessible
    this.developmentMode = process.env.KYC_DEVELOPMENT_MODE === 'true' || process.env.NODE_ENV === 'development';

    // Auto-complete verifications in development mode after a delay
    if (this.developmentMode) {
      this.setupDevelopmentMode();
    }
  }

  /**
   * Setup development mode functionality
   */
  setupDevelopmentMode() {
    logger.info('Setting up development mode for KYC verification');

    // Auto-complete verifications after 10 seconds in development mode
    this.developmentTimer = setInterval(async () => {
      try {
        await this.autoCompletePendingVerifications();
      } catch (error) {
        logger.error('Error in development mode auto-completion:', error);
      }
    }, 10000); // Check every 10 seconds

    logger.info('Development mode setup complete - verifications will auto-complete after 10 seconds');
  }

  /**
   * Auto-complete pending verifications in development mode
   */
  async autoCompletePendingVerifications() {
    try {
      // Get all pending verifications
      const pendingVerifications = await databaseService.getPendingVerifications();

      for (const verification of pendingVerifications) {
        // Check if it's been more than 10 seconds since creation
        const createdAt = new Date(verification.created_at);
        const now = new Date();
        const timeDiff = now - createdAt;

        if (timeDiff > 10000) { // 10 seconds
          logger.info(`Auto-completing verification ${verification.session_id} in development mode`);

          // Simulate successful verification
          const mockCallbackData = {
            verification: {
              sessionToken: verification.verification_data?.ballerineSessionId || 'mock_session',
              status: 'completed',
              decision: 'approved',
              person: {
                firstName: verification.user_data?.firstName || 'Test',
                lastName: verification.user_data?.lastName || 'User'
              },
              document: {
                type: 'PASSPORT',
                number: 'MOCK123456'
              }
            },
            vendorData: verification.session_id
          };

          // Process the mock callback
          await this.handleVerificationCallback(mockCallbackData, 'mock_signature', Math.floor(Date.now() / 1000).toString());

          logger.info(`Successfully auto-completed verification ${verification.session_id}`);
        }
      }
    } catch (error) {
      logger.error('Failed to auto-complete pending verifications:', error);
    }
  }

  /**
   * Start KYC verification session for a user using Ballerine SDK
   * @param {string} walletAddress - User's wallet address
   * @param {Object} userData - User information
   * @returns {Object} Verification session details
   */
  async startVerification(walletAddress, userData = {}) {
    logger.info(`Starting Ballerine SDK KYC verification for ${walletAddress}`);

    try {
      // Use Ballerine SDK service to create session
      const ballerineSession = await ballerineSDKService.createVerificationSession({
        walletAddress,
        userData,
        verificationLevel: 'basic'
      });

      // Create session data for database
      const sessionData = {
        sessionId: ballerineSession.sessionId,
        walletAddress: walletAddress.toLowerCase(),
        verificationType: 'kyc_ballerine_sdk',
        status: 'pending',
        provider: 'ballerine',
        userData,
        expiresAt: ballerineSession.expiresAt,
        verificationData: {
          provider: 'ballerine',
          sessionId: ballerineSession.sessionId,
          ballerineSessionId: ballerineSession.ballerineSessionId,
          walletAddress: walletAddress.toLowerCase(),
          startedAt: new Date().toISOString(),
          sdkConfig: ballerineSession.sdkConfig
        }
      };

      // Store session in database
      await databaseService.createCreatorVerification(sessionData);

      // Log attempt
      await databaseService.logVerificationAttempt({
        sessionId: ballerineSession.sessionId,
        attemptType: 'start_ballerine_sdk_verification',
        provider: 'ballerine',
        status: 'success'
      });

      logger.info(`Ballerine SDK KYC session ${ballerineSession.sessionId} started for ${walletAddress}`);

      return {
        sessionId: ballerineSession.sessionId,
        ballerineSessionId: ballerineSession.ballerineSessionId,
        verificationUrl: ballerineSession.verificationUrl,
        status: 'pending',
        expiresAt: ballerineSession.expiresAt,
        provider: 'ballerine',
        sdkConfig: ballerineSession.sdkConfig,
        message: 'Complete Ballerine identity verification using the SDK to unlock campaign creation.'
      };

    } catch (error) {
      logger.error(`Failed to start Ballerine SDK KYC verification for ${walletAddress}:`, error);

      // Log failed attempt
      try {
        await databaseService.logVerificationAttempt({
          sessionId: this.generateSessionId(),
          attemptType: 'start_ballerine_sdk_verification',
          provider: 'ballerine',
          status: 'failed',
          errorMessage: error.message
        });
      } catch (logError) {
        logger.error('Failed to log verification attempt:', logError);
      }

      throw new Error(`Ballerine SDK KYC verification initialization failed: ${error.message}`);
    }
  }







  /**
   * Check verification status
   * @param {string} sessionId - Verification session ID
   * @returns {Object} Verification status
   */
  async checkVerificationStatus(sessionId) {
    try {
      const session = await databaseService.getCreatorVerification(sessionId);

      if (!session) {
        throw new Error('Verification session not found');
      }

      // Check if session expired
      if (new Date() > new Date(session.expires_at)) {
        await databaseService.updateCreatorVerification(sessionId, { status: 'expired' });
        throw new Error('Verification session expired');
      }

      const status = session.status;
      let statusMessage = '';

      if (status === 'pending') {
        statusMessage = 'Waiting for Ballerine identity verification to complete';
      } else if (status === 'verified') {
        statusMessage = 'Verification completed successfully';
      } else if (status === 'rejected') {
        statusMessage = 'Verification was rejected';
      } else {
        statusMessage = 'Verification in progress';
      }

      return {
        sessionId: session.session_id,
        status: status,
        walletAddress: session.wallet_address,
        createdAt: session.created_at,
        expiresAt: session.expires_at,
        verificationData: session.verification_data,
        message: statusMessage,
        provider: 'ballerine'
      };
    } catch (error) {
      logger.error('Failed to check verification status:', error);
      throw error;
    }
  }

  /**
   * Handle Ballerine verification callback (webhook from Ballerine)
   * @param {Object} callbackData - Callback data from Ballerine
   * @param {string} signature - Webhook signature from Ballerine
   * @param {string} timestamp - Webhook timestamp from Ballerine
   */
  async handleVerificationCallback(callbackData, signature, timestamp) {
    const startTime = Date.now();
    let sessionId = 'unknown';

    try {
      // Extract session ID for logging
      sessionId = callbackData?.sessionId || callbackData?.id || 'unknown';

      logger.info('Received Ballerine webhook callback', {
        hasSignature: !!signature,
        hasTimestamp: !!timestamp,
        sessionId,
        eventType: callbackData?.status || 'unknown'
      });

      // Process Ballerine callback
      await ballerineSDKService.handleVerificationResult(sessionId, callbackData);

      const processingTime = Date.now() - startTime;
      logger.info(`Ballerine webhook processed successfully`, {
        sessionId,
        processingTime: `${processingTime}ms`,
        status: callbackData?.status || 'unknown'
      });

      return {
        success: true,
        sessionId,
        status: callbackData?.status || 'unknown',
        processingTime: `${processingTime}ms`
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Ballerine callback processing failed:', {
        error: error.message,
        sessionId,
        processingTime: `${processingTime}ms`,
        stack: error.stack
      });

      // Log failed callback
      try {
        await databaseService.logVerificationAttempt({
          sessionId,
          attemptType: 'webhook_callback_failed',
          provider: 'ballerine',
          status: 'failed',
          errorMessage: error.message,
          metadata: {
            callbackData,
            signature: signature?.substring(0, 10) + '...',
            timestamp,
            processingTime: `${processingTime}ms`
          }
        });
      } catch (logError) {
        logger.error('Failed to log callback error:', logError);
      }

      // Don't throw error to prevent webhook retries
      return {
        success: false,
        error: error.message,
        sessionId,
        processingTime: `${processingTime}ms`
      };
    }
  }



  /**
   * Update KYC status on blockchain
   */
  async updateBlockchainKYCStatus(walletAddress, isVerified) {
    try {
      const blockchainService = require('./blockchainService');
      const result = await blockchainService.setKYCStatus(walletAddress, isVerified);

      logger.info(`Blockchain KYC status updated for ${walletAddress}: ${isVerified}`, {
        transactionHash: result.transactionHash,
        blockNumber: result.blockNumber
      });

      return result;
    } catch (error) {
      logger.error(`Failed to update blockchain KYC status for ${walletAddress}:`, error);
      // Don't throw - blockchain update failure shouldn't break the verification flow
      // The user can still be verified in the database, just not on-chain
    }
  }





  /**
   * Get verification status for wallet address
   * @param {string} walletAddress - Wallet address to check
   * @returns {Object} Verification status
   */
  async getVerificationStatus(walletAddress) {
    try {
      const normalizedAddress = walletAddress.toLowerCase();

      // Get the most recent verification for this address from database
      const latestVerification = await databaseService.getCreatorVerificationByWallet(normalizedAddress);

      if (!latestVerification) {
        return {
          walletAddress: normalizedAddress,
          status: 'unverified',
          message: 'No verification found'
        };
      }

      // Check if verification is still valid (not expired and successful)
      const isExpired = new Date() > new Date(latestVerification.expires_at);
      const isValid = latestVerification.status === 'verified' && !isExpired;

      return {
        walletAddress: normalizedAddress,
        status: isValid ? 'verified' : (isExpired ? 'expired' : latestVerification.status),
        sessionId: latestVerification.session_id,
        verifiedAt: latestVerification.completed_at,
        expiresAt: latestVerification.expires_at,
        provider: latestVerification.provider,
        isValid,
        riskScore: latestVerification.risk_score
      };
    } catch (error) {
      logger.error('Failed to get verification status:', error);
      return {
        walletAddress: walletAddress.toLowerCase(),
        status: 'error',
        message: 'Failed to retrieve verification status',
        error: error.message
      };
    }
  }



  /**
   * Generate unique session ID
   */
  generateSessionId() {
    return `kyc_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Clean up expired sessions (should be called periodically)
   */
  async cleanupExpiredSessions() {
    try {
      await databaseService.cleanupExpiredSessions();
    } catch (error) {
      logger.error('Failed to cleanup expired sessions:', error);
    }
  }

  /**
   * Mint verification NFT for successful KYC verification
   */
  async mintVerificationNFT(session) {
    try {
      const walletAddress = session.wallet_address;
      const sessionId = session.session_id;

      logger.info(`Minting verification NFT for ${walletAddress}, session: ${sessionId}`);

      // Create NFT metadata
      const nftMetadata = {
        name: 'CampaignMaster Verification NFT',
        description: `KYC Verified Creator - Session ${sessionId.substr(0, 8)}...`,
        image: `https://api.dicebear.com/7.x/initials/svg?seed=${walletAddress.substr(2, 6)}`,
        attributes: [
          {
            trait_type: 'Verification Provider',
            value: 'Ballerine'
          },
          {
            trait_type: 'VerificationLevel',
            value: 'Full'
          },
          {
            trait_type: 'Verified At',
            value: Math.floor(Date.now() / 1000)
          },
          {
            trait_type: 'Session ID',
            value: sessionId
          }
        ],
        properties: {
          walletAddress,
          verificationDate: new Date().toISOString(),
          provider: 'ballerine',
          sessionId
        }
      };

      // Convert metadata to IPFS-compatible JSON (for production, you'd upload to IPFS)
      const metadataURI = `data:application/json;base64,${Buffer.from(JSON.stringify(nftMetadata)).toString('base64')}`;

      // Mint NFT using blockchain service
      const blockchainService = require('./blockchainService');
      const mintResult = await blockchainService.mintVerificationNFT(walletAddress, 'ballerine', 'Full', metadataURI);

      if (!mintResult || !mintResult.tokenId) {
        throw new Error('NFT minting failed - no tokenId returned');
      }

      const tokenId = mintResult.tokenId;
      const transactionHash = mintResult.transactionHash;

      logger.info(`NFT minted successfully: Token ID ${tokenId}, TX: ${transactionHash}`);

      // Store NFT details in database
      const nftData = {
        tokenId: tokenId.toString(),
        transactionHash,
        metadataURI,
        mintedAt: new Date(),
        contractAddress: process.env.NFT_CONTRACT_ADDRESS || '0x4C887cd7dcFe9725D816efab0F5061317E590B57',
        verificationLevel: 'Full',
        provider: 'ballerine'
      };

      // Update session with NFT data
      await databaseService.updateCreatorVerification(sessionId, {
        verificationData: {
          ...session.verification_data,
          nft: nftData
        }
      });

      // Log NFT minting
      await databaseService.logVerificationAttempt({
        sessionId,
        attemptType: 'nft_minted',
        provider: 'ballerine',
        status: 'success',
        metadata: {
          tokenId: tokenId.toString(),
          transactionHash,
          walletAddress,
          nftData
        }
      });

      logger.info(`Verification NFT created and stored for ${walletAddress}: Token ${tokenId}`);

      return {
        tokenId: tokenId.toString(),
        transactionHash,
        metadataURI,
        contractAddress: nftData.contractAddress
      };

    } catch (error) {
      logger.error('Failed to mint verification NFT:', error);

      // Log NFT minting failure (don't throw - verification should still succeed)
      try {
        await databaseService.logVerificationAttempt({
          sessionId: session.session_id,
          attemptType: 'nft_minting_failed',
          provider: 'ballerine',
          status: 'failed',
          errorMessage: error.message,
          metadata: { walletAddress: session.wallet_address }
        });
      } catch (logError) {
        logger.error('Failed to log NFT minting error:', logError);
      }

      // Don't throw - NFT minting failure shouldn't break verification
      return null;
    }
  }

  /**
   * Get verification statistics
   */
  async getVerificationStats() {
    try {
      return await databaseService.getVerificationStats();
    } catch (error) {
      logger.error('Failed to get verification stats:', error);
      return {
        error: 'Failed to retrieve statistics',
        message: error.message
      };
    }
  }

  /**
   * Reset all KYC verification data (for development/testing)
   * This will clear all verification sessions, attempts, and cache
   */
  async resetAllVerifications() {
    try {
      logger.info('Resetting all KYC verification data');

      // Clear in-memory verification store
      this.verificationStore.clear();

      // Reset all database verification data
      const result = await databaseService.resetAllVerifications();

      logger.info('All KYC verification data has been reset', result);

      return {
        message: 'All verification data reset successfully',
        clearedSessions: result.clearedSessions || 0,
        clearedAttempts: result.clearedAttempts || 0,
        clearedAiVerifications: result.clearedAiVerifications || 0
      };
    } catch (error) {
      logger.error('Failed to reset all verifications:', error);
      throw new Error(`Failed to reset all verifications: ${error.message}`);
    }
  }

  /**
   * Reset KYC verification data for a specific wallet address
   */
  async resetWalletVerification(walletAddress) {
    try {
      const normalizedAddress = walletAddress.toLowerCase();
      logger.info(`Resetting KYC verification data for wallet ${normalizedAddress}`);

      // Clear from in-memory store
      for (const [key, value] of this.verificationStore.entries()) {
        if (value.walletAddress === normalizedAddress) {
          this.verificationStore.delete(key);
        }
      }

      // Reset database verification data for this wallet
      const result = await databaseService.resetWalletVerification(normalizedAddress);

      logger.info(`KYC verification data reset for wallet ${normalizedAddress}`, result);

      return {
        message: `Verification data reset for wallet ${normalizedAddress}`,
        walletAddress: normalizedAddress,
        clearedSessions: result.clearedSessions || 0,
        clearedAttempts: result.clearedAttempts || 0
      };
    } catch (error) {
      logger.error(`Failed to reset verification for wallet ${walletAddress}:`, error);
      throw new Error(`Failed to reset verification for wallet ${walletAddress}: ${error.message}`);
    }
  }


}

module.exports = new KYCVerificationService();
