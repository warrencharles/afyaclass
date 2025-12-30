import React, { useState, useEffect, useMemo } from 'react';
import axiosClient from '../../../utils/api';
import {
    fetchPesapalTransactions,
    bulkDeletePesapalTransactions,
    manualGrantAccess,
    searchUsersForGrant,
    fetchActiveSubscriptions,
    manageSubscription
} from '../../../utils/api';
import { AdminPaymentRequestsTab } from './AdminPaymentRequestsTab';
import { useToast } from '../../../contexts/ToastContext';
import { Search, History, ShieldPlus, Trash2, Clock, CheckCircle, XCircle, AlertCircle, Loader2, CheckSquare, Square, ThumbsUp, Image as ImageIcon, User, Mail, DollarSign, Calendar, Zap, RefreshCw } from 'lucide-react';
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal';
import { Select } from '../../../components/ui/Select';
import { Button } from '../../../components/ui/Button';

interface PesapalTransaction {
    id: number;
    userId: number;
    orderId: string;
    orderTrackingId?: string;
    requestType: string;
    amount: number;
    currency: string;
    paymentStatus: string;
    createdAt: string;
    username: string;
    email: string;
}

interface UserSearchResult {
    id: number;
    username: string;
    email: string;
    college: string;
    classType: string;
}

