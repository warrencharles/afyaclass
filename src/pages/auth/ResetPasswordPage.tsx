import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { KeyRound, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { API_BASE_URL } from '../../utils/api';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const resetToken = searchParams.get('token');
    if (resetToken) {
      setToken(resetToken);
    } else {
      setStatus('error');
      setMessage('Password reset token is missing from the URL.');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus('loading');
    setMessage('');

    if (!token) {
      setMessage('Invalid or missing password reset token.');
      setStatus('error');
      setLoading(false);
      return;
    }

    if (!newPassword.trim() || !confirmNewPassword.trim()) {
      setMessage('Please fill out all password fields.');
      setStatus('error');
      setLoading(false);
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setMessage('Passwords do not match.');
      setStatus('error');
      setLoading(false);
      return;
    }
    if (newPassword.length < 6) {
      setMessage('Password must be at least 6 characters long.');
      setStatus('error');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage(data.message || 'Your password has been successfully reset!');
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setStatus('error');
        setMessage(data.message || 'Failed to reset password. Please try again.');
      }
    } catch (err) {
      console.error('Reset password error:', err);
      setStatus('error');
      setMessage('Network error or server unreachable. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (status === 'loading') {
      return (
        <div className="flex flex-col items-center">
          <Loader2 size={64} className="animate-spin text-blue-600 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Resetting your password...</h2>
          <p className="text-gray-600">Please wait a moment.</p>
        </div>
      );
    }

    if (status === 'success') {
      return (
        <div className="flex flex-col items-center">
          <CheckCircle size={64} className="text-green-600 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Password Reset Successful!</h2>
          <Alert variant="success" message={message} autoClose={false} className="mb-6" />
          <Link to="/login" className="block w-full">
            <Button className="w-full group relative px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 neumorphic-button">
              <span className="flex items-center justify-center font-semibold">
                Go to Login
              </span>
            </Button>
          </Link>
        </div>
      );
    }

    if (status === 'error') {
      return (
        <div className="flex flex-col items-center">
          <XCircle size={64} className="text-red-600 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Password Reset Failed</h2>
          <Alert variant="error" message={message} autoClose={false} className="mb-6" />
          <Link to="/forgot-password" className="block w-full mb-4">
            <Button className="w-full group relative px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 neumorphic-button">
              <span className="flex items-center justify-center font-semibold">
                Request New Reset Link
              </span>
            </Button>
          </Link>
          <Link to="/login" className="block w-full">
            <Button variant="secondary" className="w-full group relative px-6 py-3 bg-white/50 backdrop-blur-sm text-gray-700 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 neumorphic-card border border-white/20">
              <span className="flex items-center justify-center font-medium">
                Go to Login
              </span>
            </Button>
          </Link>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Set New Password
          </h2>
          <p className="text-gray-600">
            Enter your new password below.
          </p>
        </div>

        <div className="neumorphic-card bg-white/80 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-white/20 transition-all duration-500">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <Input
              label="New Password"
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              fullWidth
              placeholder="Enter your new password"
              icon={<KeyRound size={16} className="text-gray-400" />}
              className="neumorphic-hover"
              disabled={loading}
            />
            <Input
              label="Confirm New Password"
              id="confirmNewPassword"
              type="password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              fullWidth
              placeholder="Confirm your new password"
              icon={<KeyRound size={16} className="text-gray-400" />}
              className="neumorphic-hover"
              disabled={loading}
            />
            <Button
              type="submit"
              disabled={loading}
              className="w-full group relative px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 neumorphic-button disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <span className="flex items-center justify-center text-lg font-semibold">
                {loading ? (
                  <>
                    <Loader2 size={20} className="animate-spin mr-2" />
                    Resetting Password...
                  </>
                ) : (
                  <>
                    Reset Password <CheckCircle size={20} className="ml-2 transition-transform" />
                  </>
                )}
              </span>
            </Button>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      <Navbar />
      <main className="flex-grow flex items-center justify-center pt-16 py-12 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="w-full max-w-md space-y-8 text-center">
          {renderContent()}
        </div>
      </main>
      <Footer />
    </div>
  );
};
