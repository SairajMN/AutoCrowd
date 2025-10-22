const express = require('express');
const winston = require('winston');
const realtimeDataService = require('../services/realtimeDataService');

const router = express.Router();
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [new winston.transports.Console()]
});

// GET /api/realtime/data - REST fallback endpoint for real-time data
router.get('/data', async (req, res) => {
    try {
        const { dataTypes } = req.query;

        let requestedDataTypes;
        if (dataTypes) {
            requestedDataTypes = Array.isArray(dataTypes) ? dataTypes : dataTypes.split(',');
        }

        const result = realtimeDataService.getRealtimeData(requestedDataTypes);

        res.json({
            success: true,
            ...result
        });

    } catch (error) {
        logger.error('Error in realtime data endpoint:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch real-time data',
            message: error.message
        });
    }
});

// GET /api/realtime/stats - Get connection and subscription statistics
router.get('/stats', async (req, res) => {
    try {
        const stats = realtimeDataService.getStats();

        res.json({
            success: true,
            stats,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Error getting realtime stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get statistics',
            message: error.message
        });
    }
});

// POST /api/realtime/broadcast/:dataType - Manually broadcast data update (admin/testing)
router.post('/broadcast/:dataType', async (req, res) => {
    try {
        const { dataType } = req.params;
        const { data } = req.body;

        // Validate data type
        const validTypes = ['pyusd_price', 'blockchain_state', 'market_data', 'verification_patterns'];
        if (!validTypes.includes(dataType)) {
            return res.status(400).json({
                success: false,
                error: `Invalid data type. Must be one of: ${validTypes.join(', ')}`
            });
        }

        if (!data) {
            return res.status(400).json({
                success: false,
                error: 'Data payload is required'
            });
        }

        // Broadcast the update
        realtimeDataService.handleRealtimeUpdate(dataType, data);

        logger.info(`Manual broadcast initiated for ${dataType}`);

        res.json({
            success: true,
            message: `Data broadcasted to ${realtimeDataService.getStats().clients.connected} connected clients`,
            dataType,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Error in manual broadcast endpoint:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to broadcast data',
            message: error.message
        });
    }
});

// WebSocket connection info endpoint
router.get('/connect', (req, res) => {
    const info = {
        websocket_url: '/api/realtime',
        supported_data_types: ['pyusd_price', 'blockchain_state', 'market_data', 'verification_patterns'],
        message_types: {
            subscribe: { subscriptions: ['array of data types'] },
            unsubscribe: { subscriptions: ['array of data types'] },
            ping: {},
            heartbeat: {},
            get_cached_data: { dataTypes: ['array of data types'] }
        },
        response_types: {
            connection_established: { clientId: 'number', timestamp: 'string', availableSubscriptions: ['array'] },
            subscription_confirmed: { subscriptions: ['array'], timestamp: 'string' },
            data_update: { dataType: 'string', data: {}, cached: 'boolean', timestamp: 'string' },
            error: { message: 'string', timestamp: 'string' }
        },
        heartbeat_interval: 30000,
        connection_timeout: 60000,
        documentation: 'See WebSocket API documentation for detailed usage'
    };

    res.json({
        success: true,
        websocket_info: info,
        server_stats: realtimeDataService.getStats()
    });
});

module.exports = router;
