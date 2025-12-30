import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Alert } from '../../components/ui/Alert';
import {
  User, Mail, School, Phone, Shield, Lock, Save, Trash2,
  Camera, Check, Crown, CreditCard, Clock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const DashboardProfilePage: React.FC = () => {
  const { user, isLoading, updateProfile, updatePassword, deleteAccount } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: '', email: '', college: '', phone: '',
    currentPassword: '', newPassword: '', confirmPassword: ''
  });

  const [activeTab, setActiveTab] = useState<'details' | 'security'>('details');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        username: user.username || '',
        email: user.email || '',
        college: user.college || '',
        phone: user.phone || ''
      }));
    }
  }, [user]);

  const handleUpdate = async () => {
    try {
      await updateProfile({
        username: formData.username,
        email: formData.email,
        college: formData.college,
        phone: formData.phone
      });
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handlePasswordUpdate = async () => {
    if (formData.newPassword !== formData.confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    try {
      if (!user) return;
      await updatePassword(user.id.toString(), formData.currentPassword, formData.newPassword);
      setMessage({ type: 'success', text: 'Password changed successfully.' });
      setFormData(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative pb-12">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-b from-primary-50 to-transparent pointer-events-none" />
      <div className="absolute top-20 right-20 w-64 h-64 bg-purple-200/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute top-40 left-20 w-72 h-72 bg-blue-200/20 rounded-full blur-3xl pointer-events-none animate-pulse delay-700" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 relative z-10">

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Account Settings</h1>
          <p className="text-gray-500 mt-1">Manage your personal information and security preferences.</p>
        </div>

        {message && (
          <div className="mb-6 animate-fade-in-down">
            <Alert variant={message.type} message={message.text} onClose={() => setMessage(null)} />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Left Sidebar: Profile Identity Card */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-3xl shadow-xl shadow-gray-100 overflow-hidden border border-gray-100 relative group">
              {/* Card Header Gradient */}
              <div className="h-32 bg-gradient-to-r from-gray-800 to-black relative">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
              </div>

              {/* Avatar Section */}
              <div className="px-6 pb-8 relative text-center">
                <div className="relative -mt-16 mb-4 inline-block">
                  <div className="w-32 h-32 rounded-full border-4 border-white bg-gray-100 shadow-lg flex items-center justify-center text-4xl font-bold text-gray-400 overflow-hidden relative group-hover:scale-105 transition-transform duration-300">
                    {user?.username?.[0]?.toUpperCase()}
                  </div>
                  <button className="absolute bottom-0 right-0 p-2 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 transition-colors transform hover:scale-110">
                    <Camera size={16} />
                  </button>
                </div>

                <h2 className="text-2xl font-bold text-gray-900">{user?.username}</h2>
                <p className="text-gray-500 text-sm mb-4">{user?.email}</p>

                {/* Subscription Status Badge */}
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${user?.hasMaterialAccess
                    ? 'bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 border border-amber-100'
                    : 'bg-gray-100 text-gray-600'
                  }`}>
                  {user?.hasMaterialAccess ? <Crown size={14} className="fill-current" /> : <Shield size={14} />}
                  {user?.hasMaterialAccess ? 'Premium Member' : 'Free Plan'}
                </div>
              </div>

              {/* Stats / Info Footer */}
              <div className="border-t border-gray-100 p-6 bg-gray-50/50">
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span className="flex items-center gap-1"><Clock size={14} /> Joined</span>
                  <span className="font-medium text-gray-900">Dec 2025</span>
                </div>
              </div>
            </div>

            {/* Premium Upsell (if free) */}
            {!user?.hasMaterialAccess && (
              <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-6 text-white shadow-xl shadow-indigo-200 text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-xl"></div>
                <Crown size={32} className="mx-auto mb-4 text-amber-300" />
                <h3 className="text-lg font-bold mb-2">Upgrade to Premium</h3>
                <p className="text-indigo-100 text-sm mb-4">Unlock unlimited access to all notes, books, and video tutorials.</p>
                <Button className="w-full bg-white text-indigo-600 hover:bg-indigo-50 border-0 font-bold">
                  View Plans
                </Button>
              </div>
            )}
          </div>

          {/* Right Main Content: Forms */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-3xl shadow-xl shadow-gray-100 border border-gray-100 overflow-hidden">

              {/* Custom Tab Switcher */}
              <div className="border-b border-gray-100 p-2">
                <div className="flex gap-2 p-1 bg-gray-50 rounded-xl">
                  <button
                    onClick={() => setActiveTab('details')}
                    className={`flex-1 py-3 px-4 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${activeTab === 'details'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
                      }`}
                  >
                    <User size={16} /> Personal Details
                  </button>
                  <button
                    onClick={() => setActiveTab('security')}
                    className={`flex-1 py-3 px-4 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${activeTab === 'security'
                        ? 'bg-white text-red-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
                      }`}
                  >
                    <Lock size={16} /> Security
                  </button>
                </div>
              </div>

              <div className="p-6 sm:p-8">
                {activeTab === 'details' ? (
                  <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Username</label>
                        <div className="relative group">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" size={18} />
                          <Input
                            value={formData.username}
                            onChange={e => setFormData({ ...formData, username: e.target.value })}
                            className="pl-10 h-12 bg-gray-50 border-gray-100 focus:bg-white focus:ring-2 focus:ring-primary-100 transition-all rounded-xl"
                            placeholder="Enter username"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Email Address</label>
                        <div className="relative group">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" size={18} />
                          <Input
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                            className="pl-10 h-12 bg-gray-50 border-gray-100 focus:bg-white focus:ring-2 focus:ring-primary-100 transition-all rounded-xl"
                            placeholder="Enter email"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Education Center</label>
                        <div className="relative group">
                          <School className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" size={18} />
                          <Input
                            value={formData.college}
                            onChange={e => setFormData({ ...formData, college: e.target.value })}
                            className="pl-10 h-12 bg-gray-50 border-gray-100 focus:bg-white focus:ring-2 focus:ring-primary-100 transition-all rounded-xl"
                            placeholder="College or School"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Phone Number</label>
                        <div className="relative group">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" size={18} />
                          <Input
                            value={formData.phone}
                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            className="pl-10 h-12 bg-gray-50 border-gray-100 focus:bg-white focus:ring-2 focus:ring-primary-100 transition-all rounded-xl"
                            placeholder="Enter phone number"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-gray-100 flex justify-end">
                      <Button
                        onClick={handleUpdate}
                        className="bg-black text-white hover:bg-gray-800 rounded-xl px-8 py-3 text-sm font-semibold shadow-lg shadow-gray-200 transform hover:-translate-y-0.5 transition-all"
                      >
                        <Save size={18} className="mr-2" /> Save Changes
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 animate-fade-in">
                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex items-start gap-3">
                      <Lock className="text-amber-500 shrink-0 mt-0.5" size={20} />
                      <div>
                        <h4 className="text-sm font-bold text-amber-900">Password Security</h4>
                        <p className="text-sm text-amber-700 mt-1">Ensure your account uses a strong password. We recommend mixing letters, numbers, and symbols.</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {['currentPassword', 'newPassword', 'confirmPassword'].map((field) => (
                        <div key={field} className="space-y-2">
                          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                            {field === 'confirmPassword' ? 'Confirm New Password' : field.replace(/([A-Z])/g, ' $1').trim()}
                          </label>
                          <Input
                            type="password"
                            value={formData[field as keyof typeof formData]}
                            onChange={e => setFormData({ ...formData, [field]: e.target.value })}
                            className="h-12 bg-gray-50 border-gray-100 focus:bg-white focus:ring-2 focus:ring-red-100 transition-all rounded-xl"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
                      <div className="text-sm">
                        <p className="font-bold text-red-600 mb-1">Danger Zone</p>
                        <button
                          onClick={() => deleteAccount(user?.id.toString() || '0')}
                          className="text-gray-500 hover:text-red-600 transition-colors flex items-center text-xs"
                        >
                          <Trash2 size={12} className="mr-1" /> Delete my account permanently
                        </button>
                      </div>

                      <Button
                        onClick={handlePasswordUpdate}
                        className="bg-black text-white hover:bg-gray-800 rounded-xl px-8 py-3 text-sm font-semibold shadow-lg shadow-gray-200 transform hover:-translate-y-0.5 transition-all"
                      >
                        Update Password
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
