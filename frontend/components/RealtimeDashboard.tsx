'use client';

import React, { useEffect, useState } from 'react';
import { useRealtimeData } from '../hooks/useRealtimeData';
import { PYUSDPriceData, VerificationPatterns, BlockchainState, MarketData } from '../hooks/useRealtimeData';

interface RealtimeDashboardProps {
    className?: string;
}

export function RealtimeDashboard({ className = '' }: RealtimeDashboardProps) {
    const {
        isConnected,
        connectionStats,
        pyusdPrice,
        verificationPatterns,
        blockchainState,
        marketData,
        verificationPatterns: patterns,
        getDataFreshness,
        error,
        warnings
    } = useRealtimeData({
        subscriptions: ['pyusd_price', 'verification_patterns', 'blockchain_state', 'market_data']
    });

    const [timeSinceUpdate, setTimeSinceUpdate] = useState<{ [key: string]: string }>({});

    // Update time since last update
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            const updates: { [key: string]: string } = {};

            if (pyusdPrice?.lastUpdated) {
                updates.pyusd = formatTimeAgo(now - pyusdPrice.lastUpdated.getTime());
            }
            if (verificationPatterns?.lastUpdated) {
                updates.patterns = formatTimeAgo(now - verificationPatterns.lastUpdated.getTime());
            }
            if (blockchainState?.lastUpdated) {
                updates.blockchain = formatTimeAgo(now - blockchainState.lastUpdated.getTime());
            }
            if (marketData?.timestamp) {
                updates.market = formatTimeAgo(now - marketData.timestamp.getTime());
            }

            setTimeSinceUpdate(updates);
        }, 1000);

        return () => clearInterval(interval);
    }, [pyusdPrice, verificationPatterns, blockchainState, marketData]);

    const formatTimeAgo = (ms: number) => {
        if (ms < 1000) return 'just now';
        if (ms < 60000) return `${Math.floor(ms / 1000)}s ago`;
        if (ms < 3600000) return `${Math.floor(ms / 60000)}m ago`;
        return `${Math.floor(ms / 3600000)}h ago`;
    };

    const formatPYUSD = (price: number) => {
        return price.toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 4,
            maximumFractionDigits: 4
        });
    };

    const dataFreshness = getDataFreshness();

    return (
        <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 ${className}`}>
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Real-Time Data Dashboard
                </h2>

                {/* Connection Status */}
                <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {isConnected ? 'Connected' : 'Disconnected'}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-500">
                        {connectionStats.messagesReceived} msgs
                    </span>
                </div>
            </div>

            {/* Error/Warning Alerts */}
            {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-800 rounded-md">
                    <div className="flex">
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                                Connection Error
                            </h3>
                            <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                                {error}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {warnings.length > 0 && (
                <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-800 rounded-md">
                    <div className="flex">
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                                Warnings
                            </h3>
                            <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                                {warnings.map((warning, index) => (
                                    <div key={index}>{warning}</div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* PYUSD Price Card */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">PYUSD Price</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {pyusdPrice ? formatPYUSD(pyusdPrice.usd) : '---'}
                            </p>
                            {pyusdPrice?.volatility && (
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Volatility: {(pyusdPrice.volatility * 100).toFixed(1)}%
                                    {pyusdPrice.stale && ' (Stale)'}
                                </p>
                            )}
                        </div>
                        <div className={`text-xs px-2 py-1 rounded ${dataFreshness.pyusd_price
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            }`}>
                            {dataFreshness.pyusd_price ? 'Fresh' : 'Stale'}
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Updated {timeSinceUpdate.pyusd || 'never'}
                    </p>
                </div>

                {/* Market Data Card */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Market Status</p>
                            <div className="space-y-1">
                                {marketData?.btc?.price && (
                                    <p className="text-sm text-gray-900 dark:text-white">
                                        BTC: ${marketData.btc.price.toFixed(0)}
                                    </p>
                                )}
                                {marketData?.eth?.price && (
                                    <p className="text-sm text-gray-900 dark:text-white">
                                        ETH: ${marketData.eth.price.toFixed(0)}
                                    </p>
                                )}
                                {marketData?.eth?.percent_change_24h && (
                                    <p className={`text-xs ${marketData.eth.percent_change_24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        ETH: {marketData.eth.percent_change_24h >= 0 ? '+' : ''}{marketData.eth.percent_change_24h.toFixed(2)}%
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className={`text-xs px-2 py-1 rounded ${dataFreshness.market_data
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            }`}>
                            {dataFreshness.market_data ? 'Fresh' : 'Stale'}
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Updated {timeSinceUpdate.market || 'never'}
                    </p>
                </div>

                {/* Verification Patterns Card */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">AI Verification</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {verificationPatterns ? (verificationPatterns.approvalRate * 100).toFixed(1) + '%' : '---'}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Approval Rate
                            </p>
                        </div>
                        <div className={`text-xs px-2 py-1 rounded ${dataFreshness.verification_patterns
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            }`}>
                            {dataFreshness.verification_patterns ? 'Fresh' : 'Stale'}
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Updated {timeSinceUpdate.patterns || 'never'}
                    </p>
                    {verificationPatterns?.confidenceTrends && (
                        <div className="mt-2">
                            <p className={`text-xs ${verificationPatterns.confidenceTrends.trend === 'increasing' ? 'text-green-600' :
                                    verificationPatterns.confidenceTrends.trend === 'decreasing' ? 'text-red-600' :
                                        'text-gray-600'
                                }`}>
                                {verificationPatterns.confidenceTrends.trend}
                            </p>
                        </div>
                    )}
                </div>

                {/* Blockchain State Card */}
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900 dark:to-orange-800 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Blockchain</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {blockchainState?.activeContributors.length || '---'}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Active Contributors
                            </p>
                            {blockchainState?.latestBlock && (
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Block #{blockchainState.latestBlock.toLocaleString()}
                                </p>
                            )}
                        </div>
                        <div className={`text-xs px-2 py-1 rounded ${dataFreshness.blockchain_state
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            }`}>
                            {dataFreshness.blockchain_state ? 'Fresh' : 'Stale'}
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Updated {timeSinceUpdate.blockchain || 'never'}
                    </p>
                </div>
            </div>

            {/* Data Freshness Overview */}
            <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Data Freshness Overview
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(dataFreshness).map(([key, isFresh]) => (
                        <div key={key} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                            <div className="flex items-center space-x-2">
                                <div className={`w-2 h-2 rounded-full ${isFresh ? 'bg-green-500' : 'bg-red-500'}`} />
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                                    {key.replace('_', ' ')}
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Updated {timeSinceUpdate[key.replace('_', '')] || 'never'}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
