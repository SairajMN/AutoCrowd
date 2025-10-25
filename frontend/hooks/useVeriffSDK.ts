import { useState, useEffect, useCallback, useRef } from 'react';

interface VeriffSDKConfig {
    host: string;
    apiKey: string;
    parentId: string;
    onSession: (err: any, response: any) => void;
    onFinished: (err: any, response: any) => void;
    onEvent: (eventName: string, data?: any) => void;
}

interface VeriffSession {
    sessionId: string;
    veriffSessionId: string;
    verificationUrl: string;
    status: 'pending' | 'verified' | 'rejected' | 'expired';
    expiresAt: Date;
    sdkConfig: VeriffSDKConfig;
}

interface UseVeriffSDKReturn {
    isSDKLoaded: boolean;
    isInitialized: boolean;
    session: VeriffSession | null;
    error: string | null;
    initializeSDK: (config: VeriffSDKConfig) => Promise<void>;
    startVerification: (walletAddress: string, userData?: any) => Promise<VeriffSession>;
    checkStatus: (sessionId: string) => Promise<void>;
    cleanup: () => void;
}

declare global {
    interface Window {
        Veriff: any;
    }
}

/**
 * Custom hook for Veriff SDK integration - KYC verification using Veriff only
 */
export const useVeriffSDK = (): UseVeriffSDKReturn => {
    const [isSDKLoaded, setIsSDKLoaded] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [session, setSession] = useState<VeriffSession | null>(null);
    const [error, setError] = useState<string | null>(null);

    const veriffInstance = useRef<any>(null);
    const sessionCallbacks = useRef<Map<string, (result: any) => void>>(new Map());

    // Load Veriff SDK
    useEffect(() => {
        const loadSDK = () => {
            if (window.Veriff) {
                setIsSDKLoaded(true);
                return;
            }

            // Try multiple CDN URLs in case one is blocked or outdated
            const cdnUrls = [
                'https://cdn.veriff.me/sdk/js/1.5/veriff.min.js',
                'https://cdn.veriff.me/sdk/js/1.6/veriff.min.js',
                'https://cdn.veriff.me/sdk/js/1.7/veriff.min.js',
                'https://cdn.veriff.me/sdk/js/1.8/veriff.min.js',
                'https://cdn.veriff.me/sdk/js/1.9/veriff.min.js',
                'https://cdn.veriff.me/sdk/js/2.0/veriff.min.js',
                'https://cdn.veriff.me/sdk/js/2.1/veriff.min.js'
            ];

            let loaded = false;

            const tryLoadScript = (url: string, index: number) => {
                if (loaded) return;

                const script = document.createElement('script');
                script.src = url;
                script.async = true;
                script.crossOrigin = 'anonymous';

                script.onload = () => {
                    console.log(`Veriff SDK loaded successfully from ${url}`);
                    setIsSDKLoaded(true);
                    loaded = true;
                };

                script.onerror = () => {
                    console.warn(`Failed to load Veriff SDK from ${url}`);
                    // Try next URL
                    if (index < cdnUrls.length - 1) {
                        tryLoadScript(cdnUrls[index + 1], index + 1);
                    } else {
                        console.error('Failed to load Veriff SDK from all URLs');
                        setError('Failed to load Veriff SDK - all CDN URLs failed');
                    }
                };

                document.head.appendChild(script);
            };

            tryLoadScript(cdnUrls[0], 0);
        };

        loadSDK();

        return () => {
            // Cleanup script if component unmounts
            const existingScript = document.querySelector('script[src*="veriff"]');
            if (existingScript) {
                existingScript.remove();
            }
        };
    }, []);

    // Initialize Veriff SDK
    const initializeSDK = useCallback(async (config: VeriffSDKConfig) => {
        if (!isSDKLoaded || !window.Veriff) {
            throw new Error('Veriff SDK not loaded');
        }

        try {
            setError(null);

            // Create Veriff instance with configuration for KYC verification
            veriffInstance.current = window.Veriff({
                host: config.host,
                apiKey: config.apiKey,
                parentId: config.parentId,
                onSession: (err: any, response: any) => {
                    console.log('Veriff session callback:', { err, response });
                    if (err) {
                        setError(`Session creation failed: ${err.message || 'Unknown error'}`);
                        return;
                    }
                    console.log('Veriff session created successfully:', response);
                },
                onFinished: (err: any, response: any) => {
                    console.log('Veriff verification finished:', { err, response });

                    if (err) {
                        setError(`Verification failed: ${err.message || 'Unknown error'}`);
                        setSession(prev => prev ? { ...prev, status: 'rejected' } : null);
                        return;
                    }

                    if (response && response.status) {
                        // Map Veriff status to our internal status
                        let internalStatus: 'verified' | 'rejected' | 'pending';
                        switch (response.status.toLowerCase()) {
                            case 'success':
                            case 'approved':
                                internalStatus = 'verified';
                                break;
                            case 'declined':
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
                    console.log('Veriff event:', eventName, data);

                    switch (eventName) {
                        case 'started':
                            console.log('Verification started');
                            break;
                        case 'aborted':
                            console.log('Verification aborted by user');
                            setError('Verification was cancelled by user');
                            break;
                        case 'finished':
                            console.log('Verification flow finished');
                            break;
                        default:
                            console.log(`Unhandled Veriff event: ${eventName}`);
                    }
                }
            });

            setIsInitialized(true);
            console.log('Veriff SDK initialized successfully');

        } catch (error) {
            console.error('Failed to initialize Veriff SDK:', error);
            setError(`Failed to initialize Veriff SDK: ${error.message || 'Unknown error'}`);
            throw error;
        }
    }, [isSDKLoaded]);

    // Start verification process using Veriff only
    const startVerification = useCallback(async (walletAddress: string, userData: any = {}) => {
        if (!isInitialized || !veriffInstance.current) {
            throw new Error('Veriff SDK not initialized');
        }

        try {
            setError(null);

            // Call backend to create verification session using Veriff only
            const response = await fetch('/api/kyc/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    walletAddress,
                    userData: {
                        firstName: userData.firstName || 'User',
                        lastName: userData.lastName || 'Unknown'
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
            const newSession: VeriffSession = {
                sessionId: sessionData.sessionId,
                veriffSessionId: sessionData.veriffSessionId,
                verificationUrl: sessionData.verificationUrl,
                status: 'pending',
                expiresAt: new Date(sessionData.expiresAt),
                sdkConfig: sessionData.sdkConfig
            };

            setSession(newSession);

            // Redirect to Veriff verification URL
            if (sessionData.verificationUrl) {
                console.log('Redirecting to Veriff verification URL:', sessionData.verificationUrl);
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
        if (veriffInstance.current) {
            try {
                veriffInstance.current.unmount?.();
            } catch (error) {
                console.warn('Error unmounting Veriff widget:', error);
            }
            veriffInstance.current = null;
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
