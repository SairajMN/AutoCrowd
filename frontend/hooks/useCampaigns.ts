'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from './useWeb3';
import { CampaignData, CampaignDetails } from '../lib/contracts';

export function useCampaigns() {
    const { getAllCampaigns, getCampaignDetails, isConnected, address } = useWeb3();

    const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);

    const [selectedCampaign, setSelectedCampaign] = useState<CampaignDetails | null>(null);
    const [selectedCampaignLoading, setSelectedCampaignLoading] = useState(false);

    // Prevent hydration issues by only running on client
    useEffect(() => {
        setMounted(true);
    }, []);

    // Load all campaigns
    const loadCampaigns = useCallback(async () => {
        if (!mounted) {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            setError(null);
            const campaignList = await getAllCampaigns();
            setCampaigns(campaignList);
        } catch (err) {
            console.error('Failed to load campaigns:', err);
            setError(err instanceof Error ? err.message : 'Failed to load campaigns');
        } finally {
            setLoading(false);
        }
    }, [mounted, getAllCampaigns]);

    // Load campaign details
    const loadCampaignDetails = useCallback(async (address: string) => {
        if (!mounted) return;
        try {
            setSelectedCampaignLoading(true);
            const details = await getCampaignDetails(address);
            setSelectedCampaign(details);
            return details;
        } catch (err) {
            console.error('Failed to load campaign details:', err);
            throw err;
        } finally {
            setSelectedCampaignLoading(false);
        }
    }, [mounted, getCampaignDetails]);

    // Auto-load campaigns when connection changes (only after mounted and provider ready)
    useEffect(() => {
        if (mounted) {
            loadCampaigns();
        }
    }, [mounted, loadCampaigns]);

    // Reload campaigns after wallet connection (only after mounted and provider ready)
    useEffect(() => {
        if (mounted && campaigns.length === 0) {
            loadCampaigns();
        }
    }, [address, mounted, campaigns.length, loadCampaigns]);

    return {
        campaigns,
        loading,
        error,
        selectedCampaign,
        selectedCampaignLoading,
        loadCampaigns,
        loadCampaignDetails,
        setSelectedCampaign
    };
}
