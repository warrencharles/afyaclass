import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminNavbar } from '../../components/layout/AdminNavbar';
import { useAuth } from '../../contexts/AuthContext';
import { AdminUsersTab } from './tabs/AdminUsersTab';
import { AdminClassesTab } from './tabs/AdminClassesTab';
import { AdminClassLevelsTab } from './tabs/AdminClassLevelsTab';
import { AdminSubjectsTab } from './tabs/AdminSubjectsTab';
import { AdminContentTab } from './tabs/AdminContentTab';
import { AdminAdvertisementsTab } from './tabs/AdminAdvertisementsTab';
import AdminPaymentsTab from './tabs/AdminPaymentsTab';
import { AdminForumTab } from './tabs/AdminForumTab'; // Import AdminForumTab
import AdminQueriesTab from './tabs/AdminQueriesTab'; // Import AdminQueriesTab
import { Users, BookOpen, Layers, GraduationCap, FileText, Image, Home, User, Settings, LogOut, Menu, X, ChevronLeft, ChevronRight, Shield, UserCog, Bell, DollarSign, MessageSquare, MessageCircleQuestion } from 'lucide-react'; // Removed Video icon
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert'; // Import Alert for error messages
import { AdminProfilePage } from './AdminProfilePage';
import { AdminDashboardPage } from './AdminDashboardPage';
import { fetchUnreadChatConversationsCount } from '../../utils/api'; // Import API function to fetch unread conversations count

type AdminTab = 'dashboard' | 'users' | 'classes' | 'classLevels' | 'subjects' | 'content' | 'advertisements' | 'payments' | 'forum' | 'queries' | 'profile'; // Reverted 'manageContent' to 'content' and removed 'uploadContent'

