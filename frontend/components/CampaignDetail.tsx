'use client';

import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '../hooks/useWeb3';
import { CampaignDetails } from '../lib/contracts';
import { CampaignActivity } from './CampaignActivity';

interface CampaignDetailProps {
    campaignAddress: string;
}

enum MilestoneState {
    Pending = 0,
    Submitted = 1,
    Voting = 2,
    Approved = 3,
    Rejected = 4
}

export function CampaignDetail({ campaignAddress }: CampaignDetailProps) {
    const { getCampaignDetails, contribute, isConnected, address, getPYUSDBalance, submitMilestone, voteOnMilestone, finalizeVoting, claimRefund } = useWeb3();

    const [campaign, setCampaign] = useState<CampaignDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [contributionAmount, setContributionAmount] = useState('');
    const [pyusdBalance, setPyusdBalance] = useState<bigint>(0n);
    const [transactionLoading, setTransactionLoading] = useState(false);
    const [milestoneReviewHash, setMilestoneReviewHash] = useState('');
    const [selectedMilestone, setSelectedMilestone] = useState<number | null>(null);

    // Load campaign details
    useEffect(() => {
        if (campaignAddress) {
            loadCampaignDetails();
        }
    }, [campaignAddress]);

    // Load PYUSD balance
    useEffect(() => {
        if (address) {
            loadPYUSDBalance();
        }
    }, [address]);

    const loadCampaignDetails = async () => {
        try {
            setLoading(true);
            const details = await getCampaignDetails(campaignAddress);
            setCampaign(details);
        } catch (err) {
            console.error('Failed to load campaign:', err);
            setError(err instanceof Error ? err.message : 'Failed to load campaign');
        } finally {
            setLoading(false);
        }
    };

    const loadPYUSDBalance = async () => {
        try {
            const balance = await getPYUSDBalance();
            setPyusdBalance(balance);
        } catch (err) {
            console.error('Failed to load PYUSD balance:', err);
        }
    };

    const handleContribute = async () => {
        if (!contributionAmount || !campaign) return;

        try {
            setTransactionLoading(true);
            await contribute(campaignAddress, contributionAmount);
            await loadCampaignDetails();
            await loadPYUSDBalance();
            setContributionAmount('');
            alert('Contribution successful!');
        } catch (err) {
            alert('Failed to contribute: ' + (err instanceof Error ? err.message : 'Unknown error'));
        } finally {
            setTransactionLoading(false);
        }
    };

    const handleSubmitMilestone = async (milestoneId: number) => {
        if (!milestoneReviewHash) return;

        try {
            setTransactionLoading(true);
            await submitMilestone(campaignAddress, milestoneId, milestoneReviewHash);
            await loadCampaignDetails();
            setMilestoneReviewHash('');
            setSelectedMilestone(null);
            alert('Milestone submitted successfully!');
        } catch (err) {
            alert('Failed to submit milestone: ' + (err instanceof Error ? err.message : 'Unknown error'));
        } finally {
            setTransactionLoading(false);
        }
    };

    const handleVote = async (milestoneId: number, support: boolean) => {
        try {
            setTransactionLoading(true);
            await voteOnMilestone(campaignAddress, milestoneId, support);
            await loadCampaignDetails();
            alert('Vote submitted successfully!');
        } catch (err) {
            alert('Failed to vote: ' + (err instanceof Error ? err.message : 'Unknown error'));
        } finally {
            setTransactionLoading(false);
        }
    };

    const handleFinalizeVoting = async (milestoneId: number) => {
        try {
            setTransactionLoading(true);
            await finalizeVoting(campaignAddress, milestoneId);
            await loadCampaignDetails();
            alert('Voting finalized!');
        } catch (err) {
            alert('Failed to finalize voting: ' + (err instanceof Error ? err.message : 'Unknown error'));
        } finally {
            setTransactionLoading(false);
        }
    };

    const handleClaimRefund = async () => {
        try {
            setTransactionLoading(true);
            await claimRefund(campaignAddress);
            await loadCampaignDetails();
            await loadPYUSDBalance();
            alert('Refund claimed successfully!');
        } catch (err) {
            alert('Failed to claim refund: ' + (err instanceof Error ? err.message : 'Unknown error'));
        } finally {
            setTransactionLoading(false);
        }
    };

    const getMilestoneStateText = (state: number) => {
        switch (state) {
            case MilestoneState.Pending: return 'Pending';
            case MilestoneState.Submitted: return 'Submitted for AI Review';
            case MilestoneState.Voting: return 'Community Voting';
            case MilestoneState.Approved: return 'Approved';
            case MilestoneState.Rejected: return 'Rejected';
        }
    };

    const getMilestoneStateColor = (state: number) => {
        switch (state) {
            case MilestoneState.Pending: return 'bg-gray-100 text-gray-800';
            case MilestoneState.Submitted: return 'bg-yellow-100 text-yellow-800';
            case MilestoneState.Voting: return 'bg-blue-100 text-blue-800';
            case MilestoneState.Approved: return 'bg-green-100 text-green-800';
            case MilestoneState.Rejected: return 'bg-red-100 text-red-800';
        }
    };

    if (loading) {
        return (
            <div className="animate-pulse space-y-6">
                <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
        );
    }

    if (error || !campaign) {
        return (
            <div className="text-center py-12">
                <p className="text-red-600">Error: {error || 'Campaign not found'}</p>
                <button
                    onClick={loadCampaignDetails}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    Retry
                </button>
            </div>
        );
    }

    const canClaimRefund = campaign.isBacker && campaign.totalGoal > campaign.totalRaised && Date.now() / 1000 > campaign.endTime;
    const canContribute = campaign.isActive && Date.now() / 1000 <= campaign.endTime;
    const isCreator = address?.toLowerCase() === campaign.creator.toLowerCase();

    return (
        <div className="max-w-4xl mx-auto">
            {/* Campaign Header */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">{campaign.title}</h1>
                        <p className="text-gray-600 mb-2">{campaign.description}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>Creator: {campaign.creator.slice(0, 6)}...{campaign.creator.slice(-4)}</span>
                            <span>Ends: {new Date(campaign.endTime * 1000).toLocaleDateString()}</span>
                        </div>
                    </div>
                    <div className={`px-3 py-1 rounded text-sm font-medium ${campaign.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {campaign.isActive ? 'Active' : 'Completed'}
                    </div>
                </div>

                {/* Progress */}
                <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                        <span>Raised: {ethers.formatEther(campaign.totalRaised)} PYUSD</span>
                        <span>Goal: {ethers.formatEther(campaign.totalGoal)} PYUSD</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${Math.min(100, Number((campaign.totalRaised * 100n) / campaign.totalGoal))}%` }}
                        ></div>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                        {Math.min(100, Number((campaign.totalRaised * 100n) / campaign.totalGoal)).toFixed(1)}% funded • {campaign.backersCount} backers
                    </p>
                </div>

                {/* Actions */}
                {canContribute && (
                    <div className="border-t pt-4 mt-4">
                        <h3 className="text-lg font-semibold mb-3">Contribute to Campaign</h3>
                        <div className="flex gap-4 items-end">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (PYUSD)</label>
                                <input
                                    type="number"
                                    value={contributionAmount}
                                    onChange={(e) => setContributionAmount(e.target.value)}
                                    placeholder="Enter amount"
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <p className="text-xs text-gray-500 mt-1">Balance: {ethers.formatEther(pyusdBalance)} PYUSD</p>
                            </div>
                            <button
                                onClick={handleContribute}
                                disabled={transactionLoading || !contributionAmount}
                                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                            >
                                {transactionLoading ? 'Contributing...' : 'Contribute'}
                            </button>
                        </div>
                    </div>
                )}

                {canClaimRefund && (
                    <div className="border-t pt-4 mt-4">
                        <button
                            onClick={handleClaimRefund}
                            disabled={transactionLoading}
                            className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                        >
                            {transactionLoading ? 'Claiming...' : 'Claim Refund'}
                        </button>
                    </div>
                )}
            </div>

            {/* Milestones */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Milestones</h2>
                <div className="space-y-4">
                    {campaign.milestones.map((milestone, index) => (
                        <div key={index} className="border rounded-lg p-4">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex-1">
                                    <h3 className="font-semibold text-gray-900">Milestone {index + 1}</h3>
                                    <p className="text-gray-600 text-sm mt-1">{milestone.description}</p>
                                </div>
                                <div className="text-right">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${getMilestoneStateColor(milestone.state)}`}>
                                        {getMilestoneStateText(milestone.state)}
                                    </span>
                                    <p className="text-sm text-gray-500 mt-1">{ethers.formatEther(milestone.amount)} PYUSD</p>
                                </div>
                            </div>

                            {/* Creator Actions */}
                            {isCreator && milestone.state === MilestoneState.Pending && (
                                <div className="border-t pt-3 mt-3">
                                    <button
                                        onClick={() => setSelectedMilestone(index)}
                                        className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                                    >
                                        Submit Milestone
                                    </button>
                                </div>
                            )}

                            {/* Voting Actions */}
                            {milestone.state === MilestoneState.Voting && campaign.isBacker && (
                                <div className="border-t pt-3 mt-3">
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={() => handleVote(index, true)}
                                            disabled={transactionLoading}
                                            className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                                        >
                                            Approve
                                        </button>
                                        <button
                                            onClick={() => handleVote(index, false)}
                                            disabled={transactionLoading}
                                            className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                                        >
                                            Reject
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">
                                        Your voting power: {campaign.userContribution ? ethers.formatEther(campaign.userContribution) : '0'} PYUSD
                                    </p>
                                </div>
                            )}

                            {/* Finalize Voting */}
                            {milestone.state === MilestoneState.Voting && Date.now() / 1000 > milestone.votingEnd && isCreator && (
                                <div className="border-t pt-3 mt-3">
                                    <button
                                        onClick={() => handleFinalizeVoting(index)}
                                        disabled={transactionLoading}
                                        className="px-4 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 disabled:opacity-50"
                                    >
                                        Finalize Voting
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Submit Milestone Modal */}
            {selectedMilestone !== null && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-semibold mb-4">Submit Milestone {selectedMilestone + 1}</h3>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                IPFS Review Hash (evidence/proof of completion)
                            </label>
                            <input
                                type="text"
                                value={milestoneReviewHash}
                                onChange={(e) => setMilestoneReviewHash(e.target.value)}
                                placeholder="Qm..."
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setSelectedMilestone(null);
                                    setMilestoneReviewHash('');
                                }}
                                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleSubmitMilestone(selectedMilestone)}
                                disabled={transactionLoading || !milestoneReviewHash}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                            >
                                {transactionLoading ? 'Submitting...' : 'Submit'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Activity */}
            <CampaignActivity campaignAddress={campaignAddress} campaignTitle={campaign.title} />
        </div>
    );
}
