'use client';

import { useState } from 'react';

interface KYCVerificationProps {
    walletAddress: string;
    onVerificationComplete: (status: 'verified' | 'rejected' | 'pending') => void;
    onClose: () => void;
}

interface FormData {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    country: string;
    dateOfBirth: string;
}

export default function KYCVerification({ walletAddress, onVerificationComplete, onClose }: KYCVerificationProps) {
    const [currentStep, setCurrentStep] = useState<'form' | 'reviewing' | 'minting_nft' | 'completed'>('form');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState<FormData>({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        country: '',
        dateOfBirth: ''
    });

    const updateFormData = (field: keyof FormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const validateForm = () => {
        if (!formData.firstName.trim() || !formData.lastName.trim()) {
            return 'First and last name are required';
        }
        if (!formData.email.trim() || !formData.email.includes('@')) {
            return 'Valid email is required';
        }
        if (!formData.country.trim()) {
            return 'Country is required';
        }
        if (!formData.dateOfBirth) {
            return 'Date of birth is required';
        }

        // Check if date is not in the future
        const birthDate = new Date(formData.dateOfBirth);
        const today = new Date();
        if (birthDate > today) {
            return 'Date of birth cannot be in the future';
        }

        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const validationError = validateForm();
        if (validationError) {
            setError(validationError);
            return;
        }

        setIsSubmitting(true);
        setCurrentStep('reviewing');

        try {
            // First submit the form data
            const submitResponse = await fetch('/api/kyc/submit-form', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    walletAddress,
                    ...formData
                }),
            });

            if (!submitResponse.ok) {
                throw new Error('Failed to submit verification form');
            }

            // Then mint the NFT
            setCurrentStep('minting_nft');

            const mintResponse = await fetch('/api/kyc/verify-and-mint', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    walletAddress,
                    kycProvider: 'custom_form',
                    verificationLevel: 'Full',
                    metadataURI: '',
                    userData: formData
                }),
            });

            if (mintResponse.ok) {
                const mintResult = await mintResponse.json();
                console.log('NFT minted successfully:', mintResult);
                setCurrentStep('completed');
                onVerificationComplete('verified');
            } else {
                const errorText = await mintResponse.text();
                console.error('Failed to mint NFT:', errorText);
                setError('NFT minting failed. Please try again.');
                setCurrentStep('form');
                onVerificationComplete('rejected');
            }
        } catch (error) {
            console.error('Error during verification submission:', error);
            setError(error instanceof Error ? error.message : 'Verification failed. Please try again.');
            setCurrentStep('form');
            onVerificationComplete('rejected');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">
                        KYC Verification Required
                    </h2>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                    >
                        ×
                    </button>
                </div>

                {/* Content */}
                <div>
                    {error && (
                        <div className="mb-6">
                            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                                <p className="text-red-600 text-sm">{error}</p>
                            </div>
                        </div>
                    )}

                    {currentStep === 'form' && (
                        <div>
                            <div className="mb-6">
                                <p className="text-gray-600 text-sm">
                                    Complete your identity verification to unlock campaign creation. Your information is securely stored and used only for verification purposes.
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* Name Fields */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                                            First Name *
                                        </label>
                                        <input
                                            type="text"
                                            id="firstName"
                                            value={formData.firstName}
                                            onChange={(e) => updateFormData('firstName', e.target.value)}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                                            Last Name *
                                        </label>
                                        <input
                                            type="text"
                                            id="lastName"
                                            value={formData.lastName}
                                            onChange={(e) => updateFormData('lastName', e.target.value)}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Email */}
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                        Email Address *
                                    </label>
                                    <input
                                        type="email"
                                        id="email"
                                        value={formData.email}
                                        onChange={(e) => updateFormData('email', e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        required
                                    />
                                </div>

                                {/* Phone */}
                                <div>
                                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                                        Phone Number
                                    </label>
                                    <input
                                        type="tel"
                                        id="phone"
                                        value={formData.phone}
                                        onChange={(e) => updateFormData('phone', e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                {/* Country and Date of Birth */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
                                            Country *
                                        </label>
                                        <input
                                            type="text"
                                            id="country"
                                            value={formData.country}
                                            onChange={(e) => updateFormData('country', e.target.value)}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="e.g., United States"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-1">
                                            Date of Birth *
                                        </label>
                                        <input
                                            type="date"
                                            id="dateOfBirth"
                                            value={formData.dateOfBirth}
                                            onChange={(e) => updateFormData('dateOfBirth', e.target.value)}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            required
                                            max={new Date().toISOString().split('T')[0]}
                                        />
                                    </div>
                                </div>

                                {/* Submit Button */}
                                <div className="pt-4">
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isSubmitting ? 'Submitting...' : 'Complete Verification'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {currentStep === 'reviewing' && (
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                            <p className="text-gray-600 mb-2">Submitting verification data...</p>
                            <p className="text-sm text-gray-500">Please wait while we process your information.</p>
                        </div>
                    )}

                    {currentStep === 'minting_nft' && (
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                            <p className="text-gray-600 mb-2">Processing blockchain transaction...</p>
                            <p className="text-sm text-gray-500">
                                Please approve the NFT minting transaction in your wallet to complete verification.
                            </p>
                            <p className="text-sm text-gray-500 mt-2">
                                This transaction will confirm your identity verification status.
                            </p>
                        </div>
                    )}

                    {currentStep === 'completed' && (
                        <div className="text-center">
                            <div className="bg-green-50 border border-green-200 rounded-md p-6 mb-4">
                                <div className="w-16 h-16 bg-green-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-bold text-green-900 mb-2">Verification Complete!</h3>
                                <p className="text-green-800 text-sm">
                                    Your NFT verification badge has been minted on the blockchain.
                                    You can now create campaigns and access all creator features.
                                </p>
                            </div>
                            <button
                                onClick={handleClose}
                                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-medium"
                            >
                                Start Creating Campaigns
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="text-center text-xs text-gray-500 mt-6">
                    <p>
                        This verification is required to comply with regulations and prevent fraud.
                        Your data is securely handled by Ballerine and will not be shared.
                    </p>
                </div>
            </div>
        </div>
    );
}
