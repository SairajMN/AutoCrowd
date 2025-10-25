import { useState, useCallback } from 'react';

export interface VerificationRequest {
  id: string;
  contributorAddress: string;
  campaignAddress: string;
  level: 'basic' | 'advanced' | 'expert';
  status: 'pending' | 'verified' | 'rejected' | 'expired';
  tokenId?: string;
  verifiedAt?: string;
  expiresAt?: string;
  confidenceScore?: number;
}

export interface MilestoneVerification {
  id: string;
  milestoneId: string;
  campaignAddress: string;
  contributorAddress: string;
  evidenceHash: string;
  description: string;
  evidenceUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  verifiedAt?: string;
  confidenceScore?: number;
}

export interface VerifierInfo {
  address: string;
  name: string;
  reputation: number;
  totalVerifications: number;
  successRate: number;
  expertise: string[];
}

export interface NewVerificationHook {
  // Contributor verification state
  verificationRequests: VerificationRequest[];
  currentVerification: VerificationRequest | null;
  isRequestingVerification: boolean;
  isVerificationComplete: boolean;

  // Milestone verification state
  milestoneVerifications: MilestoneVerification[];
  pendingMilestones: MilestoneVerification[];

  // Verifier state
  verifiers: VerifierInfo[];
  selectedVerifier: VerifierInfo | null;

  // Loading & error states
  isLoading: boolean;
  error: string | null;

  // Actions
  requestContributorVerification: (
    contributorAddress: string,
    campaignAddress: string,
    level: 'basic' | 'advanced' | 'expert'
  ) => Promise<void>;

  submitMilestoneVerification: (
    milestoneId: string,
    campaignAddress: string,
    evidenceHash: string,
    description: string,
    evidenceUrl: string
  ) => Promise<void>;

  getVerificationStatus: (requestId: string) => Promise<VerificationRequest | null>;

  getCampaignVerifications: (campaignAddress: string) => Promise<
    { contributors: VerificationRequest[], milestones: MilestoneVerification[] }
  >;

  getVerifierReputation: (verifierAddress: string) => Promise<VerifierInfo | null>;

  refreshVerification: () => Promise<void>;
}

/**
 * Custom hook for new NFT-based verification system
 */
