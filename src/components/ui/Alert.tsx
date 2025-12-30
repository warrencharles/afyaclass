import React, { useState, useEffect } from 'react';
import { cn } from '../../utils/cn';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X, Sparkles } from 'lucide-react';

type AlertVariant = 'success' | 'error' | 'warning' | 'info';

interface AlertProps {
  variant: AlertVariant;
  title?: string;
  message: string;
  onClose?: () => void;
  autoClose?: boolean;
  duration?: number;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  variant,
  title,
  message,
  onClose,
  autoClose = false,
  duration = 5000,
  className,
}) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(() => {
        setVisible(false);
        if (onClose) onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [autoClose, duration, onClose]);

  const handleClose = () => {
    setVisible(false);
    if (onClose) onClose();
  };

  if (!visible) return null;

  const variantClasses = {
    success: 'bg-success-100 border-success-500 text-success-800',
    error: 'bg-error-100 border-error-500 text-error-800',
    warning: 'bg-warning-100 border-warning-500 text-warning-800',
    info: 'bg-secondary-100 border-secondary-500 text-secondary-800',
  };

  const variantIcons = {
    success: <CheckCircle className="h-5 w-5 text-success-600" />,
    error: <AlertCircle className="h-5 w-5 text-error-600" />,
    warning: <AlertTriangle className="h-5 w-5 text-warning-600" />,
    info: <Info className="h-5 w-5 text-secondary-600" />,
  };

  return (
    <div
      className={cn(
        'border-l-4 p-4 rounded-2xl animate-fadeIn shadow-lg',
        variantClasses[variant],
        className
      )}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0 p-2 rounded-xl bg-white/70 shadow-md">
          {variantIcons[variant]}
        </div>
        <div className="ml-4 flex-1">
          {title && (
            <h3 className="text-sm font-semibold mb-1 flex items-center">
              {title}
              <Sparkles className="w-3 h-3 ml-2 opacity-60" />
            </h3>
          )}
          <div className="text-sm leading-relaxed">{message}</div>
        </div>
        {onClose && (
          <button
            onClick={handleClose}
            className="ml-auto flex-shrink-0 p-2 rounded-xl text-gray-400 hover:text-gray-500 hover:bg-white focus:outline-none transition-all duration-200 shadow-md"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};
