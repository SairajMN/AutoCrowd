import { useState, useEffect, useCallback, useRef } from 'react';

interface BallerineSDKConfig {
    endpoint: string;
    apiKey: string;
    flowName?: string;
    elements?: any;
    onSession?: (err: any, response: any) => void;
    onFinished?: (err: any, response: any) => void;
    onEvent?: (eventName: string, data?: any) => void;
}

interface BallerineSession {
    sessionId: string;
    ballerineSessionId: string;
    verificationUrl: string;
    status: 'pending' | 'verified' | 'rejected' | 'expired';
    expiresAt: Date;
    sdkConfig: BallerineSDKConfig;
}

interface UseBallerineSDKReturn {
    isSDKLoaded: boolean;
    isInitialized: boolean;
    session: BallerineSession | null;
    error: string | null;
    initializeSDK: (config: BallerineSDKConfig) => Promise<void>;
    startVerification: (walletAddress: string, userData?: any) => Promise<BallerineSession>;
    checkStatus: (sessionId: string) => Promise<void>;
    cleanup: () => void;
}

declare global {
    interface Window {
        BallerineSDK: any;
    }
}

/**
 * Custom hook for Ballerine SDK integration - KYC verification using Ballerine only
 */
export const useBallerineSDK = (): UseBallerineSDKReturn => {
    const [isSDKLoaded, setIsSDKLoaded] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [session, setSession] = useState<BallerineSession | null>(null);
    const [error, setError] = useState<string | null>(null);

    const ballerineInstance = useRef<any>(null);
    const sessionCallbacks = useRef<Map<string, (result: any) => void>>(new Map());

    // Load Ballerine SDK
    useEffect(() => {
        const loadSDK = () => {
            if (window.BallerineSDK) {
                setIsSDKLoaded(true);
                return;
            }

            // Try multiple CDN URLs in case one is blocked or outdated
            const cdnUrls = [
                'https://cdn.ballerine.io/sdk/ballerine-sdk.js',
                'https://app.ballerine.io/sdk/ballerine-sdk.js'
            ];

            let loaded = false;

            const tryLoadScript = (url: string, index: number) => {
                if (loaded) return;

                const script = document.createElement('script');
                script.src = url;
                script.async = true;
                script.crossOrigin = 'anonymous';

                script.onload = () => {
                    console.log(`Ballerine SDK loaded successfully from ${url}`);
                    setIsSDKLoaded(true);
                    loaded = true;
                };

                script.onerror = () => {
                    console.warn(`Failed to load Ballerine SDK from ${url}`);
                    // Try next URL
                    if (index < cdnUrls.length - 1) {
                        tryLoadScript(cdnUrls[index + 1], index + 1);
                    } else {
                        console.error('Failed to load Ballerine SDK from all URLs');
                        setError('Failed to load Ballerine SDK - all CDN URLs failed');
                    }
                };

                document.head.appendChild(script);
            };

            tryLoadScript(cdnUrls[0], 0);
        };

        loadSDK();

        return () => {
            // Cleanup script if component unmounts
            const existingScript = document.querySelector('script[src*="ballerine"]');
            if (existingScript) {
                existingScript.remove();
            }
        };
    }, []);

    // Initialize Ballerine SDK
    const initializeSDK = useCallback(async (config: BallerineSDKConfig) => {
        if (!isSDKLoaded || !window.BallerineSDK) {
            throw new Error('Ballerine SDK not loaded');
        }

        try {
            setError(null);

            // Create Ballerine instance with configuration for KYC verification
            ballerineInstance.current = new window.BallerineSDK({
                endpoint: config.endpoint,
                apiKey: config.apiKey,
                flowName: config.flowName || 'kyc-flow',
                elements: config.elements || {
                    document: {
                        name: 'document',
                        type: 'document',
                        options: {
                            documents: [
                                { type: 'passport', category: 'travel_document' },
                                { type: 'drivers_license', category: 'government_id' },
                                { type: 'id_card', category: 'government_id' },
                                { type: 'visa', category: 'travel_document' }
                            ]
                        }
                    },
                    selfie: {
                        name: 'selfie',
                        type: 'selfie',
                        options: {
                            requireQuality: true,
                            maxRetries: 3
                        }
                    }
                },
                onSession: (err: any, response: any) => {
                    console.log('Ballerine session callback:', { err, response });
                    if (err) {
                        setError(`Session creation failed: ${err.message || 'Unknown error'}`);
                        return;
                    }
                    console.log('Ballerine session created successfully:', response);
                },
                onFinished: (err: any, response: any) => {
                    console.log('Ballerine verification finished:', { err, response });

                    if (err) {
                        setError(`Verification failed: ${err.message || 'Unknown error'}`);
                        setSession(prev => prev ? { ...prev, status: 'rejected' } : null);
                        return;
                    }

                    if (response && response.status) {
                        // Map Ballerine status to our internal status
                        let internalStatus: 'verified' | 'rejected' | 'pending';
                        switch (response.status.toLowerCase()) {
                            case 'completed':
                            case 'approved':
                                internalStatus = 'verified';
                                break;
                            case 'failed':
                            case 'rejected':
                                internalStatus = 'rejected';
                                break;
                            default:
                                internalStatus = 'pending';
                        }

                        setSession(prev => prev ? { ...prev, status: internalStatus } : null);

                        // Notify callback if exists
                        if (session && sessionCallbacks.current.has(session.sessionId)) {
                            const callback = sessionCallbacks.current.get(session.sessionId);
                            callback?.(response);
                        }
                    }
                },
                onEvent: (eventName: string, data?: any) => {
                    console.log('Ballerine event:', eventName, data);

                    switch (eventName) {
                        case 'flow_started':
                            console.log('Verification started');
                            break;
                        case 'flow_completed':
                            console.log('Verification flow completed');
                            break;
                        case 'flow_failed':
                            console.log('Verification flow failed');
                            setError('Verification was cancelled or failed');
                            break;
                        default:
                            console.log(`Unhandled Ballerine event: ${eventName}`);
                    }
                }
            });

            setIsInitialized(true);
            console.log('Ballerine SDK initialized successfully');

        } catch (error) {
            console.error('Failed to initialize Ballerine SDK:', error);
            setError(`Failed to initialize Ballerine SDK: ${error.message || 'Unknown error'}`);
            throw error;
        }
    }, [isSDKLoaded]);

    // Start verification process using Ballerine only
    const startVerification = useCallback(async (walletAddress: string, userData: any = {}) => {
        if (!isInitialized || !ballerineInstance.current) {
            throw new Error('Ballerine SDK not initialized');
        }

        try {
            setError(null);

            // Call backend to create verification session using Ballerine only
            const response = await fetch('/api/kyc/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    walletAddress,
                    userData: {
                        firstName: userData.firstName || 'User',
                        lastName: userData.lastName || 'Unknown',
                        email: userData.email
                    }
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error || 'Failed to start verification');
            }

            const sessionData = result.data;

            // Create session object
            const newSession: BallerineSession = {
                sessionId: sessionData.sessionId,
                ballerineSessionId: sessionData.ballerineSessionId,
                verificationUrl: sessionData.verificationUrl,
                status: 'pending',
                expiresAt: new Date(sessionData.expiresAt),
                sdkConfig: sessionData.sdkConfig
            };

            setSession(newSession);

            // Redirect to Ballerine verification URL
            if (sessionData.verificationUrl) {
                console.log('Redirecting to Ballerine verification URL:', sessionData.verificationUrl);
                window.location.replace(sessionData.verificationUrl);
            }

            return newSession;

        } catch (error) {
            console.error('Failed to start verification:', error);
            setError(error.message || 'Failed to start verification');
            throw error;
        }
    }, [isInitialized]);

    // Check verification status
    const checkStatus = useCallback(async (sessionId: string) => {
        try {
            const response = await fetch(`/api/kyc/session/${sessionId}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();
            if (result.success) {
                const statusData = result.data;
                setSession(prev => prev ? { ...prev, status: statusData.status } : null);
            }
        } catch (error) {
            console.error('Failed to check status:', error);
            setError(error.message || 'Failed to check verification status');
        }
    }, []);

    // Set session callback
    const setSessionCallback = useCallback((sessionId: string, callback: (result: any) => void) => {
        sessionCallbacks.current.set(sessionId, callback);
    }, []);

    // Cleanup
    const cleanup = useCallback(() => {
        if (ballerineInstance.current) {
            try {
                ballerineInstance.current.destroy?.();
            } catch (error) {
                console.warn('Error destroying Ballerine instance:', error);
            }
            ballerineInstance.current = null;
        }

        setSession(null);
        setError(null);
        setIsInitialized(false);
        sessionCallbacks.current.clear();
    }, []);

    return {
        isSDKLoaded,
        isInitialized,
        session,
        error,
        initializeSDK,
        startVerification,
        checkStatus,
        cleanup
    };
};
