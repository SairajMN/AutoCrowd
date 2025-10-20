import { ethers } from 'ethers';

// Contract addresses - these should be deployed contract addresses
export const CONTRACT_ADDRESSES = {
    CAMPAIGN_FACTORY: process.env.NEXT_PUBLIC_CAMPAIGN_FACTORY_ADDRESS || '',
    PYUSD: process.env.NEXT_PUBLIC_PYUSD_CONTRACT_ADDRESS || '',
};

// CampaignFactory ABI
export const CAMPAIGN_FACTORY_ABI = [
    {
        "inputs": [{ "internalType": "address", "name": "_pyusd", "type": "address" }],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "inputs": [],
        "name": "PYUSD",
        "outputs": [{ "internalType": "address", "type": "address" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "string", "name": "_title", "type": "string" },
            { "internalType": "string", "name": "_description", "type": "string" },
            { "internalType": "uint256", "name": "_goal", "type": "uint256" },
            { "internalType": "uint256", "name": "_duration", "type": "uint256" }
        ],
        "name": "createCampaign",
        "outputs": [{ "internalType": "address", "type": "address" }],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "string", "name": "_title", "type": "string" },
            { "internalType": "string", "name": "_description", "type": "string" },
            { "internalType": "uint256", "name": "_goal", "type": "uint256" },
            { "internalType": "uint256", "name": "_duration", "type": "uint256" },
            { "internalType": "uint256[]", "name": "_milestoneAmounts", "type": "uint256[]" }
        ],
        "name": "createCampaign",
        "outputs": [{ "internalType": "address", "type": "address" }],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getAllCampaigns",
        "outputs": [
            {
                "components": [
                    { "internalType": "address", "name": "campaignAddress", "type": "address" },
                    { "internalType": "address", "name": "creator", "type": "address" },
                    { "internalType": "string", "name": "title", "type": "string" },
                    { "internalType": "uint256", "name": "createdAt", "type": "uint256" },
                    { "internalType": "bool", "name": "isActive", "type": "bool" }
                ],
                "internalType": "struct CampaignFactory.CampaignData[]",
                "name": "",
                "type": "tuple[]"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "_index", "type": "uint256" }],
        "name": "getCampaign",
        "outputs": [
            {
                "components": [
                    { "internalType": "address", "name": "campaignAddress", "type": "address" },
                    { "internalType": "address", "name": "creator", "type": "address" },
                    { "internalType": "string", "name": "title", "type": "string" },
                    { "internalType": "uint256", "name": "createdAt", "type": "uint256" },
                    { "internalType": "bool", "name": "isActive", "type": "bool" }
                ],
                "internalType": "struct CampaignFactory.CampaignData",
                "name": "",
                "type": "tuple"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getCampaignCount",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "_offset", "type": "uint256" }, { "internalType": "uint256", "name": "_limit", "type": "uint256" }],
        "name": "getCampaignsPaginated",
        "outputs": [
            {
                "components": [
                    { "internalType": "address", "name": "campaignAddress", "type": "address" },
                    { "internalType": "address", "name": "creator", "type": "address" },
                    { "internalType": "string", "name": "title", "type": "string" },
                    { "internalType": "uint256", "name": "createdAt", "type": "uint256" },
                    { "internalType": "bool", "name": "isActive", "type": "bool" }
                ],
                "internalType": "struct CampaignFactory.CampaignData[]",
                "name": "",
                "type": "tuple[]"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
] as const;

// AICrowdfundingCampaign ABI
export const CAMPAIGN_ABI = [
    {
        "inputs": [
            { "internalType": "string", "name": "_title", "type": "string" },
            { "internalType": "string", "name": "_description", "type": "string" },
            { "internalType": "uint256", "name": "_totalGoal", "type": "uint256" },
            { "internalType": "uint256", "name": "_duration", "type": "uint256" },
            { "internalType": "address", "name": "_pyusd", "type": "address" },
            { "internalType": "address", "name": "_creator", "type": "address" },
            { "internalType": "uint256[]", "name": "_milestoneAmounts", "type": "uint256[]" }
        ],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "name": "backers",
        "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "backersCount",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "campaignInfo",
        "outputs": [
            { "internalType": "string", "name": "title", "type": "string" },
            { "internalType": "string", "name": "description", "type": "string" },
            { "internalType": "uint256", "name": "totalGoal", "type": "uint256" },
            { "internalType": "uint256", "name": "totalRaised", "type": "uint256" },
            { "internalType": "uint256", "name": "startTime", "type": "uint256" },
            { "internalType": "uint256", "name": "endTime", "type": "uint256" },
            { "internalType": "address", "name": "creator", "type": "address" },
            { "internalType": "bool", "name": "isActive", "type": "bool" },
            { "internalType": "uint256", "name": "milestoneCount", "type": "uint256" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "address", "name": "", "type": "address" }],
        "name": "contributions",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "_amount", "type": "uint256" }],
        "name": "contribute",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getCampaignSummary",
        "outputs": [
            { "internalType": "string", "name": "title", "type": "string" },
            { "internalType": "string", "name": "description", "type": "string" },
            { "internalType": "uint256", "name": "totalGoal", "type": "uint256" },
            { "internalType": "uint256", "name": "totalRaised", "type": "uint256" },
            { "internalType": "uint256", "name": "startTime", "type": "uint256" },
            { "internalType": "uint256", "name": "endTime", "type": "uint256" },
            { "internalType": "address", "name": "creator", "type": "address" },
            { "internalType": "bool", "name": "isActive", "type": "bool" },
            { "internalType": "uint256", "name": "milestoneCount", "type": "uint256" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "address", "name": "", "type": "address" }],
        "name": "isBacker",
        "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "name": "milestones",
        "outputs": [
            { "internalType": "string", "name": "description", "type": "string" },
            { "internalType": "uint256", "name": "amount", "type": "uint256" },
            { "internalType": "uint256", "name": "deadline", "type": "uint256" },
            { "internalType": "enum AICrowdfundingCampaign.MilestoneState", "name": "state", "type": "uint8" },
            { "internalType": "uint256", "name": "submittedAt", "type": "uint256" },
            { "internalType": "string", "name": "aiReviewHash", "type": "string" },
            { "internalType": "bool", "name": "fundsReleased", "type": "bool" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "pyusd",
        "outputs": [{ "internalType": "contract IERC20", "name": "", "type": "address" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "string", "name": "_description", "type": "string" },
            { "internalType": "uint256", "name": "_amount", "type": "uint256" },
            { "internalType": "uint256", "name": "_deadline", "type": "uint256" }
        ],
        "name": "addMilestone",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "_milestoneId", "type": "uint256" }, { "internalType": "string", "name": "_reviewHash", "type": "string" }],
        "name": "submitMilestone",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "_milestoneId", "type": "uint256" }, { "internalType": "uint8", "name": "_verdict", "type": "uint8" }],
        "name": "onAiVerdict",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },

    {
        "inputs": [],
        "name": "claimRefund",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "owner",
        "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "anonymous": false,
        "inputs": [{ "indexed": true, "internalType": "address", "name": "contributor", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }],
        "name": "ContributionMade",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [{ "indexed": true, "name": "previousOwner", "type": "address" }, { "indexed": true, "name": "newOwner", "type": "address" }],
        "name": "OwnershipTransferred",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [{ "indexed": true, "internalType": "uint256", "name": "milestoneId", "type": "uint256" }, { "indexed": false, "internalType": "string", "name": "reviewHash", "type": "string" }],
        "name": "MilestoneSubmitted",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [{ "indexed": true, "internalType": "uint256", "name": "milestoneId", "type": "uint256" }, { "indexed": false, "internalType": "uint8", "name": "verdict", "type": "uint8" }],
        "name": "MilestoneVerified",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [{ "indexed": true, "internalType": "uint256", "name": "milestoneId", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }],
        "name": "FundsReleased",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [{ "indexed": true, "internalType": "address", "name": "backer", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }],
        "name": "RefundClaimed",
        "type": "event"
    }
] as const;

