'use client';

import React from 'react';
import Link from 'next/link';
import { ethers } from 'ethers';
import { CampaignData } from '../lib/contracts';

interface CampaignCardProps {
    campaign: CampaignData;
}

export function CampaignCard({ campaign }: CampaignCardProps) {
    return (
        <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-200">
            <div className="flex justify-between items-start mb-4">
                <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold text-gray-900 truncate mb-2">
                        {campaign.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                        Created by: {campaign.creator.slice(0, 6)}...{campaign.creator.slice(-4)}
                    </p>
                    <p className="text-sm text-gray-500">
                        Created: {new Date(campaign.createdAt * 1000).toLocaleDateString()}
                    </p>
                </div>
                <div className={`px-2 py-1 rounded text-xs font-medium ${campaign.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                    {campaign.isActive ? 'Active' : 'Completed'}
                </div>
            </div>

            <div className="flex gap-2 mt-4">
                <Link
                    href={`/campaign/${campaign.campaignAddress}`}
                    className="flex-1 text-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors"
                >
                    View Details
                </Link>
                <button className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded hover:bg-gray-200 transition-colors">
                    Share
                </button>
            </div>
        </div>
    );
}
