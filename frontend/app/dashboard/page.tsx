'use client';

import Link from 'next/link'

// Force dynamic rendering to avoid SSR issues with Wagmi
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { WalletConnect } from '../../components/WalletConnect'
import { CampaignCard } from '../../components/CampaignCard'
import { useWeb3 } from '../../hooks/useWeb3'
import { useCampaigns } from '../../hooks/useCampaigns'
import { CampaignData } from '../../lib/contracts'

interface NFTDetails {
    tokenId: string;
    walletAddress: string;
    verifiedAt: string;
    kycProvider: string;
    verificationLevel: string;
    metadataURI: string;
    isActive: boolean;
    contractAddress: string;
}

export default function DashboardPage() {
    const { address, isConnected } = useWeb3()
    const { campaigns, loading, error } = useCampaigns()
    const [userCampaigns, setUserCampaigns] = useState<CampaignData[]>([])
    const [userContributions, setUserContributions] = useState<CampaignData[]>([])
    const [filter, setFilter] = useState<'all' | 'my-campaigns' | 'my-contributions'>('all')
    const [activeTab, setActiveTab] = useState<'overview' | 'nft' | 'campaigns'>('overview')
    const [nftDetails, setNftDetails] = useState<NFTDetails | null>(null)
    const [nftLoading, setNftLoading] = useState(false)

    useEffect(() => {
        if (!address || !campaigns.length) return

        // Filter campaigns created by user and campaigns where user has contributed
        const userCreated = campaigns.filter(campaign => campaign.creator.toLowerCase() === address.toLowerCase())

        // For now, we'll just show created campaigns (contribution tracking would need additional logic)
        setUserCampaigns(userCreated)
        setUserContributions([]) // Will need to implement contribution tracking
    }, [address, campaigns])

    useEffect(() => {
        const fetchNFTDetails = async () => {
            if (!address) return;

            setNftLoading(true);
            try {
                const response = await fetch(`/api/kyc/nft/${address}`);
                if (response.ok) {
                    const result = await response.json();
                    if (result.success) {
                        setNftDetails(result.data);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch NFT details:', error);
            } finally {
                setNftLoading(false);
            }
        };

        if (isConnected && address) {
            fetchNFTDetails();
        }
    }, [address, isConnected])

    const getDisplayedCampaigns = () => {
        switch (filter) {
            case 'my-campaigns':
                return userCampaigns
            case 'my-contributions':
                return userContributions
            default:
                return campaigns
        }
    }

    if (!isConnected) {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="text-center">
                        <h1 className="text-3xl font-bold text-gray-900 mb-4">Dashboard</h1>
                        <p className="text-gray-600 mb-8">Connect your wallet to view your campaigning and contribution activity</p>
                        <WalletConnect />
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div className="flex items-center">
                            <Link href="/" className="text-2xl font-bold text-gray-900">
                                AutoCrowd
                            </Link>
                        </div>
                        <nav className="flex items-center space-x-6">
                            <Link
                                href="/dashboard/nft"
                                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                            >
                                NFT
                            </Link>
                            <Link
                                href="/create"
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
                            >
                                Create Campaign
                            </Link>
                            <WalletConnect />
                        </nav>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200 mb-8">
                    <nav className="-mb-px flex space-x-8">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`py-2 px-1 border-b-2 font-medium text-sm ${
                                activeTab === 'overview'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            Overview
                        </button>
                        <button
                            onClick={() => setActiveTab('nft')}
                            className={`py-2 px-1 border-b-2 font-medium text-sm ${
                                activeTab === 'nft'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            Verification NFT
                        </button>
                        <button
                            onClick={() => setActiveTab('campaigns')}
                            className={`py-2 px-1 border-b-2 font-medium text-sm ${
                                activeTab === 'campaigns'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            Campaigns
                        </button>
                    </nav>
                </div>

                {/* Tab Content */}
                {activeTab === 'overview' && (
                    <>
                        {/* Verification NFT Section */}
                        <div className="bg-white rounded-lg shadow p-6 mb-8">
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">Verification Status</h2>
                            {nftLoading ? (
                                <div className="animate-pulse">
                                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                </div>
                            ) : nftDetails ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <h3 className="text-lg font-medium text-green-600 mb-2">
                                            ✅ Verified Creator
                                        </h3>
                                        <div className="space-y-2">
                                            <div>
                                                <span className="text-sm font-medium text-gray-700">NFT ID:</span>
                                                <span className="ml-2 text-sm text-gray-600">{nftDetails.tokenId}</span>
                                            </div>
                                            <div>
                                        <span className="text-sm font-medium text-gray-700">Provider:</span>
                                        <span className="ml-2 text-sm text-gray-600">{nftDetails.kycProvider === 'custom_form' ? 'Custom Form' : nftDetails.kycProvider}</span>
                                            </div>
                                            <div>
                                                <span className="text-sm font-medium text-gray-700">Level:</span>
                                                <span className="ml-2 text-sm text-gray-600">{nftDetails.verificationLevel}</span>
                                            </div>
                                            <div>
                                                <span className="text-sm font-medium text-gray-700">Status:</span>
                                                <span className={`ml-2 text-sm font-medium ${nftDetails.isActive ? 'text-green-600' : 'text-red-600'}`}>
                                                    {nftDetails.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="text-md font-medium text-gray-700 mb-2">Verified On</h4>
                                        <p className="text-sm text-gray-600">
                                            {new Date(Number(nftDetails.verifiedAt) * 1000).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </p>
                                        <div className="mt-4">
                                            <Link
                                                href="/verification"
                                                className="text-blue-600 hover:text-blue-500 text-sm font-medium"
                                            >
                                                View verification details →
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <div className="text-red-600 mb-2">
                                        <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.696-.833-2.464 0L4.316 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg font-medium text-red-600 mb-2">Not Verified</h3>
                                    <p className="text-sm text-gray-600 mb-4">
                                        You need to complete KYC verification to create campaigns and receive funding.
                                    </p>
                                    <Link
                                        href="/verification"
                                        className="bg-red-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-red-700"
                                    >
                                        Get Verified
                                    </Link>
                                </div>
                            )}
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <div className="bg-white rounded-lg shadow p-6">
                                <h3 className="text-lg font-medium text-gray-900 mb-2">My Campaigns</h3>
                                <p className="text-3xl font-bold text-blue-600">{userCampaigns.length}</p>
                                <p className="text-sm text-gray-600">Active campaigns created</p>
                            </div>
                            <div className="bg-white rounded-lg shadow p-6">
                                <h3 className="text-lg font-medium text-gray-900 mb-2">My Contributions</h3>
                                <p className="text-3xl font-bold text-green-600">{userContributions.length}</p>
                                <p className="text-sm text-gray-600">Campaigns supported</p>
                            </div>
                            <div className="bg-white rounded-lg shadow p-6">
                                <h3 className="text-lg font-medium text-gray-900 mb-2">Active Campaigns</h3>
                                <p className="text-3xl font-bold text-purple-600">{campaigns.filter(c => c.isActive).length}</p>
                                <p className="text-sm text-gray-600">Total active campaigns</p>
                            </div>
                        </div>

                        {/* Campaigns List */}
                        <div className="bg-white rounded-lg shadow">
                            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                                <h2 className="text-xl font-semibold text-gray-900">Campaigns</h2>
                                <div className="flex items-center space-x-4">
                                    <span className="text-sm text-gray-600">Filter by:</span>
                                    <select
                                        value={filter}
                                        onChange={(e) => setFilter(e.target.value as any)}
                                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="all">All Campaigns</option>
                                        <option value="my-campaigns">My Campaigns</option>
                                        <option value="my-contributions">My Contributions</option>
                                    </select>
                                </div>
                            </div>

                            <div className="p-6">
                                {loading && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {[...Array(6)].map((_, i) => (
                                            <div key={i} className="bg-gray-100 rounded-lg p-6 animate-pulse">
                                                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                                                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                                                <div className="h-6 bg-gray-200 rounded mb-4"></div>
                                                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {error && (
                                    <div className="text-center py-12">
                                        <p className="text-red-600">Error loading campaigns: {error}</p>
                                    </div>
                                )}

                                {!loading && !error && getDisplayedCampaigns().length === 0 && (
                                    <div className="text-center py-12">
                                        {filter === 'my-campaigns' && (
                                            <>
                                                <p className="text-gray-600 mb-4">You haven't created any campaigns yet.</p>
                                                <Link
                                                    href="/create"
                                                    className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700"
                                                >
                                                    Create Your First Campaign
                                                </Link>
                                            </>
                                        )}
                                        {filter === 'my-contributions' && (
                                            <p className="text-gray-600">You haven't contributed to any campaigns yet.</p>
                                        )}
                                        {filter === 'all' && (
                                            <p className="text-gray-600">No campaigns found.</p>
                                        )}
                                    </div>
                                )}

                                {!loading && !error && getDisplayedCampaigns().length > 0 && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {getDisplayedCampaigns().map((campaign) => (
                                            <CampaignCard key={campaign.campaignAddress} campaign={campaign} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'nft' && (
                    <div className="bg-white rounded-lg shadow p-8">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">Verification NFT</h2>
                            <p className="text-gray-600">
                                Your verification status is represented by an on-chain NFT that proves your identity verification.
                            </p>
                        </div>

                        {nftLoading ? (
                            <div className="animate-pulse flex justify-center">
                                <div className="h-48 w-48 bg-gray-200 rounded-lg"></div>
                            </div>
                        ) : nftDetails ? (
                            <div className="max-w-2xl mx-auto">
                                <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl p-8 mb-6">
                                    <div className="text-center">
                                        <div className="w-24 h-24 bg-blue-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                                            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-900 mb-2">Verified Creator NFT</h3>
                                        <p className="text-sm text-gray-600 mb-4">Your identity has been successfully verified</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Token ID</label>
                                            <div className="bg-gray-50 px-3 py-2 rounded-lg font-mono text-sm">{nftDetails.tokenId}</div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Verification Provider</label>
                                            <div className="bg-gray-50 px-3 py-2 rounded-lg">{nftDetails.kycProvider === 'custom_form' ? 'Custom Form' : nftDetails.kycProvider}</div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Verification Level</label>
                                            <div className="bg-gray-50 px-3 py-2 rounded-lg">{nftDetails.verificationLevel}</div>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                            <div className={`px-3 py-2 rounded-lg font-medium ${nftDetails.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {nftDetails.isActive ? 'Active' : 'Inactive'}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Verified On</label>
                                            <div className="bg-gray-50 px-3 py-2 rounded-lg text-sm">
                                                {new Date(Number(nftDetails.verifiedAt) * 1000).toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Contract Address</label>
                                            <div className="bg-gray-50 px-3 py-2 rounded-lg font-mono text-xs break-all">{nftDetails.contractAddress}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 text-center">
                                    <Link
                                        href="/verification"
                                        className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 inline-flex items-center"
                                    >
                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                        View Verification Details
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <div className="text-red-600 mb-6">
                                    <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.696-.833-2.464 0L4.316 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-medium text-red-600 mb-4">No Verification NFT Found</h3>
                                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                                    You need to complete KYC identity verification to mint your verification NFT and unlock campaign creation.
                                </p>
                                <Link
                                    href="/verification"
                                    className="bg-red-600 text-white px-8 py-4 rounded-lg text-lg font-medium hover:bg-red-700 inline-flex items-center"
                                >
                                    <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Get Verified Now
                                </Link>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'campaigns' && (
                    <div className="bg-white rounded-lg shadow">
                        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                            <h2 className="text-xl font-semibold text-gray-900">My Campaigns</h2>
                            <div className="flex items-center space-x-4">
                                <Link
                                    href="/create"
                                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
                                >
                                    Create Campaign
                                </Link>
                            </div>
                        </div>

                        <div className="p-6">
                            {loading && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {[...Array(6)].map((_, i) => (
                                        <div key={i} className="bg-gray-100 rounded-lg p-6 animate-pulse">
                                            <div className="h-4 bg-gray-200 rounded mb-2"></div>
                                            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                                            <div className="h-6 bg-gray-200 rounded mb-4"></div>
                                            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {error && (
                                <div className="text-center py-12">
                                    <p className="text-red-600">Error loading campaigns: {error}</p>
                                </div>
                            )}

                            {!loading && !error && userCampaigns.length === 0 && (
                                <div className="text-center py-12">
                                    <p className="text-gray-600 mb-4">You haven't created any campaigns yet.</p>
                                    <Link
                                        href="/create"
                                        className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700"
                                    >
                                        Create Your First Campaign
                                    </Link>
                                </div>
                            )}

                            {!loading && !error && userCampaigns.length > 0 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {userCampaigns.map((campaign) => (
                                        <CampaignCard key={campaign.campaignAddress} campaign={campaign} />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
