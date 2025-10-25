const axios = require('axios');

async function testWebhook() {
    try {
        console.log('Testing Veriff webhook endpoint...');

        const testPayload = {
            verification: {
                sessionToken: 'test_session_123',
                status: 'finished',
                decision: 'approved',
                person: {
                    firstName: 'Test',
                    lastName: 'User'
                },
                document: {
                    type: 'PASSPORT',
                    number: 'TEST123456'
                }
            },
            vendorData: {
                sessionId: 'test_session_123',
                walletAddress: '0x1234567890123456789012345678901234567890'
            },
            action: 'decision_made'
        };

        const response = await axios.post('http://localhost:8000/api/kyc/veriff-callback', testPayload, {
            headers: {
                'Content-Type': 'application/json',
                'x-signature': 'test_signature',
                'x-timestamp': Math.floor(Date.now() / 1000).toString()
            },
            timeout: 10000
        });

        console.log('Webhook response status:', response.status);
        console.log('Webhook response data:', response.data);

        if (response.status === 200) {
            console.log('✅ Webhook endpoint is working correctly!');
        } else {
            console.log('❌ Webhook endpoint returned unexpected status');
        }

    } catch (error) {
        console.error('❌ Webhook test failed:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
    }
}

testWebhook();
