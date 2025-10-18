'use client';

import React, { useState, useEffect } from 'react';
import { useBlockscout } from '../hooks/useBlockscout';
import { TransactionInfo, EventLog } from '../lib/blockscout';

interface TransactionTrackerProps {
    txHash: string;
    showEvents?: boolean;
    contractAddress?: string;
}

/**
 * Component for tracking transaction details and related events via Blockscout
 */
export function TransactionTracker({
    txHash,
    showEvents = false,
    contractAddress
}: TransactionTrackerProps) {
    const { getTransactionDetails, getContractEvents, loading, error } = useBlockscout();

    const [transaction, setTransaction] = useState<TransactionInfo | null>(null);
    const [events, setEvents] = useState<EventLog[]>([]);

    useEffect(() => {
        if (txHash) {
            loadTransactionData();
        }
    }, [txHash]);

    const loadTransactionData = async () => {
        if (!txHash) return;

        // Get transaction details
        const txData = await getTransactionDetails(txHash);
        setTransaction(txData);

        // Get contract events if requested
        if (showEvents && contractAddress) {
            const eventData = await getContractEvents(contractAddress);
            setEvents(eventData);
        }
    };

    const formatTimestamp = (timestamp: string) => {
        return new Date(parseInt(timestamp) * 1000).toLocaleString();
    };

    const formatAddress = (address: string) => {
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    if (loading) {
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-600">Error loading transaction: {error}</p>
                <button
                    onClick={loadTransactionData}
                    className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                    Retry
                </button>
            </div>
        );
    }

    if (!transaction) {
        return (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-600">Transaction not found or still pending</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Transaction Details</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                    <span className="font-medium text-gray-600">Hash:</span>
                    <div className="font-mono text-xs mt-1 break-all">{transaction.hash}</div>
                </div>

                <div>
                    <span className="font-medium text-gray-600">Block:</span>
                    <div className="mt-1">{transaction.blockNumber}</div>
                </div>

                <div>
                    <span className="font-medium text-gray-600">From:</span>
                    <div className="font-mono text-xs mt-1">
                        {formatAddress(transaction.from)}
                    </div>
                </div>

                <div>
                    <span className="font-medium text-gray-600">To:</span>
                    <div className="font-mono text-xs mt-1">
                        {formatAddress(transaction.to)}
                    </div>
                </div>

                <div>
                    <span className="font-medium text-gray-600">Value:</span>
                    <div className="mt-1">{transaction.value} wei</div>
                </div>

                <div>
                    <span className="font-medium text-gray-600">Gas Used:</span>
                    <div className="mt-1">{transaction.gasUsed}</div>
                </div>

                <div>
                    <span className="font-medium text-gray-600">Status:</span>
                    <div className="mt-1">
                        <span className={`px-2 py-1 rounded text-xs ${transaction.status
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                            }`}>
                            {transaction.status ? 'Success' : 'Failed'}
                        </span>
                    </div>
                </div>

                <div>
                    <span className="font-medium text-gray-600">Timestamp:</span>
                    <div className="mt-1">{formatTimestamp(transaction.timestamp)}</div>
                </div>
            </div>

            {/* Blockscout Link */}
            <div className="mt-6 pt-4 border-t">
                <a
                    href={`${process.env.NEXT_PUBLIC_BLOCKSCOUT_BASE_URL}/tx/${transaction.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    View on Blockscout ↗
                </a>
            </div>

            {/* Contract Events */}
            {showEvents && events.length > 0 && (
                <div className="mt-6 pt-6 border-t">
                    <h4 className="text-md font-semibold mb-4">Contract Events</h4>
                    <div className="space-y-3">
                        {events.slice(0, 10).map((event, index) => (
                            <div key={index} className="bg-gray-50 rounded p-3 text-xs">
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <span className="font-medium">Block:</span> {event.blockNumber}
                                    </div>
                                    <div>
                                        <span className="font-medium">Log Index:</span> {event.logIndex}
                                    </div>
                                </div>
                                <div className="mt-2">
                                    <span className="font-medium">Data:</span>
                                    <div className="font-mono break-all mt-1">{event.data}</div>
                                </div>
                            </div>
                        ))}
                        {events.length > 10 && (
                            <p className="text-gray-500 text-center">
                                And {events.length - 10} more events...
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
