const axios = require('axios');

const BASE_URL = 'https://afyaclass.co.tz/backend-php/public/api';

async function inspect() {
    console.log('--- Inspecting API ---');

    // 1. Try Public Ads
    try {
        console.log('Fetching advertisements (Public)...');
        const adsRes = await axios.get(`${BASE_URL}/advertisements`, {
            headers: { 'Accept': 'application/json' }
        });
        const ads = Array.isArray(adsRes.data) ? adsRes.data : (adsRes.data.data || []);
        console.log('Ads found:', ads.length);
        if (ads.length > 0) {
            console.log('Ad Structure:', JSON.stringify(ads[0], null, 2));
        }
    } catch (e) {
        console.log('Public ads fetch failed:', e.message);
    }

    // 2. Login and User Info
    try {
        console.log('Logging in...');
        const loginRes = await axios.post(`${BASE_URL}/login`, {
            email: 'gentle14',
            password: 'w277ench'
        }, {
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
        });

        const token = loginRes.data.userToken || loginRes.data.token || loginRes.data.access_token;
        const user = loginRes.data.user || loginRes.data.data;

        console.log('Login User Object:', JSON.stringify(user, null, 2)); // Check for created_at here!

        if (token) {
            // Check Profile Detail
            if (user && (user.id || user.userId)) {
                const id = user.id || user.userId;
                console.log(`Fetching detailed user ${id}...`);
                const userRes = await axios.get(`${BASE_URL}/user/${id}`, {
                    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
                });
                console.log('User Detail Object:', JSON.stringify(userRes.data, null, 2));
            }
        }

    } catch (error) {
        console.error('Login/User fetch failed:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data));
        }
    }
}

inspect();
