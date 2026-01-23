import { AlertTriangle, Lock, Unlock, Zap } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Alert } from '../../../components/ui/Alert';
import { fetchSystemSettings, updateSystemSettings } from '../../../utils/api';

export const AdminSettingsTab: React.FC = () => {
    const [settings, setSettings] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            setLoading(true);
            const data = await fetchSystemSettings();
            setSettings(data);
            setError(null);
        } catch (err) {
            console.error('Failed to load settings:', err);
            setError('Failed to load system settings.');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateSetting = async (key: string, newValue: any) => {
        try {
            // Optimistic update
            setSettings(prev => ({ ...prev, [key]: newValue }));

            await updateSystemSettings(key, newValue);
            setSuccessMessage(`${key.replace(/_/g, ' ')} updated successfully.`);

            // Clear success message after 3 seconds
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err) {
            console.error('Failed to update setting:', err);
            setError('Failed to update setting.');
            // Reload settings on error to sync with backend
            loadSettings();
        }
    };

    const handleToggle = async (key: string, currentValue: boolean) => {
        handleUpdateSetting(key, !currentValue);
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Loading settings...</div>;
    }

    const isGlobalFreeAccessEnabled = settings['global_free_access'] === true; // Ensure boolean comparison

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-800">System Settings</h2>
                <p className="text-gray-500 mt-1">Manage global system configurations and access controls.</p>
            </div>

            {error && (
                <Alert
                    variant="error"
                    message={error}
                    onClose={() => setError(null)}
                />
            )}

            {successMessage && (
                <Alert
                    variant="success"
                    message={successMessage}
                    onClose={() => setSuccessMessage(null)}
                />
            )}

            {/* Global Free Access Setting */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 sm:gap-6">
                        <div className="flex items-start gap-3 sm:gap-4 flex-1">
                            <div className={`p-2 sm:p-3 rounded-lg flex-shrink-0 ${isGlobalFreeAccessEnabled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
                                {isGlobalFreeAccessEnabled ? <Unlock size={20} className="sm:w-6 sm:h-6" /> : <Lock size={20} className="sm:w-6 sm:h-6" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Global Free Access</h3>
                                <p className="text-sm sm:text-base text-gray-600 mt-1">
                                    When enabled, <strong>all registered users</strong> will have full access to all materials, bypassing payment checks.
                                    Existing payment records are preserved. Use this for special events or free trial periods.
                                </p>
                                {isGlobalFreeAccessEnabled && (
                                    <div className="mt-3 flex items-start gap-2 text-amber-600 bg-amber-50 px-3 py-2 rounded-md text-xs sm:text-sm">
                                        <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                                        <span>Warning: Free access is currently active for everyone.</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center justify-between w-full sm:w-auto mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100 sm:border-none">
                            <span className="text-sm font-medium text-gray-700 sm:hidden">Enable Access</span>
                            <button
                                onClick={() => handleToggle('global_free_access', isGlobalFreeAccessEnabled)}
                                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${isGlobalFreeAccessEnabled ? 'bg-green-500' : 'bg-gray-300'}`}
                            >
                                <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform ${isGlobalFreeAccessEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Hybrid Payment Mode Setting */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 sm:p-6 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 sm:gap-6">
                        <div className="flex items-start gap-3 sm:gap-4 flex-1">
                            <div className={`p-2 sm:p-3 rounded-lg flex-shrink-0 bg-blue-100 text-blue-600`}>
                                <Zap size={20} className="sm:w-6 sm:h-6" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Payment Collection Mode</h3>
                                <p className="text-sm sm:text-base text-gray-600 mt-1">
                                    Choose how users pay for access. <strong>Pesapal</strong> is fully automated, while <strong>Manual Proof</strong> requires users to upload payment screenshots for your review.
                                </p>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    <button
                                        onClick={() => handleUpdateSetting('payment_mode', 'pesapal')}
                                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${settings['payment_mode'] === 'pesapal' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                    >
                                        Pesapal (Automated)
                                    </button>
                                    <button
                                        onClick={() => handleUpdateSetting('payment_mode', 'manual')}
                                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${settings['payment_mode'] === 'manual' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                    >
                                        Manual Proof (Screenshot)
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {settings['payment_mode'] === 'manual' && (
                        <div className="pt-6 border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-300">
                            <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider mb-2">
                                Manual Payment Instructions
                            </label>
                            <p className="text-xs text-gray-500 mb-3">
                                Provide clear steps for users: which number to pay to (M-Pesa/Tigo Pesa), which name will appear, etc.
                            </p>
                            <textarea
                                className="w-full min-h-[120px] p-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-sm leading-relaxed"
                                placeholder="Example: Send 1,000 Tsh to Vodacom M-Pesa 07XXXXXXX (Name: AfyaClass). Then upload the transaction screenshot below."
                                value={settings['manual_payment_instructions'] || ''}
                                onChange={(e) => setSettings(prev => ({ ...prev, ['manual_payment_instructions']: e.target.value }))}
                                onBlur={(e) => handleUpdateSetting('manual_payment_instructions', e.target.value)}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
