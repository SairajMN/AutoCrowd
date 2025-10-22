import { useState, useEffect, useCallback, useRef } from 'react';

export interface RealtimeDataUpdate {
    type: 'data_update' | 'connection_established' | 'subscription_confirmed' | 'unsubscription_confirmed' | 'error';
    dataType?: string;
    data?: any;
    cached?: boolean;
    timestamp: string;
    clientId?: number;
    subscriptions?: string[];
    message?: string;
}

export interface PYUSDPriceData {
    usd: number;
    eth?: number;
    lastUpdated: Date;
    volatility: number;
    marketCap?: number;
    stale?: boolean;
}

export interface ContributorStats {
    totalTransactions: number;
    totalVolume: number;
    firstTransaction: Date;
    lastTransaction: Date;
    avgTransactionValue: number;
    transactionFrequency: number; // transactions per day
    riskScore: number;
}

export interface VerificationPatterns {
    averageConfidence: number;
    approvalRate: number;
    commonRejectionReasons: {
        insufficientEvidence: number;
        authenticityIssues: number;
        incompleteSubmission: number;
    };
    timePatterns: {
        peakHours: number[];
        lowActivityHours: number[];
        averageResponseTime: number; // milliseconds
    };
    confidenceTrends: {
        trend: 'increasing' | 'decreasing' | 'stable';
        change: number;
        recentAvg: number;
        previousAvg: number;
    };
    lastUpdated: Date;
}

export interface MarketData {
    btc?: {
        price: number;
        percent_change_24h: number;
        market_cap: number;
    };
    eth?: {
        price: number;
        percent_change_24h: number;
        market_cap: number;
    };
    pyusd?: {
        price: number;
        percent_change_24h: number;
        market_cap: number;
    };
    timestamp: Date;
    globalMetrics: any;
}

export interface BlockchainState {
    latestBlock: number;
    activeContributors: string[];
    recentTransactions: Array<{
        hash: string;
        from: string;
        to: string;
        value: string;
        timestamp: Date;
        blockNumber: number;
        gasUsed: string;
    }>;
    contractBalances: { [address: string]: string };
    networkStats: {
        ethSupply?: number;
    };
    lastUpdated: Date;
}

export interface RealtimeDataContext {
    pyusdPrice: PYUSDPriceData | null;
    contributorStats: Map<string, ContributorStats>;
    verificationPatterns: VerificationPatterns | null;
    marketData: MarketData | null;
    blockchainState: BlockchainState | null;
}

interface UseRealtimeDataOptions {
    autoConnect?: boolean;
    fallbackInterval?: number; // fallback polling interval in ms
    heartbeatInterval?: number; // WebSocket heartbeat interval in ms
    maxReconnectionAttempts?: number;
    subscriptions?: string[];
}

/**
 * Custom hook for consuming real-time data from the backend
 */
