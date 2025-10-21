const { ethers } = require('ethers');

// Simplified PYUSD ABI
const PYUSD_ABI = [
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
];

// Simplified Campaign ABI
const CAMPAIGN_ABI = [
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
        "inputs": [{ "internalType": "uint256", "name": "_amount", "type": "uint256" }],
        "name": "contribute",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

async function debugContributeIssue(campaignAddress, userAddress, pyusdAddress, amount) {
    const provider = new ethers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/ltQPtfSZ7mLXfOOk_drsl');

    console.log('=== Starting Diagnosis ===');
    console.log('Campaign:', campaignAddress);
    console.log('User:', userAddress);
    console.log('PYUSD:', pyusdAddress);
    console.log('Amount:', amount, 'PYUSD');

    try {
        // Check PYUSD contract
        console.log('\n--- Checking PYUSD Contract ---');
        const pyusdCode = await provider.getCode(pyusdAddress);
        console.log('PYUSD deployed:', pyusdCode !== '0x');

        if (pyusdCode !== '0x') {
            const pyusd = new ethers.Contract(pyusdAddress, PYUSD_ABI, provider);
            const name = await pyusd.name().catch(() => 'Unknown');
            const symbol = await pyusd.symbol().catch(() => 'Unknown');
            const decimals = await pyusd.decimals().catch(() => 0);
            console.log('PYUSD Name:', name);
            console.log('PYUSD Symbol:', symbol);
            console.log('PYUSD Decimals:', decimals);

            // Check user balance
            const balance = await pyusd.balanceOf(userAddress).catch(() => 0n);
            console.log('User PYUSD Balance:', ethers.formatUnits(balance, decimals));

            // Check allowance
            const allowance = await pyusd.allowance(userAddress, campaignAddress).catch(() => 0n);
            console.log('User PYUSD Allowance:', ethers.formatUnits(allowance, decimals));
        }

        // Check campaign contract
        console.log('\n--- Checking Campaign Contract ---');
        const campaignCode = await provider.getCode(campaignAddress);
        console.log('Campaign deployed:', campaignCode !== '0x');

        if (campaignCode !== '0x') {
            const campaign = new ethers.Contract(campaignAddress, CAMPAIGN_ABI, provider);
            const summary = await campaign.getCampaignSummary();
            console.log('Campaign Title:', summary.title);
            console.log('Campaign Active:', summary.isActive);
            console.log('Campaign End Time:', new Date(Number(summary.endTime) * 1000).toISOString());
            console.log('Total Goal:', ethers.formatUnits(summary.totalGoal, 6));
            console.log('Total Raised:', ethers.formatUnits(summary.totalRaised, 6));
        }

        return { success: true };

    } catch (error) {
        console.error('Diagnosis failed:', error);
        return { success: false, error: error.message };
    }
}

async function runDiagnosis() {
    // Data from the error report - using the actual failing campaign
    const campaignAddress = '0x1f58b44586D69C39D44FfC5477fF99437F758547';
    const userAddress = '0x6951DCad9Ef99075DF2f13657dbe879d49C3EDd8';
    const pyusdAddress = '0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9';
    const amount = '2'; // 2 PYUSD - the failing amount

    console.log('Starting CALL_EXCEPTION diagnosis...');
    console.log('Campaign:', campaignAddress);
    console.log('User:', userAddress);
    console.log('PYUSD:', pyusdAddress);
    console.log('Amount:', amount, 'PYUSD');

    try {
        const result = await debugContributeIssue(
            campaignAddress,
            userAddress,
            pyusdAddress,
            amount
        );

        console.log('\n=== FINAL DIAGNOSIS ===');
        if (result.success) {
            console.log('✅ Transaction should succeed - issue may be with gas estimation or network congestion');
        } else {
            console.log('❌ Transaction will fail:', result.error);
        }
    } catch (error) {
        console.error('Debug script failed:', error);
    }
}

runDiagnosis();
