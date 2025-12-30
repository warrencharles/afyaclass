import React, { useState, useCallback } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useToast } from '../../contexts/ToastContext';
import api from '../../utils/api';
import { Check, Zap, Lock, ShieldCheck } from 'lucide-react';

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
  userId,
  userName,
  userEmail,
}) => {
  const [name, setName] = useState(userName);
  const [email, setEmail] = useState(userEmail);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'weekly_material_access' | 'monthly_material_access'>('weekly_material_access');
  const { showToast } = useToast();

  const handlePesapalPayment = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const amount = selectedPlan === 'weekly_material_access' ? 1000 : 4000;
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
    } catch (error: any) {
      showToast('Network error.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [userId, name, email, selectedPlan, showToast]);

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
        <form onSubmit={handlePesapalPayment} className="space-y-4">
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

          <Button type="submit" fullWidth isLoading={isLoading} className="bg-black hover:bg-gray-800 text-white rounded-lg h-10 text-sm font-medium">
            <Zap size={14} className="mr-2 fill-current" />
            Pay {selectedPlan === 'weekly_material_access' ? '1,000' : '4,000'} Tsh
          </Button>

          <div className="flex items-center justify-center gap-1 text-[10px] text-gray-400">
            <Lock size={10} /> Secured by Pesapal
          </div>
        </form>
      </div>
    </Modal>
  );
};
