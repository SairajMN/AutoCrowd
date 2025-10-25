'use client';

import Link from 'next/link'

// Force dynamic rendering to avoid SSR issues with Wagmi
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { WalletConnect } from '../../components/WalletConnect'
import KYCVerification from '../../components/KYCVerification'
import { useWeb3 } from '../../hooks/useWeb3'

export default function CreateCampaignPage() {
    const router = useRouter()
    const { createCampaign, isConnected, isCorrectNetwork, switchToNetwork, address } = useWeb3()

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        goal: '',
        duration: '',
    })

    const [milestones, setMilestones] = useState([
        { description: '', amount: '' }
    ])

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState('')
    const [showKYCModal, setShowKYCModal] = useState(false)
    const [kycStatus, setKycStatus] = useState<'checking' | 'verified' | 'unverified' | 'pending'>('checking')

    // Check KYC status when wallet is connected
    useEffect(() => {
        const checkKYCStatus = async () => {
            if (!address) return;

            try {
                setKycStatus('checking');
                const response = await fetch(`/api/kyc/status/${address}`);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const result = await response.json();
                if (result.success) {
                    const status = result.data;
                    if (status.isValid) {
                        setKycStatus('verified');
                    } else {
                        setKycStatus('unverified');
                    }
                } else {
                    setKycStatus('unverified');
                }
            } catch (error) {
                console.error('KYC status check failed:', error);
                setKycStatus('unverified');
            }
        };

        if (isConnected && address) {
            checkKYCStatus();
        }
    }, [address, isConnected]);

    const updateFormData = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const updateMilestone = (index: number, field: string, value: string) => {
        const updatedMilestones = milestones.map((milestone, i) =>
            i === index ? { ...milestone, [field]: value } : milestone
        )
        setMilestones(updatedMilestones)
    }

    const addMilestone = () => {
        setMilestones([...milestones, { description: '', amount: '' }])
    }

    const removeMilestone = (index: number) => {
        if (milestones.length > 1) {
            setMilestones(milestones.filter((_, i) => i !== index))
        }
    }

    const validateForm = () => {
        if (!formData.title.trim()) return 'Title is required'
        if (!formData.description.trim()) return 'Description is required'
        if (!formData.goal || parseFloat(formData.goal) <= 0) return 'Please enter a valid goal amount'
        if (!formData.duration || parseInt(formData.duration) <= 0) return 'Please enter a valid duration'

        const totalMilestoneAmount = milestones.reduce((sum, m) => sum + (parseFloat(m.amount) || 0), 0)
        if (totalMilestoneAmount > parseFloat(formData.goal)) {
            return 'Total milestone amounts cannot exceed the campaign goal'
        }

        for (let i = 0; i < milestones.length; i++) {
            if (!milestones[i].description.trim()) {
                return `Milestone ${i + 1} description is required`
            }
            if (!milestones[i].amount || parseFloat(milestones[i].amount) <= 0) {
                return `Please enter a valid amount for milestone ${i + 1}`
            }
        }

        return null
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        const validationError = validateForm()
        if (validationError) {
            setError(validationError)
            return
        }

        if (!isConnected) {
            setError('Please connect your wallet first')
            return
        }

        if (!isCorrectNetwork) {
            await switchToNetwork()
            return
        }

        // Check if user has NFT verification
        if (kycStatus !== 'verified') {
            // Redirect to new verification form
            router.push('/verification')
            return
        }

        setIsSubmitting(true)
        try {
            const milestoneAmounts = milestones.map(m => m.amount)
            const campaignAddress = await createCampaign(
                formData.title,
                formData.description,
                formData.goal,
                formData.duration,
                milestoneAmounts
            )

            // Redirect to the created campaign page
            router.push(`/campaign/${campaignAddress}`)
        } catch (err: any) {
            console.error('Failed to create campaign:', err)
            setError(err.message || 'Failed to create campaign. Please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleKYCComplete = (status: 'verified' | 'rejected' | 'pending') => {
        if (status === 'verified') {
            setKycStatus('verified')
            setShowKYCModal(false)
        } else if (status === 'rejected') {
            setKycStatus('unverified')
            setShowKYCModal(false)
            setError('KYC verification was rejected. You cannot create campaigns at this time.')
        }
    }

    if (!isConnected) {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="text-center">
                        <h1 className="text-3xl font-bold text-gray-900 mb-4">Create Campaign</h1>
                        <p className="text-gray-600 mb-8">Connect your wallet to create a new crowdfunding campaign</p>
                        <WalletConnect />
                        <div className="mt-8">
                            <Link
                                href="/"
                                className="text-blue-600 hover:text-blue-500"
                            >
                                ← Back to Home
                            </Link>
                        </div>
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
                        </nav>
                    </div>
                </div>
            </header>

            <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Create New Campaign</h1>
                    <p className="mt-2 text-gray-600">
                        Set up your crowdfunding campaign with milestone-based funding and AI verification
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-md p-4">
                            <p className="text-red-600 text-sm">{error}</p>
                        </div>
                    )}

                    {/* Campaign Title */}
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                            Campaign Title <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            id="title"
                            value={formData.title}
                            onChange={(e) => updateFormData('title', e.target.value)}
                            placeholder="Enter an engaging title for your campaign"
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                        />
                    </div>

                    {/* Campaign Description */}
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                            Campaign Description <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => updateFormData('description', e.target.value)}
                            placeholder="Describe your campaign goals, what you'll create, and how supporters will benefit"
                            rows={6}
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                        />
                    </div>

                    {/* Funding Goal */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="goal" className="block text-sm font-medium text-gray-700 mb-2">
                                Funding Goal (PYUSD) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                id="goal"
                                value={formData.goal}
                                onChange={(e) => updateFormData('goal', e.target.value)}
                                placeholder="100"
                                step="0.1"
                                min="0"
                                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">
                                Campaign Duration (Days) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                id="duration"
                                value={formData.duration}
                                onChange={(e) => updateFormData('duration', e.target.value)}
                                placeholder="30"
                                min="1"
                                max="365"
                                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                required
                            />
                        </div>
                    </div>

                    {/* Milestones */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <label className="block text-sm font-medium text-gray-700">
                                Milestones <span className="text-gray-500 text-xs">(Optional but recommended)</span>
                            </label>
                            <button
                                type="button"
                                onClick={addMilestone}
                                className="text-blue-600 hover:text-blue-500 text-sm font-medium"
                            >
                                + Add Milestone
                            </button>
                        </div>

                        <div className="space-y-4">
                            {milestones.map((milestone, index) => (
                                <div key={index} className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex justify-between items-start mb-3">
                                        <h4 className="text-sm font-medium text-gray-700">
                                            Milestone {index + 1}
                                        </h4>
                                        {milestones.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeMilestone(index)}
                                                className="text-red-500 hover:text-red-700 text-sm"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>

                                    <div className="space-y-3">
                                        <input
                                            type="text"
                                            value={milestone.description}
                                            onChange={(e) => updateMilestone(index, 'description', e.target.value)}
                                            placeholder="Describe what this milestone will accomplish"
                                            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                        />
                                        <input
                                            type="number"
                                            value={milestone.amount}
                                            onChange={(e) => updateMilestone(index, 'amount', e.target.value)}
                                            placeholder="Amount in PYUSD"
                                            step="0.1"
                                            min="0"
                                            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <p className="text-xs text-gray-500 mt-2">
                            Milestones define when funds are released. After completing each milestone, AI agents will verify completion before funds are released to you.
                        </p>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-6 border-t border-gray-200">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Creating Campaign...' : 'Create Campaign'}
                        </button>

                        <div className="mt-4 text-center">
                            <Link
                                href="/"
                                className="text-blue-600 hover:text-blue-500 text-sm"
                            >
                                ← Back to Home
                            </Link>
                        </div>
                    </div>
                </form>
            </div>

            {/* KYC Verification Modal */}
            {showKYCModal && address && (
                <KYCVerification
                    walletAddress={address}
                    onVerificationComplete={handleKYCComplete}
                    onClose={() => setShowKYCModal(false)}
                />
            )}
        </div>
    )
}
