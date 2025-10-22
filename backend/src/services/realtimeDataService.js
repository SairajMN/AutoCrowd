const WebSocket = require('ws');
const winston = require('winston');
const aiVerificationService = require('./aiVerificationService');

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [new winston.transports.Console()]
});

class RealtimeDataService {
    constructor() {
        this.wss = null;
        this.server = null;
        this.heartbeatInterval = null;
        this.clients = new Map(); // clientId -> { ws, subscriptions, lastHeartbeat }
        this.clientIdCounter = 0;
        this.cache = new Map(); // Data type -> { data, timestamp, ttl }
        this.cacheConfig = {
            pyusd_price: { ttl: 30000 }, // 30 seconds
            blockchain_state: { ttl: 15000 }, // 15 seconds
            market_data: { ttl: 60000 }, // 1 minute
            verification_patterns: { ttl: 60000 } // 1 minute
        };
    }

    /**
     * Initialize the WebSocket server
     */
    async initialize(server) {
        logger.info('Initializing Realtime Data Service...');

        this.server = server;
        this.wss = new WebSocket.Server({
            server: server,
            path: '/api/realtime',
            perMessageDeflate: false
        });

        this.setupWebSocketHandlers();
        this.startHeartbeatCheck();
        this.startCacheCleanup();

        logger.info('Realtime Data Service initialized and WebSocket server started');
    }

    /**
     * Set up WebSocket event handlers
     */
    setupWebSocketHandlers() {
        this.wss.on('connection', (ws, request) => {
            const clientId = ++this.clientIdCounter;
            const clientInfo = {
                id: clientId,
                ws,
                subscriptions: new Set(),
                lastHeartbeat: Date.now(),
                connectedAt: new Date(),
                userAgent: request.headers['user-agent'] || 'Unknown'
            };

            this.clients.set(clientId, clientInfo);

            logger.info(`New WebSocket connection: Client ${clientId}`);

            // Send welcome message
            this.sendToClient(clientId, {
                type: 'connection_established',
                clientId,
                timestamp: new Date().toISOString(),
                availableSubscriptions: Array.from(Object.keys(this.cacheConfig))
            });

            // Handle incoming messages
            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    this.handleClientMessage(clientId, message);
                } catch (error) {
                    logger.warn(`Invalid message from client ${clientId}:`, error.message);
                    this.sendToClient(clientId, {
                        type: 'error',
                        message: 'Invalid JSON format',
                        timestamp: new Date().toISOString()
                    });
                }
            });

            // Handle client disconnect
            ws.on('close', (code, reason) => {
                logger.info(`WebSocket client ${clientId} disconnected. Code: ${code}, Reason: ${reason.toString()}`);
                this.clients.delete(clientId);
            });

