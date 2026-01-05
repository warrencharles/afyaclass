import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Menu, X, LogOut, User, Settings, Shield, Bell, Home, BarChart2, XCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal'; // Import the Modal component
import { Alert } from '../ui/Alert'; // Import Alert for error messages
import NotificationIcon from './NotificationIcon'; // Import NotificationIcon

interface AdminNavbarProps {
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
  isMobile: boolean;
  activeTab: string;
}

export const AdminNavbar: React.FC<AdminNavbarProps> = ({ onToggleSidebar, isSidebarOpen, isMobile, activeTab }) => {
  const { user, logout } = useAuth();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [isLogoutPopupOpen, setIsLogoutPopupOpen] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const navigate = useNavigate();

  const toggleProfileDropdown = useCallback(() => {
    setProfileDropdownOpen(prev => !prev);
    setIsLogoutPopupOpen(false); // Close logout popup if profile dropdown is toggled
  }, []);

  const handleProfileClick = useCallback(() => {
    navigate('/admin?tab=profile'); // Navigate to admin profile tab
    setProfileDropdownOpen(false);
  }, [navigate]);

  const handleDashboardClick = useCallback(() => {
    navigate('/admin?tab=dashboard'); // Navigate to admin dashboard tab
    setProfileDropdownOpen(false);
  }, [navigate]);

  const handleLogoutInitiate = useCallback(() => {
    setProfileDropdownOpen(false); // Close profile dropdown
    setIsLogoutPopupOpen(true); // Open custom logout popup
    setLogoutError(null); // Clear any previous errors
  }, []);

  const handleConfirmLogout = useCallback(() => {
    logout().then(() => {
      setIsLogoutPopupOpen(false);
      navigate('/login');
    }).catch((err) => {
      console.error('Logout error:', err);
      setLogoutError('Failed to log out. Please try again.');
    });
  }, [logout, navigate]);

  const handleCancelLogout = useCallback(() => {
    setIsLogoutPopupOpen(false);
    setLogoutError(null);
  }, []);


  return (
    <nav className="bg-gradient-to-r from-gray-800 via-gray-900 to-black shadow-2xl fixed top-0 left-0 right-0 z-50">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Left section: Logo and Sidebar Toggle */}
          <div className="flex items-center">
            {isMobile && (
              <button
                onClick={onToggleSidebar}
                className="text-gray-300 p-2 rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white mr-3 transition-colors"
                aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
              >
                {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            )}
            <Link to="/admin" className="flex items-center text-white group">
              <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center mr-3 shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Shield className="h-6 w-6" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                AFYA ADMIN
              </span>
            </Link>
          </div>

          {/* Center section (optional, for main navigation if needed) */}
          <div className="hidden md:flex items-center space-x-6">
            {/* You can add central navigation items here if desired */}
          </div>

          {/* Right section: User info and dropdown */}
          <div className="flex items-center">
            <div className="hidden sm:flex items-center text-gray-300 mr-4">
              <BarChart2 className="h-4 w-4 mr-2 text-green-400" />
              <span className="font-medium">Admin: {user?.username}</span>
            </div>
            {/* Notification Icon for Admin Desktop */}
            <NotificationIcon />
            <div className="relative">
              <button
                onClick={toggleProfileDropdown}
                className="flex items-center text-white bg-gray-700 px-4 py-2 rounded-xl shadow-lg hover:bg-gray-600 border border-gray-600 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white"
                aria-label="Open admin profile menu"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center mr-2 shadow-md">
                  <User className="h-4 w-4 text-white" />
                </div>
                <span className="font-medium hidden sm:inline">My Account</span>
              </button>

              {profileDropdownOpen && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setProfileDropdownOpen(false)}
                  ></div>

                  {/* Dropdown */}
                  <div className="absolute right-0 z-20 w-56 mt-2 origin-top-right bg-gray-800 rounded-lg shadow-xl border border-gray-700 overflow-hidden">
                    <div className="py-2 px-2">
                      <button
                        onClick={handleDashboardClick}
                        className="flex items-center w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-gray-700 rounded-md transition-colors group"
                      >
                        <div className="p-1.5 rounded-md mr-3 bg-gradient-to-br from-blue-500 to-purple-500 text-white shadow-md group-hover:scale-110 transition-transform">
                          <Home className="h-4 w-4" />
                        </div>
                        Dashboard
                      </button>
                      <button
                        onClick={handleProfileClick}
                        className="flex items-center w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-gray-700 rounded-md transition-colors group"
                      >
                        <div className="p-1.5 rounded-md mr-3 bg-gradient-to-br from-green-500 to-blue-500 text-white shadow-md group-hover:scale-110 transition-transform">
                          <User className="h-4 w-4" />
                        </div>
                        Edit Profile
                      </button>
                      <button
                        onClick={handleLogoutInitiate}
                        className="flex items-center w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-900 rounded-md transition-colors"
                      >
                        <LogOut className="h-4 w-4 mr-3" />
                        Sign out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      <Modal
        isOpen={isLogoutPopupOpen}
        onClose={handleCancelLogout}
        title="Confirm Logout"
        className="max-w-xs"
      >
        <div className="p-4 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <LogOut className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Are you sure you want to sign out?</h3>
          <p className="text-sm text-gray-600 mb-6">You will be securely logged out and need to sign in again to access your account.</p>

          {logoutError && (
            <Alert
              variant="error"
              message={logoutError}
              onClose={() => setLogoutError(null)}
              autoClose
              className="mb-4"
            />
          )}

          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Button
              variant="outline"
              onClick={handleCancelLogout}
              className="order-2 sm:order-1 border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmLogout}
              className="order-1 sm:order-2 bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-md hover:shadow-lg"
            >
              <LogOut size={16} className="mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </Modal>
    </nav>
  );
};
