import { useState, useCallback, useEffect } from 'react';
import { blockscoutClient } from '../lib/blockscout';
import type {
    TransactionInfo,
    EventLog,
    ContractInfo,
    BlockscoutResponse
} from '../lib/blockscout';

export interface ActivityItem {
    type: 'transaction' | 'contribution' | 'milestone' | 'refund';
    hash?: string;
    amount?: string;
    timestamp: number;
    from?: string;
    to?: string;
    description: string;
}

export interface CampaignAnalytics {
    totalTransactions: number;
    totalVolume: string;
    uniqueContributors: number;
    contractVerificationStatus: boolean;
    sourceCodeAvailable: boolean;
}

/**
 * Custom hook for Blockscout integration and campaign analytics
 */
export function useBlockscout(campaignAddress: string) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activity, setActivity] = useState<ActivityItem[]>([]);
    const [analytics, setAnalytics] = useState<CampaignAnalytics | null>(null);

    /**
     * Load campaign analytics and activity data
     */
    const loadCampaignAnalytics = useCallback(async () => {
        if (!campaignAddress) return;

        setIsLoading(true);
        setError(null);

        try {
            // Get recent transactions for the campaign
            const transactions = await blockscoutClient.getAccountTransactions(campaignAddress, 1, 20);

            // Get contract information
            const contractInfo = await blockscoutClient.getContractSource(campaignAddress);

            // Get events/logs for milestone completions and contributions
            const logs = await blockscoutClient.getContractLogs(campaignAddress, undefined, 'latest');

            // Process transactions into activity items
            const activityItems: ActivityItem[] = [];

            // Process transactions
            transactions.forEach(tx => {
                if (tx.value && tx.value !== '0') {
                    activityItems.push({
                        type: 'contribution',
                        hash: tx.hash,
                        amount: tx.value,
                        timestamp: new Date(tx.timestamp).getTime(),
                        from: tx.from,
                        to: tx.to,
                        description: `Contribution of ${parseFloat(tx.value) / 1e6} PYUSD`
                    });
                }
            });

            // Sort by timestamp (newest first)
            activityItems.sort((a, b) => b.timestamp - a.timestamp);

            setActivity(activityItems);

            // Generate analytics
            const analyticsData: CampaignAnalytics = {
                totalTransactions: transactions.length,
                totalVolume: transactions
                    .reduce((sum, tx) => sum + (parseFloat(tx.value || '0') / 1e6), 0)
                    .toFixed(2),
                uniqueContributors: new Set(
                    transactions
                        .filter(tx => tx.value && tx.value !== '0')
                        .map(tx => tx.from.toLowerCase())
                ).size,
                contractVerificationStatus: !!contractInfo?.ContractName,
                sourceCodeAvailable: !!contractInfo?.SourceCode,
            };

            setAnalytics(analyticsData);

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load campaign analytics';
            setError(errorMessage);
            console.error('Blockscout analytics error:', err);
        } finally {
            setIsLoading(false);
        }
    }, [campaignAddress]);

    /**
     * Get transaction details
     */
    const getTransactionDetails = useCallback(async (txHash: string): Promise<TransactionInfo | null> => {
        try {
            const details = await blockscoutClient.getTransaction(txHash);
            return details;
        } catch (err) {
            console.error('Error getting transaction details:', err);
            return null;
        }
    }, []);

    /**
     * Get contract verification status
     */
    const getContractVerificationStatus = useCallback(async (): Promise<boolean> => {
        try {
            const contractInfo = await blockscoutClient.getContractSource(campaignAddress);
            return !!contractInfo?.ContractName;
        } catch (err) {
            console.error('Error getting contract verification status:', err);
            return false;
        }
    }, [campaignAddress]);

    /**
     * Monitor new transactions (polling)
     */
    const startTransactionMonitoring = useCallback((onNewTransaction?: (tx: TransactionInfo) => void) => {
        if (!campaignAddress) return;

        const pollInterval = setInterval(async () => {
            try {
                const transactions = await blockscoutClient.getAccountTransactions(campaignAddress, 1, 5);
                const newTxs = transactions.filter(tx =>
                    !activity.some(existing => existing.hash === tx.hash)
                );

                if (newTxs.length > 0) {
                    // Add new transactions to activity
                    const newActivityItems: ActivityItem[] = newTxs.map(tx => ({
                        type: tx.value && tx.value !== '0' ? 'contribution' : 'transaction',
                        hash: tx.hash,
                        amount: tx.value,
                        timestamp: new Date(tx.timestamp).getTime(),
                        from: tx.from,
                        to: tx.to,
                        description: tx.value && tx.value !== '0'
                            ? `New contribution: ${parseFloat(tx.value) / 1e6} PYUSD`
                            : `Transaction: ${tx.hash.slice(0, 8)}...`
                    }));

                    setActivity(prev => [...newActivityItems, ...prev]);

                    // Notify callback
                    newTxs.forEach(tx => onNewTransaction?.(tx));
                }
            } catch (err) {
                console.error('Transaction monitoring error:', err);
            }
        }, 30000); // Poll every 30 seconds

        return () => clearInterval(pollInterval);
    }, [campaignAddress, activity]);

    /**
     * Get contributor analytics
     */
    const getContributorAnalytics = useCallback(async (address: string) => {
        try {
            const transactions = await blockscoutClient.getAccountTransactions(address, 1, 50);

            return {
                totalContributions: transactions.filter(tx => tx.to.toLowerCase() === campaignAddress.toLowerCase()).length,
                totalVolume: transactions
                    .filter(tx => tx.to.toLowerCase() === campaignAddress.toLowerCase())
                    .reduce((sum, tx) => sum + (parseFloat(tx.value || '0') / 1e6), 0),
                firstContribution: transactions
                    .filter(tx => tx.to.toLowerCase() === campaignAddress.toLowerCase())
                    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())[0]?.timestamp,
                lastContribution: transactions
                    .filter(tx => tx.to.toLowerCase() === campaignAddress.toLowerCase())
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]?.timestamp,
            };
        } catch (err) {
            console.error('Error getting contributor analytics:', err);
            return null;
        }
    }, [campaignAddress]);

    // Load analytics on mount and when campaign address changes
    useEffect(() => {
        loadCampaignAnalytics();
    }, [loadCampaignAnalytics]);

    return {
        activity,
        analytics,
        isLoading,
        error,
        loadCampaignAnalytics,
        getTransactionDetails,
        getContractVerificationStatus,
        startTransactionMonitoring,
        getContributorAnalytics,
    };
}
