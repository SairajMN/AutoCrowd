const express = require('express');
const Joi = require('joi');
const winston = require('winston');
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
const eventQuerySchema = Joi.object({
    fromBlock: Joi.number().integer().min(0).optional(),
    toBlock: Joi.alternatives().try(
        Joi.string().valid('latest'),
        Joi.number().integer().min(0)
    ).default('latest'),
    limit: Joi.number().integer().min(1).max(1000).default(100),
    offset: Joi.number().integer().min(0).default(0),
    eventType: Joi.string().valid('all', 'campaigns', 'verifications', 'contributions').default('all')
});

/**
 * GET /api/events
 * Get blockchain events with optional filtering
 */
router.get('/', async (req, res) => {
    try {
        // Validate query parameters
        const { error, value } = eventQuerySchema.validate(req.query);
        if (error) {
            return res.status(400).json({
                error: 'Validation error',
                details: error.details[0].message
            });
        }

        logger.info(`Fetching events with params:`, value);

        // Get current block number
        const currentBlock = await blockchainService.getBlockNumber();
        const fromBlock = value.fromBlock || Math.max(0, currentBlock - 1000);
        const toBlock = value.toBlock === 'latest' ? currentBlock : value.toBlock;

        // TODO: Query blockchain for events based on parameters
        // This would require implementing event filtering logic

        const mockEvents = [
            {
                id: '1',
                type: 'CampaignCreated',
                blockNumber: currentBlock - 10,
                transactionHash: '0x1234567890abcdef',
                timestamp: new Date().toISOString(),
                data: {
                    campaignAddress: '0xabcdef1234567890',
                    creator: '0x1234567890abcdef',
                    title: 'Sample Campaign',
                    goal: '1000000000000000000',
                    duration: '2592000'
                }
            },
            {
                id: '2',
                type: 'ContributionMade',
                blockNumber: currentBlock - 5,
                transactionHash: '0xabcdef1234567890',
                timestamp: new Date().toISOString(),
                data: {
                    contributor: '0x1234567890abcdef',
                    amount: '100000000000000000',
                    campaignAddress: '0xabcdef1234567890'
                }
            }
        ];

        // Filter events based on type
        let filteredEvents = mockEvents;
        if (value.eventType !== 'all') {
            filteredEvents = mockEvents.filter(event => {
                switch (value.eventType) {
                    case 'campaigns':
                        return event.type.includes('Campaign');
                    case 'verifications':
                        return event.type.includes('Verification') || event.type.includes('Milestone');
                    case 'contributions':
                        return event.type.includes('Contribution');
                    default:
                        return true;
                }
            });
        }

        // Apply pagination
        const paginatedEvents = filteredEvents.slice(
            value.offset,
            value.offset + value.limit
        );

        res.json({
            success: true,
            data: {
                events: paginatedEvents,
                pagination: {
                    total: filteredEvents.length,
                    limit: value.limit,
                    offset: value.offset,
                    hasMore: value.offset + value.limit < filteredEvents.length
                },
                blockRange: {
                    fromBlock,
                    toBlock,
                    currentBlock
                }
            }
        });

    } catch (error) {
        logger.error('Failed to fetch events:', error);
        res.status(500).json({
            error: 'Failed to fetch events',
            message: error.message
        });
    }
});

/**
 * GET /api/events/campaigns/:address
 * Get events for a specific campaign
 */
router.get('/campaigns/:address', async (req, res) => {
    try {
        const { address } = req.params;

        // Validate address format
        if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
            return res.status(400).json({
                error: 'Invalid campaign address format'
            });
        }

        logger.info(`Fetching events for campaign: ${address}`);

        // TODO: Query blockchain for events related to this campaign
        // This would require filtering events by campaign address

        const mockCampaignEvents = [
            {
                id: '1',
                type: 'ContributionMade',
                blockNumber: 12345,
                transactionHash: '0x1234567890abcdef',
                timestamp: new Date().toISOString(),
                data: {
                    contributor: '0x1234567890abcdef',
                    amount: '100000000000000000',
                    campaignAddress: address
                }
            },
            {
                id: '2',
                type: 'MilestoneSubmitted',
                blockNumber: 12350,
                transactionHash: '0xabcdef1234567890',
                timestamp: new Date().toISOString(),
                data: {
                    milestoneId: '0',
                    reviewHash: 'QmHash1234567890',
                    campaignAddress: address
                }
            }
        ];

        res.json({
            success: true,
            data: {
                campaignAddress: address,
                events: mockCampaignEvents,
                count: mockCampaignEvents.length
            }
        });

    } catch (error) {
        logger.error(`Failed to fetch events for campaign ${req.params.address}:`, error);
        res.status(500).json({
            error: 'Failed to fetch campaign events',
            message: error.message
        });
    }
});

