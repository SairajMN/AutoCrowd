'use client';

import React, { useEffect, useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useWeb3 } from '../hooks/useWeb3';
import { useAccount, useBalance } from 'wagmi';

export function WalletConnect() {
    const { isConnected, isCorrectNetwork, switchToNetwork, getPYUSDBalance } = useWeb3();
    const { address } = useAccount();
    const { data: ethBalance } = useBalance({
        address: address,
    });

    const [mounted, setMounted] = useState(false);
    const [pyusdBalance, setPyusdBalance] = useState<bigint>(0n);
    const [pyusdDecimals, setPyusdDecimals] = useState<number>(6); // PYUSD typically has 6 decimals

    // Prevent hydration mismatch by only rendering after component mounts on client
    useEffect(() => {
        setMounted(true);
    }, []);

    // Fetch PYUSD balance
    useEffect(() => {
        const fetchPYUSDBalance = async () => {
            if (isConnected && address) {
                try {
                    const balance = await getPYUSDBalance();
                    setPyusdBalance(balance);
                } catch (error) {
                    console.error('Failed to fetch PYUSD balance:', error);
                    setPyusdBalance(0n);
                }
            }
        };

        if (mounted) {
            fetchPYUSDBalance();
        }
    }, [mounted, isConnected, address, getPYUSDBalance]);

    const formatBalance = (balance: bigint, decimals: number = 18) => {
        if (balance === 0n) return '0.00';
        const formatted = Number(balance) / Math.pow(10, decimals);
        return formatted.toFixed(4);
    };

    // Always render the same structure but conditionally show content
    return (
        <div className="flex items-center gap-4">
            {mounted && isConnected && !isCorrectNetwork && (
                <button
                    onClick={switchToNetwork}
                    className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors text-sm"
                >
                    Switch Network
                </button>
            )}

            <div className="flex items-center gap-3">
                {mounted && isConnected && (
                    <div className="hidden md:flex flex-col items-end text-xs text-gray-600">
                        <div className="flex items-center gap-2">
                            <span className="font-medium">
                                {ethBalance ? formatBalance(ethBalance.value) : '0.00'} ETH
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-medium">
                                {formatBalance(pyusdBalance, pyusdDecimals)} PYUSD
                            </span>
                        </div>
                    </div>
                )}

                <ConnectButton />
            </div>
        </div>
    );
}
