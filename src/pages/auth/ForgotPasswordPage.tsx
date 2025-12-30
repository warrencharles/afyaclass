import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { Mail, Lock, CheckCircle, ChevronLeft } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const {
    isLoading,
    error,
    clearError,
    passwordResetState,
    initiatePasswordReset,
    verifyPasswordResetOtp,
    completePasswordReset,
    clearPasswordResetState,
    resendPasswordResetOtp,
  } = useAuth();
  const navigate = useNavigate();

  const { otpSent, otpVerified, resetSuccess, resendCooldown } = passwordResetState;

  useEffect(() => {
    return () => {
      clearError();
      clearPasswordResetState();
    };
  }, [clearError, clearPasswordResetState]);

  useEffect(() => {
    if (resetSuccess) {
      const timer = setTimeout(() => {
        navigate('/login', { replace: true });
        clearPasswordResetState();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [resetSuccess, navigate, clearPasswordResetState]);

  const handleInitiateReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    clearError();

    if (!email.trim()) {
      setFormError('Please enter your email address.');
      return;
    }

    try {
      await initiatePasswordReset(email);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to send password reset OTP.';
      setFormError(errorMessage);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    clearError();

    if (!otp.trim()) {
      setFormError('Please enter the OTP.');
      return;
    }

    try {
      await verifyPasswordResetOtp(otp);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'OTP verification failed.';
      setFormError(errorMessage);
    }
  };

  const handleCompleteReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    clearError();

    if (!newPassword.trim() || !confirmNewPassword.trim()) {
      setFormError('Please enter and confirm your new password.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setFormError('New password and confirm password do not match.');
      return;
    }

    try {
      await completePasswordReset(otp, newPassword);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to reset password.';
      setFormError(errorMessage);
    }
  };


  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      <Navbar />
      <main className="flex-grow flex items-center justify-center pt-16 py-12 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Forgot Password
            </h2>
            <p className="text-gray-600">
              {otpSent ? (otpVerified ? 'Set your new password' : 'Enter the OTP sent to your email') : 'Enter your email to reset your password'}
            </p>
          </div>

          {formError && (
            <div className="animate-fadeIn">
              <Alert
                variant="error"
                message={formError}
                onClose={() => {
                  setFormError(null);
                }}
              />
            </div>
          )}

          {resetSuccess && (
            <div className="space-y-4 text-center">
              <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900">Password Reset Successful!</h3>
              <p className="text-gray-700">Your password has been changed. You will be redirected to the login page shortly.</p>
              <p className="text-sm text-gray-500">Redirecting to login page...</p>
            </div>
          )}

          {!resetSuccess && (
            <div className="neumorphic-card bg-white/80 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-white/20 transition-all duration-500">
              <form className="space-y-6" onSubmit={!otpSent ? handleInitiateReset : (otpVerified ? handleCompleteReset : handleVerifyOtp)}>
                {!otpSent && (
                  <Input
                    label="Email Address"
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    fullWidth
                    placeholder="Enter your email"
                    icon={<Mail size={16} className="text-gray-400" />}
                    className="neumorphic-hover"
                  />
                )}

                {otpSent && !otpVerified && (
                  <>
                    <p className="text-center text-gray-700 mb-4">
                      A 6-digit OTP has been sent to {passwordResetState.email}. It expires in 5 minutes.
                    </p>
                    <Input
                      label="One-Time Password (OTP)"
                      id="otp"
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      fullWidth
                      placeholder="Enter 6-digit OTP"
                      icon={<Lock size={16} className="text-gray-400" />}
                      className="neumorphic-hover"
                      maxLength={6}
                    />
                    <div className="flex justify-between pt-4">
                      <button
                        type="button"
                        onClick={resendPasswordResetOtp}
                        disabled={resendCooldown > 0 || isLoading}
                        className="group relative px-6 py-3 bg-white/50 backdrop-blur-sm text-gray-700 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 neumorphic-card border border-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="flex items-center justify-center font-medium">
                          {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : 'Resend OTP'}
                        </span>
                      </button>
                      <Button
                        type="submit"
                        disabled={isLoading}
                        className="group relative px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 neumorphic-button disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        <span className="flex items-center justify-center text-lg font-semibold">
                          {isLoading ? (
                            <>
                              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-b-transparent mr-2"></div>
                              Verifying...
                            </>
                          ) : (
                            <>
                              <CheckCircle size={20} className="mr-2 transition-transform" />
                              Verify OTP
                            </>
                          )}
                        </span>
                      </Button>
                    </div>
                  </>
                )}

                {otpSent && otpVerified && (
                  <>
                    <Input
                      label="New Password"
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      fullWidth
                      placeholder="Enter your new password"
                      icon={<Lock size={16} className="text-gray-400" />}
                      className="neumorphic-hover"
                    />
                    <Input
                      label="Confirm New Password"
                      id="confirm-new-password"
                      type="password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      fullWidth
                      placeholder="Confirm your new password"
                      icon={<Lock size={16} className="text-gray-400" />}
                      className="neumorphic-hover"
                    />
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="group relative w-full px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 neumorphic-button disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      <span className="flex items-center justify-center text-lg font-semibold">
                        {isLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-b-transparent mr-2"></div>
                            Resetting...
                          </>
                        ) : (
                          <>
                            <Lock size={20} className="mr-2 transition-transform" />
                            Reset Password
                          </>
                        )}
                      </span>
                    </Button>
                  </>
                )}

                {!otpSent && (
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="group relative w-full px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 neumorphic-button disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    <span className="flex items-center justify-center text-lg font-semibold">
                      {isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-b-transparent mr-2"></div>
                          Sending OTP...
                        </>
                      ) : (
                        <>
                          <Mail size={20} className="mr-2 transition-transform" />
                          Send Reset Codes
                        </>
                      )}
                    </span>
                  </Button>
                )}
              </form>

              <div className="mt-8 text-center">
                <Link to="/login" className="text-primary-600 hover:text-primary-500 font-medium transition-colors flex items-center justify-center">
                  <ChevronLeft size={16} className="mr-1" /> Back to Login
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};
