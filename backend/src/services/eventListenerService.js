const winston = require('winston');
const blockchainService = require('./blockchainService');
const aiVerificationService = require('./aiVerificationService');

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [new winston.transports.Console()]
});

class EventListenerService {
    constructor() {
        this.isRunning = false;
        this.eventQueue = [];
        this.processingInterval = null;
        this.lastProcessedBlock = null;
    }

    async start() {
        try {
            logger.info('Starting Event Listener Service...');

            this.isRunning = true;

            // Try to get current block number, but don't fail if RPC doesn't support it
            try {
                this.lastProcessedBlock = await blockchainService.getBlockNumber();
            } catch (error) {
                logger.warn('Could not get current block number, using Blockscout API for event polling');
                this.lastProcessedBlock = 0;
            }

            // Start processing events every 60 seconds to respect Alchemy free tier limits
            this.processingInterval = setInterval(async () => {
                await this.processEvents();
            }, 60000);

            // Listen for real-time events (only if supported by RPC)
            try {
                await blockchainService.listenForEvents();
            } catch (error) {
                logger.warn('Real-time event listening not supported by current RPC, using polling mode');
            }

            logger.info('Event Listener Service started successfully');
        } catch (error) {
            logger.error('Failed to start Event Listener Service:', error);
            throw error;
        }
    }

    async stop() {
        try {
            logger.info('Stopping Event Listener Service...');

            this.isRunning = false;

            if (this.processingInterval) {
                clearInterval(this.processingInterval);
                this.processingInterval = null;
            }

            await blockchainService.stopListeningForEvents();

            logger.info('Event Listener Service stopped');
        } catch (error) {
            logger.error('Error stopping Event Listener Service:', error);
        }
    }

    async processEvents() {
        if (!this.isRunning) {
            return;
        }

        try {
            const currentBlock = await blockchainService.getBlockNumber();

            if (this.lastProcessedBlock >= currentBlock) {
                return; // No new blocks to process
            }

            logger.info(`Processing events from block ${this.lastProcessedBlock + 1} to ${currentBlock}`);

            // Process verification requests
            await this.processVerificationRequests();

            // Process milestone submissions
            await this.processMilestoneSubmissions();

            this.lastProcessedBlock = currentBlock;

        } catch (error) {
            logger.error('Error processing events:', error);
        }
    }

    async processVerificationRequests() {
        try {
            // Get pending verification requests from the AI handler contract
            const pendingRequests = await this.getPendingVerificationRequests();

            for (const request of pendingRequests) {
                await this.processVerificationRequest(request);
            }

        } catch (error) {
            logger.error('Error processing verification requests:', error);
        }
    }

    async getPendingVerificationRequests() {
        // This would typically query the AI Verification Handler contract
        // for pending requests. For now, we'll simulate this.

        try {
            // In a real implementation, you would:
            // 1. Query the contract for pending requests
            // 2. Parse the events to get request details
            // 3. Return structured request data

            // For demo purposes, return empty array
            return [];

        } catch (error) {
            logger.error('Error getting pending verification requests:', error);
            return [];
        }
    }

    async processVerificationRequest(request) {
        try {
            logger.info(`Processing verification request: ${request.requestId}`);

            // Prepare submission data for AI verification
            const submission = {
                milestoneId: request.milestoneId,
                campaignAddress: request.campaignAddress,
                evidenceHash: request.evidenceHash,
                description: request.description || '',
                evidenceUrl: request.evidenceUrl || ''
            };

            // Get AI verification result
            const verificationResult = await aiVerificationService.verifyMilestone(submission);

            // Determine verdict
            const approved = verificationResult.verdict === 'approved';

            // Create AI report hash (in real implementation, this would be stored in IPFS)
            const aiReportHash = this.generateReportHash(verificationResult);

            // Submit verdict to blockchain
            await blockchainService.completeVerification(
                request.requestId,
                approved,
                aiReportHash
            );

            logger.info(`Verification completed for request ${request.requestId}. Approved: ${approved}`);

        } catch (error) {
            logger.error(`Error processing verification request ${request.requestId}:`, error);
        }
    }

    async processMilestoneSubmissions() {
        try {
            // This would process milestone submission events from campaign contracts
            // For now, we'll simulate this functionality

            logger.debug('Processing milestone submissions...');

        } catch (error) {
            logger.error('Error processing milestone submissions:', error);
        }
    }

    generateReportHash(verificationResult) {
        // In a real implementation, this would:
        // 1. Create a detailed AI report
        // 2. Store it in IPFS
        // 3. Return the IPFS hash

        // For demo purposes, generate a mock hash
        const reportData = JSON.stringify({
            verdict: verificationResult.verdict,
            confidence: verificationResult.confidence,
            reasoning: verificationResult.reasoning,
            timestamp: new Date().toISOString()
        });

        // Simple hash generation (in production, use proper IPFS)
        const crypto = require('crypto');
        return crypto.createHash('sha256').update(reportData).digest('hex');
    }

    /**
     * Add event to processing queue
     */
    addEvent(event) {
        this.eventQueue.push({
            ...event,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Process queued events
     */
    async processQueuedEvents() {
        while (this.eventQueue.length > 0) {
            const event = this.eventQueue.shift();
            await this.processEvent(event);
        }
    }

    /**
     * Process individual event
     */
    async processEvent(event) {
        try {
            logger.info(`Processing event: ${event.type}`, event);

            switch (event.type) {
                case 'MilestoneSubmitted':
                    await this.handleMilestoneSubmitted(event);
                    break;
                case 'VerificationRequested':
                    await this.handleVerificationRequested(event);
                    break;
                default:
                    logger.warn(`Unknown event type: ${event.type}`);
            }

        } catch (error) {
            logger.error(`Error processing event:`, error);
        }
    }

    async handleMilestoneSubmitted(event) {
        logger.info(`Handling milestone submission: ${event.milestoneId}`);

        // This would trigger AI verification process
        // For now, just log the event
    }

    async handleVerificationRequested(event) {
        logger.info(`Handling verification request: ${event.requestId}`);

        // This would process the verification request
        // For now, just log the event
    }
}

module.exports = new EventListenerService();
