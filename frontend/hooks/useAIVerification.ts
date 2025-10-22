import { useState, useCallback } from 'react';

export interface VerificationRequest {
    milestoneId: string;
    campaignAddress: string;
    description: string;
    evidenceHash: string;
    evidenceUrl?: string;
}

export interface ScamDetectionResult {
    campaignCreatorRisk: number;
    overallScamRisk: number;
    riskLevel: string;
    suggestions: string[];
    riskFactors: {
        multipleCampaignCreator: boolean;
        immediateWithdrawals: boolean;
        selfContribution: boolean;
        unusualTiming: boolean;
        overfundedCampaign: boolean;
    };
    warning?: string;
}

export interface VerificationResult {
    milestoneId: string;
    campaignAddress: string;
    verdict: 'approved' | 'rejected' | 'pending' | 'uncertain';
    confidence: number;
    reasoning: string;
    timestamp: string;
    aiReportHash?: string;
    scamDetection?: ScamDetectionResult;
    realtimeData?: {
        freshness: string;
        dataSourcesUsed: string[];
    };
}

export interface VerificationStatus {
    requestId: string;
    campaignAddress: string;
    milestoneId: string;
    requester: string;
    timestamp: string;
    isProcessed: boolean;
    isApproved?: boolean;
    aiReportHash?: string;
}

/**
 * Custom hook for ASI AI verification integration
 */
export function useAIVerification() {
    const [isVerifying, setIsVerifying] = useState(false);
    const [verificationError, setVerificationError] = useState<string | null>(null);

    /**
     * Request AI verification for a milestone
     */
    const requestVerification = useCallback(async (request: VerificationRequest): Promise<VerificationResult | null> => {
        setIsVerifying(true);
        setVerificationError(null);

        try {
            // Call backend verification API
            const response = await fetch('/api/verification/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(request),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || `HTTP ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                return result.data;
            } else {
                throw new Error(result.error || 'Verification failed');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown verification error';
            setVerificationError(errorMessage);
            console.error('AI verification error:', error);
            return null;
        } finally {
            setIsVerifying(false);
        }
    }, []);

    /**
     * Get verification status for a request
     */
    const getVerificationStatus = useCallback(async (requestId: string): Promise<VerificationStatus | null> => {
        try {
            const response = await fetch(`/api/verification/status/${requestId}`);

            if (!response.ok) {
                if (response.status === 404) {
                    return null; // Request not found
                }
                const error = await response.json();
                throw new Error(error.message || `HTTP ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                return result.data;
            } else {
                throw new Error(result.error || 'Failed to get verification status');
            }
        } catch (error) {
            console.error('Error getting verification status:', error);
            return null;
        }
    }, []);

    /**
     * Retry verification for a failed request
     */
    const retryVerification = useCallback(async (requestId: string): Promise<VerificationResult | null> => {
        setIsVerifying(true);
        setVerificationError(null);

        try {
            const response = await fetch(`/api/verification/retry/${requestId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || `HTTP ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                return result.data;
            } else {
                throw new Error(result.error || 'Verification retry failed');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown retry error';
            setVerificationError(errorMessage);
            console.error('AI verification retry error:', error);
            return null;
        } finally {
            setIsVerifying(false);
        }
    }, []);

    /**
     * Get pending verification requests
     */
    const getPendingRequests = useCallback(async () => {
        try {
            const response = await fetch('/api/verification/pending');
            const result = await response.json();

            if (result.success) {
                return result.data.pendingRequests;
            } else {
                console.error('Failed to get pending requests:', result.error);
                return [];
            }
        } catch (error) {
            console.error('Error getting pending requests:', error);
            return [];
        }
    }, []);

    return {
        requestVerification,
        getVerificationStatus,
        retryVerification,
        getPendingRequests,
        isVerifying,
        verificationError,
    };
}
