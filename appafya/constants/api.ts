import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const BASE_URL = 'https://afyaclass.co.tz/backend-php/public';

const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

// Add a request interceptor to add the auth token to every request
api.interceptors.request.use(
    async (config) => {
        try {
            let token;
            if (Platform.OS !== 'web') {
                token = await SecureStore.getItemAsync('userToken');
            } else {
                token = localStorage.getItem('userToken');
            }

            let deviceId;
            if (Platform.OS !== 'web') {
                deviceId = await SecureStore.getItemAsync('deviceId');
            } else {
                deviceId = localStorage.getItem('deviceId');
            }

            // Debug logs
            const shortToken = token ? `${token.substring(0, 15)}...` : 'NONE';
            console.log(`[API] Req: ${config.url} | Token: ${shortToken} | DeviceID: ${deviceId || 'NONE'}`);

            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            if (deviceId) {
                config.headers['X-Device-ID'] = deviceId;
            }
        } catch (error) {
            console.log('[API] Error attaching token', error);
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add response interceptor for debugging
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            const url = error.config?.url || '';
            console.log(`[API] 401 Unauthorized for ${url}.`);

            // Check if this is a login-related request (login or OTP verification)
            // We use case-insensitive check and look for the endpoint path
            const isLoginRequest = url.toLowerCase().includes('/login') ||
                url.toLowerCase().includes('/verify-login-otp');

            if (!isLoginRequest) {
                console.log('[API] Triggering global unauthorized event');
                import('../utils/events').then(({ eventEmitter }) => {
                    eventEmitter.emit('unauthorized');
                });
            } else {
                console.log('[API] Ignoring 401 for login request (letting component handle it)');
            }
        }
        return Promise.reject(error);
    }
);

export default api;
