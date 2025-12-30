import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { Input } from '../../components/ui/Input';

import { Alert } from '../../components/ui/Alert';
import { LogIn, User, KeyRound, Lock, CheckCircle, Sparkles } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { login, isLoading, error, isAuthenticated, isAdmin, clearError, otpVerificationState, verifyOtpLogin, resendOtp, otpVerifiedSuccessfully, clearOtpVerificationState } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const { requiresOtpVerification, email: unverifiedEmail, resendCooldown } = otpVerificationState;
  const [otpInput, setOtpInput] = useState('');
  const [currentResendCooldown, setCurrentResendCooldown] = useState(resendCooldown || 0);

  useEffect(() => {
    setCurrentResendCooldown(otpVerificationState.resendCooldown || 0);
  }, [otpVerificationState.resendCooldown]);


  useEffect(() => {
    if (currentResendCooldown > 0) {
      const timer = setTimeout(() => setCurrentResendCooldown(currentResendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [currentResendCooldown]);

  useEffect(() => {
    console.log('LoginPage useEffect: isAuthenticated changed to', isAuthenticated, 'isAdmin:', isAdmin);
    if (isAuthenticated) {
      const from = location.state?.from?.pathname;
      if (isAdmin) {
        console.log('LoginPage: Navigating to /admin or from state:', from || '/admin');
        navigate(from || '/admin', { replace: true });
      } else {
        console.log('LoginPage: Navigating to /dashboard or from state:', from || '/dashboard');
        navigate(from || '/dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, isAdmin, navigate, location]);

  useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  // Reintroduce the useEffect for otpVerifiedSuccessfully
  useEffect(() => {
    if (otpVerifiedSuccessfully) {
      console.log('LoginPage: OTP verified successfully. Displaying success message.');
      const timer = setTimeout(() => {
        clearOtpVerificationState(); // Clear OTP state in AuthContext
      }, 3000); // 3-second delay to allow user to read the message
      return () => clearTimeout(timer);
    }
  }, [otpVerifiedSuccessfully, clearOtpVerificationState, navigate]);

  const handleResendOtp = async () => {
    if (currentResendCooldown > 0 || !unverifiedEmail) return;
    setFormError(null);
    try {
      await resendOtp(unverifiedEmail);
      setFormError('New OTP sent to your email!');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to resend OTP. Please try again later.';
      setFormError(errorMessage);
    }
  };

  const handleOtpVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null); // Clear form error at the start of verification attempt

    if (!otpInput.trim()) {
      setFormError('Please enter the OTP.');
      return;
    }

    try {
      await verifyOtpLogin(otpInput);
      // If verifyOtpLogin succeeds, AuthContext will handle navigation to /login and set otpVerifiedSuccessfully.
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'OTP verification failed.';
      setFormError(errorMessage);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (requiresOtpVerification) {
      handleOtpVerification(e);
      return;
    }

    if (!emailOrUsername.trim() || !password.trim()) {
      setFormError('All fields are required');
      return;
    }

    setFormError(null);
    clearError();

    await login(emailOrUsername, password);
  };

  const getErrorMessage = (): string => {
    if (formError) return formError;
    if (error) {
      if (typeof error === 'string') {
        return error;
      } else if (error !== null && typeof error === 'object') {
        const errorObj = error as any;
        let errorMessage = errorObj.message || 'An unexpected error occurred.';
        if (errorObj.error) {
          errorMessage += ` Details: ${errorObj.error}`;
        }
        if (errorObj.file && errorObj.line) {
          errorMessage += ` (File: ${errorObj.file}, Line: ${errorObj.line})`;
        }
        return errorMessage;
      }
    }
    return 'An error occurred';
  };


  return (
    <div className="flex flex-col min-h-screen bg-[#ebf5fc] relative overflow-hidden font-sans">
      <Navbar />
      <main className="flex-grow flex items-center justify-center pt-24 pb-12 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="w-full max-w-sm space-y-3">
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-900">
              Welcome back
            </h2>
            <p className="text-sm text-gray-600">
              Sign in to your account
            </p>
          </div>

          {/* Show general error alert */}
          {(error || formError) && (
            <div className="animate-fadeIn">
              <Alert
                variant="error"
                message={getErrorMessage()}
                onClose={() => {
                  setFormError(null);
                  clearError();
                }}
              />
            </div>
          )}

          {/* Neumorphic Login Card - High Contrast */}
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-[0_20px_50px_rgba(8,_112,_184,_0.1)] border border-white/50 transition-all duration-500 relative">
            <form key={requiresOtpVerification ? 'otp-form' : 'login-form'} className="space-y-3" onSubmit={handleSubmit}>

              {/* OTP Input Section - Conditionally Rendered */}
              {requiresOtpVerification && !otpVerifiedSuccessfully && (
                <div className="space-y-4">
                  <Input
                    label="One-Time Password (OTP)"
                    id="otp"
                    type="text"
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value)}
                    fullWidth
                    placeholder="Enter 6-digit OTP"
                    icon={<Lock size={16} className="text-gray-400" />}
                    className="neu-pressed !bg-[#ebf5fc] !border-none !shadow-none focus:!ring-0 rounded-xl"
                    maxLength={6}
                  />
                  <div className="flex justify-between pt-4 gap-3">
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={currentResendCooldown > 0 || isLoading}
                      className="group relative flex-1 px-4 py-2.5 bg-white/50 backdrop-blur-sm text-gray-700 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 neumorphic-card border border-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="flex items-center justify-center font-medium text-sm">
                        {currentResendCooldown > 0 ? `Resend (${currentResendCooldown}s)` : 'Resend OTP'}
                      </span>
                    </button>
                    <button
                      type="submit" // This will trigger handleOtpVerification
                      disabled={isLoading}
                      className="group relative flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 neumorphic-button disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      <span className="flex items-center justify-center text-sm font-semibold">
                        {isLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-b-transparent mr-2"></div>
                            Verifying...
                          </>
                        ) : (
                          <>
                            <CheckCircle size={18} className="mr-2 transition-transform" />
                            Verify
                          </>
                        )}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* OTP Verified Success Message */}
              {otpVerifiedSuccessfully && (
                <div className="space-y-4 text-center">
                  <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-gray-900">Email Verified Successfully!</h3>
                  <p className="text-gray-700">You can now log in with your confirmed email and password.</p>
                  <p className="text-sm text-gray-500">Redirecting to login page...</p>
                </div>
              )}

              {/* Standard Login Form - Hidden if OTP input is shown or OTP is verified */}
              {!requiresOtpVerification && !otpVerifiedSuccessfully && (
                <div className="space-y-4">
                  <Input
                    label="Email or Username"
                    id="emailOrUsername"
                    type="text"
                    value={emailOrUsername}
                    onChange={(e) => setEmailOrUsername(e.target.value)}
                    fullWidth
                    placeholder="Enter your email or username"
                    icon={<User size={16} className="text-gray-400" />}
                    className="neu-pressed !bg-[#ebf5fc] !border-none !shadow-none focus:!ring-0 rounded-xl"
                    autoComplete="username"
                  />

                  <Input
                    label="Password"
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    fullWidth
                    placeholder="Enter your password"
                    icon={<KeyRound size={16} className="text-gray-400" />}
                    className="neu-pressed !bg-[#ebf5fc] !border-none !shadow-none focus:!ring-0 rounded-xl"
                    autoComplete="current-password"
                  />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <input
                        id="remember-me"
                        name="remember-me"
                        type="checkbox"
                        checked={remember}
                        onChange={(e) => setRemember(e.target.checked)}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded transition-all duration-200"
                      />
                      <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 font-medium">
                        Remember me
                      </label>
                    </div>

                    <div className="text-sm">
                      <Link to="/forgot-password" className="text-primary-600 hover:text-primary-500 font-medium transition-colors">
                        Forgot your password?
                      </Link>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="group relative w-full px-4 py-3 neu-pressed rounded-full text-blue-600 font-bold text-lg hover:scale-105 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    <span className="flex items-center justify-center">
                      {isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-b-transparent mr-2"></div>
                          Signing in...
                        </>
                      ) : (
                        <>
                          <LogIn size={20} className="mr-2 transition-transform group-hover:translate-x-1" />
                          Sign in
                        </>
                      )}
                    </span>
                  </button>
                </div>
              )}
            </form>

            <div className="mt-4 text-center">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white/80 text-gray-500 font-medium">New to AfyaClass?</span>
                </div>
              </div>
              <div className="mt-4">
                <Link to="/register">
                  <button className="w-full group relative px-4 py-3 neu-flat rounded-xl text-gray-600 font-bold hover:text-blue-600 transition-all duration-300 hover:scale-105">
                    <span className="flex items-center justify-center font-medium text-sm">
                      Create an account
                      <Sparkles size={16} className="ml-2 transition-transform text-blue-500" />
                    </span>
                  </button>
                </Link>
              </div>
            </div>
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
};
