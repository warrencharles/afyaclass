import React, { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../../contexts/NotificationContext';
import { BellIcon, Trash2 } from 'lucide-react'; // Assuming Heroicons are available, adding Trash2 for clear all
import { formatDistanceToNow } from 'date-fns'; // For time formatting
import { Link } from 'react-router-dom'; // For linking to entities

const NotificationIcon: React.FC = () => {
  const { notifications, unreadCount, markNotificationAsRead, markAllNotificationsAsRead, clearAllNotifications } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleDropdown = () => {
    setIsOpen(prev => !prev);
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleMarkAllRead = async () => {
    await markAllNotificationsAsRead();
    // setIsOpen(false); // Keep dropdown open for user to see changes or clear
  };

  const handleClearAll = async () => {
    await clearAllNotifications();
    setIsOpen(false); // Close dropdown after clearing all
  };

  const getNotificationLink = (notification: any) => {
    if (notification.entityType === 'payment_request' && notification.entityId) {
      return `/admin/payment-requests/${notification.entityId}`; // Assuming admin route for payment requests
    }
    if (notification.entityType === 'user_query' && notification.entityId) {
      return `/admin/user-queries/${notification.entityId}`; // Assuming admin route for user queries
    }
    // Add more entity types and their respective routes as needed
    return '#'; // Default to no specific link
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        className="relative p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white"
        aria-label="Notifications"
      >
        <BellIcon className="h-6 w-6" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full animate-bounce">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
          <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="notification-menu">
          <div className="flex justify-between items-center px-4 py-2 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Notifications</h3>
            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Mark all as read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="text-sm text-red-600 hover:text-red-800 flex items-center"
                  title="Clear all notifications"
                >
                  <Trash2 className="h-4 w-4 mr-1" /> Clear all
                </button>
              )}
            </div>
          </div>
            {notifications.length === 0 ? (
              <p className="text-gray-500 px-4 py-2">No new notifications.</p>
            ) : (
              <ul className="max-h-60 overflow-y-auto">
                {notifications.map(notification => (
                  <li
                    key={notification.id}
                    className={`px-4 py-2 border-b border-gray-200 last:border-b-0 ${
                      !notification.isRead ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'
                    }`}
                  >
                    <Link to={getNotificationLink(notification)} onClick={() => markNotificationAsRead(notification.id)} className="block">
                      <div className="flex justify-between items-start">
                        <p className={`text-sm ${!notification.isRead ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                          {notification.message}
                        </p>
                        {!notification.isRead && (
                          <button
                            onClick={(e) => { e.preventDefault(); markNotificationAsRead(notification.id); }}
                            className="ml-2 text-xs text-blue-500 hover:text-blue-700 flex-shrink-0"
                            title="Mark as read"
                          >
                            &#10003; {/* Checkmark icon */}
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationIcon;
