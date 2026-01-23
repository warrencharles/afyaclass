import { FileText } from 'lucide-react';
import React, { useMemo } from 'react';
import { User } from '../../types';
import CountdownTimer from './CountdownTimer';

interface AccessStatusSectionProps {
    user: User | null;
    onAccessEnd: () => void;
}

export const AccessStatusSection: React.FC<AccessStatusSectionProps> = ({ user, onAccessEnd }) => {
    const calculateRemainingTime = (endTime: string | null | undefined, startTime: string | null | undefined, hasAccess: boolean | undefined, durationMinutes = 15) => {
        if (user?.isGlobalFreeAccessEnabled) return 0;
        if (hasAccess && endTime) {
            // Paid access
            const end = new Date(endTime).getTime();
            const now = new Date().getTime();
            return Math.max(0, Math.floor((end - now) / 1000));
        } else if (!hasAccess && startTime) {
            // Trial Access
            const start = new Date(startTime).getTime();
            const end = start + (durationMinutes * 60 * 1000);
            const now = new Date().getTime();
            return Math.max(0, Math.floor((end - now) / 1000));
        }
        return 0;
    };


    const materialTime = useMemo(() => {
        if (user?.isGlobalFreeAccessEnabled) return 0;
        // Material logic had some specific checks in original code, simplifying here but respecting priority
        if (user?.hasMaterialAccess) return calculateRemainingTime(user.materialPaidAccessEndTime, null, true);
        return calculateRemainingTime(user?.materialTrialEndTime, user?.materialTrialStartTime, false);
    }, [user?.materialPaidAccessEndTime, user?.materialTrialEndTime, user?.materialTrialStartTime, user?.hasMaterialAccess, user?.isGlobalFreeAccessEnabled]);


    const statuses = [
        {
            id: 'material',
            label: 'Materials',
            isActive: user?.hasMaterialAccess || (user?.materialTrialStartTime && materialTime > 0),
            isPaid: user?.hasMaterialAccess,
            time: materialTime,
            icon: FileText,
            bg: 'bg-green-50',
            border: 'border-green-100',
            text: 'text-green-700',
            iconColor: 'text-green-500'
        }
    ].filter(s => s.isActive); // Only show active statuses

    if (statuses.length === 0) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {statuses.map((status) => (
                <div key={status.id} className={`${status.bg} border ${status.border} rounded-2xl p-3 flex flex-row items-center justify-between gap-3 shadow-sm transition-transform hover:scale-[1.02]`}>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`p-2 rounded-xl bg-white shadow-sm ${status.iconColor} shrink-0`}>
                            <status.icon size={20} />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <h3 className={`font-bold text-sm ${status.text}`}>{status.label}</h3>
                            <span className="text-xs font-medium opacity-80 text-gray-600">
                                {status.isPaid ? 'Active Subscription' : 'Trial Active'}
                            </span>
                        </div>
                    </div>

                    <div className="shrink-0 flex flex-col items-end">
                        <CountdownTimer
                            initialTimeInSeconds={status.time}
                            onTrialEnd={onAccessEnd}
                            isPaidAccess={status.isPaid}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
};
