import { NextRequest, NextResponse } from 'next/server';

/**
 * Frontend API route for getting Veriff SDK configuration
 */
export async function GET(request: NextRequest) {
    try {
        // Get backend URL from environment or use default
        const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:8000';

        // Forward the request to the backend KYC service
        const response = await fetch(`${backendUrl}/api/kyc/sdk-config`, {
            method: 'GET',
        });

        if (!response.ok) {
            const errorData = await response.json();
            return NextResponse.json(errorData, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error) {
        console.error('Frontend KYC SDK config API proxy error:', error);
        return NextResponse.json(
            { error: 'Internal server error', message: (error as Error).message },
            { status: 500 }
        );
    }
}
