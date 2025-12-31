import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types'; // Use imported User type
import { useToast } from './ToastContext';
import {
  loginUser,
  registerUser,
  logoutUser,
  updateUserProfile,
  updateUserPassword,
  deleteUserAccount,
  fetchUserProfile,
  startMaterialTrial as startMaterialTrialApi,
  verifyLoginOtp,
  resendConfirmationEmail,
  requestPasswordReset,
  resetPassword,
  terminateAllOtherSessions as terminateAllOtherSessionsApi,
  validateToken,
} from '../utils/authApi';
import { submitMaterialAccessPaymentProof } from '../utils/api'; // Only import what's needed
import { saveAuthToken, clearAuthToken, saveUser, getAuthToken, getUserFromStorage, saveDeviceId, getDeviceId, clearDeviceId } from '../utils/authStorage'; // Import authStorage utilities
import axiosClient from '../utils/axiosClient'; // Import axiosClient
import SessionResolutionModal from '../components/SessionResolutionModal'; // Import the new modal
import { Session } from '../types'; // Import Session type

interface SessionConflictDetails {
  userId: number;
  message: string;
  resolutionToken: string; // Add resolutionToken to conflict details
  activeSessions: Session[]; // Array of active sessions using the Session type
}

interface AuthContextType {
  user: User | null;
  profile: User | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isAuthInitialized: boolean;    // true after initial auth check (valid or invalid)
  setUser: React.Dispatch<React.SetStateAction<User | null>>; // Expose setUser
  setProfile: React.Dispatch<React.SetStateAction<User | null>>; // Expose setProfile
  login: (emailOrUsername: string, password: string, skipSuccessToast?: boolean) => Promise<void>; // Added skipSuccessToast
  register: (userData: {
    email: string;
    password: string;
    username: string;
    college: string;
    phone?: string;
    classType: 'CMT' | 'PST' | 'MLT' | 'NMT' | 'HIT';
    classTypeNameFull?: string;
    classLevel: string;
  }) => Promise<void>;
  logout: (suppressToast?: boolean, isExternalInvalidation?: boolean) => Promise<void>; // Changed to return Promise<void>
  updateProfile: (updates: Partial<User>) => Promise<void>;
  updatePassword: (userId: string, currentPassword: string, newPassword: string) => Promise<void>;
  deleteAccount: (userId: string) => Promise<void>;
  submitPaymentProof: (proofData: {
    userId: string;
    name: string;
    email: string;
    requestType: 'exam_access' | 'exam_guide_access' | 'weekly_material_access' | 'monthly_material_access';
    amount: number;
    paymentScreenshot: File;
  }) => Promise<void>;
  startMaterialTrial: (userId: number) => Promise<void>;
  refetchUser: (userId?: number) => Promise<User | undefined>;
  clearError: () => void;
  verifyOtpLogin: (otp: string) => Promise<void>;
  resendOtp: (email: string) => Promise<void>;
  otpVerificationState: {
    userId: number | null;
    email: string | null;
    resendCooldown: number | null;
    requiresOtpVerification: boolean;
  };
  otpVerifiedSuccessfully: boolean;
  clearOtpVerificationState: () => void;

  // Password Reset specific states and functions
  passwordResetState: {
    email: string | null;
    otpSent: boolean;
    otpVerified: boolean;
    resetSuccess: boolean;
    resendCooldown: number;
  };
  initiatePasswordReset: (email: string) => Promise<void>;
  verifyPasswordResetOtp: (otp: string) => Promise<void>;
  completePasswordReset: (otp: string, newPassword: string) => Promise<void>;
  clearPasswordResetState: () => void;
  resendPasswordResetOtp: () => Promise<void>;

  // Session Termination specific states and functions
  isSessionTerminationModalOpen: boolean;
  sessionConflictDetails: SessionConflictDetails | null;
  handleTerminateAllOtherSessions: () => Promise<void>; // Only keep terminate all
  closeSessionTerminationModal: () => void;

