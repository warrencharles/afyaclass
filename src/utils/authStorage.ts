// authStorage.ts
const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";
const DEVICE_ID_KEY = "device_id";

export function saveAuthToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}
export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(DEVICE_ID_KEY); // Clear device ID on logout
}
export function saveUser(user: any) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}
export function getUserFromStorage(): any | null {
  const s = localStorage.getItem(USER_KEY);
  return s ? JSON.parse(s) : null;
}

export function saveDeviceId(deviceId: string) {
  localStorage.setItem(DEVICE_ID_KEY, deviceId);
}
export function getDeviceId(): string | null {
  return localStorage.getItem(DEVICE_ID_KEY);
}
export function clearDeviceId() {
  localStorage.removeItem(DEVICE_ID_KEY);
}
