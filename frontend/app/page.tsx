'use client';

import Link from 'next/link'

// Force dynamic rendering to avoid SSR issues with Wagmi
export const dynamic = 'force-dynamic'
import { WalletConnect } from '../components/WalletConnect'
import { CampaignCard } from '../components/CampaignCard'
import { useCampaigns } from '../hooks/useCampaigns'

export default function HomePage() {
    const { campaigns, loading, error } = useCampaigns()

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div className="flex items-center">
                            <h1 className="text-2xl font-bold text-gray-900">AutoCrowd</h1>
                            <span className="ml-2 text-sm text-gray-500">AI-Powered Crowdfunding</span>
                        </div>
                        <div className="flex items-center space-x-4">
                            <Link
                                href="/verification"
                                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                            >
                                Get Verified
                            </Link>
                            <Link
                                href="/dashboard"
                                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                            >
                                Dashboard
                            </Link>
                            <WalletConnect />
                        </div>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-4xl font-bold text-gray-900 sm:text-5xl">
                        Crowdfunding with AI Verification
                    </h2>
                    <p className="mt-4 text-xl text-gray-600">
                        Launch campaigns with milestone-based funding, verified by artificial intelligence.
                        Transparent, secure, and automated milestone releases.
                    </p>
                    <div className="mt-8">
                        <Link
                            href="/create"
                            className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                        >
                            Create Campaign
                        </Link>
                    </div>
                </div>
            </section>

            {/* Campaigns Grid */}
            <section className="py-8 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <h3 className="text-2xl font-bold text-gray-900 mb-8">Active Campaigns</h3>

                    {loading && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
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

                    {!loading && !error && campaigns.length === 0 && (
                        <div className="text-center py-12">
                            <p className="text-gray-600">No active campaigns yet. Be the first to create one!</p>
                        </div>
                    )}

                    {!loading && !error && campaigns.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {campaigns.map((campaign) => (
                                <CampaignCard key={campaign.campaignAddress} campaign={campaign} />
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* Features Section */}
            <section className="bg-white py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <h3 className="text-2xl font-bold text-gray-900 text-center mb-8">How It Works</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="text-center">
                            <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl">🚀</span>
                            </div>
                            <h4 className="text-lg font-semibold mb-2">Create Campaign</h4>
                            <p className="text-gray-600">Set your funding goal and define milestones with AI verification</p>
                        </div>
                        <div className="text-center">
                            <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl">🤖</span>
                            </div>
                            <h4 className="text-lg font-semibold mb-2">AI Verification</h4>
                            <p className="text-gray-600">AI agents review milestone completion before fund release</p>
                        </div>
                        <div className="text-center">
                            <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl">💰</span>
                            </div>
                            <h4 className="text-lg font-semibold mb-2">Fund Release</h4>
                            <p className="text-gray-600">Funds automatically released upon successful milestone verification</p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}
