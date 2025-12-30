import axiosClient from './axiosClient'; // Import the new axiosClient

// User Authentication and Profile Management
export const registerUser = async (userData: any) => {
  const response = await axiosClient.post('/register', userData);
  return response.data;
};

export const loginUser = async (credentials: { emailOrUsername: string; password: string; forceLogin?: boolean }) => {
  try {
    const response = await axiosClient.post('/login', credentials);
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.status === 409) {
      // Re-throw the error with the backend's response data for AuthContext to handle
      throw { response: error.response };
    }
    throw error; // Re-throw other errors
  }
};

export const logoutUser = async (sessionId: string | null) => {
  const response = await axiosClient.post('/logout', { sessionId });
  return response.data;
};

export const fetchUserProfile = async (userId: number) => {
  const response = await axiosClient.get(`/user/${userId}`);
  return response.data;
};

export const updateUserProfile = async (userId: number, userData: any) => {
  const response = await axiosClient.put(`/user/${userId}`, userData);
  return response.data;
};

export const updateUserPassword = async (userId: number, passwords: any) => {
  const response = await axiosClient.put(`/user/${userId}/password`, passwords);
  return response.data;
};

export const deleteUserAccount = async (userId: number) => {
  const response = await axiosClient.delete(`/user/${userId}`);
  return response.data;
};

// Admin User Management
export const fetchAllUsers = async () => {
  const response = await axiosClient.get('/admin/users');
  return response.data;
};

export const createNewUser = async (userData: any) => {
  const response = await axiosClient.post('/admin/users', userData);
  return response.data;
};

export const adminUpdateUser = async (userId: number, userData: any) => {
  const response = await axiosClient.put(`/admin/users/${userId}`, userData);
  return response.data;
};

export const adminDeleteUser = async (userId: number) => {
  const response = await axiosClient.delete(`/admin/users/${userId}`);
  return response.data;
};

export const startMaterialTrial = async (userId: number) => {
  const response = await axiosClient.post('/users/start-material-trial', { userId });
  return response.data;
};

export const resendConfirmationEmail = async (email: string) => {
  const response = await axiosClient.post('/resend-confirmation-email', { email });
  return response.data;
};

export const verifyLoginOtp = async (otpData: { email: string; otp: string }) => {
  const response = await axiosClient.post('/verify-login-otp', otpData);
  return response.data;
};

export const requestPasswordReset = async (email: string) => {
  const response = await axiosClient.post('/request-password-reset', { email });
  return response.data;
};

export const resetPassword = async (resetData: { email: string; otp: string; newPassword: string }) => {
  const response = await axiosClient.post('/reset-password', resetData);
  return response.data;
};

export const validateToken = async () => {
  const response = await axiosClient.get('/validate-token');
  return response.data;
};

// --- New functions for session management ---

// Function to terminate all other sessions for the current user
export const terminateAllOtherSessions = async (userId: number, currentSessionId: string | null, sessionResolutionToken: string) => {
  const url = '/terminate-all-other-sessions';
  console.log(`authApi: Calling ${url} with userId: ${userId}, currentSessionId: ${currentSessionId}`);
  const response = await axiosClient.post(url, { userId, currentSessionId }, {
    headers: {
      'Authorization': `Bearer ${sessionResolutionToken}`
    }
  });
  return response.data;
};

// Function to terminate a specific session
export const terminateSession = async (sessionIdToTerminate: string, sessionResolutionToken: string) => {
  const url = '/terminate-session';
  console.log(`authApi: Calling ${url} with sessionIdToTerminate: ${sessionIdToTerminate}`);
  const response = await axiosClient.post(url, { sessionId: sessionIdToTerminate }, {
    headers: {
      'Authorization': `Bearer ${sessionResolutionToken}`
    }
  });
  return response.data;
};
