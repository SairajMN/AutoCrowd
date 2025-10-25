import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { CAMPAIGN_FACTORY_ABI, CONTRACT_ADDRESSES, CampaignData } from '../../../lib/contracts';

// Server-side API route to fetch campaigns (bypasses CORS)
export async function GET() {
    try {
        // Initialize provider with RPC URL from environment or fallback
        const provider = new ethers.JsonRpcProvider(
            process.env.NEXT_PUBLIC_RPC_URL || 'https://sepolia.drpc.org'
        );

        // Get contract instance
        const contract = new ethers.Contract(
            CONTRACT_ADDRESSES.CAMPAIGN_FACTORY,
            CAMPAIGN_FACTORY_ABI,
            provider
        );

        // Fetch campaigns
        let campaigns: CampaignData[] = [];
        try {
            const page = await contract.getCampaignsPaginated(0, 50);
            campaigns = page.map((c: any) => ({
                campaignAddress: c.campaignAddress,
                creator: c.creator,
                title: c.title,
                createdAt: Number(c.createdAt),
                isActive: c.isActive
            }));
        } catch (error: any) {
            // Handle case where no campaigns exist yet (contract reverts with "Offset out of bounds")
            if (error.reason === "Offset out of bounds" || error.message?.includes("Offset out of bounds")) {
                console.log('Server-side API: No campaigns exist yet, returning empty array');
                campaigns = [];
            } else {
                throw error; // Re-throw other errors
            }
        }

        console.log('Server-side API: Fetched', campaigns.length, 'campaigns');

        return NextResponse.json({ campaigns });
    } catch (error) {
        console.error('Server-side campaigns API error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch campaigns' },
            { status: 500 }
        );
    }
}
