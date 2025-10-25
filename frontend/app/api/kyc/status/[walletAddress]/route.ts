import { NextRequest, NextResponse } from 'next/server';

/**
 * Frontend API route for getting KYC verification status using Veriff only
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { walletAddress: string } }
) {
    try {
        const { walletAddress } = params;

        // Validate wallet address format
        if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
            return NextResponse.json(
                { error: 'Invalid wallet address format' },
                { status: 400 }
            );
        }

        // Get backend URL from environment or use default
        const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:8000';

        // Forward the request to the backend KYC service (Veriff only)
        const response = await fetch(`${backendUrl}/api/kyc/status/${walletAddress}`, {
            method: 'GET',
        });

        if (!response.ok) {
            const errorData = await response.json();
            return NextResponse.json(errorData, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error) {
        console.error('Frontend KYC API proxy error:', error);
        return NextResponse.json(
            { error: 'Internal server error', message: (error as Error).message },
            { status: 500 }
        );
    }
}
