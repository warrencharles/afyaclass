import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Alert } from '../components/ui/Alert';

interface Toast {
  id: string;
  message: string;
  variant: 'success' | 'error' | 'info' | 'warning';
  duration?: number; // in milliseconds, 0 for persistent
}

interface ToastContextType {
  showToast: (message: string, variant?: 'success' | 'error' | 'info' | 'warning', duration?: number) => void;
}

export const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((
    message: string,
    variant: 'success' | 'error' | 'info' | 'warning' = 'info',
    duration: number = 5000 // Default 5 seconds
  ) => {
    console.log(`ToastContext: showToast called with message: "${message}", variant: "${variant}"`);
    const id = Date.now().toString();
    const newToast: Toast = { id, message, variant, duration };
    setToasts((prevToasts) => [...prevToasts, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        console.log(`ToastContext: Removing toast with id: ${id}`);
        setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] space-y-2">
        {toasts.map((toast) => (
          <Alert
            key={toast.id}
            variant={toast.variant}
            message={toast.message}
            onClose={() => removeToast(toast.id)}
            autoClose={toast.duration !== 0}
            duration={toast.duration}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
