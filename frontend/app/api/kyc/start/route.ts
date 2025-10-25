import { NextRequest, NextResponse } from 'next/server';

/**
 * Frontend API route for submitting custom KYC form
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate required fields
        if (!body.walletAddress) {
            return NextResponse.json(
                { error: 'Wallet address is required' },
                { status: 400 }
            );
        }

        // Get backend URL from environment or use default
        const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:8000';

        // Forward the request to the backend KYC service
        const response = await fetch(`${backendUrl}/api/kyc/submit-form`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorData = await response.json();
            return NextResponse.json(errorData, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error) {
        console.error('Frontend KYC form API proxy error:', error);
        return NextResponse.json(
            { error: 'Internal server error', message: (error as Error).message },
            { status: 500 }
        );
    }
}
