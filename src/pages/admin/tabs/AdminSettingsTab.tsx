import React, { useEffect, useState } from 'react';
import { fetchSystemSettings, updateSystemSettings } from '../../../utils/api';
import { Alert } from '../../../components/ui/Alert';
import { Unlock, Lock, AlertTriangle } from 'lucide-react';

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

    const handleToggle = async (key: string, currentValue: boolean) => {
        const newValue = !currentValue;
        try {
            // Optimistic update
            setSettings(prev => ({ ...prev, [key]: newValue }));

            await updateSystemSettings(key, newValue);
            setSuccessMessage(`Setting updated successfully.`);

            // Clear success message after 3 seconds
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err) {
            console.error('Failed to update setting:', err);
            setError('Failed to update setting.');
            // Revert optimistic update
            setSettings(prev => ({ ...prev, [key]: currentValue }));
        }
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
                                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${isGlobalFreeAccessEnabled ? 'bg-green-500' : 'bg-gray-300'
                                    }`}
                            >
                                <span className="sr-only">Toggle global free access</span>
                                <span
                                    className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform ${isGlobalFreeAccessEnabled ? 'translate-x-7' : 'translate-x-1'
                                        }`}
                                />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
