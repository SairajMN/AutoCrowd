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
 * Ballerine SDK Service for KYC Verification
 * Provides comprehensive Ballerine integration with NFT minting
 */
class BallerineSDKService {
    constructor() {
        this.apiKey = process.env.BALLERINE_API_KEY;
        this.baseUrl = process.env.BALLERINE_ENDPOINT || 'https://api.ballerine.io';
        this.webhookUrl = process.env.BASE_URL ? `${process.env.BASE_URL}/api/kyc/ballerine-callback` : 'http://localhost:8000/api/kyc/ballerine-callback';

        // Development mode - enable if no API key or explicitly set
        this.developmentMode = process.env.KYC_DEVELOPMENT_MODE === 'true' ||
            process.env.NODE_ENV === 'development' ||
            !this.apiKey ||
            this.apiKey === 'demo_key';

        // SDK configuration
        this.sdkConfig = {
            endpoint: this.baseUrl,
            apiKey: this.apiKey || 'demo_key',
            webhookUrl: this.webhookUrl,
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
            }
        };

        // Session tracking
        this.activeSessions = new Map();
        this.sessionCallbacks = new Map();

        logger.info('Ballerine SDK Service initialized', {
            baseUrl: this.baseUrl,
            webhookUrl: this.webhookUrl,
            hasApiKey: !!this.apiKey,
            developmentMode: this.developmentMode
        });
    }

    /**
     * Create a new Ballerine verification session
     * @param {Object} sessionData - Session configuration
     * @returns {Object} Session details for frontend SDK
     */
    async createVerificationSession(sessionData) {
        try {
            const {
                walletAddress,
                userData = {},
                verificationLevel = 'basic',
                sessionId = this.generateSessionId()
            } = sessionData;

            logger.info(`Creating Ballerine session for ${walletAddress}`, { sessionId });

            // Create Ballerine session via API
            const ballerineSession = await this.createBallerineAPISession({
                sessionId,
                walletAddress,
                userData,
                verificationLevel
            });

            // Store session data
            const sessionInfo = {
                sessionId,
                walletAddress: walletAddress.toLowerCase(),
                ballerineSessionId: ballerineSession.id,
                ballerineUrl: ballerineSession.url,
                userData,
                verificationLevel,
                status: 'created',
                createdAt: new Date(),
                expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
            };

            this.activeSessions.set(sessionId, sessionInfo);

            logger.info(`Ballerine session created successfully`, {
                sessionId,
                ballerineSessionId: ballerineSession.id
            });

            return {
                sessionId,
                ballerineSessionId: ballerineSession.id,
                verificationUrl: ballerineSession.url,
                status: 'created',
                expiresAt: sessionInfo.expiresAt,
                sdkConfig: this.getSDKConfig(sessionId, ballerineSession.url)
            };

        } catch (error) {
            logger.error('Failed to create Ballerine session:', error);
            throw new Error(`Ballerine session creation failed: ${error.message}`);
        }
    }

    /**
     * Create Ballerine API session
     */
    async createBallerineAPISession({ sessionId, walletAddress, userData, verificationLevel }) {
        // In development mode, return mock data instead of making API calls
        if (this.developmentMode) {
            logger.info('Development mode: Returning mock Ballerine session data');

            // Use the provided Ballerine URL if available, otherwise use mock URL
            const ballerineUrl = process.env.BALLERINE_SESSION_URL || `https://app.ballerine.io/mock-verification?session=${sessionId}`;

            return {
                id: `mock_ballerine_${Date.now()}`,
                url: ballerineUrl
            };
        }

        const requestBody = {
            flow: {
                name: 'kyc-flow',
                version: '1'
            },
            customer: {
                id: walletAddress.toLowerCase(),
                email: userData.email,
                metadata: {
                    walletAddress: walletAddress.toLowerCase(),
                    sessionId,
                    verificationLevel,
                    platform: 'AutoCrowd'
                }
            },
            callbackUrl: this.webhookUrl,
            elements: this.sdkConfig.elements
        };

        const response = await axios.post(
            `${this.baseUrl}/v1/sessions`,
            requestBody,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                timeout: 30000
            }
        );

        if (!response.data?.session?.url) {
            throw new Error('Invalid Ballerine API response: missing session URL');
        }

        return {
            id: response.data.session.id,
            url: response.data.session.url
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
            customer: {
                id: 'user-id',
                email: 'user@example.com'
            }
        };
    }

    /**
     * Handle Ballerine verification completion
     */
    async handleVerificationResult(sessionId, result) {
        try {
            logger.info(`Processing Ballerine verification result for session ${sessionId}`, result);

            const sessionInfo = this.activeSessions.get(sessionId);
            if (!sessionInfo) {
                logger.warn(`Session ${sessionId} not found in active sessions`);
                return;
            }

            // Update session status based on Ballerine result
            let status = 'rejected'; // Default to rejected
            if (result.status === 'approved' || result.status === 'completed') {
                status = 'verified';
            } else if (result.status === 'pending' || result.status === 'in_progress') {
                status = 'pending';
            }

            sessionInfo.status = status;
            sessionInfo.completedAt = new Date();
            sessionInfo.verificationResult = result;

            this.activeSessions.set(sessionId, sessionInfo);

            // Process verification result
            if (status === 'verified') {
                await this.processSuccessfulVerification(sessionInfo, result);
            } else {
                await this.processFailedVerification(sessionInfo, result);
            }

            // Notify callbacks
            const callback = this.sessionCallbacks.get(sessionId);
            if (callback) {
                callback(null, {
                    sessionId,
                    status: sessionInfo.status,
                    walletAddress: sessionInfo.walletAddress,
                    verificationResult: result
                });
            }

        } catch (error) {
            logger.error('Failed to handle Ballerine verification result:', error);
        }
    }

    /**
     * Process successful verification
     */
    async processSuccessfulVerification(sessionInfo, verificationResult) {
        try {
            logger.info(`Processing successful Ballerine verification for ${sessionInfo.walletAddress}`);

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
                    provider: 'ballerine',
                    sessionId: sessionInfo.sessionId,
                    ballerineSessionId: sessionInfo.ballerineSessionId,
                    verificationResult,
                    nft: nftResult
                },
                completedAt: new Date()
            });

            logger.info(`Successfully processed Ballerine verification for ${sessionInfo.walletAddress}`, {
                nftTokenId: nftResult?.tokenId
            });

        } catch (error) {
            logger.error('Failed to process successful Ballerine verification:', error);
        }
    }

    /**
     * Process failed verification
     */
    async processFailedVerification(sessionInfo, verificationResult) {
        try {
            logger.info(`Processing failed Ballerine verification for ${sessionInfo.walletAddress}`);

            // Update database
            const databaseService = require('./databaseService');
            await databaseService.updateCreatorVerification(sessionInfo.sessionId, {
                status: 'rejected',
                verificationData: {
                    provider: 'ballerine',
                    sessionId: sessionInfo.sessionId,
                    ballerineSessionId: sessionInfo.ballerineSessionId,
                    verificationResult
                },
                completedAt: new Date()
            });

        } catch (error) {
            logger.error('Failed to process failed Ballerine verification:', error);
        }
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
                description: `KYC Verified Creator - Ballerine Session ${sessionId.substr(0, 8)}...`,
                image: `https://api.dicebear.com/7.x/initials/svg?seed=${walletAddress.substr(2, 6)}&backgroundColor=4f46e5&textColor=ffffff`,
                attributes: [
                    {
                        trait_type: 'Verification Provider',
                        value: 'Ballerine'
                    },
                    {
                        trait_type: 'Verification Level',
                        value: sessionInfo.verificationLevel
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
                        trait_type: 'Ballerine Session ID',
                        value: sessionInfo.ballerineSessionId
                    }
                ],
                properties: {
                    walletAddress,
                    verificationDate: new Date().toISOString(),
                    provider: 'ballerine',
                    sessionId,
                    ballerineSessionId: sessionInfo.ballerineSessionId,
                    verificationLevel: sessionInfo.verificationLevel
                }
            };

            // Convert metadata to IPFS-compatible JSON
            const metadataURI = `data:application/json;base64,${Buffer.from(JSON.stringify(nftMetadata)).toString('base64')}`;

            // Mint NFT using blockchain service
            const blockchainService = require('./blockchainService');
            const mintResult = await blockchainService.mintVerificationNFT(
                walletAddress,
                'ballerine',
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
            ballerineSessionId: sessionInfo.ballerineSessionId,
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
                logger.info(`Cleaning up expired Ballerine session: ${sessionId}`);
                this.activeSessions.delete(sessionId);
                this.sessionCallbacks.delete(sessionId);
            }
        }
    }

    /**
     * Generate unique session ID
     */
    generateSessionId() {
        return `ballerine_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    }

    /**
     * Get SDK initialization script for frontend
     */
    getSDKScript() {
        return `
        // Ballerine SDK initialization
        import { BallerineSDK } from '@ballerine/web-sdk';

        export const initializeBallerineSDK = (config) => {
            return new BallerineSDK({
                endpoint: config.endpoint,
                apiKey: config.apiKey,
                flowName: config.flowName || 'kyc-flow',
                elements: config.elements
            });
        };
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

module.exports = new BallerineSDKService();