export const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [unreadQueriesCount, setUnreadQueriesCount] = useState(0); // State for unread queries count

  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isConfirmLogoutOpen, setIsConfirmLogoutOpen] = useState(false); // State for logout confirmation modal
  const [logoutError, setLogoutError] = useState<string | null>(null); // State for logout error

  // Get active tab from URL query parameter
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab') as AdminTab;
    if (tab && tabs.some(t => t.id === tab)) {
      setActiveTab(tab);
    }
  }, [location.search]);

  // Handle window resize for responsive behavior
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);

      if (mobile) {
        setIsSidebarOpen(false); // Mobile: sidebar closed by default
      } else {
        setIsSidebarOpen(true); // Desktop: sidebar open by default
      }
    };

    handleResize(); // Set initial state
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Toggle sidebar function
  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen(prev => !prev);
  }, []);

  // Close sidebar when clicking overlay (mobile only)
  const closeSidebar = useCallback(() => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  }, [isMobile]);

  const handleLogoutInitiate = useCallback(() => {
    setIsConfirmLogoutOpen(true); // Open logout confirmation modal
    setLogoutError(null); // Clear any previous errors
  }, []);

  const handleConfirmLogout = useCallback(() => {
    logout().then(() => {
      setIsConfirmLogoutOpen(false);
      navigate('/login');
    }).catch((err) => {
      console.error('Logout error:', err);
      setLogoutError('Failed to log out. Please try again.');
    });
  }, [logout, navigate]);

  const handleCancelLogout = useCallback(() => {
    setIsConfirmLogoutOpen(false);
    setLogoutError(null);
  }, []);

  // Fetch unread queries count
  useEffect(() => {
    const getUnreadCount = async () => {
      try {
        const count = await fetchUnreadChatConversationsCount();
        setUnreadQueriesCount(count);
      } catch (err) {
        console.error('Failed to fetch unread chat conversations count:', err);
      }
    };

    getUnreadCount();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        getUnreadCount();
      }
    }, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const tabs = [
    { id: 'dashboard' as AdminTab, label: 'Dashboard', icon: Home, description: 'Comprehensive analytics overview' },
    { id: 'users' as AdminTab, label: 'Users', icon: Users, description: 'Manage user accounts and permissions' },
    { id: 'classes' as AdminTab, label: 'Classes', icon: BookOpen, description: 'Manage class types and programs' },
    { id: 'classLevels' as AdminTab, label: 'Class Levels', icon: Layers, description: 'Manage class levels and semesters' },
    { id: 'subjects' as AdminTab, label: 'Subjects', icon: GraduationCap, description: 'Manage subjects for each class level' },
    { id: 'content' as AdminTab, label: 'Content', icon: FileText, description: 'Manage learning materials and resources' }, // Reverted to 'content'
    { id: 'advertisements' as AdminTab, label: 'Advertisements', icon: Image, description: 'Manage promotional content and banners' },
    { id: 'payments' as AdminTab, label: 'Payment Management', icon: DollarSign, description: 'Review proofs, monitor logs, and grant access' },
    { id: 'forum' as AdminTab, label: 'Forum', icon: MessageSquare, description: 'Manage forum discussions and topics' },
    { id: 'queries' as AdminTab, label: 'Queries', icon: MessageCircleQuestion, description: 'Review user chat queries', notificationCount: unreadQueriesCount },
    { id: 'profile' as AdminTab, label: 'Profile', icon: User, description: 'Manage your personal details' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <AdminDashboardPage />;
      case 'users':
        return <AdminUsersTab />;
      case 'classes':
        return <AdminClassesTab />;
      case 'classLevels':
        return <AdminClassLevelsTab />;
      case 'subjects':
        return <AdminSubjectsTab />;
      case 'content': // Reverted case
        return <AdminContentTab />;
      case 'advertisements':
        return <AdminAdvertisementsTab />;
      case 'payments':
        return <AdminPaymentsTab />;
      case 'forum':
        return <AdminForumTab />;
      case 'queries':
        return <AdminQueriesTab />;
      case 'profile':
        return <AdminProfilePage />;
      default:
        return <AdminDashboardPage />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <AdminNavbar
        onToggleSidebar={toggleSidebar}
        isSidebarOpen={isSidebarOpen}
        isMobile={isMobile}
        activeTab={activeTab}
      />


      <div className="flex flex-1 relative pt-16"> {/* Added pt-16 to account for fixed navbar height */}
        {/* Sidebar */}
        <aside className={`
          fixed top-[4.5rem] bottom-0 left-0 
          ${isMobile && !isSidebarOpen ? '-translate-x-full' : 'translate-x-0'}
          ${isMobile ? 'z-30' : 'z-10'}
          ${isMobile ? 'w-80' : (isSidebarOpen ? 'w-80' : 'w-20')}
          bg-white/95 backdrop-blur-lg shadow-2xl border-r border-white/20 
          transition-all duration-300 ease-in-out
          flex flex-col
        `}>
          {/* Sidebar Header */}
          <div className="p-6 border-b border-gray-200/50">
            <div className="flex items-center justify-between">
              {(isSidebarOpen || isMobile) && (
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg mr-4">
                    <Shield className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">Admin Panel</h2>
                    <p className="text-sm text-gray-500">System Management</p>
                  </div>
                </div>
              )}

              {/* Desktop Toggle Button */}
              {!isMobile && (
                <button
                  onClick={toggleSidebar}
                  className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors"
                  aria-label={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
                >
                  {isSidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                </button>
              )}

              {/* Mobile Close Button */}
              {isMobile && (
                <button
                  onClick={closeSidebar}
                  className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors ml-auto"
                  aria-label="Close sidebar"
                >
                  <X size={20} />
                </button>
              )}
            </div>
          </div>

          {/* Admin Tabs */}
          <nav className="flex-1 p-4 overflow-y-auto">
            <div className="space-y-2 mb-6">
              <h3 className={`text-xs font-semibold text-gray-500 uppercase tracking-wider ${!isSidebarOpen && !isMobile ? 'text-center' : ''}`}>
                {(isSidebarOpen || isMobile) ? 'Management' : 'Mgmt'}
              </h3>
              <div className="space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id);
                        navigate(`/admin?tab=${tab.id}`); // Update URL on tab change
                        if (isMobile) setIsSidebarOpen(false);
                      }}
                      className={`flex items-center w-full px-4 py-3 text-left transition-all duration-300 rounded-2xl group ${!isSidebarOpen && !isMobile ? 'justify-center' : ''
                        } ${activeTab === tab.id
                          ? 'bg-gradient-to-r from-primary-500 to-blue-600 text-white shadow-lg transform scale-105'
                          : 'text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                      <div className={`relative p-2 rounded-xl ${!isSidebarOpen && !isMobile ? '' : 'mr-4'} ${activeTab === tab.id
                        ? 'bg-white/20'
                        : 'bg-gradient-to-br from-primary-500 to-blue-600 text-white shadow-md group-hover:scale-110 transition-transform'
                        }`}>
                        <Icon size={20} />
                        {tab.notificationCount && tab.notificationCount > 0 && (
                          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                            {tab.notificationCount}
                          </span>
                        )}
                      </div>
                      {(isSidebarOpen || isMobile) && (
                        <div className="min-w-0 flex-1">
                          <span className="font-medium text-base block">{tab.label}</span>
                          <span className={`text-xs ${activeTab === tab.id ? 'text-white/80' : 'text-gray-500'}`}>
                            {tab.description}
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </nav>

          {/* Logout Button - Fixed at bottom */}
          <div className="p-4 border-t border-gray-200/50 bg-white/50 backdrop-blur-sm">
            <button
              onClick={() => {
                if (isMobile) setIsSidebarOpen(false); // Close sidebar on mobile if logout is initiated
                handleLogoutInitiate();
              }}
              className="flex items-center w-full px-4 py-3 text-left text-red-600 transition-all duration-300 rounded-2xl hover:bg-red-50 group"
            >
              <div className="p-2 rounded-xl mr-4 bg-gradient-to-br from-red-500 to-pink-500 text-white shadow-md group-hover:scale-110 transition-transform">
                <LogOut size={20} />
              </div>
              {(isSidebarOpen || isMobile) && (
                <span className="font-medium text-base">Logout</span>
              )}
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className={`flex-1 overflow-hidden relative z-0 transition-all duration-300 ease-in-out
          ${isMobile ? 'ml-0' : (isSidebarOpen ? 'ml-80' : 'ml-20')}
        `}>
          {/* Mobile Toggle Button (hidden as it's now in AdminNavbar) */}
          {/* {isMobile && (
            <div className="fixed top-4 left-4 z-20">
              <button 
                onClick={toggleSidebar} 
                className="p-3 rounded-2xl bg-white/95 backdrop-blur-sm text-gray-700 hover:shadow-xl transition-all duration-300 shadow-lg border border-white/30 hover:scale-105"
                aria-label={isSidebarOpen ? "Close menu" : "Open menu"}
              >
                {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          )} */}

          <div className="h-full overflow-y-auto relative">
            <div className="p-6">
              <div className="max-w-7xl mx-auto">
                {/* Admin Header */}
                <div className="mb-8 bg-white/90 backdrop-blur-lg p-6 rounded-3xl shadow-xl border border-white/20 relative z-0">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center">
                        <div className="bg-red-100 p-3 rounded-2xl mr-4 flex-shrink-0">
                          <Shield className="h-8 w-8 text-red-600" />
                        </div>
                        <div className="min-w-0">
                          <h1 className="text-3xl font-bold text-gray-900 mb-2 truncate">Admin Dashboard</h1>
                          <p className="text-gray-600 flex items-center text-lg">
                            <UserCog className="w-5 h-5 mr-2 text-red-600 flex-shrink-0" />
                            <span className="mr-3">Welcome, {user?.username}</span>
                            <span className="text-gray-400 mx-2">|</span>
                            <span className="text-red-600 font-medium">System Administrator</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Current Tab</p>
                        <p className="font-semibold text-gray-800">
                          {tabs.find(tab => tab.id === activeTab)?.label}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tab Content */}
                <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-xl border border-white/20">
                  <div className="p-6">
                    {renderTabContent()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Settings Modal */}
      <Modal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        title="Admin Settings"
        size="2xl"
      >
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-pink-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Settings size={40} className="text-white" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-3">System Settings</h3>
          <p className="text-gray-500 mb-8">Configure system-wide settings and preferences</p>

          <div className="space-y-4 text-left">
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="font-medium text-gray-800 mb-2">User Management</h4>
              <p className="text-sm text-gray-600">Configure user registration and access controls</p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="font-medium text-gray-800 mb-2">Content Settings</h4>
              <p className="text-sm text-gray-600">Manage content upload limits and file types</p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="font-medium text-gray-800 mb-2">System Maintenance</h4>
              <p className="text-sm text-gray-600">Database cleanup and system optimization</p>
            </div>
          </div>

          <div className="flex justify-center mt-8">
            <Button onClick={() => setIsSettingsModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Logout Confirmation Modal */}
      <Modal
        isOpen={isConfirmLogoutOpen}
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
    </div>
  );
};
