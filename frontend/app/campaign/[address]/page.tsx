import React from 'react';
import { CampaignDetail } from '../../../components/CampaignDetail';

interface PageProps {
    params: {
        address: string;
    };
}

export default function CampaignPage({ params }: PageProps) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12">
            <div className="container mx-auto px-4">
                <CampaignDetail campaignAddress={params.address} />
            </div>
        </div>
    );
}
