const axios = require('axios');
const winston = require('winston');
const crypto = require('crypto');

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [new winston.transports.Console()]
});

/**
 * Enhanced Veriff SDK Service for KYC Verification
 * Provides comprehensive Veriff integration with NFT minting
 */
class VeriffSDKService {
    constructor() {
        this.apiKey = process.env.VERIFF_API_KEY;
        this.apiSecret = process.env.VERIFF_API_SECRET;
        this.baseUrl = process.env.VERIFF_ENDPOINT || 'https://api.veriff.com';
        this.webhookUrl = process.env.BASE_URL ? `${process.env.BASE_URL}/api/kyc/veriff-callback` : 'http://localhost:8000/api/kyc/veriff-callback';

        // Development mode - check KYC_DEVELOPMENT_MODE first, then NODE_ENV
        this.developmentMode = process.env.KYC_DEVELOPMENT_MODE === 'true' || process.env.NODE_ENV === 'development';

        // SDK configuration
        this.sdkConfig = {
            host: 'https://stationapi.veriff.com',
            apiKey: this.apiKey,
            parentId: 'veriff-root',
            onSession: this.handleSession.bind(this),
            onFinished: this.handleFinished.bind(this),
            onEvent: this.handleEvent.bind(this)
        };

        // Session tracking
        this.activeSessions = new Map();
        this.sessionCallbacks = new Map();

        logger.info('Veriff SDK Service initialized', {
            baseUrl: this.baseUrl,
            webhookUrl: this.webhookUrl,
            hasApiKey: !!this.apiKey,
            developmentMode: this.developmentMode
        });

        if (!this.developmentMode && (!this.apiKey || !this.apiSecret)) {
            logger.error('VERIFF_API_KEY and VERIFF_API_SECRET must be configured for production mode');
        }
    }

    /**
     * Create a new Veriff verification session
     * @param {Object} sessionData - Session configuration
     * @returns {Object} Session details for frontend SDK
     */
    async createVerificationSession(sessionData) {
        try {
            const {
                walletAddress,
                userData = {},
                verificationLevel = 'Full',
                documentType = 'PASSPORT',
                sessionId = this.generateSessionId()
            } = sessionData;

            logger.info(`Creating Veriff session for ${walletAddress}`, { sessionId });

            // Create Veriff session via API
            const veriffSession = await this.createVeriffAPISession({
                sessionId,
                walletAddress,
                userData,
                documentType
            });

            // Store session data
            const sessionInfo = {
                sessionId,
                walletAddress: walletAddress.toLowerCase(),
                veriffSessionId: veriffSession.id,
                veriffUrl: veriffSession.url,
                userData,
                verificationLevel,
                documentType,
                status: 'created',
                createdAt: new Date(),
                expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
            };

            this.activeSessions.set(sessionId, sessionInfo);

            logger.info(`Veriff session created successfully`, {
                sessionId,
                veriffSessionId: veriffSession.id
            });

            return {
                sessionId,
                veriffSessionId: veriffSession.id,
                verificationUrl: veriffSession.url,
                status: 'created',
                expiresAt: sessionInfo.expiresAt,
                sdkConfig: this.getSDKConfig(sessionId, veriffSession.url)
            };

        } catch (error) {
            logger.error('Failed to create Veriff session:', error);
            throw new Error(`Veriff session creation failed: ${error.message}`);
        }
    }

