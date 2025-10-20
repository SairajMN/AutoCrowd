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
const campaignQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0),
  creator: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).optional(),
  active: Joi.boolean().optional()
});

/**
 * GET /api/campaigns
 * Get all campaigns with optional filtering
 */
router.get('/', async (req, res) => {
  try {
    // Validate query parameters
    const { error, value } = campaignQuerySchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details[0].message
      });
    }

    logger.info(`Fetching campaigns with params:`, value);

    // Get campaigns from blockchain
    const allCampaigns = await blockchainService.getAllCampaigns();

    // Apply filters
    let filteredCampaigns = allCampaigns;

    if (value.creator) {
      filteredCampaigns = filteredCampaigns.filter(
        campaign => campaign.creator.toLowerCase() === value.creator.toLowerCase()
      );
    }

    if (value.active !== undefined) {
      filteredCampaigns = filteredCampaigns.filter(
        campaign => campaign.isActive === value.active
      );
    }

    // Apply pagination
    const paginatedCampaigns = filteredCampaigns.slice(
      value.offset,
      value.offset + value.limit
    );

    res.json({
      success: true,
      data: {
        campaigns: paginatedCampaigns,
        pagination: {
          total: filteredCampaigns.length,
          limit: value.limit,
          offset: value.offset,
          hasMore: value.offset + value.limit < filteredCampaigns.length
        }
      }
    });

  } catch (error) {
    logger.error('Failed to fetch campaigns:', error);
    res.status(500).json({
      error: 'Failed to fetch campaigns',
      message: error.message
    });
  }
});

/**
 * GET /api/campaigns/:address
 * Get specific campaign details
 */
router.get('/:address', async (req, res) => {
  try {
    const { address } = req.params;

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({
        error: 'Invalid campaign address format'
      });
    }

    logger.info(`Fetching campaign details for: ${address}`);

    // Get all campaigns and find the specific one
    const allCampaigns = await blockchainService.getAllCampaigns();
    const campaign = allCampaigns.find(
      c => c.campaignAddress.toLowerCase() === address.toLowerCase()
    );

    if (!campaign) {
      return res.status(404).json({
        error: 'Campaign not found'
      });
    }

    // TODO: Get additional campaign details from the campaign contract
    // This would include milestones, contributions, etc.

    res.json({
      success: true,
      data: {
        campaign,
        details: {
          milestones: [],
          contributions: [],
          backers: []
        }
      }
    });

  } catch (error) {
    logger.error(`Failed to fetch campaign ${req.params.address}:`, error);
    res.status(500).json({
      error: 'Failed to fetch campaign details',
      message: error.message
    });
  }
});

/**
 * GET /api/campaigns/:address/milestones
 * Get milestones for a specific campaign
 */
router.get('/:address/milestones', async (req, res) => {
  try {
    const { address } = req.params;

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({
        error: 'Invalid campaign address format'
      });
    }

    logger.info(`Fetching milestones for campaign: ${address}`);

    // TODO: Query the campaign contract for milestones
    // This would require the campaign contract ABI and address

    res.json({
      success: true,
      data: {
        campaignAddress: address,
        milestones: [],
        message: 'Milestone fetching not yet implemented'
      }
    });

  } catch (error) {
    logger.error(`Failed to fetch milestones for campaign ${req.params.address}:`, error);
    res.status(500).json({
      error: 'Failed to fetch milestones',
      message: error.message
    });
  }
});

/**
 * GET /api/campaigns/:address/contributions
 * Get contributions for a specific campaign
 */
router.get('/:address/contributions', async (req, res) => {
  try {
    const { address } = req.params;

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({
        error: 'Invalid campaign address format'
      });
    }

    logger.info(`Fetching contributions for campaign: ${address}`);

    // TODO: Query the campaign contract for contributions
    // This would require the campaign contract ABI and address

    res.json({
      success: true,
      data: {
        campaignAddress: address,
        contributions: [],
        message: 'Contribution fetching not yet implemented'
      }
    });

  } catch (error) {
    logger.error(`Failed to fetch contributions for campaign ${req.params.address}:`, error);
    res.status(500).json({
      error: 'Failed to fetch contributions',
      message: error.message
    });
  }
});

/**
 * GET /api/campaigns/creator/:creator
 * Get campaigns by creator address
 */
router.get('/creator/:creator', async (req, res) => {
  try {
    const { creator } = req.params;

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(creator)) {
      return res.status(400).json({
        error: 'Invalid creator address format'
      });
    }

    logger.info(`Fetching campaigns by creator: ${creator}`);

    // Get all campaigns and filter by creator
    const allCampaigns = await blockchainService.getAllCampaigns();
    const creatorCampaigns = allCampaigns.filter(
      campaign => campaign.creator.toLowerCase() === creator.toLowerCase()
    );

    res.json({
      success: true,
      data: {
        creator,
        campaigns: creatorCampaigns,
        count: creatorCampaigns.length
      }
    });

  } catch (error) {
    logger.error(`Failed to fetch campaigns by creator ${req.params.creator}:`, error);
    res.status(500).json({
      error: 'Failed to fetch creator campaigns',
      message: error.message
    });
  }
});

/**
 * GET /api/campaigns/stats/summary
 * Get campaign statistics summary
 */
router.get('/stats/summary', async (req, res) => {
  try {
    logger.info('Fetching campaign statistics summary');

    // Get all campaigns
    const allCampaigns = await blockchainService.getAllCampaigns();

    // Calculate statistics
    const stats = {
      total: allCampaigns.length,
      active: allCampaigns.filter(c => c.isActive).length,
      completed: allCampaigns.filter(c => !c.isActive).length,
      totalCreators: new Set(allCampaigns.map(c => c.creator)).size,
      createdAt: {
        last24h: allCampaigns.filter(c => {
          const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
          return c.createdAt * 1000 > dayAgo;
        }).length,
        last7d: allCampaigns.filter(c => {
          const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
          return c.createdAt * 1000 > weekAgo;
        }).length
      }
    };

    res.json({
      success: true,
      data: {
        statistics: stats,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Failed to fetch campaign statistics:', error);
    res.status(500).json({
      error: 'Failed to fetch campaign statistics',
      message: error.message
    });
  }
});

/**
 * GET /api/campaigns/health
 * Health check for campaigns service
 */
router.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        blockchain: 'operational',
        campaigns: 'operational'
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
