import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';
import { ToastProvider } from './contexts/ToastContext.tsx';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { NotificationProvider } from './contexts/NotificationContext.tsx';
import { ProfileProvider } from './contexts/ProfileContext.tsx'; // Import ProfileProvider
import { AdminProvider } from './contexts/AdminContext.tsx'; // Import AdminProvider
import { ContentProvider } from './contexts/ContentContext.tsx'; // Import ContentProvider
import { useAuth } from './contexts/AuthContext'; // Import useAuth for AdminConditionalProvider

const AdminConditionalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAdmin } = useAuth();
  return isAdmin ? <AdminProvider>{children}</AdminProvider> : <>{children}</>;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <NotificationProvider>
            <ProfileProvider>
              <AdminConditionalProvider>
                <ContentProvider>
                  <App />
                </ContentProvider>
              </AdminConditionalProvider>
            </ProfileProvider>
          </NotificationProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>
);
