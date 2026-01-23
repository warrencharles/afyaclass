const axios = require('axios');

const BASE_URL = 'https://afyaclass.co.tz/backend-php/public/api'; // inferred from api.ts (api.ts had /backend-php/public, usually /api is next, checking...)

async function inspect() {
    try {
        console.log('Logging in...');
        // Try standard login endpoint
        const loginRes = await axios.post('https://afyaclass.co.tz/backend-php/public/api/login', {
            email: 'gentle14', // User said username gentle14, usually API takes email/username field
            password: 'w277ench'
        });

        const token = loginRes.data.token || loginRes.data.access_token;
        const user = loginRes.data.user;

        console.log('Login successful. User:', user);
        console.log('Token:', token ? 'Found' : 'Missing');

        if (token) {
            const authHeader = { Authorization: `Bearer ${token}` };

            // 1. Check User Details (sometimes login user object is partial)
            if (user && user.id) {
                console.log(`Fetching user details for ID ${user.id}...`);
                const userRes = await axios.get(`https://afyaclass.co.tz/backend-php/public/api/user/${user.id}`, { headers: authHeader });
                console.log('User Details Keys:', Object.keys(userRes.data));
                console.log('User Created At field:', userRes.data.created_at, userRes.data.createdAt, userRes.data.date_joined);
            }

            // 2. Check Advertisements
            console.log('Fetching advertisements...');
            const adsRes = await axios.get('https://afyaclass.co.tz/backend-php/public/api/advertisements', { headers: authHeader });
            console.log('Ads Response Status:', adsRes.status);

            const ads = Array.isArray(adsRes.data) ? adsRes.data : adsRes.data.data;
            if (ads && ads.length > 0) {
                console.log('First Ad Object:', JSON.stringify(ads[0], null, 2));
            } else {
                console.log('No ads found or structure unknown:', adsRes.data);
            }
        }

    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Response Data:', error.response.data);
        }
    }
}

inspect();
