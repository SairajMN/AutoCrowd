'use client';

import { useState, useEffect } from 'react';
import { useBallerineSDK } from '../hooks/useBallerineSDK';

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
    } = useBallerineSDK();

    // Initialize Ballerine SDK when component mounts
    useEffect(() => {
        const initializeBallerine = async () => {
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
                    endpoint: sdkConfig.endpoint,
                    apiKey: sdkConfig.apiKey,
                    flowName: sdkConfig.flowName,
                    elements: sdkConfig.elements,
                    onSession: (err: any, response: any) => {
                        console.log('Ballerine session callback:', { err, response });
                    },
                    onFinished: (err: any, response: any) => {
                        console.log('Ballerine verification finished:', { err, response });

                        if (err) {
                            setError(`Verification failed: ${err.message || 'Unknown error'}`);
                            onVerificationComplete('rejected');
                            return;
                        }

                        if (response && response.status) {
                            let status: 'verified' | 'rejected' | 'pending';
                            switch (response.status.toLowerCase()) {
                                case 'completed':
                                case 'approved':
                                    status = 'verified';
                                    break;
                                case 'failed':
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
                        console.log('Ballerine event:', eventName, data);

                        switch (eventName) {
                            case 'flow_started':
                                setCurrentStep('verifying');
                                break;
                            case 'flow_completed':
                                setCurrentStep('completed');
                                break;
                            case 'flow_failed':
                                setError('Verification was cancelled or failed');
                                onVerificationComplete('rejected');
                                break;
                        }
                    }
                });

                setCurrentStep('ready');
                setIsLoading(false);

            } catch (error) {
                console.error('Failed to initialize Ballerine SDK:', error);
                setError(error instanceof Error ? error.message : 'Failed to initialize verification');
                setIsLoading(false);
            }
        };

        initializeBallerine();

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
                            <p className="text-gray-600">Initializing Ballerine verification...</p>
                        </div>
                    ) : currentStep === 'ready' ? (
                        <div className="mb-6">
                            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
                                <p className="text-blue-800 text-sm">
                                    You need to complete identity verification using Ballerine before creating a campaign.
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
                            <p className="text-gray-600">Redirecting to Ballerine verification...</p>
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
                        Your data is securely handled by Ballerine and will not be shared.
                    </p>
                </div>
            </div>
        </div>
    );
}
