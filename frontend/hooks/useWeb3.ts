'use client';

import { useEffect, useState, useCallback } from 'react';
import { useWalletClient, usePublicClient, useAccount, useSwitchChain, useChainId } from 'wagmi';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, CAMPAIGN_FACTORY_ABI, CAMPAIGN_ABI, PYUSD_ABI, CampaignData, CampaignDetails, CampaignSummary, Milestone, NETWORK_CONFIG } from '../lib/contracts';
import { parsePYUSDAmount } from '../lib/pyusd';

export function useWeb3() {
    const { address, isConnected } = useAccount();
    const { data: walletClient } = useWalletClient();
    const publicClient = usePublicClient();
    const chainId = useChainId();
    const { switchChain } = useSwitchChain();

    const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);
    const [ethersProvider, setEthersProvider] = useState<ethers.BrowserProvider | null>(null);
    const [ethersSigner, setEthersSigner] = useState<ethers.Signer | null>(null);
    const [isProviderReady, setIsProviderReady] = useState(false);
    const [readOnlyProvider, setReadOnlyProvider] = useState<ethers.JsonRpcProvider | null>(null);
    const [resolvedPyusdAddress, setResolvedPyusdAddress] = useState<string | null>(null);

    // Initialize read-only provider for public reads (no wallet required)
    useEffect(() => {
        try {
            const provider = new ethers.JsonRpcProvider(
                NETWORK_CONFIG.rpcUrl,
                { chainId: NETWORK_CONFIG.chainId, name: NETWORK_CONFIG.name },
                { batchMaxCount: 3 }
            );
            setReadOnlyProvider(provider);
        } catch (error) {
            console.error('Failed to initialize read-only provider:', error);
        }
    }, []);

    // Initialize ethers provider when wallet connects
    useEffect(() => {
        if (walletClient) {
            setIsProviderReady(false);
            const provider = new ethers.BrowserProvider(walletClient as any);
            setEthersProvider(provider);
            provider.getSigner()
                .then(setEthersSigner)
                .then(() => setIsProviderReady(true))
                .catch((error) => {
                    console.error(error);
                    setIsProviderReady(true); // Still ready even if signer fails
                });
        } else {
            setEthersProvider(null);
            setEthersSigner(null);
            setIsProviderReady(false);
        }
    }, [walletClient]);

    // Check if on correct network
    useEffect(() => {
        setIsCorrectNetwork(chainId === NETWORK_CONFIG.chainId);
    }, [chainId]);

    // Switch to correct network
    const switchToNetwork = useCallback(async () => {
        if (!isCorrectNetwork) {
            try {
                await switchChain({ chainId: NETWORK_CONFIG.chainId as any });
            } catch (error) {
                console.error('Failed to switch network:', error);
                // Fallback: try to add network to wallet
                if (window.ethereum) {
                    try {
                        await window.ethereum.request({
                            method: 'wallet_addEthereumChain',
                            params: [{
                                chainId: `0x${NETWORK_CONFIG.chainId.toString(16)}`,
                                chainName: NETWORK_CONFIG.name,
                                nativeCurrency: {
                                    name: 'ETH',
                                    symbol: 'ETH',
                                    decimals: 18
                                },
                                rpcUrls: [NETWORK_CONFIG.rpcUrl],
                                blockExplorerUrls: [NETWORK_CONFIG.blockExplorer]
                            }]
                        });
                    } catch (addError) {
                        console.error('Failed to add network:', addError);
                    }
                }
            }
        }
    }, [isCorrectNetwork, switchChain]);

    // Get contract instances
    const getCampaignFactoryContract = useCallback(() => {
        const providerForRead = ethersProvider ?? readOnlyProvider;
        if (!providerForRead) return null;
        return new ethers.Contract(CONTRACT_ADDRESSES.CAMPAIGN_FACTORY, CAMPAIGN_FACTORY_ABI, providerForRead);
    }, [ethersProvider, readOnlyProvider]);

    const getCampaignContract = useCallback((address: string) => {
        const providerForRead = ethersProvider ?? readOnlyProvider;
        if (!providerForRead) return null;
        return new ethers.Contract(address, CAMPAIGN_ABI, providerForRead);
    }, [ethersProvider, readOnlyProvider]);

    const getPYUSDContract = useCallback(() => {
        const providerForRead = ethersProvider ?? readOnlyProvider;
        if (!providerForRead) return null;
        const tokenAddress = CONTRACT_ADDRESSES.PYUSD;
        if (!tokenAddress) return null;
        return new ethers.Contract(tokenAddress, PYUSD_ABI, providerForRead);
    }, [ethersProvider, readOnlyProvider]);

    // Resolve PYUSD token address from factory on load/network change
    useEffect(() => {
        const resolve = async () => {
            try {
                const factory = getCampaignFactoryContract();
                if (!factory) return;
                const addr: string = await (factory as any).PYUSD();
                console.log('Resolved PYUSD address from CampaignFactory:', addr);
                console.log('Environment PYUSD address:', CONTRACT_ADDRESSES.PYUSD);
                if (addr && addr !== ethers.ZeroAddress) {
                    try {
                        const code = await (ethersProvider ?? readOnlyProvider)!.getCode(addr);
                        if (code && code !== '0x') {
                            setResolvedPyusdAddress(addr);
                        }
                    } catch { }
                }
            } catch (e) {
                console.log('Failed to resolve PYUSD from factory, using env fallback');
                // keep env fallback
            }
        };
        resolve();
    }, [getCampaignFactoryContract]);

    // Contract read functions
    const getAllCampaigns = useCallback(async (): Promise<CampaignData[]> => {
        const contract = getCampaignFactoryContract();
        if (!contract) throw new Error('Contract not initialized');

        try {
            const campaigns = await contract.getAllCampaigns();
            return campaigns.map((c: any) => ({
                campaignAddress: c.campaignAddress,
                creator: c.creator,
                title: c.title,
                createdAt: Number(c.createdAt),
                isActive: c.isActive
            }));
        } catch (error) {
            console.error('Failed to get campaigns:', error);
            // Fallback: try paginated endpoint to avoid large response or batch issues
            try {
                const page = await (contract as any).getCampaignsPaginated(0, 50);
                return page.map((c: any) => ({
                    campaignAddress: c.campaignAddress,
                    creator: c.creator,
                    title: c.title,
                    createdAt: Number(c.createdAt),
                    isActive: c.isActive
                }));
            } catch (e) {
                // Return empty array instead of throwing to prevent UI crashes for provider hiccups
                if (error instanceof Error && error.message.includes('Failed to fetch')) {
                    console.warn('Network connection failed, returning empty campaigns list');
                    return [];
                }
                throw e;
            }
        }
    }, [getCampaignFactoryContract]);

    const getCampaignDetails = useCallback(async (campaignAddress: string): Promise<CampaignDetails> => {
        const contract = getCampaignContract(campaignAddress);
        if (!contract) throw new Error('Contract not initialized');

        try {
            const summary = await contract.getCampaignSummary();
            const milestoneCountNum = Number(summary.milestoneCount);
            const milestones = await Promise.all(Array.from({ length: milestoneCountNum }, async (_, i) => {
                try {
                    const m: any = await contract.milestones(i);
                    return {
                        description: m.description,
                        amount: m.amount as bigint,
                        deadline: Number(m.deadline),
                        state: Number(m.state),
                        submittedAt: Number(m.submittedAt),
                        votingEnd: 0,
                        yesVotes: 0n,
                        noVotes: 0n,
                        aiReviewHash: m.aiReviewHash,
                        fundsReleased: m.fundsReleased
                    };
                } catch {
                    return {
                        description: '',
                        amount: 0n,
                        deadline: 0,
                        state: 0,
                        submittedAt: 0,
                        votingEnd: 0,
                        yesVotes: 0n,
                        noVotes: 0n,
                        aiReviewHash: '',
                        fundsReleased: false
                    };
                }
            }));

            const [backersCount, userContribution, isBacker] = await Promise.all([
                contract.backersCount(),
                address ? contract.contributions(address) : Promise.resolve(BigInt(0)),
                address ? contract.isBacker(address) : Promise.resolve(false)
            ]);

            return {
                title: summary.title,
                description: summary.description,
                totalGoal: summary.totalGoal,
                totalRaised: summary.totalRaised,
                startTime: Number(summary.startTime),
                endTime: Number(summary.endTime),
                creator: summary.creator,
                isActive: summary.isActive,
                milestoneCount: summary.milestoneCount,
                milestones,
                backersCount: Number(backersCount),
                userContribution,
                isBacker
            };
        } catch (error) {
            console.error('Failed to get campaign details:', error);
            if (error instanceof Error && error.message.includes('Failed to fetch')) {
                throw new Error('Network connection failed. Please check your internet connection and try again.');
            }
            throw error;
        }
    }, [getCampaignContract, address]);

    const getPYUSDBalance = useCallback(async (): Promise<bigint> => {
        if (!address) return 0n;
        const contract = getPYUSDContract();
        if (!contract) throw new Error('Contract not initialized');

        try {
            return await contract.balanceOf(address);
        } catch (error) {
            console.error('Failed to get PYUSD balance:', error);
            return 0n;
        }
    }, [getPYUSDContract, address, ethersProvider, readOnlyProvider]);

    // Contract write functions
    const createCampaign = useCallback(async (
        title: string,
        description: string,
        goal: string,
        duration: string,
        milestoneAmounts?: string[]
    ): Promise<string> => {
        if (!ethersSigner) throw new Error('Signer not available');

        const contract = new ethers.Contract(CONTRACT_ADDRESSES.CAMPAIGN_FACTORY, CAMPAIGN_FACTORY_ABI, ethersSigner);

        try {
            let tx;
            if (!milestoneAmounts || milestoneAmounts.length === 0) {
                // Call the function without milestones (4 parameters)
                tx = await contract['createCampaign(string,string,uint256,uint256)'](
                    title,
                    description,
                    parsePYUSDAmount(goal),
                    parseInt(duration) * 24 * 60 * 60 // Convert days to seconds
                );
            } else {
                // Call the function with milestones (5 parameters)
                tx = await contract['createCampaign(string,string,uint256,uint256,uint256[])'](
                    title,
                    description,
                    parsePYUSDAmount(goal),
                    parseInt(duration) * 24 * 60 * 60, // Convert days to seconds
                    milestoneAmounts.map(amount => parsePYUSDAmount(amount))
                );
            }
            const receipt = await tx.wait();
            return receipt.logs[0].address; // Campaign address from event
        } catch (error) {
            console.error('Failed to create campaign:', error);
            throw error;
        }
    }, [ethersSigner]);

    const contribute = useCallback(async (campaignAddress: string, amount: string): Promise<void> => {
        if (!ethersSigner) throw new Error('Signer not available');

        try {
            const amountWei = parsePYUSDAmount(amount);

            // First check allowance before approve
            const tokenAddress = resolvedPyusdAddress || CONTRACT_ADDRESSES.PYUSD;
            if (!tokenAddress) throw new Error('PYUSD address not resolved');

            const pyusdContract = new ethers.Contract(tokenAddress, PYUSD_ABI, ethersSigner);

            // Check current allowance
            const currentAllowance: bigint = await pyusdContract.allowance(address, campaignAddress);
            console.log('Current allowance:', ethers.formatUnits(currentAllowance, 6), 'PYUSD');
            console.log('Required allowance:', ethers.formatUnits(amountWei, 6), 'PYUSD');

            // Only approve if allowance is insufficient
            if (currentAllowance < amountWei) {
                console.log('Approving PYUSD for campaign...');
                const approveTx = await pyusdContract.approve(campaignAddress, amountWei, {
                    gasLimit: 100000 // Ensure sufficient gas for approval
                });
                const approveReceipt = await approveTx.wait();
                console.log('Approval confirmed in block:', approveReceipt.blockNumber);

                // Add a small delay to ensure the approval is processed
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Verify the allowance was set
                const newAllowance = await pyusdContract.allowance(address, campaignAddress);
                if (newAllowance < amountWei) {
                    throw new Error(`Allowance verification failed. Expected: ${amountWei.toString()}, Got: ${newAllowance.toString()}`);
                }
            } else {
                console.log('Sufficient allowance already exists');
            }

            // Then contribute with explicit gas limits
            console.log('Executing contribute transaction...');
            const campaignContract = new ethers.Contract(campaignAddress, CAMPAIGN_ABI, ethersSigner);

            // Try to estimate gas first
            let gasEstimate;
            try {
                gasEstimate = await campaignContract.contribute.estimateGas(amountWei, {
                    from: address
                });
                console.log('Estimated gas:', gasEstimate.toString());
            } catch (estError: any) {
                console.warn('Gas estimation failed:', estError.message);
                gasEstimate = 250000n; // Fallback gas limit
            }

            const contributeTx = await campaignContract.contribute(amountWei, {
                gasLimit: gasEstimate * 120n / 100n // Add 20% buffer
            });

            console.log('Contribute transaction sent:', contributeTx.hash);
            const contributeReceipt = await contributeTx.wait();
            console.log('Contribute confirmed in block:', contributeReceipt.blockNumber);

        } catch (error: any) {
            console.error('Failed to contribute:', error);

            // Enhanced error handling
            if (error.message?.includes('CALL_EXCEPTION') || error.code === 'CALL_EXCEPTION') {
                console.error('CALL_EXCEPTION detected - likely gas estimation or contract state issue');

                // Try to provide more specific error info
                if (error.reason) {
                    throw new Error(`Transaction failed: ${error.reason}`);
                } else if (error.data) {
                    // Try to decode revert data
                    try {
                        const decodedError = ethers.AbiCoder.defaultAbiCoder().decode(['string'], error.data);
                        throw new Error(`Transaction reverted: ${decodedError[0]}`);
                    } catch (decodeError) {
                        throw new Error(`Transaction failed with CALL_EXCEPTION. Check contract state and token approvals.`);
                    }
                } else {
                    throw new Error(`Transaction failed with CALL_EXCEPTION during gas estimation. This likely means the transaction would revert on chain. Check campaign status, token balance, and approvals.`);
                }
            }

            // Re-throw with more context
            throw error;
        }
    }, [ethersSigner, resolvedPyusdAddress, address]);

    const submitMilestone = useCallback(async (campaignAddress: string, milestoneId: number, reviewHash: string): Promise<void> => {
        if (!ethersSigner) throw new Error('Signer not available');

        const contract = new ethers.Contract(campaignAddress, CAMPAIGN_ABI, ethersSigner);
        try {
            const tx = await contract.submitMilestone(milestoneId, reviewHash);
            await tx.wait();
        } catch (error) {
            console.error('Failed to submit milestone:', error);
            throw error;
        }
    }, [ethersSigner]);

    // Voting removed from protocol

    const claimRefund = useCallback(async (campaignAddress: string): Promise<void> => {
        if (!ethersSigner) throw new Error('Signer not available');

        const contract = new ethers.Contract(campaignAddress, CAMPAIGN_ABI, ethersSigner);
        try {
            const tx = await contract.claimRefund();
            await tx.wait();
        } catch (error) {
            console.error('Failed to claim refund:', error);
            throw error;
        }
    }, [ethersSigner]);

    return {
        // Connection state
        isConnected,
        address,
        isCorrectNetwork,
        chainId,
        isProviderReady,

        // Actions
        switchToNetwork,

        // Contract reads
        getAllCampaigns,
        getCampaignDetails,
        getPYUSDBalance,

        // Contract writes
        createCampaign,
        contribute,
        submitMilestone,
        claimRefund,

        // Low level
        ethersProvider,
        ethersSigner,
        publicClient
    };
}
