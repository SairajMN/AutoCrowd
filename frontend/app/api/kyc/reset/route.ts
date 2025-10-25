import { NextRequest, NextResponse } from 'next/server';

/**
 * Frontend API route for resetting KYC verification data using Veriff only
 * Supports both general reset and wallet-specific reset
 */
export async function POST(request: NextRequest) {
    try {
        const url = new URL(request.url);
        const walletAddress = url.searchParams.get('walletAddress');

        // Get backend URL from environment or use default
        const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:8000';

        // Determine which reset endpoint to use
        const resetEndpoint = walletAddress
            ? `${backendUrl}/api/kyc/reset/${walletAddress}`
            : `${backendUrl}/api/kyc/reset`;

        // Forward the request to the backend KYC service (Veriff only)
        const response = await fetch(resetEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            return NextResponse.json(errorData, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error) {
        console.error('Frontend KYC reset API proxy error:', error);
        return NextResponse.json(
            { error: 'Internal server error', message: (error as Error).message },
            { status: 500 }
        );
    }
}
