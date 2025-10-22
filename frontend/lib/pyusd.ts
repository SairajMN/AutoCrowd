/**
 * PYUSD (PayPal USD) utilities for address validation and faucet access
 */

export interface PYUSDConfig {
    tokenAddress: string;
    faucetUrl: string;
    explorerUrl: string;
    chainId: number;
}

/**
 * PYUSD configuration for different networks
 */
export const PYUSD_CONFIGS: Record<number, PYUSDConfig> = {
    1: { // Ethereum Mainnet
        tokenAddress: '0x6c3ea9036406852006290770BEdFcAbA0e23A0e8', // PYUSD on mainnet
        faucetUrl: 'https://faucet.paypal.com',
        explorerUrl: 'https://etherscan.io/token/',
        chainId: 1
    },
    11155111: { // Sepolia Testnet
        tokenAddress: '0x8a4712c2d7c4f9b8a1e6a2c7b0f6e9a3', // PYUSD on Sepolia
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

/**
 * Validate Ethereum address format
 */
export function isValidEthereumAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Get PYUSD configuration for the current network
 */
export function getPYUSDConfig(chainId?: number): PYUSDConfig {
    const config = PYUSD_CONFIGS[chainId || 11155111]; // Default to Sepolia
    if (!config) {
        throw new Error(`PYUSD not configured for chain ${chainId}`);
    }
    return config;
}

/**
 * Validate PYUSD token balance for an address
 */
export async function validatePYUSDBalance(
    walletAddress: string,
    chainId?: number,
    requiredAmount?: bigint
): Promise<{
    hasBalance: boolean;
    currentBalance: bigint;
    requiredAmount: bigint;
    needsFaucet: boolean;
    faucetUrl: string;
}> {
    if (!isValidEthereumAddress(walletAddress)) {
        throw new Error('Invalid Ethereum address format');
    }

    const config = getPYUSDConfig(chainId);
    const required = requiredAmount || 0n;

    try {
        // Try client-side Blockscout call first
        const { blockscoutClient } = await import('./blockscout');
        const balance = await blockscoutClient.getTokenBalance(config.tokenAddress, walletAddress);

        if (!balance) {
            return {
                hasBalance: false,
                currentBalance: 0n,
                requiredAmount: required,
                needsFaucet: required > 0n,
                faucetUrl: config.faucetUrl
            };
        }

        const currentBalance = BigInt(balance);
        const hasBalance = currentBalance >= required;
        const needsFaucet = !hasBalance && required > 0n;

        return {
            hasBalance,
            currentBalance,
            requiredAmount: required,
            needsFaucet,
            faucetUrl: config.faucetUrl
        };
    } catch (error) {
        console.error('Client-side balance validation failed, trying server-side:', error);

        // Fallback to server-side API if client-side fails due to CORS
        try {
            const response = await fetch('/api/pyusd/balance', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    walletAddress,
                    chainId,
                    requiredAmount: required.toString()
                }),
            });

            if (!response.ok) {
                throw new Error(`Server API error: ${response.status}`);
            }

            const data = await response.json();
            console.log('Successfully fetched PYUSD balance via server API');
            return data;
        } catch (serverError) {
            console.error('Server-side fallback also failed:', serverError);
            // Return conservative result on error
            return {
                hasBalance: false,
                currentBalance: 0n,
                requiredAmount: required,
                needsFaucet: required > 0n,
                faucetUrl: config.faucetUrl
            };
        }
    }
}

/**
 * Generate faucet claim link for PYUSD
 */
export function getFaucetLink(chainId?: number): string {
    const config = getPYUSDConfig(chainId);
    return config.faucetUrl;
}

/**
 * Generate Blockscout explorer link for PYUSD token
 */
export function getPYUSDExplorerLink(chainId?: number): string {
    const config = getPYUSDConfig(chainId);
    return `${config.explorerUrl}${config.tokenAddress}`;
}

/**
 * Get PYUSD token address for the current network
 */
export function getPYUSDTokenAddress(chainId?: number): string {
    const config = getPYUSDConfig(chainId);
    return config.tokenAddress;
}

/**
 * Format PYUSD amount (handles decimals)
 */