  registerInterval: (id: number) => void;
  clearAllRegisteredIntervals: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(getUserFromStorage()); // Initialize user from storage
  const [profile, setProfile] = useState<User | null>(getUserFromStorage()); // Initialize profile from storage
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthInitialized, setIsAuthInitialized] = useState(false); // true after initial auth check

  const [otpVerificationState, setOtpVerificationState] = useState<{
    userId: number | null;
    email: string | null;
    resendCooldown: number | null;
    requiresOtpVerification: boolean;
  }>({
    userId: null,
    email: null,
    resendCooldown: null,
    requiresOtpVerification: false,
  });
  const [otpVerifiedSuccessfully, setOtpVerifiedSuccessfully] = useState(false);
  const [passwordResetState, setPasswordResetState] = useState<{
    email: string | null;
    otpSent: boolean;
    otpVerified: boolean;
    resetSuccess: boolean;
    resendCooldown: number;
  }>({
    email: null,
    otpSent: false,
    otpVerified: false,
    resetSuccess: false,
    resendCooldown: 0,
  });

  const [isSessionTerminationModalOpen, setIsSessionTerminationModalOpen] = useState(false);
  const [sessionConflictDetails, setSessionConflictDetails] = useState<SessionConflictDetails | null>(null);
  const [pendingLoginCredentials, setPendingLoginCredentials] = useState<{ emailOrUsername: string; password: string } | null>(null);
  const [pendingLoginUserId, setPendingLoginUserId] = useState<number | null>(null); // To store userId for termination
  const [sessionResolutionToken, setSessionResolutionToken] = useState<string | null>(null); // New state for resolution token

  const registeredIntervals = useRef<number[]>([]); // Ref to store interval IDs
  const isInvalidatingRef = useRef(false);

  const { showToast } = useToast();

  // Register intervals so we can clear them on logout
  const registerInterval = useCallback((id: number) => {
    registeredIntervals.current.push(id);
  }, []);

  const clearAllRegisteredIntervals = useCallback(() => {
    registeredIntervals.current.forEach(clearInterval);
    registeredIntervals.current = [];
  }, []);

  const clearError = useCallback(() => {
    setError(prevError => (prevError !== null ? null : prevError));
  }, []);

  const clearOtpVerificationState = useCallback(() => {
    setOtpVerificationState({
      userId: null,
      email: null,
      resendCooldown: null,
      requiresOtpVerification: false,
    });
    setOtpVerifiedSuccessfully(false);
  }, []);

  const clearPasswordResetState = useCallback(() => {
    setPasswordResetState({
      email: null,
      otpSent: false,
      otpVerified: false,
      resetSuccess: false,
      resendCooldown: 0,
    });
  }, []);

  const closeSessionTerminationModal = useCallback(() => {
    setIsSessionTerminationModalOpen(false);
    setSessionConflictDetails(null);
    setPendingLoginCredentials(null); // Clear pending credentials if user cancels
    navigate('/login', { replace: true }); // Navigate back to login page if user cancels
  }, [navigate]);

  const login = useCallback(async (emailOrUsername: string, password: string, skipSuccessToast: boolean = false) => {
    isInvalidatingRef.current = false; // Reset invalidation flag on new login attempt
    setIsLoading(true);
    setError(null);
    // Do NOT set isAuthInitialized to false here. It should only reflect the initial app load check.
    console.log('AuthContext: login started.');
    try {
      const data = await loginUser({ emailOrUsername, password });
      console.log("AuthContext: loginUser response data:", data);

      if (data.status === "success") {
        // Handle successful login
        if (!data || !data.user || typeof data.user.userId === 'undefined' || !data.token || !data.sessionId) {
          throw new Error(data?.message || 'Login response malformed: missing user data, token, or session ID.');
        }

        const loggedInUser: User = {
          id: data.user.userId,
          email: data.user.email ?? null,
          username: data.user.username,
          college: data.user.college,
          phone: data.user.phone,
          classType: data.user.classType,
          classTypeNameFull: data.user.classTypeNameFull,
          classLevel: data.user.classLevel,
          role: data.user.role,
          hasMaterialAccess: data.user.hasMaterialAccess,
          materialTrialStartTime: data.user.materialTrialStartTime,
          materialPaidAccessEndTime: data.user.materialPaidAccessEndTime ?? null,
          hasPendingPayment: data.user.hasPendingPayment,
          isConfirmed: data.user.isConfirmed,
          canAccessExams: data.user.hasMaterialAccess,
          canAccessExamGuides: data.user.hasMaterialAccess,
          token: (data.token ?? null) as string | null,
          device_id: (data.sessionId ?? null) as string | null, // Use sessionId as device_id
        };

        console.log('AuthContext: Login successful. User ID:', loggedInUser.id, 'User:', loggedInUser);
        saveAuthToken(loggedInUser.token as string); // Save token
        saveDeviceId(loggedInUser.device_id as string); // Save device ID
        saveUser(loggedInUser); // Save user
        setUser(loggedInUser);
        setProfile(loggedInUser);

        if (!skipSuccessToast) {
          showToast(data.message || 'Login successful!', 'success');
        }
        navigate(loggedInUser.role === "admin" ? "/admin" : "/dashboard", { replace: true }); // Navigate after setting user
        // Do NOT set isAuthInitialized to true here. It should only reflect the initial app load check.
        return; // Exit after successful login
      } else if (data && data.requiresOtpVerification && data.userId && data.email) { // Corrected condition
        // Handle case where user is not confirmed and needs OTP verification
        console.log('AuthContext: User requires OTP verification during login because they are not confirmed. User ID:', data.userId);
        setOtpVerificationState({
          userId: Number(data.userId), // Use data.userId directly
          email: data.email, // Use data.email directly
          resendCooldown: data.resendCooldown || 0,
          requiresOtpVerification: true,
        });
        // Removed setError here to prevent duplicate messages, showToast is sufficient.
        setUser(null);
        setProfile(null);
        clearAuthToken();
        clearDeviceId(); // Clear device ID as well
        showToast(data.message || 'Please verify your email.', 'warning');
        return;
      } else {
        // Generic error for other cases
        throw new Error(data?.message || 'Login failed due to an unknown reason.');
      }
    } catch (err: any) {
      let errorMessage = (err.response?.data?.message || err.message || 'Login failed') as string;
      const errorDetails = err.response?.data;

      if (errorDetails && typeof errorDetails === 'object') {
        if (errorDetails.status === "conflict") {
          // Handle session conflict
          console.log('AuthContext: Session conflict detected. Opening termination modal.');
          setPendingLoginCredentials({ emailOrUsername, password });
          setPendingLoginUserId(errorDetails.user.userId); // Store user ID for termination
          setSessionConflictDetails({
            userId: errorDetails.user.userId,
            message: errorDetails.message || 'Account already in use on another device.',
            resolutionToken: errorDetails.resolutionToken, // Store the resolution token
            activeSessions: errorDetails.activeSessions, // Pass the entire array of active sessions
          });
          setSessionResolutionToken(errorDetails.resolutionToken); // Also store in separate state for easier access
          setIsSessionTerminationModalOpen(true);
          return; // Exit after handling conflict
        }

        if (errorDetails.error) {
          errorMessage += ` Details: ${errorDetails.error}`;
        }
        if (errorDetails.file && errorDetails.line) {
          errorMessage += ` (File: ${errorDetails.file}, Line: ${errorDetails.line})`;
        }
      }

      console.log("AuthContext: Login failed. Error:", errorMessage);

      setUser(null);
      setProfile(null);
      clearAuthToken(); // Clear token from storage
      clearDeviceId(); // Clear device ID from storage

      if (err.response?.status === 401 || err.response?.status === 403) {
        showToast(errorMessage, 'error');
        return;
      } else {
        showToast(errorMessage, 'error');
      }
    } finally {
      setIsLoading(false);
      // Do NOT set isAuthInitialized to true here. It should only reflect the initial app load check.
      console.log('AuthContext: Login process finished.');
    }
  }, [navigate, showToast, setOtpVerificationState, setUser, setProfile, clearAuthToken, clearDeviceId, closeSessionTerminationModal]);

  const logout = useCallback(async (suppressToast: boolean = false, isExternalInvalidation: boolean = false): Promise<void> => {
    setIsLoading(true);
    setError(null);
    clearOtpVerificationState();
    clearAllRegisteredIntervals(); // Clear all intervals on logout
    try {
      if (!isExternalInvalidation) {
        const currentSessionId = getDeviceId(); // Get the current device ID
        if (currentSessionId) {
          console.log('AuthContext: Calling backend logout for session ID:', currentSessionId);
          await logoutUser(currentSessionId); // Call backend to invalidate the specific session
        }
      }

      clearAuthToken(); // Clear token from storage
      clearDeviceId(); // Clear device ID from storage
      setUser(null);
      setProfile(null);

      if (!suppressToast) {
        showToast('Logged out successfully!', 'success');
      }
      navigate('/login', { replace: true }); // Navigate AFTER clearing state
    } catch (err: any) {
      console.error('Logout error:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Logout failed';
      setError(errorMessage);
      showToast(errorMessage, 'error');
      throw err; // Re-throw the error to ensure the Promise rejects
    } finally {
      setIsLoading(false);
      console.log('AuthContext: Logout process finished.');
    }
  }, [showToast, clearOtpVerificationState, clearAllRegisteredIntervals, navigate, getDeviceId, logoutUser]);

  // Removed handleTerminateSpecificSession as it's no longer directly used by the modal.
  // The modal now only offers "Terminate All Other Sessions".

  const handleTerminateAllOtherSessions = useCallback(async () => { // New function
    if (!pendingLoginCredentials || pendingLoginUserId === null || !sessionResolutionToken) {
      showToast('Login credentials, user ID, or resolution token missing for terminating all other sessions.', 'error');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      closeSessionTerminationModal(); // Close the modal immediately

      // Call the backend endpoint to terminate all other sessions
      await terminateAllOtherSessionsApi(pendingLoginUserId, null, sessionResolutionToken);

      // After successful termination, re-attempt login for the current user
      await login(pendingLoginCredentials.emailOrUsername, pendingLoginCredentials.password, false);
    } catch (err: any) {
      console.error('AuthContext: Error during all other sessions termination and re-login:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to terminate all other sessions and log in.';
      setError(errorMessage);
      showToast(errorMessage, 'error');
      navigate('/login', { replace: true }); // Go back to login on failure
    } finally {
      setIsLoading(false);
    }
  }, [pendingLoginCredentials, pendingLoginUserId, sessionResolutionToken, showToast, login, closeSessionTerminationModal, navigate]);


  const register = async (userData: {
    email: string;
    password: string;
    username: string;
    college: string;
    phone?: string;
    classType: 'CMT' | 'PST' | 'MLT' | 'NMT' | 'HIT';
    classTypeNameFull?: string;
    classLevel: string;
  }) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await registerUser(userData);

      if (data && data.message && (data.userId != null && data.userId !== '')) {
        showToast(data.message, 'success');
        console.log('AuthContext: Registration successful. User ID:', data.userId);

        setOtpVerificationState({
          userId: Number(data.userId),
          email: userData.email,
          resendCooldown: data.resendCooldown || 0,
          requiresOtpVerification: true,
        });
      } else if (data && data.message) {
        throw new Error(data.message);
      } else {
        throw new Error('Registration response malformed: missing userId or message.');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Registration failed';
      setError(errorMessage);
      setUser(null);
      setProfile(null);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };


  const isAuthenticated = !!user;
  const isAdmin = user?.role === 'admin';

  const refetchUser = useCallback(async (userIdFromParam?: number) => {
    console.log('AuthContext: refetchUser - userIdFromParam:', userIdFromParam);
    console.log('AuthContext: refetchUser - user?.id (current state):', user?.id);
    const idToFetch = userIdFromParam ?? user?.id;
    console.log('AuthContext: refetchUser - idToFetch after ?? operator:', idToFetch, 'Type:', typeof idToFetch);
    const parsedIdToFetch = parseInt(String(idToFetch), 10);

    const token = getAuthToken(); // Use getAuthToken from authStorage
    if (!token) {
      console.warn('AuthContext: No token found. Stopping refetchUser to prevent 401 spam.');
      setIsLoading(false);
      return;
    }

    if (isNaN(parsedIdToFetch) || parsedIdToFetch <= 0) {
      console.warn(`AuthContext: refetchUser called with invalid user ID. Skipping fetch. idToFetch: ${idToFetch}, Parsed ID: ${parsedIdToFetch}`);
      setIsLoading(false);
      return;
    }
    const finalIdToFetch = parsedIdToFetch;
    setIsLoading(true);
    try {
      const data = await fetchUserProfile(finalIdToFetch);
      console.log('AuthContext: refetchUser - Raw data from backend:', data);

      const fetchedUser: User = {
        id: data.id,
        email: data.email,
        username: data.username,
        college: data.college,
        phone: data.phone ?? null,
        classType: data.classType,
        classTypeNameFull: data.classTypeNameFull ?? null,
        classLevel: data.classLevel,
        role: data.role,
        hasMaterialAccess: data.hasMaterialAccess ?? false,
        materialTrialStartTime: data.materialTrialStartTime ?? null,
        materialTrialEndTime: data.materialTrialEndTime ?? null,
        materialPaidAccessEndTime: data.materialPaidAccessEndTime ?? null,
        hasPendingPayment: data.hasPendingPayment ?? false,
        isConfirmed: data.isConfirmed ?? false,
        canAccessExams: data.hasMaterialAccess,
        canAccessExamGuides: data.hasMaterialAccess,
        token: user?.token ?? null,
        device_id: user?.device_id ?? null,
      };
      console.log('AuthContext: refetchUser - fetchedUser.materialTrialStartTime:', fetchedUser.materialTrialStartTime);
      console.log('AuthContext: refetchUser - fetchedUser.hasMaterialAccess:', fetchedUser.hasMaterialAccess);

      // Only update state if the fetched user data is actually different
      if (JSON.stringify(user) !== JSON.stringify(fetchedUser)) {
        setUser(fetchedUser);
        setProfile(fetchedUser);
        saveUser(fetchedUser); // Save user to storage
        console.log('AuthContext: User state updated after refetchUser. User ID:', fetchedUser.id, 'User:', fetchedUser);
      } else {
        console.log('AuthContext: Refetched user data is identical, no state update needed.');
      }

      saveAuthToken(fetchedUser.token as string); // Save token to storage
      return fetchedUser;
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        console.warn("AuthContext: API: Authentication error (401/403) during refetch. Session may have expired.");
      } else {
        console.error('AuthContext: Error refetching user:', err);
        console.warn('AuthContext: Refetch user failed due to non-authentication error. User state maintained.', err);
      }
      throw err; // Re-throw the error so calling functions can handle it
    } finally {
      setIsLoading(false);
    }
  }, [user, setIsLoading, setUser, setProfile, showToast]);

  const handleSessionInvalidated = useCallback(() => {
    if (!user) {
      console.log('AuthContext: handleSessionInvalidated suppressed - no active user.');
      return;
    }
    if (isInvalidatingRef.current) {
      console.log('AuthContext: Session invalidation already in progress. Skipping.');
      return;
    }
    isInvalidatingRef.current = true;
    console.log('AuthContext: handleSessionInvalidated triggered.');
    showToast('Your session has been terminated from another device. Please log in again.', 'warning');
    logout(true, true);
    navigate('/login', { replace: true });
  }, [user, showToast, navigate, logout]);

  useEffect(() => {
    // Set up axios interceptor for 401/403 errors
    const interceptor = axiosClient.interceptors.response.use(
      response => response,
      error => {
        const isCredentialRequest = error.config?.url?.includes('/login') || error.config?.url?.includes('/password');
        if (error.isAuthError && !isCredentialRequest) { // Custom property set in axiosClient
          console.warn('AuthContext: axiosClient interceptor detected authentication error on protected route. Triggering session invalidation.');
          handleSessionInvalidated();
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axiosClient.interceptors.response.eject(interceptor);
    };
  }, [handleSessionInvalidated]);

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      const id = window.setInterval(() => { // Use window.setInterval for type safety with useRef
        if (document.visibilityState === 'visible') {
          console.log('AuthContext: Performing periodic session check...');
          refetchUser(user.id).catch(err => {
            if (err.response?.status === 401 || err.response?.status === 403) {
              console.warn('AuthContext: Periodic session check failed due to authentication error. Logging out.');
              logout(true, true);
            } else {
              // Suppress detailed error logging for network issues during background polling
              console.warn('AuthContext: Periodic session check failed (network/server issue).');
            }
          });
        }
      }, 60000);
      registerInterval(id); // Register the interval
    } else {
      clearAllRegisteredIntervals(); // Clear all intervals if not authenticated
    }

    return () => {
      clearAllRegisteredIntervals(); // Clear on unmount
    };
  }, [isAuthenticated, user?.id, refetchUser, logout, registerInterval, clearAllRegisteredIntervals]);

  useEffect(() => {
    const loadAndValidateUser = async () => {
      setIsAuthInitialized(false); // Not ready until initial check is done
      console.log('AuthContext: loadAndValidateUser started. Setting isAuthInitialized to false.');
      const storedUser = getUserFromStorage(); // Use getUserFromStorage
      const storedToken = getAuthToken(); // Use getAuthToken

      if (storedUser && storedToken) {
        try {
          // Ensure the stored user has necessary properties
          if (
            storedUser &&
            typeof storedUser.id === 'number' &&
            storedUser.isConfirmed &&
            Object.prototype.hasOwnProperty.call(storedUser, 'token') &&
            Object.prototype.hasOwnProperty.call(storedUser, 'device_id') // Check for device_id
          ) {
            console.log('AuthContext: Loading confirmed user from localStorage. User ID:', storedUser.id);
            saveAuthToken(storedToken); // Ensure token is set for axiosClient
            saveDeviceId(storedUser.device_id as string); // Ensure device_id is set for axiosClient

            try {
              const validationResponse = await validateToken();
              if (validationResponse.valid) {
                console.log('AuthContext: Token validated successfully with backend.');
                setUser(storedUser);
                setProfile(storedUser);
                console.log('AuthContext: User state updated from localStorage. User ID:', storedUser.id);
              } else {
                console.warn('AuthContext: Token validation failed. Clearing session.');
                clearAuthToken();
                clearDeviceId(); // Clear device ID
                setUser(null);
                setProfile(null);
              }
            } catch (validationError: any) {
              console.error('AuthContext: Error validating token with backend. Clearing session:', validationError);
              clearAuthToken();
              clearDeviceId(); // Clear device ID
              setUser(null);
              setProfile(null);
            }
          } else {
            console.warn('AuthContext: Stored user in localStorage is invalid, missing ID, unconfirmed, or missing token/device_id properties. Clearing localStorage.');
            clearAuthToken();
            clearDeviceId(); // Clear device ID
            setUser(null);
            setProfile(null);
          }
        } catch (e) {
          console.error('AuthContext: Error parsing user from localStorage:', e);
          clearAuthToken();
          clearDeviceId(); // Clear device ID
          setUser(null); // Ensure user is null on parse error
          setProfile(null); // Ensure profile is null on parse error
        }
      } else {
        console.log('AuthContext: No user or token found in localStorage.');
        clearAuthToken(); // Ensure no stale token remains
        clearDeviceId(); // Ensure no stale device ID remains
        setUser(null);
        setProfile(null);
      }
      setIsAuthInitialized(true); // Ensure isAuthInitialized is true after all checks, regardless of outcome
      console.log('AuthContext: loadAndValidateUser process finished. Final isAuthInitialized state:', true);
    };

    loadAndValidateUser();
  }, []); // Run only once on mount


  useEffect(() => {
    console.log('AuthContext: isAuthenticated changed to:', isAuthenticated, 'User:', user, 'isAuthInitialized:', isAuthInitialized);
  }, [isAuthenticated, user, isAuthInitialized]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (passwordResetState.resendCooldown > 0) {
      timer = setTimeout(() => {
        setPasswordResetState(prevState => ({
          ...prevState,
          resendCooldown: prevState.resendCooldown - 1,
        }));
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [passwordResetState.resendCooldown]);

  const updateProfile = async (updates: Partial<User>) => {
    console.log('AuthContext: updateProfile called with updates:', updates);
    if (!user) {
      console.log('AuthContext: No user logged in, throwing error.');
      throw new Error('No user logged in');
    }

    setError(null);
    setIsLoading(true);
    try {
      const data = await updateUserProfile(user.id, updates);

      await refetchUser(user.id);

      showToast(data.message || 'Profile Updated Successfully!', 'success');

    } catch (err: any) {
      console.error('AuthContext: Error during profile update:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to update profile';
      setError(errorMessage);
      showToast(errorMessage, 'error');
      throw err;
    } finally {
      setIsLoading(false);
      console.log('AuthContext: updateProfile finished.');
    }
  };

  const updatePassword = async (userId: string, currentPasswordInput: string, newPasswordInput: string) => {
    console.log('AuthContext: updatePassword called');
    console.log('AuthContext: userId:', userId);
    console.log('AuthContext: currentPasswordInput (masked):', currentPasswordInput ? '********' : 'N/A');
    console.log('AuthContext: newPasswordInput (masked):', newPasswordInput ? '********' : 'N/A');

    if (!user || user.id !== Number(userId)) {
      showToast('Unauthorized action.', 'error');
      throw new Error('Unauthorized');
    }

    setError(null);
    setIsLoading(true);
    try {
      const data = await updateUserPassword(Number(userId), { currentPassword: currentPasswordInput, newPassword: newPasswordInput });
      console.log(`User ${userId} password updated successfully.`);
      showToast(data.message || 'Password updated successfully!', 'success');
    } catch (err: any) {
      console.error('AuthContext: Error during password update fetch:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to update password';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteAccount = async (userId: string) => {
    if (!user || user.id !== Number(userId)) {
      showToast('Unauthorized action.', 'error');
      throw new Error('Unauthorized');
    }

    setError(null);
    setIsLoading(true);
    try {
      const data = await deleteUserAccount(Number(userId));

      showToast(data.message || 'Account deleted successfully!', 'success');
      logout();
    } catch (err: any) {
      console.error('AuthContext: Error during account deletion fetch:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to delete account';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const submitPaymentProof = async (proofData: {
    userId: string;
    name: string;
    email: string;
    requestType: 'exam_access' | 'exam_guide_access' | 'weekly_material_access' | 'monthly_material_access';
    amount: number;
    paymentScreenshot: File;
  }) => {
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('userId', proofData.userId);
      formData.append('name', proofData.name);
      formData.append('email', proofData.email);
      formData.append('requestType', proofData.requestType);
      formData.append('amount', proofData.amount.toString());
      formData.append('paymentScreenshot', proofData.paymentScreenshot);

      const data = await submitMaterialAccessPaymentProof(formData);

      showToast(data.message || 'Payment proof submitted successfully!', 'success');
      await refetchUser(Number(proofData.userId));
    } catch (err: any) {
      console.error('AuthContext: Error submitting payment proof:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to submit payment proof';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const startMaterialTrial = async (userId: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await startMaterialTrialApi(userId);
      await refetchUser(userId);
      showToast(data.message || 'Material trial started successfully!', 'success');
    } catch (err: any) {
      console.error('AuthContext: Error starting material trial:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to start material trial';
      setError(errorMessage);
      showToast(errorMessage, 'error');
      await refetchUser(userId);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtpLogin = async (otp: string) => {
    if (!otpVerificationState.userId || !otpVerificationState.email) {
      showToast('Cannot verify OTP without user ID and email.', 'error');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await verifyLoginOtp({ email: otpVerificationState.email, otp });
      console.log('AuthContext: verifyOtpLogin - Backend response data:', data); // Add this log
      if (data.message === 'Email verified successfully! You can log in now.') { // Updated message to match backend
        setOtpVerifiedSuccessfully(true);
        showToast(data.message, 'success');
        navigate('/login', { replace: true });
      } else {
        throw new Error(data.message || 'OTP verification response malformed.');
      }
    } catch (err: any) {
      console.error('AuthContext: Error verifying OTP:', err);
      const errorMessage = err.response?.data?.message || err.message || 'OTP verification failed';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const resendOtp = async (email: string) => {
    if (!email) {
      showToast('Email is required to resend OTP.', 'error');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await resendConfirmationEmail(email);
      showToast(data.message || 'New OTP sent. Please check your email.', 'success');
      if (data.resendCooldown) {
        setOtpVerificationState(prevState => ({
          ...prevState,
          resendCooldown: data.resendCooldown,
        }));
      }
    } catch (err: any) {
      console.error('AuthContext: Error resending OTP:', err);
      const errorMessage: string = err.response?.data?.message || err.message || 'Failed to resend OTP';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const initiatePasswordReset = async (email: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await requestPasswordReset(email);
      setPasswordResetState(prevState => ({
        ...prevState,
        email,
        otpSent: true,
        resendCooldown: data.resendCooldown || 0,
      }));
      showToast(data.message || 'Password reset OTP sent to your email!', 'success');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to initiate password reset.';
      showToast(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyPasswordResetOtp = async (_otp: string) => {
    if (!passwordResetState.email || !passwordResetState.otpSent) {
      showToast('Please request a password reset first.', 'error');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      setPasswordResetState(prevState => ({
        ...prevState,
        otpVerified: true,
      }));
      showToast('OTP verified. Please set your new password.', 'success');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'OTP verification failed.';
      showToast(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const completePasswordReset = async (otp: string, newPassword: string) => {
    if (!passwordResetState.email || !passwordResetState.otpVerified) {
      showToast('Please complete the OTP verification step first.', 'error');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await resetPassword({
        email: passwordResetState.email,
        otp,
        newPassword,
      });
      setPasswordResetState(prevState => ({
        ...prevState,
        resetSuccess: true,
      }));
      showToast(data.message || 'Password reset successfully! You can now log in.', 'success');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to reset password.';
      showToast(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const resendPasswordResetOtp = async () => {
    if (!passwordResetState.email || passwordResetState.resendCooldown > 0) {
      showToast('Cannot resend OTP. Please wait or provide an email.', 'warning');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await requestPasswordReset(passwordResetState.email);
      setPasswordResetState(prevState => ({
        ...prevState,
        resendCooldown: data.resendCooldown || 0,
        otpSent: true,
      }));
      showToast(data.message || 'New password reset OTP sent!', 'success');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to resend OTP.';
      showToast(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const contextValue = React.useMemo(() => ({
    user,
    profile,
    isLoading,
    error,
    isAuthenticated,
    isAdmin,
    isAuthInitialized,
    login,
    register,
    logout,
    updateProfile,
    updatePassword,
    deleteAccount,
    submitPaymentProof,
    startMaterialTrial,
    refetchUser,
    clearError,
    verifyOtpLogin,
    resendOtp,
    otpVerificationState,
    otpVerifiedSuccessfully,
    clearOtpVerificationState,
    passwordResetState,
    initiatePasswordReset,
    verifyPasswordResetOtp,
    completePasswordReset,
    clearPasswordResetState,
    resendPasswordResetOtp,
    isSessionTerminationModalOpen,
    sessionConflictDetails,
    handleTerminateAllOtherSessions,
    closeSessionTerminationModal,
    registerInterval,
    clearAllRegisteredIntervals,
    setUser,
    setProfile,
  }), [
    user, profile, isLoading, error, isAuthenticated, isAdmin, isAuthInitialized,
    login, register, logout, updateProfile, updatePassword, deleteAccount,
    submitPaymentProof, startMaterialTrial, refetchUser, clearError,
    verifyOtpLogin, resendOtp, otpVerificationState, otpVerifiedSuccessfully,
    clearOtpVerificationState, passwordResetState, initiatePasswordReset,
    verifyPasswordResetOtp, completePasswordReset, clearPasswordResetState,
    resendPasswordResetOtp, isSessionTerminationModalOpen, sessionConflictDetails,
    handleTerminateAllOtherSessions, closeSessionTerminationModal,
    registerInterval, clearAllRegisteredIntervals, setUser, setProfile
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
      {isSessionTerminationModalOpen && sessionConflictDetails && (
        <SessionResolutionModal
          isOpen={isSessionTerminationModalOpen}
          onCancel={closeSessionTerminationModal}
          onTerminateAll={handleTerminateAllOtherSessions}
          sessionConflictDetails={sessionConflictDetails}
        />
      )}
    </AuthContext.Provider>
  );
};
