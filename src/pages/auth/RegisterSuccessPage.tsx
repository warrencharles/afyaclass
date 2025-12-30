import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { MailCheck, Loader2, RefreshCcw } from 'lucide-react';
import { API_BASE_URL } from '../../utils/api';

export const RegisterSuccessPage: React.FC = () => {
  const location = useLocation();
  const { email, message } = location.state || {};
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0); // Cooldown in seconds

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleResendConfirmation = async () => {
    if (!email) {
      setResendError('No email address found to resend confirmation.');
      return;
    }
    setResendLoading(true);
    setResendSuccess(null);
    setResendError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/resend-confirmation-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setResendSuccess(data.message);
        setCooldown(120); // 2 minutes cooldown
      } else {
        setResendError(data.message || 'Failed to resend confirmation email.');
        if (response.status === 429) { // Too Many Requests
          // Attempt to parse remaining time from message if available
          const match = data.message.match(/Please wait (\d+) seconds/);
          if (match && match[1]) {
            setCooldown(parseInt(match[1], 10));
          } else {
            setCooldown(60); // Default cooldown if message parsing fails
          }
        }
      }
    } catch (err) {
      console.error('Error resending confirmation email:', err);
      setResendError('Network error or server unreachable.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      <Navbar />
      <main className="flex-grow flex items-center justify-center pt-16 py-12 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="w-full max-w-md space-y-8 text-center">
          <div className="neumorphic-card bg-white/80 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-white/20 transition-all duration-500">
            <MailCheck size={64} className="text-blue-600 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Registration Successful!
            </h2>
            <p className="text-gray-600 mb-6">
              {message || "Please check your email to confirm your account. A verification link has been sent to:"}
            </p>
            {email && (
              <p className="text-lg font-semibold text-blue-700 mb-6">{email}</p>
            )}

            {resendSuccess && (
              <Alert variant="success" message={resendSuccess} onClose={() => setResendSuccess(null)} className="mb-4" />
            )}
            {resendError && (
              <Alert variant="error" message={resendError} onClose={() => setResendError(null)} className="mb-4" />
            )}

            <div className="space-y-4">
              <Button
                onClick={handleResendConfirmation}
                disabled={resendLoading || cooldown > 0}
                className="w-full group relative px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 neumorphic-button disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <span className="flex items-center justify-center text-lg font-semibold">
                  {resendLoading ? (
                    <>
                      <Loader2 size={20} className="animate-spin mr-2" />
                      Resending...
                    </>
                  ) : cooldown > 0 ? (
                    `Resend in ${cooldown}s`
                  ) : (
                    <>
                      <RefreshCcw size={20} className="mr-2" />
                      Resend Confirmation Email
                    </>
                  )}
                </span>
              </Button>
              <Link to="/login" className="block">
                <Button
                  variant="secondary"
                  className="w-full group relative px-6 py-3 bg-white/50 backdrop-blur-sm text-gray-700 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 neumorphic-card border border-white/20"
                >
                  <span className="flex items-center justify-center font-medium">
                    Go to Login
                  </span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};
