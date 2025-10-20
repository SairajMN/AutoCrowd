const { debugContributeIssue } = require('./frontend/lib/debug.ts');

async function runDiagnosis() {
    // Data from the error report
    const campaignAddress = '0x1bC1f0331205B669542eB1420cff776A0214bAc5';
    const userAddress = '0x754142F6be13FbBfDf3643B73B0C79a622320953';
    const pyusdAddress = '0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9';
    const amount = '1'; // 1 PYUSD

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