export function useRealtimeData(options: UseRealtimeDataOptions = {}) {
    const {
        autoConnect = true,
        fallbackInterval = 30000, // 30 seconds
        heartbeatInterval = 30000, // 30 seconds
        maxReconnectionAttempts = 5,
        subscriptions = ['pyusd_price', 'market_data', 'verification_patterns']
    } = options;

    // WebSocket connection
    const [ws, setWs] = useState<WebSocket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [connectionStats, setConnectionStats] = useState({
        reconnectAttempts: 0,
        lastConnected: null as Date | null,
        lastDisconnected: null as Date | null,
        messagesReceived: 0,
        bytesReceived: 0
    });

    // Real-time data state
    const [realtimeData, setRealtimeData] = useState<RealtimeDataContext>({
        pyusdPrice: null,
        contributorStats: new Map(),
        verificationPatterns: null,
        marketData: null,
        blockchainState: null
    });

    // Connection management
    const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);
    const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
    const fallbackTimerRef = useRef<NodeJS.Timeout | null>(null);
    const clientIdRef = useRef<number | null>(null);

    // Error handling
    const [error, setError] = useState<string | null>(null);
    const [warnings, setWarnings] = useState<string[]>([]);

    /**
     * Update real-time data based on incoming message
     */
    const updateRealtimeData = useCallback((update: RealtimeDataUpdate) => {
        if (update.type === 'data_update' && update.dataType && update.data) {
            setRealtimeData(prevData => {
                const newData = { ...prevData };

                switch (update.dataType) {
                    case 'pyusd_price':
                        newData.pyusdPrice = {
                            ...update.data,
                            lastUpdated: new Date(update.data.lastUpdated || update.timestamp)
                        };
                        break;
                    case 'blockchain_state':
                        newData.blockchainState = {
                            ...update.data,
                            lastUpdated: new Date(update.data.lastUpdated || update.timestamp),
                            recentTransactions: update.data.recentTransactions?.map((tx: any) => ({
                                ...tx,
                                timestamp: new Date(tx.timestamp)
                            })) || []
                        };
                        // Update contributor stats
                        if (update.data.activeContributors) {
                            const newStats = new Map();
                            // Note: In a full implementation, we'd fetch detailed stats for each contributor
                            update.data.activeContributors.forEach((addr: string) => {
                                newStats.set(addr.toLowerCase(), {
                                    totalTransactions: 1,
                                    totalVolume: 0,
                                    firstTransaction: new Date(),
                                    lastTransaction: new Date(),
                                    avgTransactionValue: 0,
                                    transactionFrequency: 0.1,
                                    riskScore: 0.5
                                });
                            });
                            newData.contributorStats = newStats;
                        }
                        break;
                    case 'verification_patterns':
                        newData.verificationPatterns = {
                            ...update.data,
                            lastUpdated: new Date(update.data.lastUpdated || update.timestamp)
                        };
                        break;
                    case 'market_data':
                        newData.marketData = {
                            ...update.data,
                            timestamp: new Date(update.data.timestamp || update.timestamp)
                        };
                        break;
                }

                return newData;
            });
        }
    }, []);

    /**
     * Connect to WebSocket server
     */
    const connect = useCallback(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            return; // Already connected
        }

        try {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}/api/realtime`;

            const newWs = new WebSocket(wsUrl);

            newWs.onopen = () => {
                setIsConnected(true);
                setError(null);
                setConnectionStats(prev => ({
                    ...prev,
                    lastConnected: new Date(),
                    reconnectAttempts: 0
                }));

                // Clear any reconnection timer
                if (reconnectTimerRef.current) {
                    clearTimeout(reconnectTimerRef.current);
                    reconnectTimerRef.current = null;
                }

                // Start heartbeat
                startHeartbeat();

                // Subscribe to data types
                if (subscriptions.length > 0) {
                    sendMessage(newWs, 'subscribe', { subscriptions });
                }
            };

            newWs.onmessage = (event) => {
                try {
                    const update: RealtimeDataUpdate = JSON.parse(event.data);
                    setConnectionStats(prev => ({
                        ...prev,
                        messagesReceived: prev.messagesReceived + 1,
                        bytesReceived: prev.bytesReceived + event.data.length
                    }));

                    if (update.clientId) {
                        clientIdRef.current = update.clientId;
                    }

                    updateRealtimeData(update);
                } catch (err) {
                    console.error('Failed to parse WebSocket message:', err);
                    setWarnings(prev => [...prev, 'Failed to parse incoming message']);
                }
            };

            newWs.onclose = (event) => {
                setIsConnected(false);
                setConnectionStats(prev => ({
                    ...prev,
                    lastDisconnected: new Date()
                }));

                setWs(null);

                // Stop heartbeat
                if (heartbeatTimerRef.current) {
                    clearInterval(heartbeatTimerRef.current);
                    heartbeatTimerRef.current = null;
                }

                // Attempt reconnection if not a normal closure
                if (event.code !== 1000 && connectionStats.reconnectAttempts < maxReconnectionAttempts) {
                    const delay = Math.min(1000 * Math.pow(2, connectionStats.reconnectAttempts), 30000);
                    reconnectTimerRef.current = setTimeout(() => {
                        setConnectionStats(prev => ({
                            ...prev,
                            reconnectAttempts: prev.reconnectAttempts + 1
                        }));
                        connect();
                    }, delay);
                } else {
                    // Start fallback polling after max reconnection attempts
                    startFallbackPolling();
                }
            };

            newWs.onerror = (error) => {
                setError('WebSocket connection error');
                console.error('WebSocket error:', error);
            };

            setWs(newWs);
        } catch (err) {
            setError('Failed to create WebSocket connection');
            console.error('WebSocket creation error:', err);
            startFallbackPolling();
        }
    }, [ws, subscriptions, connectionStats.reconnectAttempts, maxReconnectionAttempts, updateRealtimeData]);

    /**
     * Disconnect from WebSocket
     */
    const disconnect = useCallback(() => {
        if (ws) {
            ws.close(1000, 'Client disconnect');
        }

        // Clear timers
        [heartbeatTimerRef, reconnectTimerRef, fallbackTimerRef].forEach(ref => {
            if (ref.current) {
                clearTimeout(ref.current);
                ref.current = null;
            }
        });
    }, [ws]);

    /**
     * Send message to WebSocket server
     */
    const sendMessage = useCallback((socket: WebSocket, type: string, data: any = {}) => {
        if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type, ...data }));
        }
    }, []);

    /**
     * Start heartbeat timer
     */
    const startHeartbeat = useCallback(() => {
        if (heartbeatTimerRef.current) {
            clearInterval(heartbeatTimerRef.current);
        }

        heartbeatTimerRef.current = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                sendMessage(ws, 'heartbeat');
            }
        }, heartbeatInterval);
    }, [ws, heartbeatInterval, sendMessage]);

    /**
     * Start fallback polling when WebSocket is unavailable
     */
    const startFallbackPolling = useCallback(() => {
        if (fallbackTimerRef.current) {
            clearInterval(fallbackTimerRef.current);
        }

        fallbackTimerRef.current = setInterval(async () => {
            try {
                const params = new URLSearchParams();
                subscriptions.forEach(sub => params.append('dataTypes', sub));

                const response = await fetch(`/api/realtime/data?${params}`);
                if (response.ok) {
                    const result = await response.json();
                    if (result.success && result.data) {
                        // Update data from polling fallback
                        Object.entries(result.data).forEach(([dataType, data]: [string, any]) => {
                            if (data && data.data) {
                                updateRealtimeData({
                                    type: 'data_update',
                                    dataType,
                                    data: data.data,
                                    cached: true,
                                    timestamp: data.timestamp
                                });
                            }
                        });
                        setError(null); // Clear errors on successful poll
                    }
                }
            } catch (err) {
                setError('Fallback polling failed');
                console.error('Fallback polling error:', err);
            }
        }, fallbackInterval);
    }, [fallbackInterval, subscriptions, updateRealtimeData]);

    /**
     * Subscribe to additional data types
     */
    const subscribe = useCallback((newSubscriptions: string[]) => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            sendMessage(ws, 'subscribe', { subscriptions: newSubscriptions });
        }
    }, [ws, sendMessage]);

    /**
     * Unsubscribe from data types
     */
    const unsubscribe = useCallback((subscriptionsToRemove: string[]) => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            sendMessage(ws, 'unsubscribe', { subscriptions: subscriptionsToRemove });
        }
    }, [ws, sendMessage]);

    /**
     * Get specific contributor statistics
     */
    const getContributorStats = useCallback((address: string) => {
        return realtimeData.contributorStats.get(address.toLowerCase()) || null;
    }, [realtimeData.contributorStats]);

    /**
     * Check if data is stale (older than threshold)
     */
    const isDataStale = useCallback((dataType: string, thresholdMs: number = 300000) => { // 5 minutes default
        let lastUpdate: Date | null = null;

        switch (dataType) {
            case 'pyusd_price':
                lastUpdate = realtimeData.pyusdPrice?.lastUpdated || null;
                break;
            case 'blockchain_state':
                lastUpdate = realtimeData.blockchainState?.lastUpdated || null;
                break;
            case 'market_data':
                lastUpdate = realtimeData.marketData?.timestamp || null;
                break;
            case 'verification_patterns':
                lastUpdate = realtimeData.verificationPatterns?.lastUpdated || null;
                break;
        }

        if (!lastUpdate) return true;
        return (Date.now() - lastUpdate.getTime()) > thresholdMs;
    }, [realtimeData]);

    /**
     * Get data freshness indicators
     */
    const getDataFreshness = useCallback(() => ({
        pyusd_price: !isDataStale('pyusd_price', 30000), // 30 seconds
        blockchain_state: !isDataStale('blockchain_state', 15000), // 15 seconds
        market_data: !isDataStale('market_data', 60000), // 1 minute
        verification_patterns: !isDataStale('verification_patterns', 60000), // 1 minute
        overall: {
            fresh: ['pyusd_price', 'blockchain_state', 'market_data', 'verification_patterns']
                .filter(type => !isDataStale(type)).length,
            total: 4
        }
    }), [isDataStale]);

    // Auto-connect on mount
    useEffect(() => {
        if (autoConnect) {
            connect();
        }

        return () => {
            disconnect();
        };
    }, [autoConnect, connect, disconnect]);

    // Clean up warnings after some time
    useEffect(() => {
        if (warnings.length > 0) {
            const timer = setTimeout(() => {
                setWarnings(prev => prev.slice(1));
            }, 5000);

            return () => clearTimeout(timer);
        }
    }, [warnings]);

    return {
        // Connection state
        isConnected,
        connectionStats,
        clientId: clientIdRef.current,

        // Data
        ...realtimeData,

        // Helpers
        getContributorStats,
        getDataFreshness,
        isDataStale,

        // Controls
        connect,
        disconnect,
        subscribe,
        unsubscribe,

        // Status
        error,
        warnings,

        // WebSocket instance (for advanced usage)
        ws
    };
}