// PYUSD ERC20 ABI (simplified)
export const PYUSD_ABI = [
    {
        "inputs": [],
        "name": "name",
        "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "symbol",
        "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "decimals",
        "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "address", "name": "account", "type": "address" }],
        "name": "balanceOf",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "address", "name": "spender", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }],
        "name": "approve",
        "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }, { "internalType": "address", "name": "spender", "type": "address" }],
        "name": "allowance",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    }
] as const;

// Types
export interface CampaignData {
    campaignAddress: string;
    creator: string;
    title: string;
    createdAt: number;
    isActive: boolean;
}

export interface CampaignSummary {
    title: string;
    description: string;
    totalGoal: bigint;
    totalRaised: bigint;
    startTime: number;
    endTime: number;
    creator: string;
    isActive: boolean;
    milestoneCount: number;
}

export interface Milestone {
    description: string;
    amount: bigint;
    deadline: number;
    state: number; // MilestoneState enum
    submittedAt: number;
    votingEnd: number;
    yesVotes: bigint;
    noVotes: bigint;
    aiReviewHash: string;
    fundsReleased: boolean;
}

export interface CampaignDetails extends CampaignSummary {
    milestones: Milestone[];
    backersCount: number;
    userContribution: bigint;
    isBacker: boolean;
}

// Network configuration
export const NETWORK_CONFIG = {
    chainId: process.env.NEXT_PUBLIC_CHAIN_ID ? parseInt(process.env.NEXT_PUBLIC_CHAIN_ID) : 11155111, // Ethereum Sepolia
    name: 'Ethereum Sepolia',
    rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || 'https://sepolia.drpc.org',
    blockExplorer: process.env.NEXT_PUBLIC_BLOCK_EXPLORER || 'https://eth-sepolia.blockscout.com',
};
