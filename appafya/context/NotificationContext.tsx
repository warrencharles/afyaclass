import api from '@/constants/api';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useAlert } from './AlertContext';
import { useAuth } from './AuthContext';

interface Notification {
    id: number;
    type: string;
    message: string;
    isRead: boolean;
    createdAt: string;
    entityId?: number;
    entityType?: string;
}

interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    fetchNotifications: (userId: number | undefined, isAuthenticated: boolean) => Promise<void>;
    markNotificationAsRead: (notificationId: number) => Promise<void>;
    markAllNotificationsAsRead: () => Promise<void>;
    clearAllNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }): React.JSX.Element => {
    const { userToken } = useAuth();
    const [userId, setUserId] = useState<number | undefined>(undefined);

    const { showAlert } = useAlert();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const notificationsRef = useRef(notifications);
    useEffect(() => {
        notificationsRef.current = notifications;
    }, [notifications]);

    useEffect(() => {
        import('expo-secure-store').then(async (SecureStore) => {
            try {
                const infoStr = await SecureStore.getItemAsync('userInfo');
                if (infoStr) {
                    const user = JSON.parse(infoStr);
                    setUserId(user.id || user.userId);
                }
            } catch (e) {
                console.log('Error loading user info for notifications', e);
            }
        });
    }, [userToken]);


    const fetchNotifications = useCallback(async (currentUserId: number | undefined, hasToken: boolean) => {
        if (!hasToken || !currentUserId) {
            if (notificationsRef.current.length > 0) {
                setNotifications([]);
                setUnreadCount(0);
            }
            return;
        }

        try {
            const response = await api.get(`/notifications/${currentUserId}`);
            const data: Notification[] = response.data;

            if (JSON.stringify(notificationsRef.current) !== JSON.stringify(data)) {
                setNotifications(data);
                setUnreadCount(data.filter(n => !n.isRead).length);
            }
        } catch (error) {
            console.log('Error fetching notifications:', error);
        }
    }, []);

    const markNotificationAsRead = useCallback(async (notificationId: number) => {
        if (!userId) return;
        try {
            await api.put(`/notifications/${userId}/${notificationId}`);
            setNotifications(prev =>
                prev.map(n => (n.id === notificationId ? { ...n, isRead: true } : n))
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.log('Error marking read:', error);
            showAlert({ title: 'Error', message: 'Failed to update notification', type: 'error' });
        }
    }, [userId]);

    const markAllNotificationsAsRead = useCallback(async () => {
        if (!userId) return;
        try {
            await api.put(`/notifications/${userId}`, { action: 'mark_all_as_read' });
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
            showAlert({ title: 'Success', message: 'All marked as read', type: 'success' });
        } catch (error) {
            console.log('Error marking all read:', error);
        }
    }, [userId]);

    const clearAllNotifications = useCallback(async () => {
        if (!userId) return;
        try {
            await api.delete(`/notifications/${userId}`);
            setNotifications([]);
            setUnreadCount(0);
            showAlert({ title: 'Success', message: 'Notifications cleared', type: 'success' });
        } catch (error) {
            console.log('Error clearing notifications:', error);
        }
    }, [userId]);

    // Polling logic
    const appState = useRef(AppState.currentState);
    const intervalRef = useRef<any>(null);

    useEffect(() => {
        if (userToken && userId) {
            fetchNotifications(userId, true);

            const startPolling = () => {
                if (intervalRef.current) clearInterval(intervalRef.current);
                intervalRef.current = setInterval(() => {
                    if (AppState.currentState === 'active') {
                        fetchNotifications(userId, true);
                    }
                }, 30000);
            };

            startPolling();

            const subscription = AppState.addEventListener('change', nextAppState => {
                if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
                    fetchNotifications(userId, true);
                    startPolling();
                } else if (nextAppState.match(/inactive|background/)) {
                    if (intervalRef.current) clearInterval(intervalRef.current);
                }
                appState.current = nextAppState;
            });

            return () => {
                if (intervalRef.current) clearInterval(intervalRef.current);
                subscription.remove();
            };
        } else {
            setNotifications([]);
            setUnreadCount(0);
        }
    }, [userToken, userId, fetchNotifications]);

    return (
        <NotificationContext.Provider
            value={{
                notifications,
                unreadCount,
                fetchNotifications,
                markNotificationAsRead,
                markAllNotificationsAsRead,
                clearAllNotifications,
            }}
        >
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};