/**
 * GET /api/events/verifications/:requestId
 * Get events related to a verification request
 */
router.get('/verifications/:requestId', async (req, res) => {
    try {
        const { requestId } = req.params;

        if (!requestId) {
            return res.status(400).json({
                error: 'Request ID is required'
            });
        }

        logger.info(`Fetching events for verification request: ${requestId}`);

        // TODO: Query blockchain for events related to this verification request
        // This would include VerificationRequested, VerificationCompleted, etc.

        const mockVerificationEvents = [
            {
                id: '1',
                type: 'VerificationRequested',
                blockNumber: 12340,
                transactionHash: '0x1234567890abcdef',
                timestamp: new Date().toISOString(),
                data: {
                    requestId,
                    campaignAddress: '0xabcdef1234567890',
                    milestoneId: '0',
                    requester: '0x1234567890abcdef'
                }
            },
            {
                id: '2',
                type: 'VerificationCompleted',
                blockNumber: 12345,
                transactionHash: '0xabcdef1234567890',
                timestamp: new Date().toISOString(),
                data: {
                    requestId,
                    approved: true,
                    aiReportHash: 'QmReportHash1234567890'
                }
            }
        ];

        res.json({
            success: true,
            data: {
                requestId,
                events: mockVerificationEvents,
                count: mockVerificationEvents.length
            }
        });

    } catch (error) {
        logger.error(`Failed to fetch events for verification ${req.params.requestId}:`, error);
        res.status(500).json({
            error: 'Failed to fetch verification events',
            message: error.message
        });
    }
});

/**
 * GET /api/events/transaction/:txHash
 * Get events for a specific transaction
 */
router.get('/transaction/:txHash', async (req, res) => {
    try {
        const { txHash } = req.params;

        // Validate transaction hash format
        if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
            return res.status(400).json({
                error: 'Invalid transaction hash format'
            });
        }

        logger.info(`Fetching events for transaction: ${txHash}`);

        // Get transaction and receipt
        const transaction = await blockchainService.getTransaction(txHash);
        const receipt = await blockchainService.getTransactionReceipt(txHash);

        if (!transaction || !receipt) {
            return res.status(404).json({
                error: 'Transaction not found'
            });
        }

        // Parse events from logs
        const events = receipt.logs.map((log, index) => ({
            id: `${txHash}-${index}`,
            type: 'ContractEvent',
            blockNumber: receipt.blockNumber,
            transactionHash: txHash,
            transactionIndex: receipt.transactionIndex,
            logIndex: log.logIndex,
            address: log.address,
            topics: log.topics,
            data: log.data,
            timestamp: new Date().toISOString()
        }));

        res.json({
            success: true,
            data: {
                transactionHash: txHash,
                transaction,
                receipt: {
                    blockNumber: receipt.blockNumber,
                    transactionIndex: receipt.transactionIndex,
                    gasUsed: receipt.gasUsed.toString(),
                    status: receipt.status
                },
                events,
                count: events.length
            }
        });

    } catch (error) {
        logger.error(`Failed to fetch events for transaction ${req.params.txHash}:`, error);
        res.status(500).json({
            error: 'Failed to fetch transaction events',
            message: error.message
        });
    }
});

/**
 * GET /api/events/stats/summary
 * Get event statistics summary
 */
router.get('/stats/summary', async (req, res) => {
    try {
        logger.info('Fetching event statistics summary');

        // TODO: Calculate real statistics from blockchain events
        const mockStats = {
            totalEvents: 1250,
            eventTypes: {
                CampaignCreated: 45,
                ContributionMade: 890,
                MilestoneSubmitted: 120,
                MilestoneVerified: 95,
                FundsReleased: 85,
                VerificationRequested: 120,
                VerificationCompleted: 95
            },
            timeRange: {
                last24h: 25,
                last7d: 180,
                last30d: 650
            },
            blockRange: {
                earliestBlock: 10000,
                latestBlock: 15000,
                currentBlock: 15000
            }
        };

        res.json({
            success: true,
            data: {
                statistics: mockStats,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        logger.error('Failed to fetch event statistics:', error);
        res.status(500).json({
            error: 'Failed to fetch event statistics',
            message: error.message
        });
    }
});

/**
 * GET /api/events/health
 * Health check for events service
 */
router.get('/health', async (req, res) => {
    try {
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            services: {
                blockchain: 'operational',
                events: 'operational'
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
