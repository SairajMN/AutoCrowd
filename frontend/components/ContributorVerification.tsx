import React, { useState, useEffect } from 'react';
import { useNewVerification, type VerificationRequest } from '../hooks/useNewVerification';

interface ContributorVerificationProps {
  contributorAddress: string;
  campaignAddress: string;
  onVerificationComplete?: (verification: VerificationRequest) => void;
}

export const ContributorVerification: React.FC<ContributorVerificationProps> = ({
  contributorAddress,
  campaignAddress,
  onVerificationComplete
}) => {
  const {
    currentVerification,
    isRequestingVerification,
    isVerificationComplete,
    isLoading,
    error,
    requestContributorVerification,
    getVerificationStatus
  } = useNewVerification();

  const [verificationLevel, setVerificationLevel] = useState<'basic' | 'advanced' | 'expert'>('basic');
  const [checkingStatus, setCheckingStatus] = useState(false);

  useEffect(() => {
    if (currentVerification && currentVerification.status === 'verified' && onVerificationComplete) {
      onVerificationComplete(currentVerification);
    }
  }, [currentVerification, onVerificationComplete]);

  const handleRequestVerification = async () => {
    try {
      await requestContributorVerification(
        contributorAddress,
        campaignAddress,
        verificationLevel
      );
    } catch (err) {
      console.error('Verification request failed:', err);
    }
  };

  const handleCheckStatus = async () => {
    setCheckingStatus(true);
    try {
      if (currentVerification?.id) {
        const status = await getVerificationStatus(currentVerification.id);
        if (status) {
          // Status will be handled via the hook's state updates
        }
      }
    } catch (err) {
      console.error('Status check failed:', err);
    }
    setCheckingStatus(false);
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'verified':
        return 'text-green-600';
      case 'rejected':
        return 'text-red-600';
      case 'expired':
        return 'text-orange-600';
      case 'pending':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'verified':
        return '✅';
      case 'rejected':
        return '❌';
      case 'expired':
        return '⏰';
      case 'pending':
        return '⏳';
      default:
        return '❓';
    }
  };

  if (isVerificationComplete && currentVerification?.status === 'verified') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">🎉</span>
          <div>
            <h3 className="text-green-800 font-semibold">Verification Complete!</h3>
            <p className="text-green-700 text-sm">
              You have been verified for this campaign with a {currentVerification.level} level verification.
            </p>
            {currentVerification.tokenId && (
              <p className="text-green-600 text-xs mt-1">
                NFT Token ID: #{currentVerification.tokenId}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isVerificationComplete && currentVerification?.status === 'rejected') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">❌</span>
          <div>
            <h3 className="text-red-800 font-semibold">Verification Denied</h3>
            <p className="text-red-700 text-sm">
              Your verification request was not approved. You may try again with different information.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-md mx-auto">
      <div className="text-center mb-4">
        <h3 className="text-xl font-bold text-blue-900 mb-2">Get Verified</h3>
        <p className="text-blue-700 text-sm">
          Get a verification NFT to prove your credibility and unlock advanced features in this campaign.
        </p>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {!currentVerification && (
        <>
          {/* Verification Level Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Verification Level
            </label>
            <select
              value={verificationLevel}
              onChange={(e) => setVerificationLevel(e.target.value as 'basic' | 'advanced' | 'expert')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="basic">Basic - Identity verification</option>
              <option value="advanced">Advanced - Background check</option>
              <option value="expert">Expert - Full audit</option>
            </select>
          </div>

          {/* Request Button */}
          <button
            onClick={handleRequestVerification}
            disabled={isRequestingVerification}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isRequestingVerification ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Requesting Verification...</span>
              </div>
            ) : (
              `Request ${verificationLevel.charAt(0).toUpperCase() + verificationLevel.slice(1)} Verification`
            )}
          </button>
        </>
      )}

      {currentVerification && currentVerification.status === 'pending' && (
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="text-blue-800">Verification in Progress</span>
          </div>

          <div className="bg-white rounded-lg p-4 border border-blue-200">
            <div className="text-sm text-gray-600 mb-2">
              Request ID: {currentVerification.id.slice(0, 20)}...
            </div>
            <div className="text-sm text-gray-600 mb-4">
              Level: {currentVerification.level.charAt(0).toUpperCase() + currentVerification.level.slice(1)}
            </div>
            <button
              onClick={handleCheckStatus}
              disabled={checkingStatus}
              className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg text-sm hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {checkingStatus ? 'Checking...' : 'Check Status'}
            </button>
          </div>
        </div>
      )}

      {currentVerification && currentVerification.status !== 'pending' && (
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <span className="text-2xl">{getStatusIcon(currentVerification.status)}</span>
            <span className={`text-lg font-semibold ${getStatusColor(currentVerification.status)}`}>
              {currentVerification.status === 'verified' ? 'Verified' :
               currentVerification.status === 'rejected' ? 'Rejected' : 'Expired'}
            </span>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-200 text-left">
            <div className="text-sm">
              <strong>Level:</strong> {currentVerification.level.charAt(0).toUpperCase() + currentVerification.level.slice(1)}
            </div>
            {currentVerification.verifiedAt && (
              <div className="text-sm mt-1">
                <strong>Verified:</strong> {new Date(currentVerification.verifiedAt).toLocaleDateString()}
              </div>
            )}
            {currentVerification.expiresAt && (
              <div className="text-sm mt-1">
                <strong>Expires:</strong> {new Date(currentVerification.expiresAt).toLocaleDateString()}
              </div>
            )}
            {currentVerification.tokenId && (
              <div className="text-sm mt-1">
                <strong>NFT ID:</strong> #{currentVerification.tokenId}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-4 text-xs text-blue-600 text-center">
        Verification NFTs prove your credibility and may unlock exclusive campaign features.
      </div>
    </div>
  );
};