export function useNewVerification(): NewVerificationHook {
  const [verificationRequests, setVerificationRequests] = useState<VerificationRequest[]>([]);
  const [currentVerification, setCurrentVerification] = useState<VerificationRequest | null>(null);
  const [isRequestingVerification, setIsRequestingVerification] = useState(false);
  const [isVerificationComplete, setIsVerificationComplete] = useState(false);

  const [milestoneVerifications, setMilestoneVerifications] = useState<MilestoneVerification[]>([]);
  const [pendingMilestones, setPendingMilestones] = useState<MilestoneVerification[]>([]);

  const [verifiers, setVerifiers] = useState<VerifierInfo[]>([]);
  const [selectedVerifier, setSelectedVerifier] = useState<VerifierInfo | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Request contributor verification (NFT minting)
   */
  const requestContributorVerification = useCallback(async (
    contributorAddress: string,
    campaignAddress: string,
    level: 'basic' | 'advanced' | 'expert'
  ): Promise<void> => {
    setIsRequestingVerification(true);
    setError(null);
    setIsVerificationComplete(false);

    try {
      const response = await fetch('/api/new-verification/contributor/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contributorAddress,
          campaignAddress,
          level
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        const verificationRequest: VerificationRequest = {
          id: result.data.verificationId,
          contributorAddress,
          campaignAddress,
          level,
          status: 'pending',
          verifiedAt: undefined,
          expiresAt: undefined
        };

        setCurrentVerification(verificationRequest);
        setVerificationRequests(prev => [...prev, verificationRequest]);

        // Mark as complete if sync
        if (result.data.immediate) {
          setIsVerificationComplete(true);
          setCurrentVerification(prev => prev ? { ...prev, status: 'verified', tokenId: result.data.tokenId } : null);
        }
      } else {
        throw new Error(result.error || 'Verification request failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Failed to request contributor verification:', err);
    } finally {
      setIsRequestingVerification(false);
    }
  }, []);

  /**
   * Submit milestone for verification
   */
  const submitMilestoneVerification = useCallback(async (
    milestoneId: string,
    campaignAddress: string,
    evidenceHash: string,
    description: string,
    evidenceUrl: string
  ): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/new-verification/milestone/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          milestoneId,
          campaignAddress,
          evidenceHash,
          description,
          evidenceUrl
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        const milestoneVerification: MilestoneVerification = {
          id: result.data.verificationId,
          milestoneId,
          campaignAddress,
          contributorAddress: '', // Will be filled by backend
          evidenceHash,
          description,
          evidenceUrl,
          status: 'pending'
        };

        setPendingMilestones(prev => [...prev, milestoneVerification]);
        setMilestoneVerifications(prev => [...prev, milestoneVerification]);
      } else {
        throw new Error(result.error || 'Milestone verification submission failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Failed to submit milestone verification:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Get verification status by request ID
   */
  const getVerificationStatus = useCallback(async (requestId: string): Promise<VerificationRequest | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/new-verification/status/${requestId}`);

      if (response.status === 404) return null;

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        return result.data.verification;
      } else {
        throw new Error(result.error || 'Failed to get verification status');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Failed to get verification status:', err);
    } finally {
      setIsLoading(false);
    }

    return null;
  }, []);

  /**
   * Get all verifications for a campaign
   */
  const getCampaignVerifications = useCallback(async (campaignAddress: string): Promise<
    { contributors: VerificationRequest[], milestones: MilestoneVerification[] }
  > => {
    setIsLoading(true);
    setError(null);

    try {
      const contributorResponse = await fetch(`/api/new-verification/campaign/${campaignAddress}/contributors`);
      const milestoneResponse = await fetch(`/api/new-verification/campaign/${campaignAddress}/milestones`);

      const [contributorResult, milestoneResult] = await Promise.all([
        contributorResponse.ok ? contributorResponse.json() : { success: false },
        milestoneResponse.ok ? milestoneResponse.json() : { success: false }
      ]);

      return {
        contributors: contributorResult.success ? contributorResult.data.contributors || [] : [],
        milestones: milestoneResult.success ? milestoneResult.data.milestones || [] : []
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Failed to get campaign verifications:', err);
    } finally {
      setIsLoading(false);
    }

    return { contributors: [], milestones: [] };
  }, []);

  /**
   * Get verifier reputation information
   */
  const getVerifierReputation = useCallback(async (verifierAddress: string): Promise<VerifierInfo | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/new-verification/verifier/${verifierAddress}`);

      if (response.status === 404) return null;

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        const verifier = result.data.verifier;
        const verifierInfo: VerifierInfo = {
          address: verifierAddress,
          name: verifier.name,
          reputation: verifier.reputationScore,
          totalVerifications: verifier.totalVerifications,
          successRate: verifier.successRate,
          expertise: verifier.expertise
        };

        setSelectedVerifier(verifierInfo);
        return verifierInfo;
      } else {
        throw new Error(result.error || 'Failed to get verifier information');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Failed to get verifier reputation:', err);
    } finally {
      setIsLoading(false);
    }

    return null;
  }, []);

  /**
   * Refresh verification data
   */
  const refreshVerification = useCallback(async (): Promise<void> => {
    // Refresh logic would go here
    setError(null);
    // This would typically re-fetch all relevant data
  }, []);

  return {
    // Contributor verification state
    verificationRequests,
    currentVerification,
    isRequestingVerification,
    isVerificationComplete,

    // Milestone verification state
    milestoneVerifications,
    pendingMilestones,

    // Verifier state
    verifiers,
    selectedVerifier,

    // Loading & error states
    isLoading,
    error,

    // Actions
    requestContributorVerification,
    submitMilestoneVerification,
    getVerificationStatus,
    getCampaignVerifications,
    getVerifierReputation,
    refreshVerification,
  };
}
