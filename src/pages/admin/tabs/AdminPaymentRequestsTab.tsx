import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '../../../contexts/ToastContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Alert } from '../../../components/ui/Alert';
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal';
import { CheckCircle, XCircle, User, Mail, FileText, Search, Loader2, Eye, Trash2, Calendar } from 'lucide-react';
import api from '../../../utils/api';
import { AxiosError } from 'axios';

interface PaymentRequest {
  id: string;
  userId: string;
  name: string;
  email: string;
  paymentScreenshotUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  requestType: 'exam_access' | 'exam_guide_access' | 'weekly_material_access' | 'monthly_material_access';
  amount: number;
  currency: string;
  createdAt: string;
  username: string;
}

export const AdminPaymentRequestsTab: React.FC = () => {
  const { showToast } = useToast();
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: 'danger' | 'warning' | 'info' | 'success';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'info',
    onConfirm: () => { }
  });

  const fetchPaymentRequests = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get('/admin/payment-requests');
      setPaymentRequests(Array.isArray(response.data) ? response.data : []);
    } catch (err: unknown) {
      console.error('Error fetching payment requests:', err);
      let errorMessage = 'Failed to load payment requests.';
      if (err instanceof AxiosError && err.response) {
        errorMessage = err.response.data?.message || errorMessage;
      }
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchPaymentRequests();
  }, [fetchPaymentRequests]);

  const handleUpdateStatus = async (requestId: string, status: 'approved' | 'rejected', userId: string, requestType: string) => {
    try {
      await api.put(`/admin/payment-requests/${requestId}`, { status, userId, requestType });
      showToast(`Request ${status} successfully!`, 'success');
      fetchPaymentRequests();
    } catch (err: unknown) {
      console.error(`Error ${status} payment request:`, err);
      let errorMessage = `Failed to ${status} payment request.`;
      if (err instanceof AxiosError && err.response) {
        errorMessage = err.response.data?.message || errorMessage;
      }
      showToast(errorMessage, 'error');
    } finally {
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
    }
  };

  const handleDeleteRequest = async (requestId: string) => {
    try {
      await api.delete(`/admin/payment-requests/${requestId}`);
      showToast('Payment request deleted successfully!', 'success');
      fetchPaymentRequests();
    } catch (err: unknown) {
      console.error('Error deleting payment request:', err);
      showToast('Failed to delete payment request.', 'error');
    } finally {
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
    }
  };

  const triggerConfirm = (type: 'approved' | 'rejected' | 'delete', request: PaymentRequest) => {
    const isDelete = type === 'delete';
    const isApprove = type === 'approved';

    setConfirmModal({
      isOpen: true,
      title: isDelete ? 'Delete Request' : isApprove ? 'Approve Payment' : 'Reject Payment',
      message: isDelete
        ? `Are you sure you want to delete the payment proof from ${request.username}?`
        : isApprove
          ? `Grant ${request.requestType.replace(/_/g, ' ')} to ${request.username}?`
          : `Reject the payment proof from ${request.username}?`,
      variant: isDelete ? 'danger' : isApprove ? 'success' : 'warning',
      onConfirm: () => {
        if (isDelete) handleDeleteRequest(request.id);
        else handleUpdateStatus(request.id, type as any, request.userId, request.requestType);
      }
    });
  };

  const filteredRequests = useMemo(() => {
    if (!Array.isArray(paymentRequests)) return [];
    return paymentRequests.filter(request => {
      const uName = (request.username || request.name || '').toLowerCase();
      const uEmail = (request.email || '').toLowerCase();
      const uType = (request.requestType || '').replace(/_/g, ' ').toLowerCase();
      const term = searchTerm.toLowerCase();

      const matchesSearch = uName.includes(term) || uEmail.includes(term) || uType.includes(term) || (request.amount?.toString() || '').includes(term);
      const matchesStatus = filterStatus === 'all' || request.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [paymentRequests, searchTerm, filterStatus]);

  return (
    <div className="space-y-6">
      {error && (
        <Alert
          variant="error"
          message={error}
          onClose={() => setError(null)}
          autoClose
        />
      )}

      {/* Modern Filter Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-center bg-white/40 backdrop-blur-md p-3 rounded-2xl border border-white/50 shadow-sm">
        <div className="relative flex-grow w-full">
          <Input
            type="text"
            placeholder="Search students or plans..."
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            className="pl-12 bg-white/60 border-transparent rounded-xl focus:bg-white transition-all shadow-inner"
            fullWidth
            icon={<Search size={18} className="text-slate-400" />}
          />
        </div>
        <div className="w-full md:w-48">
          <Select
            value={filterStatus}
            onChange={(value: string) => setFilterStatus(value as any)}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'pending', label: 'Pending' },
              { value: 'approved', label: 'Approved' },
              { value: 'rejected', label: 'Rejected' },
            ]}
            fullWidth
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col justify-center items-center py-20 bg-white/40 backdrop-blur-sm rounded-[2rem] border border-white/50">
          <Loader2 className="h-10 w-10 animate-spin text-blue-500 mb-4" />
          <p className="text-sm text-slate-500 font-black uppercase tracking-widest">Syncing Receipts...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white/40 backdrop-blur-sm rounded-[2rem] border border-white/80 border-dashed text-center">
          <div className="p-5 bg-slate-50 rounded-full mb-4">
            <FileText size={40} className="text-slate-300" />
          </div>
          <h3 className="text-lg font-black text-slate-700">No requests found</h3>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Refine your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {filteredRequests.map(request => (
            <Card key={request.id} className="border-0 shadow-lg shadow-blue-900/5 bg-white/80 backdrop-blur-md hover:shadow-xl hover:shadow-blue-900/10 transition-all duration-500 rounded-[2rem] overflow-hidden group">
              <CardHeader className="flex flex-row items-center justify-between p-4 md:p-5 bg-slate-50/50 border-b border-slate-100/30">
                <div className="flex items-center min-w-0">
                  <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white mr-3 shadow-lg shadow-blue-200 shrink-0">
                    <User size={18} />
                  </div>
                  <div className="truncate">
                    <CardTitle className="text-sm font-black text-slate-800 truncate">{request.username}</CardTitle>
                    <div className="flex items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">
                      <Calendar size={10} className="mr-1" />
                      {new Date(request.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-tight uppercase ${request.status === 'approved' ? 'bg-green-100 text-green-700' :
                  request.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                  {request.status === 'approved' ? 'COMPLETED' : request.status}
                </span>
              </CardHeader>
              <CardContent className="p-5 md:p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Plan Type</p>
                    <p className="text-xs font-bold text-slate-700 capitalize">{(request.requestType || '').replace(/_/g, ' ')}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</p>
                    <p className="text-sm font-black text-blue-600">{request.currency} {Number(request.amount).toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 text-[11px] font-medium text-slate-500 bg-slate-50 p-2 rounded-xl border border-slate-100/50">
                  <Mail size={12} className="shrink-0" />
                  <span className="truncate">{request.email}</span>
                </div>

                <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between">
                  <a
                    href={`${api.defaults.baseURL}${request.paymentScreenshotUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 px-3 py-2 bg-slate-100 text-slate-600 hover:bg-blue-600 hover:text-white rounded-xl text-[11px] font-black transition-all active:scale-95 shadow-sm"
                  >
                    <Eye size={14} />
                    <span>Receipt</span>
                  </a>
                  <div className="flex items-center space-x-2">
                    {request.status === 'pending' && (
                      <>
                        <button
                          onClick={() => triggerConfirm('approved', request)}
                          className="p-2.5 bg-green-500 text-white rounded-xl shadow-lg shadow-green-200 hover:shadow-green-300 transition-all active:scale-90"
                          title="Approve"
                        >
                          <CheckCircle size={16} />
                        </button>
                        <button
                          onClick={() => triggerConfirm('rejected', request)}
                          className="p-2.5 bg-red-500 text-white rounded-xl shadow-lg shadow-red-200 hover:shadow-red-300 transition-all active:scale-90"
                          title="Reject"
                        >
                          <XCircle size={16} />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => triggerConfirm('delete', request)}
                      className="p-2.5 bg-slate-100 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all active:scale-90"
                      title="Delete Entry"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Global Confirmation Popup */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
      />
    </div>
  );
};

export default AdminPaymentRequestsTab;
