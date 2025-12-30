import React, { useState, useCallback, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { BookOpen, LogOut, Sparkles, AlignLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Alert } from '../ui/Alert';
import NotificationIcon from './NotificationIcon';

interface NavbarProps {
  isDashboardSidebarOpen?: boolean;
  toggleDashboardSidebar?: () => void;
  isMobile?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ isDashboardSidebarOpen, toggleDashboardSidebar, isMobile }) => {
  const { isAuthenticated, user, logout } = useAuth();
  const [isLogoutPopupOpen, setIsLogoutPopupOpen] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  const handleLogoutInitiate = useCallback(() => {
    setIsLogoutPopupOpen(true);
    setLogoutError(null);
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

  // Memoize navigation items to prevent unnecessary re-renders
  const navigationItems = useMemo(() => {
    if (!isAuthenticated && !isAuthPage) {
      return [
        { to: '/login', label: 'Login', variant: 'outline' as const },
        { to: '/register', label: 'Create Account', variant: 'primary' as const }
      ];
    }
    return [];
  }, [isAuthenticated, isAuthPage]);

  return (
    <nav className="bg-white/90 backdrop-blur-md shadow-sm border-b border-gray-100 fixed top-0 left-0 right-0 z-[100] transition-all duration-300">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center">
            <Link to="/" className="flex items-center group text-gray-800">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center mr-3 shadow-lg group-hover:scale-110 transition-transform duration-300 bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                <BookOpen className="h-6 w-6" />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                AfyaClass
              </span>
            </Link>
          </div>

          {/* Desktop navigation */}
          <div className="hidden md:flex md:items-center md:space-x-4">
            {isAuthenticated ? (
              <>
                <div className="flex items-center text-gray-600 mr-4">
                  <Sparkles className="h-4 w-4 mr-2 text-yellow-500" />
                  <span className="font-medium">Welcome, {user?.username}</span>
                </div>
                {/* Notification Icon for Desktop */}
                <NotificationIcon />
                <button
                  onClick={handleLogoutInitiate}
                  className="flex items-center text-white bg-gray-700 px-4 py-2 rounded-xl shadow-lg hover:bg-gray-600 border border-gray-600 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </button>
              </>
            ) : (
              <>
                {navigationItems.map((item) => (
                  <Link key={item.to} to={item.to}>
                    <button
                      className={`px-6 py-2 rounded-xl font-bold transition-all duration-300 ${item.variant === 'primary'
                          ? 'neu-pressed text-blue-600 hover:scale-105'
                          : 'neu-pressed text-gray-600 hover:text-blue-600 hover:scale-105'
                        }`}
                    >
                      {item.label}
                    </button>
                  </Link>
                ))}
              </>
            )}
          </div>

          {/* Mobile menu buttons */}
          <div className="flex items-center md:hidden">
            {/* Notification Icon for Mobile */}
            {isAuthenticated && <NotificationIcon />}
            {/* Dashboard Sidebar Toggle Button (Mobile Only) */}
            {isMobile && toggleDashboardSidebar && (
              <button
                onClick={toggleDashboardSidebar}
                className="text-gray-700 p-2 rounded-xl bg-gray-100 hover:bg-gray-200 focus:outline-none transition-all duration-300 shadow-sm mr-2"
                aria-label={isDashboardSidebarOpen ? "Collapse dashboard sidebar" : "Expand dashboard sidebar"}
              >
                <AlignLeft className="h-6 w-6 text-gray-700" />
              </button>
            )}
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
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
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
              className="order-1 sm:order-2 bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-md hover:shadow-lg"
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
