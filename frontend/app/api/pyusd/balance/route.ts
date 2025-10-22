import { NextRequest, NextResponse } from 'next/server';

// Server-side API route for PYUSD balance (bypasses CORS)
export async function POST(request: NextRequest) {
    try {
        const { walletAddress, chainId, requiredAmount } = await request.json();

        if (!walletAddress) {
            return NextResponse.json(
                { error: 'Wallet address is required' },
                { status: 400 }
            );
        }

        const required = requiredAmount ? BigInt(requiredAmount) : 0n;

        // PYUSD configuration
        const config = getPYUSDConfig(chainId || 11155111);

        // Make Blockscout API call server-side
        const apiUrl = 'https://eth-sepolia.blockscout.com/api';
        const balanceResponse = await fetch(
            `${apiUrl}?module=account&action=tokenbalance&contractaddress=${config.tokenAddress}&address=${walletAddress}`
        );

        if (!balanceResponse.ok) {
            console.error('Blockscout API error:', balanceResponse.status);
            return NextResponse.json(
                {
                    hasBalance: false,
                    currentBalance: '0',
                    requiredAmount: required.toString(),
                    needsFaucet: required > 0n,
                    faucetUrl: config.faucetUrl
                }
            );
        }

        const balanceData = await balanceResponse.json();

        if (balanceData.status === '1' && balanceData.result) {
            const currentBalance = BigInt(balanceData.result);
            const hasBalance = currentBalance >= required;
            const needsFaucet = !hasBalance && required > 0n;

            return NextResponse.json({
                hasBalance,
                currentBalance: balanceData.result,
                requiredAmount: required.toString(),
                needsFaucet,
                faucetUrl: config.faucetUrl
            });
        } else {
            console.error('Blockscout API returned error status:', balanceData);
            return NextResponse.json(
                {
                    hasBalance: false,
                    currentBalance: '0',
                    requiredAmount: required.toString(),
                    needsFaucet: required > 0n,
                    faucetUrl: config.faucetUrl
                }
            );
        }

    } catch (error) {
        console.error('Server-side PYUSD balance API error:', error);
        const required = request.json ? BigInt((await request.json()).requiredAmount || '0') : 0n;
        const config = getPYUSDConfig(11155111);

        return NextResponse.json(
            {
                hasBalance: false,
                currentBalance: '0',
                requiredAmount: required.toString(),
                needsFaucet: required > 0n,
                faucetUrl: config.faucetUrl,
                error: 'Failed to fetch balance'
            },
            { status: 500 }
        );
    }
}

interface PYUSDConfig {
    tokenAddress: string;
    faucetUrl: string;
    explorerUrl: string;
    chainId: number;
}

const PYUSD_CONFIGS: Record<number, PYUSDConfig> = {
    1: { // Ethereum Mainnet
        tokenAddress: '0x6c3ea9036406852006290770BEdFcAbA0e23A0e8', // PYUSD on mainnet
        faucetUrl: 'https://faucet.paypal.com',
        explorerUrl: 'https://etherscan.io/token/',
        chainId: 1
    },
    11155111: { // Sepolia Testnet
        tokenAddress: '0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9',
        faucetUrl: 'https://faucet.paypal.com/testnet',
        explorerUrl: 'https://eth-sepolia.blockscout.com/token/',
        chainId: 11155111
    },
    11155420: { // Optimism Sepolia
        tokenAddress: '0x25a3aB79eE2D40C53b3Bc3640e9c5C9E5B9Fd2e0',
        faucetUrl: 'https://faucet.paypal.com/testnet/optimism',
        explorerUrl: 'https://sepolia-optimistic.etherscan.io/token/',
        chainId: 11155420
    }
};

function getPYUSDConfig(chainId?: number): PYUSDConfig {
    const config = PYUSD_CONFIGS[chainId || 11155111]; // Default to Sepolia
    if (!config) {
        throw new Error(`PYUSD not configured for chain ${chainId}`);
    }
    return config;
}
