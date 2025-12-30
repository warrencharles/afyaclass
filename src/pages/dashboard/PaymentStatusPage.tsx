import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useAuth } from '../../contexts/AuthContext';

const MAX_POLL_ATTEMPTS = 5;
const POLL_INTERVAL_MS = 3000; // 3 seconds

export const PaymentStatusPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, refetchUser, setUser } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed' | 'pending'>('loading');
  const [message, setMessage] = useState('Verifying your payment, please wait...');
  const [pesapalOrderTrackingId, setPesapalOrderTrackingId] = useState<string | null>(null);
  const [merchantReference, setMerchantReference] = useState<string | null>(null);

  const pollCount = useRef(0);

  const handleGoToDashboard = useCallback(() => {
    navigate('/dashboard');
  }, [navigate]);

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const pesapalTrackingId = queryParams.get('OrderTrackingId');
    const internalOrderId = queryParams.get('order_tracking_id');

    setPesapalOrderTrackingId(pesapalTrackingId);
    setMerchantReference(internalOrderId);

    if (!pesapalTrackingId && !internalOrderId) {
      setStatus('failed');
      setMessage('Missing payment reference information. Cannot determine status.');
      return;
    }

    const pollPaymentStatus = async () => {
      if (pollCount.current >= MAX_POLL_ATTEMPTS) {
        setStatus('pending');
        setMessage('Your payment is still processing. Please check your dashboard in a few minutes or contact support.');
        return;
      }
      pollCount.current += 1;

      try {
        const response = await api.get('/pesapal-payment-status', {
          params: {
            order_tracking_id: pesapalTrackingId,
            order_merchant_reference: internalOrderId,
          },
        });

        const paymentStatus = response.data.status;

        switch (paymentStatus) {
          case 'COMPLETED':
          case 'Completed':
            setStatus('success');
            setMessage('Payment successful! Your material access has been updated.');
            // Crucial step: Refetch user data to update context and unlock materials
            if (response.data.user) {
              setUser(response.data.user);
            }
            break;
          case 'PENDING':
          case 'Pending':
            // If pending, schedule the next poll
            setTimeout(pollPaymentStatus, POLL_INTERVAL_MS);
            break;
          case 'FAILED':
          case 'Failed':
          case 'CANCELLED':
          case 'Cancelled':
            setStatus('failed');
            setMessage('Payment failed or was cancelled. Please try again.');
            break;
          default:
            setStatus('failed');
            setMessage(`Unknown payment status: ${paymentStatus}. Please contact support.`);
            break;
        }
      } catch (error: any) {
        console.error(`Error fetching payment status (Attempt ${pollCount.current}):`, error);
        setStatus('failed');
        setMessage(error.response?.data?.message || 'Failed to retrieve payment status due to a server error.');
      }
    };

    pollPaymentStatus();

    // No cleanup function needed that stops polling, as setTimeout doesn't run after unmount.
  }, [location.search, user?.id, setUser]);


  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <Card className="w-full max-w-md p-6 text-center shadow-lg rounded-lg">
        {status === 'loading' && (
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-16 w-16 text-blue-500 animate-spin" />
            <h2 className="text-2xl font-semibold text-gray-800">Processing Payment</h2>
            <p className="text-gray-600">{message}</p>
          </div>
        )}

        {status === 'pending' && (
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-16 w-16 text-yellow-500 animate-spin" />
            <h2 className="text-2xl font-semibold text-gray-800">Payment Pending</h2>
            <p className="text-gray-600">{message}</p>
            {pesapalOrderTrackingId && (
              <p className="text-sm text-gray-500">Pesapal Tracking ID: {pesapalOrderTrackingId}</p>
            )}
            {merchantReference && (
              <p className="text-sm text-gray-500">Order Reference: {merchantReference}</p>
            )}
            <Button onClick={handleGoToDashboard} className="mt-6">
              Go to Dashboard
            </Button>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
            <h2 className="text-2xl font-semibold text-gray-800">Payment Successful!</h2>
            <p className="text-gray-600">{message}</p>
            {pesapalOrderTrackingId && (
              <p className="text-sm text-gray-500">Pesapal Tracking ID: {pesapalOrderTrackingId}</p>
            )}
            {merchantReference && (
              <p className="text-sm text-gray-500">Order Reference: {merchantReference}</p>
            )}
            <Button onClick={handleGoToDashboard} className="mt-6">
              Go to Dashboard
            </Button>
          </div>
        )}

        {status === 'failed' && (
          <div className="flex flex-col items-center space-y-4">
            <XCircle className="h-16 w-16 text-red-500" />
            <h2 className="text-2xl font-semibold text-gray-800">Payment Failed</h2>
            <p className="text-gray-600">{message}</p>
            {pesapalOrderTrackingId && (
              <p className="text-sm text-gray-500">Pesapal Tracking ID: {pesapalOrderTrackingId}</p>
            )}
            {merchantReference && (
              <p className="text-sm text-gray-500">Order Reference: {merchantReference}</p>
            )}
            <Button onClick={handleGoToDashboard} className="mt-6" variant="danger">
              Go to Dashboard
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};
