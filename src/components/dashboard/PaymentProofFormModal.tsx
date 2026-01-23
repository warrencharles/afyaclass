import { Check, Lock, ShieldCheck, Zap } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import api from '../../utils/api';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';

interface PaymentProofFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentProofSubmitted: () => void;
  userId: string;
  userName: string;
  userEmail: string;
}

export const PaymentProofFormModal: React.FC<PaymentProofFormModalProps> = ({
  isOpen,
  onClose,
  onPaymentProofSubmitted,
  userId,
  userName,
  userEmail,
}) => {
  const [name, setName] = useState(userName);
  const [email, setEmail] = useState(userEmail);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'weekly_material_access' | 'monthly_material_access'>('weekly_material_access');
  const [paymentMode, setPaymentMode] = useState<'pesapal' | 'manual'>('pesapal');
  const [instructions, setInstructions] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const { showToast } = useToast();
  const { submitPaymentProof } = useAuth();

  useEffect(() => {
    const loadMode = async () => {
      try {
        const response = await api.get('/settings/public');
        setPaymentMode(response.data.payment_mode || 'pesapal');
        setInstructions(response.data.manual_payment_instructions || '');
      } catch (e) {
        console.error('Failed to load payment settings');
      }
    };
    if (isOpen) loadMode();
  }, [isOpen]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const amount = selectedPlan === 'weekly_material_access' ? 1000 : 4000;

      if (paymentMode === 'pesapal') {
        const response = await api.post('/initiate-pesapal-payment', {
          userId,
          name,
          email,
          requestType: selectedPlan,
          amount,
        });
        const { redirectUrl } = response.data;
        if (redirectUrl) {
          window.location.href = redirectUrl;
        } else {
          showToast('System failed. Try again.', 'error');
        }
      } else {
        // Manual Proof Submission
        if (!screenshot) {
          showToast('Please upload a payment screenshot.', 'error');
          setIsLoading(false);
          return;
        }

        await submitPaymentProof({
          userId,
          name,
          email,
          requestType: selectedPlan,
          amount,
          paymentScreenshot: screenshot
        });
        onPaymentProofSubmitted();
        onClose();
      }
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Network error.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [userId, name, email, selectedPlan, showToast, paymentMode, screenshot, submitPaymentProof, onPaymentProofSubmitted, onClose]);

  const PlanRow = ({ type, price, label }: { type: string; price: string; label: string }) => (
    <div
      onClick={() => setSelectedPlan(type as any)}
      className={`
        flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors
        ${selectedPlan === type
          ? 'border-blue-600 bg-blue-50 text-blue-900'
          : 'border-gray-200 hover:border-blue-300 text-gray-700'}
      `}
    >
      <div className="flex items-center gap-3">
        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedPlan === type ? 'border-blue-600 bg-blue-600' : 'border-gray-300'}`}>
          {selectedPlan === type && <Check size={10} className="text-white" />}
        </div>
        <span className="text-sm font-semibold">{label}</span>
      </div>
      <span className="text-sm font-bold">{price} Tsh</span>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Unlock Access"
      size="md"
      className="max-w-md"
    >
      <div className="p-4 space-y-6">
        {/* Plan Selection */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Select Plan</h4>
          <PlanRow type="weekly_material_access" label="Weekly Pass" price="1,000" />
          <PlanRow type="monthly_material_access" label="Monthly Pass" price="4,000" />
        </div>

        {/* Checkout Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <Input
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 text-sm"
              required
            />
            <Input
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-9 text-sm"
              required
            />
          </div>

          {paymentMode === 'manual' && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 animate-in fade-in duration-500">
              <div className="flex items-center gap-2 text-blue-700">
                <ShieldCheck size={16} />
                <span className="text-[11px] font-black uppercase tracking-wider">Instructions</span>
              </div>
              <p className="text-xs text-slate-600 font-medium leading-relaxed italic border-l-4 border-blue-400 pl-3">
                {instructions || 'Please upload your payment receipt below.'}
              </p>

              <div className="space-y-2 pt-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Upload Screenshot *</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setScreenshot(e.target.files ? e.target.files[0] : null)}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-[10px] file:font-black file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                  required
                />
              </div>
            </div>
          )}

          <Button type="submit" fullWidth isLoading={isLoading} className={`${paymentMode === 'pesapal' ? 'bg-black hover:bg-gray-800' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-lg h-10 text-sm font-medium`}>
            {paymentMode === 'pesapal' && <Zap size={14} className="mr-2 fill-current" />}
            {paymentMode === 'pesapal' ? `Pay ${selectedPlan === 'weekly_material_access' ? '1,000' : '4,000'} Tsh` : 'Submit Proof'}
          </Button>

          <div className="flex items-center justify-center gap-1 text-[10px] text-gray-400">
            <Lock size={10} /> {paymentMode === 'pesapal' ? 'Secured by Pesapal' : 'Review by Admin'}
          </div>
        </form>
      </div>
    </Modal>
  );
};
