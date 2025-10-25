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

export default function DashboardPage() {
    const { address, isConnected } = useWeb3()
    const { campaigns, loading, error } = useCampaigns()
    const [userCampaigns, setUserCampaigns] = useState<CampaignData[]>([])
    const [userContributions, setUserContributions] = useState<CampaignData[]>([])
    const [filter, setFilter] = useState<'all' | 'my-campaigns' | 'my-contributions'>('all')

    useEffect(() => {
        if (!address || !campaigns.length) return

        // Filter campaigns created by user and campaigns where user has contributed
        const userCreated = campaigns.filter(campaign => campaign.creator.toLowerCase() === address.toLowerCase())

        // For now, we'll just show created campaigns (contribution tracking would need additional logic)
        setUserCampaigns(userCreated)
        setUserContributions([]) // Will need to implement contribution tracking
    }, [address, campaigns])

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
                                href="/"
                                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                            >
                                Home
                            </Link>
                            <Link
                                href="/kyc"
                                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                            >
                                KYC
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
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-xl font-semibold text-gray-900">
                            {filter === 'my-campaigns' && 'My Campaigns'}
                            {filter === 'my-contributions' && 'My Contributions'}
                            {filter === 'all' && 'All Campaigns'}
                        </h2>
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
            </div>
        </div>
    )
}
