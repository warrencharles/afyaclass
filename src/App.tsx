import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, Outlet, useOutletContext } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { RegisterSuccessPage } from './pages/auth/RegisterSuccessPage';
import { VerifyEmailPage } from './pages/auth/VerifyEmailPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { DashboardProfilePage } from './pages/dashboard/DashboardProfilePage';
import { AdminPage } from './pages/admin/AdminPage';
import { ForumPage } from './pages/forum/ForumPage';
import { DiscussionDetailPage } from './pages/forum/DiscussionDetailPage';
import { PaymentStatusPage } from './pages/dashboard/PaymentStatusPage';
import { fetchAdvertisements } from './utils/api';
import { Advertisement } from './types';
import ProtectedRoute from './components/ProtectedRoute';

import { DashboardContent as ActualDashboardContent, DashboardOutletContext } from './components/dashboard/DashboardContent';

const DashboardContent: React.FC = () => {
  const outletContext = useOutletContext<DashboardOutletContext>();
  return <ActualDashboardContent {...outletContext} />;
};

export interface ExtendedDashboardOutletContext extends DashboardOutletContext {
  advertisements: Advertisement[];
}

const AppRoutes: React.FC = () => {
  const { isAuthenticated, isAdmin, user, isAuthInitialized } = useAuth();
  const location = useLocation();

  console.log('AppRoutes: Rendered. isAuthInitialized (from AuthContext):', isAuthInitialized, 'isAuthenticated:', isAuthenticated, 'User:', user?.id, 'Location:', location.pathname);

  useEffect(() => {
    console.log('AppRoutes: useEffect [location] triggered. Path:', location.pathname);
    const titles: Record<string, string> = {
      '/': 'AFYA CLASS HUB | Health Science E-Learning Platform',
      '/login': 'Login | AFYA CLASS HUB',
      '/register': 'Register | AFYA CLASS HUB',
      '/dashboard': 'Dashboard | AFYA CLASS HUB',
      '/admin': 'Admin Panel | AFYA CLASS HUB'
    };

    document.title = titles[location.pathname] || 'AFYA CLASS HUB';
    const timer = setTimeout(() => {
      window.scrollTo(0, 0);
    }, 100);

    return () => clearTimeout(timer);
  }, [location]);

  if (!isAuthInitialized) {
    console.log('AppRoutes: Displaying loading spinner. isAuthInitialized:', isAuthInitialized);
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="flex flex-col items-center">
          <svg className="animate-spin h-10 w-10 text-primary-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-lg text-gray-700">Loading application data...</p>
        </div>
      </div>
    );
  }
  console.log('AppRoutes: Rendering main application routes. isAuthInitialized:', isAuthInitialized);

  return (
    <>
      <Routes>
        {/* Public routes */}
        <Route
          path="/"
          element={
            isAuthenticated
              ? (isAdmin ? <Navigate to="/admin" replace /> : <Navigate to="/dashboard" replace />)
              : <HomePage />
          }
        />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/register-success" element={<RegisterSuccessPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Protected routes */}
        <Route path="/dashboard/*" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} >
          <Route index element={<DashboardContent />} />
          <Route path="profile" element={<DashboardProfilePage />} />
          <Route path="forum" element={<ForumPage />} />
          <Route path="forum/:id" element={<DiscussionDetailPage />} />
          <Route path="payment-status" element={<PaymentStatusPage />} />
        </Route>
        <Route
          path="/admin"
          element={
            <ProtectedRoute requireAdmin={true}>
              <AdminPage />
            </ProtectedRoute>
          }
        />
        {/* Catch-all for unauthenticated users */}
        <Route
          path="*"
          element={
            isAuthenticated
              ? null
              : <Navigate to="/" replace />
          }
        />
      </Routes>
    </>
  );
};

let appRenderCount = 0;
function App() {
  appRenderCount++;
  console.log(`App component rendered ${appRenderCount} times.`);
  return (
    <AppRoutes />
  );
}

export default App;
