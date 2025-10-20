import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, CAMPAIGN_ABI, PYUSD_ABI } from './contracts';

export class CampaignDebugger {
    private provider: ethers.JsonRpcProvider;

    constructor(provider: ethers.JsonRpcProvider) {
        this.provider = provider;
    }

    /**
     * Check campaign state for debugging
     */
    async checkCampaignState(campaignAddress: string) {
        const contract = new ethers.Contract(campaignAddress, CAMPAIGN_ABI, this.provider);

        try {
            const summary = await contract.getCampaignSummary();
            const currentTime = Math.floor(Date.now() / 1000);

            console.log('=== Campaign State Check ===');
            console.log('Title:', summary.title);
            console.log('Description:', summary.description);
            console.log('Total Goal:', ethers.formatUnits(summary.totalGoal, 6), 'PYUSD');
            console.log('Total Raised:', ethers.formatUnits(summary.totalRaised, 6), 'PYUSD');
            console.log('Start Time:', new Date(Number(summary.startTime) * 1000).toISOString());
            console.log('End Time:', new Date(Number(summary.endTime) * 1000).toISOString());
            console.log('Current Time:', new Date(currentTime * 1000).toISOString());
            console.log('Is Active:', summary.isActive);
            console.log('Creator:', summary.creator);
            console.log('Milestone Count:', Number(summary.milestoneCount));

            // Check timing
            const isExpired = currentTime > Number(summary.endTime);
            const canContribute = !isExpired && summary.isActive;

            console.log('Campaign Expired:', isExpired);
            console.log('Can Contribute:', canContribute);

            return {
                canContribute,
                isExpired,
                isActive: summary.isActive,
                totalGoal: summary.totalGoal,
                totalRaised: summary.totalRaised,
                endTime: summary.endTime
            };
        } catch (error) {
            console.error('Failed to check campaign state:', error);
            throw error;
        }
    }

    /**
     * Check user's PYUSD balance and allowance
     */
    async checkUserAllowanceAndBalance(userAddress: string, campaignAddress: string, pyusdAddress: string) {
        const token = new ethers.Contract(pyusdAddress, PYUSD_ABI, this.provider);

        try {
            const [balance, allowance] = await Promise.all([
                token.balanceOf(userAddress),
                token.allowance(userAddress, campaignAddress)
            ]);

            console.log('=== User PYUSD Check ===');
            console.log('User:', userAddress);
            console.log('Campaign:', campaignAddress);
            console.log('PYUSD Contract:', pyusdAddress);
            console.log('Balance:', ethers.formatUnits(balance, 6), 'PYUSD');
            console.log('Allowance to Campaign:', ethers.formatUnits(allowance, 6), 'PYUSD');

            return {
                balance,
                allowance,
                hasBalance: balance > 0n,
                hasAllowance: allowance > 0n
            };
        } catch (error) {
            console.error('Failed to check user allowance and balance:', error);
            throw error;
        }
    }

    /**
     * Check if PYUSD contract is deployed and accessible
     */
    async checkPYUSDContract(pyusdAddress: string) {
        try {
            const code = await this.provider.getCode(pyusdAddress);
            const isDeployed = code !== '0x';

            console.log('=== PYUSD Contract Check ===');
            console.log('Address:', pyusdAddress);
            console.log('Is Deployed:', isDeployed);

            if (isDeployed) {
                const token = new ethers.Contract(pyusdAddress, PYUSD_ABI, this.provider);
                const name = await token.name().catch(() => 'Unknown');
                const symbol = await token.symbol().catch(() => 'Unknown');
                const decimals = await token.decimals().catch(() => 0);

                console.log('Name:', name);
                console.log('Symbol:', symbol);
                console.log('Decimals:', decimals);
            }

            return { isDeployed, code: code.substring(0, 100) + '...' };
        } catch (error) {
            console.error('Failed to check PYUSD contract:', error);
            return { isDeployed: false, error: error.message };
        }
    }

    /**
     * Simulate the contribute transaction to diagnose the exact failure
     */
    async diagnoseContributeFailure(
        userAddress: string,
        campaignAddress: string,
        pyusdAddress: string,
        amount: string
    ) {
        console.log('\n=== Contribute Transaction Diagnosis ===');
        console.log(`User: ${userAddress}`);
        console.log(`Campaign: ${campaignAddress}`);
        console.log(`Amount: ${amount} PYUSD`);

        try {
            // Check campaign state
            const campaignState = await this.checkCampaignState(campaignAddress);
            if (!campaignState.canContribute) {
                return {
                    success: false,
                    error: 'Cannot contribute: ' +
                        (!campaignState.isActive ? 'Campaign not active' : 'Campaign expired')
                };
            }

            // Check user balance/allowance
            const amountWei = ethers.parseUnits(amount, 6);
            const userState = await this.checkUserAllowanceAndBalance(userAddress, campaignAddress, pyusdAddress);

            if (!userState.hasBalance || userState.balance < amountWei) {
                return {
                    success: false,
                    error: `Insufficient balance: ${ethers.formatUnits(userState.balance, 6)} PYUSD available, need ${amount} PYUSD`
                };
            }

            if (!userState.hasAllowance || userState.allowance < amountWei) {
                return {
                    success: false,
                    error: `Insufficient allowance: ${ethers.formatUnits(userState.allowance, 6)} PYUSD allowed, need ${amount} PYUSD`
                };
            }

            // Try to simulate the transaction
            const campaign = new ethers.Contract(campaignAddress, CAMPAIGN_ABI, this.provider);
            const simulatedTx = await campaign.contribute.staticCall(amountWei, {
                from: userAddress
            });

            console.log('Static call simulation successful');
            return { success: true, simulatedResult: simulatedTx };

        } catch (error: any) {
            console.log('Diagnosis found issue:', error);
            let errorMessage = 'Unknown error';

            if (error.message) {
                if (error.message.includes('Campaign ended')) {
                    errorMessage = 'Campaign has ended';
                } else if (error.message.includes('Campaign not active')) {
                    errorMessage = 'Campaign is not active';
                } else if (error.message.includes('Amount must be > 0')) {
                    errorMessage = 'Amount must be greater than 0';
                } else if (error.message.includes('ERC20InsufficientAllowance')) {
                    errorMessage = 'Insufficient PYUSD allowance for campaign contract';
                } else if (error.message.includes('ERC20InsufficientBalance')) {
                    errorMessage = 'Insufficient PYUSD balance';
                } else {
                    errorMessage = error.message;
                }
            }

            return { success: false, error: errorMessage, rawError: error };
        }
    }
}

// Utility function for quick debugging
export async function debugContributeIssue(
    campaignAddress: string,
    userAddress: string,
    pyusdAddress: string,
    amount: string,
    rpcUrl?: string
) {
    const provider = new ethers.JsonRpcProvider(rpcUrl || 'https://rpc.sepolia.org');
    const campaignDebugger = new CampaignDebugger(provider);

    try {
        const result = await campaignDebugger.diagnoseContributeFailure(
            userAddress,
            campaignAddress,
            pyusdAddress,
            amount
        );

        console.log('\n=== Diagnosis Result ===');
        console.log('Success:', result.success);

        if (!result.success) {
            console.log('Error:', result.error);
        }

        return result;
    } catch (error) {
        console.error('Debugging failed:', error);
        throw error;
    }
}