    /**
     * Create Veriff API session
     */
    async createVeriffAPISession({ sessionId, walletAddress, userData, documentType }) {
        // In development mode, return mock data instead of making API calls
        if (this.developmentMode) {
            logger.info('Development mode: Returning mock Veriff session data');

            // Use the provided Veriff URL if available, otherwise use mock URL
            const veriffUrl = process.env.VERIFF_SESSION_URL || `https://veriff.me/mock-verification?session=${sessionId}`;

            return {
                id: `mock_veriff_${Date.now()}`,
                url: veriffUrl
            };
        }

        const timestamp = Math.floor(Date.now() / 1000);
        const signature = this.generateSignature(timestamp);

        const requestBody = {
            verification: {
                callback: this.webhookUrl,
                person: {
                    firstName: userData.firstName || 'User',
                    lastName: userData.lastName || 'Unknown'
                },
                document: {
                    type: documentType
                },
                vendorData: sessionId,
                additionalData: {
                    sessionId,
                    walletAddress: walletAddress.toLowerCase(),
                    timestamp,
                    platform: 'AutoCrowd'
                }
            }
        };

        const response = await axios.post(
            `${this.baseUrl}/v2/sessions`,
            requestBody,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'X-AUTH-CLIENT': this.apiKey,
                    'X-SIGNATURE': signature
                },
                timeout: 30000
            }
        );

        if (!response.data.verification?.url) {
            throw new Error('Invalid Veriff API response: missing verification URL');
        }

        return {
            id: response.data.verification.sessionToken,
            url: response.data.verification.url
        };
    }

    /**
     * Get SDK configuration for frontend
     */
    getSDKConfig(sessionId, verificationUrl) {
        return {
            ...this.sdkConfig,
            sessionId,
            verificationUrl,
            person: {
                firstName: 'User',
                lastName: 'Unknown'
            }
        };
    }

    /**
     * Handle Veriff session creation callback
     */
    handleSession(err, response) {
        if (err) {
            logger.error('Veriff session creation failed:', err);
            return;
        }

        logger.info('Veriff session created via SDK:', response);

        if (response && response.sessionId) {
            const sessionInfo = this.activeSessions.get(response.sessionId);
            if (sessionInfo) {
                sessionInfo.veriffSessionId = response.sessionId;
                sessionInfo.status = 'active';
                this.activeSessions.set(response.sessionId, sessionInfo);
            }
        }
    }

    /**
     * Handle Veriff verification completion
     */
    handleFinished(err, response) {
        logger.info('Veriff verification finished:', { err, response });

        if (err) {
            logger.error('Verification finished with error:', err);
            this.handleVerificationError(err);
            return;
        }

        if (response && response.status) {
            this.handleVerificationResult(response);
        }
    }

    /**
     * Handle Veriff events
     */
    handleEvent(eventName, data) {
        logger.info('Veriff event:', { eventName, data });

        switch (eventName) {
            case 'started':
                logger.info('Verification started');
                break;
            case 'aborted':
                logger.warn('Verification aborted by user');
                break;
            case 'finished':
                logger.info('Verification flow finished');
                break;
            default:
                logger.debug(`Unhandled Veriff event: ${eventName}`);
        }
    }

    /**
     * Handle verification result
     */
    async handleVerificationResult(response) {
        try {
            const { sessionId, status, decision } = response;

            if (!sessionId) {
                logger.error('No session ID in verification result');
                return;
            }

            const sessionInfo = this.activeSessions.get(sessionId);
            if (!sessionInfo) {
                logger.warn(`Session ${sessionId} not found in active sessions`);
                return;
            }

            // Update session status
            sessionInfo.status = decision === 'approved' ? 'verified' : 'rejected';
            sessionInfo.completedAt = new Date();
            sessionInfo.verificationResult = response;

            this.activeSessions.set(sessionId, sessionInfo);

            // Process verification result
            if (decision === 'approved') {
                await this.processSuccessfulVerification(sessionInfo, response);
            } else {
                await this.processFailedVerification(sessionInfo, response);
            }

            // Notify callbacks
            const callback = this.sessionCallbacks.get(sessionId);
            if (callback) {
                callback(null, {
                    sessionId,
                    status: sessionInfo.status,
                    walletAddress: sessionInfo.walletAddress,
                    verificationResult: response
                });
            }

        } catch (error) {
            logger.error('Failed to handle verification result:', error);
        }
    }

    /**
     * Process successful verification
     */
    async processSuccessfulVerification(sessionInfo, verificationResult) {
        try {
            logger.info(`Processing successful verification for ${sessionInfo.walletAddress}`);

            // Update blockchain KYC status
            const blockchainService = require('./blockchainService');
            await blockchainService.setKYCStatus(sessionInfo.walletAddress, true);

            // Mint verification NFT
            const nftResult = await this.mintVerificationNFT(sessionInfo, verificationResult);

            // Update database
            const databaseService = require('./databaseService');
            await databaseService.updateCreatorVerification(sessionInfo.sessionId, {
                status: 'verified',
                verificationData: {
                    provider: 'veriff',
                    sessionId: sessionInfo.sessionId,
                    veriffSessionId: sessionInfo.veriffSessionId,
                    verificationResult,
                    nft: nftResult
                },
                completedAt: new Date()
            });

            logger.info(`Successfully processed verification for ${sessionInfo.walletAddress}`, {
                nftTokenId: nftResult?.tokenId
            });

        } catch (error) {
            logger.error('Failed to process successful verification:', error);
        }
    }

    /**
     * Process failed verification
     */
    async processFailedVerification(sessionInfo, verificationResult) {
        try {
            logger.info(`Processing failed verification for ${sessionInfo.walletAddress}`);

            // Update database
            const databaseService = require('./databaseService');
            await databaseService.updateCreatorVerification(sessionInfo.sessionId, {
                status: 'rejected',
                verificationData: {
                    provider: 'veriff',
                    sessionId: sessionInfo.sessionId,
                    veriffSessionId: sessionInfo.veriffSessionId,
                    verificationResult
                },
                completedAt: new Date()
            });

        } catch (error) {
            logger.error('Failed to process failed verification:', error);
        }
    }

    /**
     * Handle verification error
     */
    handleVerificationError(error) {
        logger.error('Verification error:', error);
        // Handle error cases - could retry or notify user
    }

    /**
     * Mint verification NFT
     */
    async mintVerificationNFT(sessionInfo, verificationResult) {
        try {
            const walletAddress = sessionInfo.walletAddress;
            const sessionId = sessionInfo.sessionId;

            logger.info(`Minting verification NFT for ${walletAddress}`);

            // Create enhanced NFT metadata
            const nftMetadata = {
                name: 'CampaignMaster KYC Verification',
                description: `KYC Verified Creator - Veriff Session ${sessionId.substr(0, 8)}...`,
                image: `https://api.dicebear.com/7.x/initials/svg?seed=${walletAddress.substr(2, 6)}&backgroundColor=4f46e5&textColor=ffffff`,
                attributes: [
                    {
                        trait_type: 'Verification Provider',
                        value: 'Veriff'
                    },
                    {
                        trait_type: 'Verification Level',
                        value: sessionInfo.verificationLevel
                    },
                    {
                        trait_type: 'Document Type',
                        value: sessionInfo.documentType
                    },
                    {
                        trait_type: 'Verified At',
                        value: Math.floor(Date.now() / 1000)
                    },
                    {
                        trait_type: 'Session ID',
                        value: sessionId
                    },
                    {
                        trait_type: 'Veriff Session ID',
                        value: sessionInfo.veriffSessionId
                    }
                ],
                properties: {
                    walletAddress,
                    verificationDate: new Date().toISOString(),
                    provider: 'veriff',
                    sessionId,
                    veriffSessionId: sessionInfo.veriffSessionId,
                    verificationLevel: sessionInfo.verificationLevel,
                    documentType: sessionInfo.documentType
                }
            };

            // Convert metadata to IPFS-compatible JSON
            const metadataURI = `data:application/json;base64,${Buffer.from(JSON.stringify(nftMetadata)).toString('base64')}`;

            // Mint NFT using blockchain service
            const blockchainService = require('./blockchainService');
            const mintResult = await blockchainService.mintVerificationNFT(
                walletAddress,
                'veriff',
                sessionInfo.verificationLevel,
                metadataURI
            );

            if (!mintResult || !mintResult.tokenId) {
                throw new Error('NFT minting failed - no tokenId returned');
            }

            logger.info(`NFT minted successfully: Token ID ${mintResult.tokenId}`);

            return {
                tokenId: mintResult.tokenId.toString(),
                transactionHash: mintResult.transactionHash,
                metadataURI,
                contractAddress: mintResult.contractAddress
            };

        } catch (error) {
            logger.error('Failed to mint verification NFT:', error);
            return null;
        }
    }

    /**
     * Get session status
     */
    getSessionStatus(sessionId) {
        const sessionInfo = this.activeSessions.get(sessionId);
        if (!sessionInfo) {
            return null;
        }

        return {
            sessionId,
            walletAddress: sessionInfo.walletAddress,
            status: sessionInfo.status,
            createdAt: sessionInfo.createdAt,
            expiresAt: sessionInfo.expiresAt,
            veriffSessionId: sessionInfo.veriffSessionId,
            verificationResult: sessionInfo.verificationResult
        };
    }

    /**
     * Set session callback
     */
    setSessionCallback(sessionId, callback) {
        this.sessionCallbacks.set(sessionId, callback);
    }

    /**
     * Clean up expired sessions
     */
    cleanupExpiredSessions() {
        const now = new Date();
        for (const [sessionId, sessionInfo] of this.activeSessions.entries()) {
            if (now > sessionInfo.expiresAt) {
                logger.info(`Cleaning up expired session: ${sessionId}`);
                this.activeSessions.delete(sessionId);
                this.sessionCallbacks.delete(sessionId);
            }
        }
    }

    /**
     * Generate signature for Veriff API
     */
    generateSignature(timestamp) {
        return crypto
            .createHmac('sha256', this.apiSecret)
            .update(`${this.apiKey}:${timestamp}`)
            .digest('hex');
    }

    /**
     * Generate unique session ID
     */
    generateSessionId() {
        return `veriff_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    }

    /**
     * Get SDK initialization script for frontend
     */
    getSDKScript() {
        return `
      // Load Veriff SDK with fallback URLs
      (function() {
        var cdnUrls = [
          'https://cdn.veriff.me/sdk/js/1.5/veriff.min.js',
          'https://cdn.veriff.me/sdk/js/1.6/veriff.min.js',
          'https://cdn.veriff.me/sdk/js/1.7/veriff.min.js',
          'https://cdn.veriff.me/sdk/js/1.8/veriff.min.js',
          'https://cdn.veriff.me/sdk/js/1.9/veriff.min.js',
          'https://cdn.veriff.me/sdk/js/2.0/veriff.min.js',
          'https://cdn.veriff.me/sdk/js/2.1/veriff.min.js'
        ];

        var loaded = false;

        function tryLoadScript(url, index) {
          if (loaded) return;

          var script = document.createElement('script');
          script.src = url;
          script.async = true;
          script.crossOrigin = 'anonymous';

          script.onload = function() {
            console.log('Veriff SDK loaded successfully from ' + url);
            loaded = true;
          };

          script.onerror = function() {
            console.warn('Failed to load Veriff SDK from ' + url);
            if (index < cdnUrls.length - 1) {
              tryLoadScript(cdnUrls[index + 1], index + 1);
            } else {
              console.error('Failed to load Veriff SDK from all URLs');
            }
          };

          document.head.appendChild(script);
        }

        tryLoadScript(cdnUrls[0], 0);
      })();
    `;
    }

    /**
     * Get service statistics
     */
    getStats() {
        const activeCount = this.activeSessions.size;
        const verifiedCount = Array.from(this.activeSessions.values())
            .filter(session => session.status === 'verified').length;
        const rejectedCount = Array.from(this.activeSessions.values())
            .filter(session => session.status === 'rejected').length;

        return {
            activeSessions: activeCount,
            verifiedSessions: verifiedCount,
            rejectedSessions: rejectedCount,
            totalSessions: activeCount + verifiedCount + rejectedCount
        };
    }
}

module.exports = new VeriffSDKService();
