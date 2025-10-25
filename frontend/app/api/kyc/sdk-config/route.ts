import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Frontend API route for getting Ballerine SDK configuration
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

        // During build time or when backend is unavailable, return mock configuration
        // This prevents build failures while allowing the app to work in production
        const isBuildTime = process.env.NODE_ENV === 'production' ||
            process.env.NEXT_PHASE === 'phase-production-build' ||
            (error as Error).message.includes('ECONNREFUSED');

        if (isBuildTime) {
            console.log('Backend unavailable during build/static generation, returning mock Ballerine SDK config');
            return NextResponse.json({
                apiKey: process.env.BALLERINE_API_KEY || 'demo_key',
                endpoint: process.env.BALLERINE_ENDPOINT || 'https://api.ballerine.io',
                flowName: 'kyc-flow',
                elements: {
                    document: {
                        name: 'document',
                        type: 'document',
                        options: {
                            documents: [
                                { type: 'passport', category: 'travel_document' },
                                { type: 'drivers_license', category: 'government_id' },
                                { type: 'id_card', category: 'government_id' },
                                { type: 'visa', category: 'travel_document' }
                            ]
                        }
                    },
                    selfie: {
                        name: 'selfie',
                        type: 'selfie',
                        options: {
                            requireQuality: true,
                            maxRetries: 3
                        }
                    }
                },
                developmentMode: true,
                webhookUrl: process.env.BASE_URL || 'https://auto-crowd-backend.vercel.app/api/kyc/ballerine-callback'
            });
        }

        return NextResponse.json(
            { error: 'Internal server error', message: (error as Error).message },
            { status: 500 }
        );
    }
}
