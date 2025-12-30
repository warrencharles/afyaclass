import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext'; // Assuming AuthContext provides userId and role, and isAuthInitialized
import { useToast } from './ToastContext'; // Assuming ToastContext provides a way to show toasts
import api from '../utils/api'; // Import the axios instance
import axios from 'axios'; // Import axios to use axios.isAxiosError

interface Notification {
  id: number;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  entityId?: number; // Optional: ID of the related entity (e.g., payment_request_id, user_query_id)
  entityType?: string; // Optional: Type of the related entity (e.g., 'payment_request', 'user_query')
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  fetchNotifications: (userId: number | undefined, isAuthenticated: boolean) => Promise<void>;
  markNotificationAsRead: (notificationId: number) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  registerNotificationCallback: (callback: (notification: Notification) => void) => () => void; // New: Register a callback
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const { user, isAuthenticated, isAuthInitialized } = useAuth(); // Destructure isAuthInitialized
  const { showToast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Use a ref to store callbacks to avoid re-renders and stale closures
  const notificationCallbacks = useRef<Set<(notification: Notification) => void>>(new Set());

  // Use a ref to access the latest notifications inside fetchNotifications without adding it as a dependency
  const notificationsRef = useRef(notifications);
  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  const registerNotificationCallback = useCallback((callback: (notification: Notification) => void) => {
    notificationCallbacks.current.add(callback);
    return () => {
      notificationCallbacks.current.delete(callback);
    };
  }, []);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://dev.afyaclass.co.tz/backend-php/public';

  const fetchNotifications = useCallback(async (currentUserId: number | undefined, currentIsAuthenticated: boolean) => {
    if (!currentIsAuthenticated || !currentUserId) {
      if (notificationsRef.current.length > 0) {
        console.log('NotificationContext: User not authenticated, clearing notifications.');
        setNotifications([]);
        setUnreadCount(0);
      }
      return;
    }
    // console.log(`NotificationContext: Attempting to fetch notifications for user ID: ${currentUserId}`);
    try {
      const response = await api.get(`/notifications/${currentUserId}`);
      const data: Notification[] = response.data;

      // Identify new unread notifications using ref
      const newUnreadNotifications = data.filter(
        n => !n.isRead && !notificationsRef.current.some(existing => existing.id === n.id)
      );

      if (JSON.stringify(notificationsRef.current) !== JSON.stringify(data)) {
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.isRead).length);
        // console.log(`NotificationContext: Successfully fetched ${data.length} notifications.`);
      }

      // Trigger callbacks for new unread notifications
      newUnreadNotifications.forEach(n => {
        notificationCallbacks.current.forEach(callback => callback(n));
      });

    } catch (error) {
      console.error(`NotificationContext: Error fetching notifications for user ID ${currentUserId}:`, error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        console.log('NotificationContext: Received 401 Unauthorized, user might be logged out.');
      } else {
        // showToast('Failed to load notifications.', 'error'); // Suppress to avoid spamming toast
      }
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [showToast]); // Removed notifications dependency

  const markNotificationAsRead = useCallback(async (notificationId: number) => {
    if (!isAuthenticated || !user?.id) {
      console.error('NotificationContext: Cannot mark notification as read, user ID is missing or not authenticated.');
      showToast('Failed to mark notification as read: User not authenticated.', 'error');
      return;
    }
    try {
      // The backend expects /notifications/{userId}/{notificationId} for single notification updates
      await api.put(`/notifications/${user.id}/${notificationId}`);
      // Update state optimistically or refetch
      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      console.log(`NotificationContext: Notification ${notificationId} marked as read for user ${user.id}.`);
    } catch (error) {
      console.error(`NotificationContext: Error marking notification ${notificationId} as read for user ${user.id}:`, error);
      showToast('Failed to mark notification as read.', 'error');
    }
  }, [isAuthenticated, user?.id, showToast]);

  const markAllNotificationsAsRead = useCallback(async () => {
    if (!isAuthenticated || !user?.id) return;
    try {
      await api.put(`/notifications/${user.id}`, { action: 'mark_all_as_read' });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      showToast('All notifications marked as read.', 'success');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      showToast('Failed to mark all notifications as read.', 'error');
    }
  }, [isAuthenticated, user?.id, showToast]);

  const clearAllNotifications = useCallback(async () => {
    if (!isAuthenticated || !user?.id) return;
    try {
      await api.delete(`/notifications/${user.id}`);
      setNotifications([]);
      setUnreadCount(0);
      showToast('All notifications cleared.', 'success');
    } catch (error) {
      console.error('Error clearing all notifications:', error);
      showToast('Failed to clear all notifications.', 'error');
    }
  }, [isAuthenticated, user?.id, showToast]);

  const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    // Only proceed if AuthContext has finished its initial authentication check
    if (!isAuthInitialized) {
      return;
    }

    if (isAuthenticated && user?.id) {
      // Initial fetch
      fetchNotifications(user.id, isAuthenticated);

      const startPolling = () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(() => {
          if (document.visibilityState === 'visible') {
            fetchNotifications(user.id, isAuthenticated);
          }
        }, 30000); // Poll every 30 seconds
      };

      startPolling();

      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          fetchNotifications(user.id, isAuthenticated); // Valid fetch on tab focus
          startPolling();
        } else {
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    } else {
      setNotifications([]);
      setUnreadCount(0);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }, [isAuthenticated, user?.id, fetchNotifications, isAuthInitialized]);

  // Effect to show toast for new unread notifications
  useEffect(() => {
    if (notifications.length > 0) {
      const newUnreadNotifications = notifications.filter(n => !n.isRead && (Date.now() - new Date(n.createdAt).getTime() < 5000)); // Consider "new" if created in last 5 seconds
      newUnreadNotifications.forEach(n => {
        showToast(n.message, 'info', 5000); // Show for 5 seconds
      });
    }
  }, [notifications, showToast]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        fetchNotifications: fetchNotifications, // Ensure the function reference is correct
        markNotificationAsRead,
        markAllNotificationsAsRead,
        clearAllNotifications,
        registerNotificationCallback, // Added new function to context value
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
