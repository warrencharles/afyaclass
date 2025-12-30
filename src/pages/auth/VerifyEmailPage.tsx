import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../../utils/api';

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [verificationStatus, setVerificationStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setVerificationStatus('error');
      setMessage('Verification token is missing.');
      return;
    }

    const verifyEmail = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/verify-email?token=${token}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();

        if (response.ok) {
          setVerificationStatus('success');
          setMessage(data.message || 'Your email has been successfully verified!');
          // Optionally redirect to login after a short delay
          setTimeout(() => {
            navigate('/login');
          }, 3000);
        } else {
          setVerificationStatus('error');
          setMessage(data.message || 'Email verification failed.');
        }
      } catch (err) {
        console.error('Error during email verification:', err);
        setVerificationStatus('error');
        setMessage('Network error or server unreachable. Please try again.');
      }
    };

    verifyEmail();
  }, [searchParams, navigate]);

  const renderContent = () => {
    switch (verificationStatus) {
      case 'loading':
        return (
          <div className="flex flex-col items-center">
            <Loader2 size={64} className="animate-spin text-blue-600 mb-6" />
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Verifying your email...</h2>
            <p className="text-gray-600">Please wait a moment.</p>
          </div>
        );
      case 'success':
        return (
          <div className="flex flex-col items-center">
            <CheckCircle size={64} className="text-green-600 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Verification Successful!</h2>
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
      case 'error':
        return (
          <div className="flex flex-col items-center">
            <XCircle size={64} className="text-red-600 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Verification Failed</h2>
            <Alert variant="error" message={message} autoClose={false} className="mb-6" />
            <Link to="/register" className="block w-full mb-4">
              <Button className="w-full group relative px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 neumorphic-button">
                <span className="flex items-center justify-center font-semibold">
                  Register Again
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
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      <Navbar />
      <main className="flex-grow flex items-center justify-center pt-16 py-12 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="w-full max-w-md space-y-8 text-center">
          <div className="neumorphic-card bg-white/80 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-white/20 transition-all duration-500">
            {renderContent()}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};