            // Handle errors
            ws.on('error', (error) => {
                logger.error(`WebSocket client ${clientId} error:`, error);
                this.clients.delete(clientId);
            });
        });

        this.wss.on('error', (error) => {
            logger.error('WebSocket server error:', error);
        });
    }

    /**
     * Handle messages from clients
     */
    handleClientMessage(clientId, message) {
        const client = this.clients.get(clientId);
        if (!client) return;

        switch (message.type) {
            case 'subscribe':
                this.handleSubscribe(clientId, message.subscriptions);
                break;
            case 'unsubscribe':
                this.handleUnsubscribe(clientId, message.subscriptions);
                break;
            case 'ping':
                this.sendToClient(clientId, { type: 'pong', timestamp: new Date().toISOString() });
                break;
            case 'heartbeat':
                client.lastHeartbeat = Date.now();
                break;
            case 'get_cached_data':
                this.sendCachedData(clientId, message.dataTypes);
                break;
            default:
                logger.warn(`Unknown message type from client ${clientId}: ${message.type}`);
        }
    }

    /**
     * Handle subscription request
     */
    handleSubscribe(clientId, subscriptions) {
        const client = this.clients.get(clientId);
        if (!client) return;

        if (Array.isArray(subscriptions)) {
            subscriptions.forEach(sub => {
                if (Object.keys(this.cacheConfig).includes(sub)) {
                    client.subscriptions.add(sub);
                }
            });
        }

        logger.info(`Client ${clientId} subscribed to: ${Array.from(client.subscriptions).join(', ')}`);

        this.sendToClient(clientId, {
            type: 'subscription_confirmed',
            subscriptions: Array.from(client.subscriptions),
            timestamp: new Date().toISOString()
        });

        // Send initial data for subscriptions
        this.sendCachedData(clientId, Array.from(client.subscriptions));
    }

    /**
     * Handle unsubscription request
     */
    handleUnsubscribe(clientId, subscriptions) {
        const client = this.clients.get(clientId);
        if (!client) return;

        if (Array.isArray(subscriptions)) {
            subscriptions.forEach(sub => client.subscriptions.delete(sub));
        }

        logger.info(`Client ${clientId} unsubscribed from: ${subscriptions.join(', ')}`);

        this.sendToClient(clientId, {
            type: 'unsubscription_confirmed',
            subscriptions: Array.from(client.subscriptions),
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Send cached data to client
     */
    sendCachedData(clientId, dataTypes) {
        const client = this.clients.get(clientId);
        if (!client) return;

        dataTypes.forEach(dataType => {
            if (client.subscriptions.has(dataType)) {
                const cachedData = this.getCachedData(dataType);
                if (cachedData) {
                    this.sendToClient(clientId, {
                        type: 'data_update',
                        dataType,
                        data: cachedData.data,
                        cached: true,
                        timestamp: cachedData.timestamp
                    });
                }
            }
        });
    }

    /**
     * Broadcast data update to all subscribed clients
     */
    broadcastUpdate(dataType, data) {
        if (!Object.keys(this.cacheConfig).includes(dataType)) {
            logger.warn(`Unknown data type for broadcast: ${dataType}`);
            return;
        }

        // Update cache
        this.setCachedData(dataType, data);

        // Broadcast to clients
        let broadcastCount = 0;
        for (const [clientId, client] of this.clients) {
            if (client.subscriptions.has(dataType)) {
                this.sendToClient(clientId, {
                    type: 'data_update',
                    dataType,
                    data,
                    cached: false,
                    timestamp: new Date().toISOString()
                });
                broadcastCount++;
            }
        }

        logger.debug(`Broadcasted ${dataType} update to ${broadcastCount} clients`);
    }

    /**
     * Send message to specific client
     */
    sendToClient(clientId, message) {
        const client = this.clients.get(clientId);
        if (!client || client.ws.readyState !== WebSocket.OPEN) {
            return false;
        }

        try {
            client.ws.send(JSON.stringify(message));
            return true;
        } catch (error) {
            logger.error(`Failed to send message to client ${clientId}:`, error);
            this.clients.delete(clientId);
            return false;
        }
    }

    /**
     * Cache data with TTL
     */
    setCachedData(dataType, data) {
        this.cache.set(dataType, {
            data,
            timestamp: new Date().toISOString(),
            expiresAt: Date.now() + this.cacheConfig[dataType].ttl
        });
    }

    /**
     * Get cached data if not expired
     */
    getCachedData(dataType) {
        const cached = this.cache.get(dataType);
        if (!cached) return null;

        if (Date.now() > cached.expiresAt) {
            this.cache.delete(dataType);
            return null;
        }

        return cached;
    }

    /**
     * Start heartbeat checking for stale connections
     */
    startHeartbeatCheck() {
        this.heartbeatInterval = setInterval(() => {
            const now = Date.now();
            const timeoutMs = 60000; // 60 seconds

            for (const [clientId, client] of this.clients) {
                if (now - client.lastHeartbeat > timeoutMs) {
                    logger.info(`Client ${clientId} heartbeat timeout, disconnecting`);
                    client.ws.close(1008, 'Heartbeat timeout');
                    this.clients.delete(clientId);
                }
            }
        }, 30000); // Check every 30 seconds
    }

    /**
     * Start cache cleanup for expired data
     */
    startCacheCleanup() {
        setInterval(() => {
            const now = Date.now();
            let cleanedCount = 0;

            for (const [dataType, cached] of this.cache) {
                if (now > cached.expiresAt) {
                    this.cache.delete(dataType);
                    cleanedCount++;
                }
            }

            if (cleanedCount > 0) {
                logger.debug(`Cleaned ${cleanedCount} expired cache entries`);
            }
        }, 60000); // Clean every minute
    }

    /**
     * Get service statistics
     */
    getStats() {
        const subscriptionCounts = {};
        for (const [dataType] of Object.entries(this.cacheConfig)) {
            subscriptionCounts[dataType] = 0;
        }

        for (const client of this.clients.values()) {
            for (const sub of client.subscriptions) {
                if (subscriptionCounts[sub] !== undefined) {
                    subscriptionCounts[sub]++;
                }
            }
        }

        return {
            clients: {
                connected: this.clients.size,
                totalEverConnected: this.clientIdCounter
            },
            subscriptions: subscriptionCounts,
            cache: {
                entries: this.cache.size,
                types: Object.keys(this.cacheConfig)
            },
            uptime: process.uptime()
        };
    }

    /**
     * Gracefully shutdown the service
     */
    async shutdown() {
        logger.info('Shutting down Realtime Data Service...');

        // Stop heartbeat checking
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }

        // Close all client connections
        for (const [clientId, client] of this.clients) {
            try {
                client.ws.close(1001, 'Server shutdown');
            } catch (error) {
                logger.warn(`Error closing connection for client ${clientId}:`, error.message);
            }
        }

        this.clients.clear();

        // Close WebSocket server
        if (this.wss) {
            this.wss.close();
            this.wss = null;
        }

        logger.info('Realtime Data Service shutdown complete');
    }

    /**
     * Handle real-time data updates from AI verification service
     */
    handleRealtimeUpdate(updateType, data) {
        this.broadcastUpdate(updateType, data);
    }

    /**
     * Get HTTP endpoint for REST fallback
     */
    getRealtimeData(dataTypes) {
        const result = {};

        if (Array.isArray(dataTypes)) {
            dataTypes.forEach(dataType => {
                const cached = this.getCachedData(dataType);
                if (cached) {
                    result[dataType] = cached;
                }
            });
        } else {
            // Return all available data
            Object.keys(this.cacheConfig).forEach(dataType => {
                const cached = this.getCachedData(dataType);
                if (cached) {
                    result[dataType] = cached;
                }
            });
        }

        return {
            data: result,
            timestamp: new Date().toISOString(),
            websocket_url: '/api/realtime',
            stats: this.getStats()
        };
    }
}

module.exports = new RealtimeDataService();
