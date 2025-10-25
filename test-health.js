const axios = require('axios');

async function testHealth() {
    try {
        console.log('Testing health endpoint...');

        const response = await axios.get('http://localhost:8000/health', {
            timeout: 5000
        });

        console.log('Health check response status:', response.status);
        console.log('Health check response data:', response.data);

        if (response.status === 200) {
            console.log('✅ Backend server is running correctly!');
        }

    } catch (error) {
        console.error('❌ Health check failed:', error.message);
        if (error.code === 'ECONNREFUSED') {
            console.error('Backend server is not running on port 8000');
        }
    }
}

testHealth();
