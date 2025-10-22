import { useState, useCallback } from 'react';
import type {
    VerifiedContributor,
    ContributorsData,
    ContributorVerificationData
} from './useAIVerification';

export interface ContributorVerificationHook {
    contributors: VerifiedContributor[];
    contributorDetails: ContributorVerificationData | null;
    isLoading: boolean;
    error: string | null;
    verificationStats: {
        totalVerified: number;
        highRiskCount: number;
        averageRiskScore: number;
        blockscoutVerifiedCount: number;
    } | null;
    getContributors: (
        campaignAddress: string,
        startIndex?: number,
        limit?: number,
        verifyBlockscout?: boolean,
        checkScam?: boolean
    ) => Promise<void>;
    getContributorDetails: (
        campaignAddress: string,
        contributorAddress: string,
        enhanceWithRealtime?: boolean
    ) => Promise<VerifiedContributor | null>;
    refreshVerification: () => Promise<void>;
}

/**
 * Custom hook for contributor verification with Blockscout and ASI integration
 */
export function useContributorVerification(): ContributorVerificationHook {
    const [contributors, setContributors] = useState<VerifiedContributor[]>([]);
    const [contributorDetails, setContributorDetails] = useState<ContributorVerificationData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [verificationStats, setVerificationStats] = useState<{
        totalVerified: number;
        highRiskCount: number;
        averageRiskScore: number;
        blockscoutVerifiedCount: number;
    } | null>(null);

    /**
     * Get verified contributors for a campaign
     */
    const getContributors = useCallback(async (
        campaignAddress: string,
        startIndex: number = 0,
        limit: number = 50,
        verifyBlockscout: boolean = true,
        checkScam: boolean = true
    ): Promise<void> => {
        setIsLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams({
                startIndex: startIndex.toString(),
                limit: limit.toString(),
                verifyBlockscout: verifyBlockscout.toString(),
                checkScam: checkScam.toString()
            });

            const response = await fetch(`/api/verification/contributors/${campaignAddress}?${params}`);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                const contributorsData: ContributorsData = result.data;
                setContributors(contributorsData.contributors);

                // Calculate verification stats
                const stats = {
                    totalVerified: contributorsData.contributors.filter(c => c.verificationStatus === 'VERIFIED').length,
                    highRiskCount: contributorsData.contributors.filter(c => c.scamRiskScore > 0.6).length,
                    averageRiskScore: contributorsData.contributors.reduce((sum, c) => sum + c.scamRiskScore, 0) / contributorsData.contributors.length,
                    blockscoutVerifiedCount: contributorsData.contributors.filter(c => c.blockscoutVerified).length
                };

                setVerificationStats(stats);
            } else {
                throw new Error(result.error || 'Failed to fetch contributors');
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMessage);
            console.error('Failed to get contributors:', err);
            setContributors([]);
            setVerificationStats(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Get detailed verification info for a specific contributor
     */
    const getContributorDetails = useCallback(async (
        campaignAddress: string,
        contributorAddress: string,
        enhanceWithRealtime: boolean = true
    ): Promise<VerifiedContributor | null> => {
        setIsLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams({
                enhanceWithRealtime: enhanceWithRealtime.toString()
            });

            const response = await fetch(
                `/api/verification/contributor/${campaignAddress}/${contributorAddress}?${params}`
            );

            if (!response.ok) {
                if (response.status === 404) {
                    return null;
                }
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                const data: ContributorVerificationData = result.data;
                setContributorDetails(data);
                return data.contributor;
            } else {
                throw new Error(result.error || 'Failed to fetch contributor details');
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMessage);
            console.error('Failed to get contributor details:', err);
            setContributorDetails(null);
        } finally {
            setIsLoading(false);
        }

        return null;
    }, []);

    /**
     * Refresh verification for all current contributors
     */
    const refreshVerification = useCallback(async (): Promise<void> => {
        if (contributors.length === 0) return;

        setIsLoading(true);
        setError(null);

        try {
            // Get the campaign address from the first contributor's blockscoutDetails or assume same campaign
            const campaignAddress = contributors[0]?.blockscoutDetails?.campaignAddress;
            if (!campaignAddress) {
                throw new Error('Unable to determine campaign address for refresh');
            }

            // Re-fetch all contributors
            await getContributors(campaignAddress, 0, contributors.length, true, true);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMessage);
            console.error('Failed to refresh verification:', err);
        } finally {
            setIsLoading(false);
        }
    }, [contributors, getContributors]);

    return {
        contributors,
        contributorDetails,
        isLoading,
        error,
        verificationStats,
        getContributors,
        getContributorDetails,
        refreshVerification,
    };
}