const AdminPaymentsTab: React.FC = () => {
    const [activeSubTab, setActiveSubTab] = useState<'proofs' | 'automatic' | 'manual' | 'subscriptions'>('subscriptions');
    const [transactions, setTransactions] = useState<PesapalTransaction[]>([]);
    const [loadingTransactions, setLoadingTransactions] = useState(false);

    // Subscription States
    const [activeSubscriptions, setActiveSubscriptions] = useState<any[]>([]);
    const [loadingSubscriptions, setLoadingSubscriptions] = useState(false);

    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
    const [searchingUsers, setSearchingUsers] = useState(false);
    const [grantingAccess, setGrantingAccess] = useState(false);
    const { showToast } = useToast();

    // Modal state
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        variant: 'danger' | 'warning' | 'info' | 'success';
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        variant: 'info'
    });

    const [manualGrantData, setManualGrantData] = useState({
        userId: 0,
        username: '',
        requestType: 'weekly_material_access',
        durationDays: 7
    });

    useEffect(() => {
        if (activeSubTab === 'automatic') {
            loadTransactions();
        } else if (activeSubTab === 'subscriptions') {
            loadSubscriptions();
        }
    }, [activeSubTab]);

    const loadSubscriptions = async () => {
        setLoadingSubscriptions(true);
        try {
            const data = await fetchActiveSubscriptions();
            setActiveSubscriptions(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to load subscriptions:', err);
            showToast('Failed to load active subscriptions', 'error');
        } finally {
            setLoadingSubscriptions(false);
        }
    };

    const loadTransactions = async () => {
        setLoadingTransactions(true);
        try {
            const data = await fetchPesapalTransactions();
            setTransactions(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to load transactions:', err);
            showToast('Failed to load auto-payments logs', 'error');
        } finally {
            setLoadingTransactions(false);
        }
    };

    const toggleSelect = (id: number) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleBulkDelete = () => {
        if (selectedIds.length === 0) return;

        setConfirmModal({
            isOpen: true,
            title: 'Delete Transactions',
            message: `Are you sure you want to delete ${selectedIds.length} transaction log entries? This action cannot be undone.`,
            variant: 'danger',
            onConfirm: async () => {
                setLoadingTransactions(true);
                try {
                    await bulkDeletePesapalTransactions(selectedIds);
                    showToast('Log entries deleted successfully', 'success');
                    setSelectedIds([]);
                    loadTransactions();
                } catch (err) {
                    showToast('Failed to delete log entries', 'error');
                } finally {
                    setLoadingTransactions(false);
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };

    const handleApproveTransaction = (t: PesapalTransaction) => {
        setConfirmModal({
            isOpen: true,
            title: 'Approve Payment',
            message: `Authorize access for ${t.username}? This will manually grant the requested plan based on this log entry.`,
            variant: 'info',
            onConfirm: async () => {
                setGrantingAccess(true);
                try {
                    let duration = 7;
                    if (t.requestType.includes('monthly')) duration = 30;

                    await manualGrantAccess({
                        userId: t.userId,
                        requestType: t.requestType,
                        durationDays: duration
                    });
                    showToast('Access granted successfully', 'success');
                    loadTransactions();
                } catch (err) {
                    showToast('Failed to grant access', 'error');
                } finally {
                    setGrantingAccess(false);
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };

    const handleSearchUsers = async () => {
        if (searchQuery.length < 2) return;
        setSearchingUsers(true);
        try {
            const response = await searchUsersForGrant(searchQuery);
            setSearchResults(Array.isArray(response.users) ? response.users : []);
        } catch (err) {
            console.error('Search error:', err);
            showToast('Failed to search users', 'error');
        } finally {
            setSearchingUsers(false);
        }
    };

    const handleManualGrant = (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualGrantData.userId) {
            showToast('Please select a user first', 'error');
            return;
        }

        setConfirmModal({
            isOpen: true,
            title: 'Authorize Access',
            message: `Granting ${manualGrantData.requestType.replace(/_/g, ' ')} to ${manualGrantData.username} for ${manualGrantData.durationDays} days. Proceed?`,
            variant: 'success',
            onConfirm: async () => {
                setGrantingAccess(true);
                try {
                    await manualGrantAccess({
                        userId: manualGrantData.userId,
                        requestType: manualGrantData.requestType,
                        durationDays: manualGrantData.durationDays
                    });
                    showToast('Access granted successfully!', 'success');
                    setManualGrantData({ userId: 0, username: '', requestType: 'weekly_material_access', durationDays: 7 });
                    setSearchQuery('');
                    setSearchResults([]);
                } catch (err) {
                    showToast('Failed to grant access', 'error');
                } finally {
                    setGrantingAccess(false);
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };

    const selectUser = (user: UserSearchResult) => {
        setManualGrantData({ ...manualGrantData, userId: user.id, username: user.username });
        setSearchResults([]);
        setSearchQuery('');
    };

    const handleManageSubscription = (userId: number, username: string, action: 'extend' | 'revoke', value?: number) => {
        const actionText = action === 'revoke' ? 'Revoke Access' : 'Extend Subscription';
        const modalVariant = action === 'revoke' ? 'danger' : 'success';
        const message = action === 'revoke'
            ? `Are you sure you want to immediately REVOKE access for ${username}? The user will lose access instantly.`
            : `Extend subscription for ${username} by ${value} days?`;

        setConfirmModal({
            isOpen: true,
            title: actionText,
            message: message,
            variant: modalVariant,
            onConfirm: async () => {
                setGrantingAccess(true); // Re-use granting loader
                try {
                    await manageSubscription({ userId, action, value });
                    showToast(`Subscription ${action === 'revoke' ? 'revoked' : 'extended'} successfully!`, 'success');
                    loadSubscriptions(); // Refresh list
                } catch (err: any) {
                    showToast(err.response?.data?.message || 'Action failed', 'error');
                } finally {
                    setGrantingAccess(false);
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };

    return (
        <div className="space-y-4 md:space-y-6 animate-in fade-in duration-500 pb-20 md:pb-0">
            {/* Sub-navigation - Responsive sizing */}
            <div className="flex overflow-x-auto no-scrollbar gap-2 p-1.5 bg-white/50 backdrop-blur-md rounded-2xl w-full sm:w-fit border border-blue-100 shadow-sm sticky top-0 z-10">
                {[
                    { id: 'proofs', label: 'Proofs', icon: ImageIcon },
                    { id: 'automatic', label: 'Auto Logs', icon: History },
                    { id: 'subscriptions', label: 'Active Subs', icon: Zap },
                    { id: 'manual', label: 'Grant', icon: ShieldPlus }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveSubTab(tab.id as any)}
                        className={`flex items-center space-x-2 px-4 md:px-6 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all duration-300 whitespace-nowrap ${activeSubTab === tab.id
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 translate-y-[-1px]'
                            : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50'
                            }`}
                    >
                        <tab.icon size={16} className="md:w-[18px] md:h-[18px]" />
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            {activeSubTab === 'proofs' && (
                <div className="bg-white/70 backdrop-blur-lg border border-white/50 rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-xl shadow-blue-900/5">
                    <div className="mb-6">
                        <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Payment Proofs</h2>
                        <p className="text-slate-500 text-xs md:text-sm font-medium">Review manual screenshots from students.</p>
                    </div>
                    <AdminPaymentRequestsTab />
                </div>
            )}

            {activeSubTab === 'automatic' && (
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/60 backdrop-blur-md p-4 rounded-2xl border border-white/50 shadow-sm">
                        <div className="hidden sm:block">
                            <h2 className="text-xl font-black text-slate-800 tracking-tight">Pesapal History</h2>
                            <p className="text-xs text-slate-500 font-medium">Automated transaction records.</p>
                        </div>
                        <div className="flex items-center justify-between w-full sm:w-auto space-x-3">
                            <h2 className="sm:hidden text-lg font-black text-slate-800">History</h2>
                            <div className="flex items-center space-x-2">
                                {selectedIds.length > 0 && (
                                    <button
                                        onClick={handleBulkDelete}
                                        className="flex items-center space-x-2 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl border border-red-100 transition-all font-black text-[10px] md:text-xs"
                                    >
                                        <Trash2 size={14} />
                                        <span>Delete ({selectedIds.length})</span>
                                    </button>
                                )}
                                <button
                                    onClick={loadTransactions}
                                    className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100 rounded-xl transition-all shadow-sm active:scale-95"
                                >
                                    <History size={16} className={loadingTransactions ? 'animate-spin' : ''} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-2xl md:rounded-3xl shadow-2xl shadow-blue-900/10 overflow-hidden">
                        {/* Mobile List View / Desktop Table View */}
                        <div className="hidden md:block">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-100">
                                        <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-center w-12">
                                            <button
                                                onClick={() => setSelectedIds(selectedIds.length === (Array.isArray(transactions) ? transactions.length : 0) ? [] : (Array.isArray(transactions) ? transactions.map(t => t.id) : []))}
                                                className="text-slate-400 hover:text-blue-600 transition-colors"
                                            >
                                                {selectedIds.length > 0 && selectedIds.length === (Array.isArray(transactions) ? transactions.length : 0) ? <CheckSquare size={18} /> : <Square size={18} />}
                                            </button>
                                        </th>
                                        <th className="px-6 py-5 text-xs font-black text-slate-500 uppercase tracking-widest">Student</th>
                                        <th className="px-6 py-5 text-xs font-black text-slate-500 uppercase tracking-widest">Details</th>
                                        <th className="px-6 py-5 text-xs font-black text-slate-500 uppercase tracking-widest">Amount</th>
                                        <th className="px-6 py-5 text-xs font-black text-slate-500 uppercase tracking-widest text-center">Status</th>
                                        <th className="px-6 py-5 text-xs font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {loadingTransactions ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-20 text-center">
                                                <Loader2 className="animate-spin h-8 w-8 text-blue-500 mx-auto mb-2" />
                                                <p className="text-slate-500 font-bold text-sm">Loading logs...</p>
                                            </td>
                                        </tr>
                                    ) : !Array.isArray(transactions) || transactions.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-20 text-center bg-white/40 backdrop-blur-sm">
                                                <History size={40} className="mx-auto text-slate-200 mb-4" />
                                                <p className="text-slate-500 font-black uppercase tracking-widest">No transactions logged</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        transactions.map((t) => (
                                            <tr key={t.id} className={`hover:bg-blue-50/30 transition-colors group ${selectedIds.includes(t.id) ? 'bg-blue-50/50' : ''}`}>
                                                <td className="px-6 py-4 text-center">
                                                    <button onClick={() => toggleSelect(t.id)} className={`transition-colors ${selectedIds.includes(t.id) ? 'text-blue-600' : 'text-slate-300 hover:text-blue-400'}`}>
                                                        {selectedIds.includes(t.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                                                    </button>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center">
                                                        <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-black mr-3 text-xs">
                                                            {(t.username || '?').charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-black text-slate-800">{t.username}</div>
                                                            <div className="text-[10px] text-slate-400 font-bold">{t.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-[10px] font-mono text-slate-400 mb-0.5">{t.orderId}</div>
                                                    <span className="inline-flex px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[9px] font-black uppercase tracking-wider">
                                                        {(t.requestType || '').replace(/_/g, ' ')}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm font-black text-slate-900 leading-none">
                                                        {Number(t.amount || 0).toLocaleString()}
                                                    </div>
                                                    <div className="text-[9px] text-slate-400 mt-0.5 font-black uppercase tracking-tighter">{t.currency}</div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tight ${(t.paymentStatus || '').toLowerCase() === 'completed'
                                                        ? 'bg-green-100 text-green-700'
                                                        : (t.paymentStatus || '').toLowerCase() === 'pending'
                                                            ? 'bg-amber-100 text-amber-700'
                                                            : 'bg-red-100 text-red-700'
                                                        }`}>
                                                        {t.paymentStatus}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {(t.paymentStatus || '').toLowerCase() !== 'completed' && (
                                                            <button
                                                                onClick={() => handleApproveTransaction(t)}
                                                                className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-all"
                                                                title="Approve"
                                                            >
                                                                <ThumbsUp size={14} />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => {
                                                                setSelectedIds([t.id]);
                                                                handleBulkDelete();
                                                            }}
                                                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Cards View */}
                        <div className="md:hidden divide-y divide-slate-100">
                            {loadingTransactions ? (
                                <div className="p-10 text-center">
                                    <Loader2 className="animate-spin h-8 w-8 text-blue-500 mx-auto mb-2" />
                                    <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Crunching logs...</p>
                                </div>
                            ) : !Array.isArray(transactions) || transactions.length === 0 ? (
                                <div className="p-10 text-center bg-white/40 backdrop-blur-sm">
                                    <History size={40} className="mx-auto text-slate-200 mb-4" />
                                    <p className="text-slate-500 font-black uppercase tracking-widest">No logs found</p>
                                </div>
                            ) : transactions.map(t => (
                                <div key={t.id} className="p-4 space-y-3 relative group active:bg-slate-50">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center space-x-3">
                                            <button onClick={() => toggleSelect(t.id)} className={`shrink-0 ${selectedIds.includes(t.id) ? 'text-blue-600' : 'text-slate-300'}`}>
                                                {selectedIds.includes(t.id) ? <CheckSquare size={20} /> : <Square size={20} />}
                                            </button>
                                            <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-black">
                                                {(t.username || '?').charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="text-sm font-black text-slate-800">{t.username}</div>
                                                <div className="text-[10px] text-slate-400 font-bold">{t.email}</div>
                                            </div>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${(t.paymentStatus || '').toLowerCase() === 'completed' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                            {t.paymentStatus}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-end pl-12">
                                        <div className="space-y-1">
                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{(t.requestType || '').replace(/_/g, ' ')}</div>
                                            <div className="text-lg font-black text-slate-900 leading-none">
                                                {t.currency} {Number(t.amount || 0).toLocaleString()}
                                            </div>
                                        </div>
                                        <div className="flex space-x-2">
                                            {(t.paymentStatus || '').toLowerCase() !== 'completed' && (
                                                <button onClick={() => handleApproveTransaction(t)} className="p-2 bg-green-50 text-green-600 rounded-xl border border-green-100">
                                                    <ThumbsUp size={16} />
                                                </button>
                                            )}
                                            <button onClick={() => { setSelectedIds([t.id]); handleBulkDelete(); }} className="p-2 bg-slate-50 text-slate-400 rounded-xl border border-slate-100">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}


            {activeSubTab === 'subscriptions' && (
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/60 backdrop-blur-md p-6 rounded-[2rem] border border-white/50 shadow-sm">
                        <div>
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                                <Zap className="text-amber-500 fill-amber-500" />
                                Active Subscriptions
                            </h2>
                            <p className="text-sm text-slate-500 font-bold mt-1">Manage currently active student access rights.</p>
                        </div>
                        <div className="bg-white/80 px-4 py-2 rounded-xl border border-blue-100 shadow-sm">
                            <div className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Active</div>
                            <div className="text-xl font-black text-blue-600">{activeSubscriptions.length} Users</div>
                        </div>
                        <button
                            onClick={loadSubscriptions}
                            className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100 rounded-xl transition-all shadow-sm active:scale-95"
                            title="Refresh"
                        >
                            <RefreshCw size={20} className={loadingSubscriptions ? 'animate-spin' : ''} />
                        </button>
                    </div>

                    <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-[2.5rem] shadow-2xl shadow-blue-900/10 overflow-hidden transform transition-all p-2">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-100/50">
                                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Student</th>
                                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Subscription Start</th>
                                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Expires On</th>
                                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Remaining</th>
                                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {loadingSubscriptions ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-20 text-center">
                                                <Loader2 className="animate-spin h-8 w-8 text-blue-500 mx-auto mb-2" />
                                                <p className="text-slate-500 font-bold text-sm">Loading subscriptions...</p>
                                            </td>
                                        </tr>
                                    ) : activeSubscriptions.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-20 text-center">
                                                <ShieldPlus size={40} className="mx-auto text-slate-200 mb-4" />
                                                <p className="text-slate-500 font-black uppercase tracking-widest">No active subscriptions found</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        activeSubscriptions.map((sub: any) => {
                                            const expiry = new Date(sub.materialPaidAccessEndTime);
                                            const now = new Date();
                                            const diffTime = expiry.getTime() - now.getTime();
                                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                            const isExpiringSoon = diffDays <= 3 && diffDays > 0;

                                            // Handle invalid dates nicely
                                            const isValidDate = !isNaN(expiry.getTime());

                                            return (
                                                <tr key={sub.id} className="hover:bg-blue-50/40 transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center space-x-3">
                                                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-600 font-black shadow-sm">
                                                                {(sub.username || '?').charAt(0).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <div className="text-sm font-black text-slate-800">{sub.username}</div>
                                                                <div className="text-[10px] text-slate-400 font-bold">{sub.email}</div>
                                                                <div className="text-[9px] text-slate-300 font-bold">{sub.phone}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {sub.subscriptionStartDate ? (
                                                            <div className="flex items-center text-slate-600">
                                                                <Calendar size={12} className="mr-1.5 text-slate-400" />
                                                                <span className="text-xs font-bold">{new Date(sub.subscriptionStartDate).toLocaleDateString()}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-[10px] text-slate-300 font-bold italic">Unknown</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {isValidDate ? (
                                                            <div className="flex items-center text-slate-700">
                                                                <Clock size={12} className={`mr-1.5 ${isExpiringSoon ? 'text-amber-500' : 'text-slate-400'}`} />
                                                                <span className="text-xs font-bold">{expiry.toLocaleDateString()} <span className="text-[10px] text-slate-400 ml-1">{expiry.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-red-500 font-bold">Invalid Date</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        {isValidDate && diffDays > 0 ? (
                                                            <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${isExpiringSoon ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                                                                {diffDays} Days
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-700">Expired</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end space-x-2">
                                                            <div className="flex bg-slate-100 rounded-lg p-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button
                                                                    onClick={() => handleManageSubscription(sub.id, sub.username, 'extend', 7)}
                                                                    className="px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-white hover:text-blue-600 rounded-md transition-all shadow-sm hover:shadow"
                                                                    title="Extend 7 Days"
                                                                >
                                                                    +7d
                                                                </button>
                                                                <div className="w-px bg-slate-200 mx-1"></div>
                                                                <button
                                                                    onClick={() => handleManageSubscription(sub.id, sub.username, 'extend', 30)}
                                                                    className="px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-white hover:text-blue-600 rounded-md transition-all shadow-sm hover:shadow"
                                                                    title="Extend 30 Days"
                                                                >
                                                                    +30d
                                                                </button>
                                                            </div>
                                                            <button
                                                                onClick={() => handleManageSubscription(sub.id, sub.username, 'revoke')}
                                                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                                title="Revoke Susbscription"
                                                            >
                                                                <XCircle size={18} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeSubTab === 'manual' && (
                <div className="max-w-3xl mx-auto w-full px-2 md:px-0">
                    <div className="bg-white md:bg-white/80 backdrop-blur-xl border border-blue-50 md:border-blue-100 rounded-3xl md:rounded-[2.5rem] p-6 md:p-10 shadow-2xl shadow-blue-900/10">
                        <div className="flex items-center space-x-4 md:space-x-6 mb-8 md:mb-10">
                            <div className="p-3 md:p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/30 shrink-0">
                                <ShieldPlus className="text-white w-6 h-6 md:w-8 md:h-8" />
                            </div>
                            <div>
                                <h2 className="text-xl md:text-3xl font-black text-slate-900 tracking-tight">Access Control</h2>
                                <p className="text-slate-500 text-xs md:text-sm font-bold opacity-80 uppercase tracking-widest">Manual Grant System</p>
                            </div>
                        </div>

                        <form onSubmit={handleManualGrant} className="space-y-6 md:space-y-8">
                            {/* User Search Section */}
                            <div className="space-y-2 relative">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Student Account</label>
                                <div className="relative group">
                                    <input
                                        type="text"
                                        placeholder="Username or email..."
                                        value={manualGrantData.userId ? manualGrantData.username : searchQuery}
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value);
                                            if (manualGrantData.userId) {
                                                setManualGrantData({ ...manualGrantData, userId: 0, username: '' });
                                            }
                                        }}
                                        onKeyUp={(e) => e.key === 'Enter' && handleSearchUsers()}
                                        className={`w-full bg-slate-50/50 border ${manualGrantData.userId ? 'border-green-400 bg-green-50/20' : 'border-slate-100'} rounded-2xl py-3 md:py-4 pl-12 md:pl-14 pr-4 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-300 transition-all text-sm md:text-lg font-bold shadow-sm`}
                                        readOnly={!!manualGrantData.userId}
                                    />
                                    <User className={`absolute left-4 md:left-5 top-1/2 -translate-y-1/2 ${manualGrantData.userId ? 'text-green-500' : 'text-slate-300'}`} size={20} />

                                    {manualGrantData.userId ? (
                                        <button
                                            type="button"
                                            onClick={() => setManualGrantData({ ...manualGrantData, userId: 0 })}
                                            className="absolute right-3 md:right-5 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-white border border-slate-200 text-blue-600 font-bold rounded-xl text-[10px] hover:shadow-md transition-all active:scale-95"
                                        >
                                            Reset
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={handleSearchUsers}
                                            className="absolute right-3 md:right-5 top-1/2 -translate-y-1/2 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-95"
                                        >
                                            {searchingUsers ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
                                        </button>
                                    )}
                                </div>

                                {/* Results Dropdown */}
                                {Array.isArray(searchResults) && searchResults.length > 0 && (
                                    <div className="absolute z-50 w-full mt-2 bg-white border border-slate-100 rounded-3xl shadow-2xl max-h-64 overflow-y-auto animate-in slide-in-from-top-2 duration-300">
                                        <div className="p-2 space-y-1">
                                            {searchResults.map(user => (
                                                <button
                                                    key={user.id}
                                                    type="button"
                                                    onClick={() => selectUser(user)}
                                                    className="w-full px-4 py-3 text-left hover:bg-blue-50 flex items-center justify-between group transition-all rounded-xl"
                                                >
                                                    <div className="flex items-center space-x-3">
                                                        <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-black group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                                                            {(user.username || '?').charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div className="font-black text-slate-800 text-sm">{user.username}</div>
                                                            <div className="text-[10px] text-slate-400 font-bold">{user.email}</div>
                                                        </div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Plan Selection - Simplified logic */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Access Tier</label>
                                    <Select
                                        value={manualGrantData.requestType}
                                        onChange={(val) => setManualGrantData({ ...manualGrantData, requestType: val })}
                                        options={[
                                            { value: 'weekly_material_access', label: 'Material Access (Weekly)' },
                                            { value: 'monthly_material_access', label: 'Material Access (Monthly)' }
                                        ]}
                                        placeholder="Select Plan"
                                        fullWidth
                                        icon={<ShieldPlus size={18} />}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Validity Period (Days)</label>
                                    <div className="flex space-x-2 md:space-x-3">
                                        {[7, 30].map(days => (
                                            <button
                                                key={days}
                                                type="button"
                                                onClick={() => setManualGrantData({ ...manualGrantData, durationDays: days })}
                                                className={`flex-1 py-3.5 md:py-4 rounded-2xl border-2 font-black transition-all duration-300 text-sm md:text-base ${manualGrantData.durationDays === days
                                                    ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-200'
                                                    : 'bg-white border-slate-100 text-slate-400 hover:border-blue-100 hover:text-blue-500'
                                                    }`}
                                            >
                                                {days}
                                            </button>
                                        ))}
                                        <input
                                            type="number"
                                            placeholder="Ext"
                                            min="1"
                                            className="w-16 md:w-20 bg-slate-50/50 border-2 border-slate-100 rounded-2xl py-3.5 md:py-4 px-2 text-center text-slate-800 font-bold focus:outline-none focus:border-blue-300 text-sm"
                                            onChange={(e) => setManualGrantData({ ...manualGrantData, durationDays: parseInt(e.target.value) || 0 })}
                                            value={manualGrantData.durationDays === 7 || manualGrantData.durationDays === 30 ? '' : manualGrantData.durationDays}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-2 md:pt-4">
                                <Button
                                    type="submit"
                                    disabled={grantingAccess || !manualGrantData.userId}
                                    fullWidth
                                    className={`py-6 md:py-8 rounded-3xl font-black text-lg md:text-xl tracking-tight shadow-2xl active:scale-95 transition-all duration-500 ${grantingAccess || !manualGrantData.userId
                                        ? 'bg-slate-100 text-slate-300 cursor-not-allowed opacity-50'
                                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 shadow-blue-600/30'
                                        }`}
                                >
                                    {grantingAccess ? (
                                        <>
                                            <Loader2 className="animate-spin mr-3" size={24} />
                                            <span>Authorizing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="mr-3" size={24} />
                                            <span>Grant Full Access</span>
                                        </>
                                    )}
                                </Button>
                            </div>

                            {/* Mobile Warning Context */}
                            <div className="flex items-start space-x-3 md:space-x-4 p-4 md:p-6 bg-amber-50/50 border border-amber-100 rounded-3xl">
                                <AlertCircle className="text-amber-500 shrink-0" size={20} />
                                <p className="text-[10px] md:text-xs text-amber-700/80 font-black uppercase tracking-tight leading-relaxed">
                                    Direct authorization bypasses payment verification. Student will be notified immediately of their new status.
                                </p>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Premium Confirmation Modal */}
            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                variant={confirmModal.variant}
                isLoading={loadingTransactions || grantingAccess}
                confirmText={confirmModal.variant === 'danger' ? 'Yes, Delete' : 'Confirm'}
            />
        </div>
    );
};

export default AdminPaymentsTab;
