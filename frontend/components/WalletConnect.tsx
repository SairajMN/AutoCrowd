'use client';

import React, { useEffect, useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useWeb3 } from '../hooks/useWeb3';

export function WalletConnect() {
    const { isConnected, isCorrectNetwork, switchToNetwork } = useWeb3();
    const [mounted, setMounted] = useState(false);

    // Prevent hydration mismatch by only rendering after component mounts on client
    useEffect(() => {
        setMounted(true);
    }, []);

    // Always render the same structure but conditionally show content
    return (
        <div className="flex items-center gap-4">
            {mounted && isConnected && !isCorrectNetwork && (
                <button
                    onClick={switchToNetwork}
                    className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
                >
                    Switch to Base Sepolia
                </button>
            )}

            <ConnectButton />
        </div>
    );
}
