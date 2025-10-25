'use client';

import { useState, useEffect } from 'react';
import { useVeriffSDK } from '../hooks/useVeriffSDK';

interface KYCVerificationProps {
    walletAddress: string;
    onVerificationComplete: (status: 'verified' | 'rejected' | 'pending') => void;
    onClose: () => void;
}

export default function KYCVerification({ walletAddress, onVerificationComplete, onClose }: KYCVerificationProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentStep, setCurrentStep] = useState<'initializing' | 'ready' | 'verifying' | 'completed'>('initializing');

    const {
        isSDKLoaded,
        isInitialized,
        session,
        error: sdkError,
        initializeSDK,
        startVerification,
        checkStatus,
        cleanup
    } = useVeriffSDK();

    // Initialize Veriff SDK when component mounts
    useEffect(() => {
        const initializeVeriff = async () => {
            try {
                setIsLoading(true);
                setError(null);

                // Get SDK configuration from backend
                const response = await fetch('/api/kyc/sdk-config');
                if (!response.ok) {
                    throw new Error('Failed to get SDK configuration');
                }

                const result = await response.json();
                if (!result.success) {
                    throw new Error(result.error || 'Failed to get SDK configuration');
                }

                const sdkConfig = result.data;

                // Initialize SDK with configuration
                await initializeSDK({
                    host: sdkConfig.host,
                    apiKey: sdkConfig.apiKey,
                    parentId: 'veriff-root',
                    onSession: (err: any, response: any) => {
                        console.log('Veriff session callback:', { err, response });
                    },
                    onFinished: (err: any, response: any) => {
                        console.log('Veriff verification finished:', { err, response });

                        if (err) {
                            setError(`Verification failed: ${err.message || 'Unknown error'}`);
                            onVerificationComplete('rejected');
                            return;
                        }

                        if (response && response.status) {
                            let status: 'verified' | 'rejected' | 'pending';
                            switch (response.status.toLowerCase()) {
                                case 'success':
                                case 'approved':
                                    status = 'verified';
                                    break;
                                case 'declined':
                                case 'rejected':
                                    status = 'rejected';
                                    break;
                                default:
                                    status = 'pending';
                            }

                            setCurrentStep('completed');
                            onVerificationComplete(status);
                        }
                    },
                    onEvent: (eventName: string, data?: any) => {
                        console.log('Veriff event:', eventName, data);

                        switch (eventName) {
                            case 'started':
                                setCurrentStep('verifying');
                                break;
                            case 'finished':
                                setCurrentStep('completed');
                                break;
                            case 'aborted':
                                setError('Verification was cancelled');
                                onVerificationComplete('rejected');
                                break;
                        }
                    }
                });

                setCurrentStep('ready');
                setIsLoading(false);

            } catch (error) {
                console.error('Failed to initialize Veriff SDK:', error);
                setError(error instanceof Error ? error.message : 'Failed to initialize verification');
                setIsLoading(false);
            }
        };

        initializeVeriff();

        // Cleanup on unmount
        return () => {
            cleanup();
        };
    }, [initializeSDK, cleanup, onVerificationComplete]);

    // Handle SDK errors
    useEffect(() => {
        if (sdkError) {
            setError(sdkError);
            onVerificationComplete('rejected');
        }
    }, [sdkError, onVerificationComplete]);

    const handleStartVerification = async () => {
        try {
            setError(null);
            setCurrentStep('verifying');

            await startVerification(walletAddress, {
                firstName: 'User',
                lastName: 'Unknown'
            });

        } catch (error) {
            console.error('Failed to start verification:', error);
            setError(error instanceof Error ? error.message : 'Failed to start verification');
            setCurrentStep('ready');
            onVerificationComplete('rejected');
        }
    };

    const handleClose = () => {
        cleanup();
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
                <div className="text-center">
                    {error ? (
                        <div className="mb-6">
                            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                                <p className="text-red-600 text-sm">{error}</p>
                            </div>
                            <button
                                onClick={handleClose}
                                className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
                            >
                                Close
                            </button>
                        </div>
                    ) : isLoading ? (
                        <div className="mb-6">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                            <p className="text-gray-600">Initializing Veriff verification...</p>
                        </div>
                    ) : currentStep === 'ready' ? (
                        <div className="mb-6">
                            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
                                <p className="text-blue-800 text-sm">
                                    You need to complete identity verification using Veriff before creating a campaign.
                                </p>
                            </div>
                            <button
                                onClick={handleStartVerification}
                                className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 font-medium"
                            >
                                Start Verification
                            </button>
                        </div>
                    ) : currentStep === 'verifying' ? (
                        <div className="mb-6">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                            <p className="text-gray-600">Redirecting to Veriff verification...</p>
                            <p className="text-sm text-gray-500 mt-2">
                                Please complete the verification in the new window.
                            </p>
                        </div>
                    ) : currentStep === 'completed' ? (
                        <div className="mb-6">
                            <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
                                <p className="text-green-800 text-sm">
                                    Verification completed! You can now create campaigns.
                                </p>
                            </div>
                            <button
                                onClick={handleClose}
                                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                            >
                                Continue
                            </button>
                        </div>
                    ) : null}
                </div>

                {/* Footer */}
                <div className="text-center text-xs text-gray-500 mt-6">
                    <p>
                        This verification is required to comply with regulations and prevent fraud.
                        Your data is securely handled by Veriff and will not be shared.
                    </p>
                </div>
            </div>
        </div>
    );
}
