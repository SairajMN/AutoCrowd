'use client';

import React, { useState, useEffect } from 'react';
import { useBlockscout } from '../hooks/useBlockscout';
import { EventLog } from '../lib/blockscout';

interface CampaignActivityProps {
    campaignAddress: string;
    campaignTitle?: string;
}

interface CampaignEvent {
    type: 'contribution' | 'milestone' | 'verification' | 'fundRelease';
    blockNumber: number;
    logIndex: number;
    timestamp?: number;
    contributor?: string;
    amount?: string;
    milestoneId?: number;
    approved?: boolean;
}

/**
 * Component for displaying campaign activity via Blockscout
 */
export function CampaignActivity({ campaignAddress, campaignTitle }: CampaignActivityProps) {
    const { getCampaignEvents, loading, error } = useBlockscout();

    const [events, setEvents] = useState<CampaignEvent[]>([]);
    const [filter, setFilter] = useState<'all' | 'contributions' | 'milestones' | 'verifications'>('all');

    useEffect(() => {
        if (campaignAddress) {
            loadCampaignActivity();
        }
    }, [campaignAddress]);

    const loadCampaignActivity = async () => {
        const eventTypes = filter === 'all' ? undefined : {
            contributions: filter === 'contributions',
            milestones: filter === 'milestones',
            verifications: filter === 'verifications',
            fundReleases: true
        };

        const campaignEvents = await getCampaignEvents(campaignAddress, eventTypes);
        const parsedEvents = parseCampaignEvents(campaignEvents);
        setEvents(parsedEvents);
    };

    useEffect(() => {
        loadCampaignActivity();
    }, [filter]);

    const parseCampaignEvents = (rawEvents: EventLog[]): CampaignEvent[] => {
        const parsed: CampaignEvent[] = [];

        for (const event of rawEvents) {
            try {
                // This is a simplified parsing. In production, you'd use ethers.js to properly decode events
                const eventSig = event.topics[0];

                if (eventSig === '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925') {
                    // ContributionMade(address indexed contributor, uint256 amount)
                    parsed.push({
                        type: 'contribution',
                        blockNumber: parseInt(event.blockNumber),
                        logIndex: parseInt(event.logIndex),
                        contributor: '0x' + event.topics[1].slice(26), // Extract address from topic
                        amount: parseInt(event.data, 16).toString() // Simplified amount parsing
                    });
                } else if (eventSig === '0x5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e58efa934280731972c69ca9ae') {
                    // MilestoneSubmitted(uint256 indexed milestoneId, string reviewHash)
                    parsed.push({
                        type: 'milestone',
                        blockNumber: parseInt(event.blockNumber),
                        logIndex: parseInt(event.logIndex),
                        milestoneId: parseInt(event.topics[1], 16)
                    });
                } else if (eventSig === '0x3a52c60c480a6ded66c2d4dd7bae7b59dd140c64aea8c44efacdf7c8ad9c9bd32') {
                    // MilestoneVerified(uint256 indexed milestoneId, bool approved)
                    parsed.push({
                        type: 'verification',
                        blockNumber: parseInt(event.blockNumber),
                        logIndex: parseInt(event.logIndex),
                        milestoneId: parseInt(event.topics[1], 16),
                        approved: event.data !== '0x0000000000000000000000000000000000000000000000000000000000000000'
                    });
                }
            } catch (err) {
                console.warn('Failed to parse event:', event, err);
            }
        }

        return parsed.sort((a, b) => {
            if (a.blockNumber !== b.blockNumber) return b.blockNumber - a.blockNumber;
            return b.logIndex - a.logIndex;
        });
    };

    const getEventIcon = (type: string) => {
        switch (type) {
            case 'contribution': return '💰';
            case 'milestone': return '🎯';
            case 'verification': return '✅';
            case 'fundRelease': return '💸';
            default: return '📄';
        }
    };

    const getEventDescription = (event: CampaignEvent) => {
        switch (event.type) {
            case 'contribution':
                return `Contribution of ${event.amount} PYUSD from ${event.contributor?.slice(0, 6)}...${event.contributor?.slice(-4)}`;
            case 'milestone':
                return `Milestone ${event.milestoneId} submitted for AI verification`;
            case 'verification':
                return `Milestone ${event.milestoneId} ${event.approved ? 'approved' : 'rejected'} by AI`;
            case 'fundRelease':
                return `Funds released for milestone ${event.milestoneId}`;
            default:
                return 'Unknown event';
        }
    };

    const getEventColor = (type: string) => {
        switch (type) {
            case 'contribution': return 'text-green-800 bg-green-100';
            case 'milestone': return 'text-blue-800 bg-blue-100';
            case 'verification': return 'text-purple-800 bg-purple-100';
            case 'fundRelease': return 'text-yellow-800 bg-yellow-100';
            default: return 'text-gray-800 bg-gray-100';
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-600">Error loading campaign activity: {error}</p>
                <button
                    onClick={loadCampaignActivity}
                    className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="text-lg font-semibold">
                        {campaignTitle ? `${campaignTitle} Activity` : 'Campaign Activity'}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                        Block #{events[0]?.blockNumber || 'Latest'}
                    </p>
                </div>

                <div className="flex gap-2">
                    {['all', 'contributions', 'milestones', 'verifications'].map((filterOption) => (
                        <button
                            key={filterOption}
                            onClick={() => setFilter(filterOption as any)}
                            className={`px-3 py-1 text-xs rounded capitalize ${filter === filterOption
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                                }`}
                        >
                            {filterOption}
                        </button>
                    ))}
                </div>
            </div>

            {events.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    <p>No activity found for this campaign</p>
                    <button
                        onClick={loadCampaignActivity}
                        className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Refresh
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {events.map((event, index) => (
                        <div key={index} className="flex items-start gap-4 p-4 border rounded-lg">
                            <div className="text-2xl">{getEventIcon(event.type)}</div>

                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className={`px-2 py-1 text-xs rounded capitalize ${getEventColor(event.type)}`}>
                                        {event.type}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        Block {event.blockNumber}
                                    </span>
                                </div>

                                <p className="text-sm text-gray-700">
                                    {getEventDescription(event)}
                                </p>

                                <div className="mt-2 flex items-center gap-4">
                                    <a
                                        href={`${process.env.NEXT_PUBLIC_BLOCKSCOUT_BASE_URL}/tx/${campaignAddress}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-blue-600 hover:text-blue-800"
                                    >
                                        View on Blockscout ↗
                                    </a>
                                </div>
                            </div>
                        </div>
                    ))}

                    <div className="text-center pt-4">
                        <button
                            onClick={loadCampaignActivity}
                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded"
                        >
                            Load More Activity
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
