'use client';

import React, { useEffect, useState } from 'react';
import { useWeb3 } from '../hooks/useWeb3';
import { useAccount, useBalance, useConnect, useDisconnect } from 'wagmi';

export function WalletConnect() {
    const { isConnected, isCorrectNetwork, switchToNetwork, getPYUSDBalance } = useWeb3();
    const { address } = useAccount();
    const { connect, connectors, isPending } = useConnect();
    const { disconnect } = useDisconnect();
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

                {mounted && !isConnected ? (
                    <div className="flex gap-2">
                        {connectors.map((connector) => (
                            <button
                                key={connector.uid}
                                onClick={() => connect({ connector })}
                                disabled={isPending}
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm"
                            >
                                {isPending ? 'Connecting...' : `Connect ${connector.name}`}
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="flex gap-2">
                        <div className="px-4 py-2 bg-green-600 text-white rounded text-sm">
                            {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Connected'}
                        </div>
                        <button
                            onClick={() => disconnect()}
                            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
                        >
                            Disconnect
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