export function formatPYUSDAmount(amount: bigint, decimals: number = 6): string {
    const divisor = BigInt(10 ** decimals);
    const integerPart = amount / divisor;
    const fractionalPart = amount % divisor;

    if (fractionalPart === 0n) {
        return `${integerPart}`;
    }

    // Format fractional part with leading zeros
    const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
    const trimmedFractional = fractionalStr.replace(/0+$/, '');

    return `${integerPart}.${trimmedFractional}`;
}

/**
 * Convert human-readable PYUSD amount to wei (with 6 decimals for PYUSD)
 */
export function parsePYUSDAmount(amount: string): bigint {
    const [integerPart = '0', fractionalPart = ''] = amount.split('.');
    const decimals = 6;

    let result = BigInt(integerPart) * BigInt(10 ** decimals);

    if (fractionalPart) {
        const paddedFractional = fractionalPart.padEnd(decimals, '0').slice(0, decimals);
        result += BigInt(paddedFractional);
    }

    return result;
}

/**
 * Validate and prepare wallet for PYUSD transactions
 */
export async function prepareWalletForPYUSD(
    walletAddress: string,
    requiredAmount?: bigint,
    chainId?: number
): Promise<{
    isValid: boolean;
    balanceValid: boolean;
    faucetRequired: boolean;
    errors: string[];
    recommendations: string[];
}> {
    const errors: string[] = [];
    const recommendations: string[] = [];

    // Validate address format
    if (!isValidEthereumAddress(walletAddress)) {
        errors.push('Invalid Ethereum address format');
        return {
            isValid: false,
            balanceValid: false,
            faucetRequired: false,
            errors,
            recommendations: ['Please provide a valid Ethereum address starting with 0x']
        };
    }

    try {
        const balanceValidation = await validatePYUSDBalance(walletAddress, chainId, requiredAmount);

        const isValid = !errors.length && balanceValidation.hasBalance;
        const faucetRequired = balanceValidation.needsFaucet || (requiredAmount && balanceValidation.currentBalance < requiredAmount);

        if (faucetRequired) {
            recommendations.push('Visit the PayPal faucet to claim test PYUSD tokens');
            recommendations.push(`Faucet URL: ${balanceValidation.faucetUrl}`);
        }

        if (balanceValidation.currentBalance < (requiredAmount || 0n)) {
            errors.push(`Insufficient PYUSD balance. Need: ${formatPYUSDAmount(requiredAmount || 0n)}, Have: ${formatPYUSDAmount(balanceValidation.currentBalance)}`);
        }

        return {
            isValid,
            balanceValid: balanceValidation.hasBalance,
            faucetRequired,
            errors,
            recommendations
        };
    } catch (error) {
        errors.push(`Failed to validate PYUSD balance: ${error.message}`);
        recommendations.push('Check your wallet connection and network configuration');
        recommendations.push('Ensure you\'re connected to the correct network (Sepolia testnet for test PYUSD)');

        return {
            isValid: false,
            balanceValid: false,
            faucetRequired: true,
            errors,
            recommendations
        };
    }
}

/**
 * Get PYUSD-related network information
 */
export function getNetworkInfo(chainId?: number) {
    const config = getPYUSDConfig(chainId);
    const networkName = getNetworkName(chainId);

    return {
        networkName,
        chainId: config.chainId,
        tokenAddress: config.tokenAddress,
        faucetUrl: config.faucetUrl,
        explorerUrl: config.explorerUrl,
        isTestnet: config.chainId !== 1
    };
}

/**
 * Get human-readable network name
 */
function getNetworkName(chainId?: number): string {
    switch (chainId) {
        case 1: return 'Ethereum Mainnet';
        case 11155111: return 'Sepolia Testnet';
        case 11155420: return 'Optimism Sepolia';
        default: return `Chain ${chainId || 'Unknown'}`;
    }
}

/**
 * PYUSD address constants
 */
export const PYUSD_ADDRESSES = {
    MAINNET: '0x6c3ea9036406852006290770BEdFcAbA0e23A0e8',
    SEPOLIA: '0x8a4712c2d7c4f9b8a1e6a2c7b0f6e9a3',
    OPTIMISM_SEPOLIA: '0x25a3aB79eE2D40C53b3Bc3640e9c5C9E5B9Fd2e0'
} as const;

/**
 * Faucet URLs
 */
export const FAUCET_URLS = {
    MAINNET: 'https://faucet.paypal.com',
    TESTNET: 'https://faucet.paypal.com/testnet',
    OPTIMISM_TESTNET: 'https://faucet.paypal.com/testnet/optimism'
} as const;
