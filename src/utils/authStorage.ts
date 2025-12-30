// authStorage.ts
const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";
const DEVICE_ID_KEY = "device_id";

export function saveAuthToken(token: string) {
  sessionStorage.setItem(TOKEN_KEY, token);
}
export function getAuthToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}
export function clearAuthToken() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(DEVICE_ID_KEY); // Clear device ID on logout
}
export function saveUser(user: any) {
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
}
export function getUserFromStorage(): any | null {
  const s = sessionStorage.getItem(USER_KEY);
  return s ? JSON.parse(s) : null;
}

export function saveDeviceId(deviceId: string) {
  sessionStorage.setItem(DEVICE_ID_KEY, deviceId);
}
export function getDeviceId(): string | null {
  return sessionStorage.getItem(DEVICE_ID_KEY);
}
export function clearDeviceId() {
  sessionStorage.removeItem(DEVICE_ID_KEY);
}
