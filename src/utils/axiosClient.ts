// axiosClient.ts
import axios from "axios";
import { getAuthToken, getDeviceId } from "./authStorage"; // Import getDeviceId

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "https://afyaclass.co.tz/backend-php/public",
  withCredentials: false,
  headers: { "Content-Type": "application/json" },
});

// Attach token and device ID on each request if available
axiosClient.interceptors.request.use(config => {
  const token = getAuthToken();
  const deviceId = getDeviceId(); // Get device ID

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (deviceId) {
    config.headers['X-Device-ID'] = deviceId; // Attach device ID to a custom header
  }
  return config;
});

// Response interceptor to centrally handle 401/403
axiosClient.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401 || err.response?.status === 403) {
      // Optional: You can emit an event or call a callback to log out globally
      // But DON'T forcibly redirect here; instead throw an identifiable error
      err.isAuthError = true;
    }
    return Promise.reject(err);
  }
);

export default axiosClient;
