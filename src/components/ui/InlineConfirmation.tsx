import React, { useState, useEffect, useRef } from 'react';
import { Button } from './Button';
import { XCircle, CheckCircle2, Info } from 'lucide-react';

interface InlineConfirmationProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  countdownSeconds?: number; // Optional: seconds before auto-cancelling
  confirmButtonText?: string;
  cancelButtonText?: string;
  variant?: 'info' | 'warning' | 'danger';
}

export const InlineConfirmation: React.FC<InlineConfirmationProps> = ({
  message,
  onConfirm,
  onCancel,
  countdownSeconds = 0, // Default to 0 seconds (no auto-cancel)
  confirmButtonText = 'Confirm',
  cancelButtonText = 'Cancel',
  variant = 'info',
}) => {
  const [countdown, setCountdown] = useState(countdownSeconds);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const baseClasses = "flex items-center justify-between p-3 rounded-lg border shadow-sm animate-fade-in";
  const textClasses = "text-sm font-medium";
  const iconClasses = "flex-shrink-0";
  let containerColors, iconColors, cancelHoverColors, confirmColors;

  switch (variant) {
    case 'warning':
      containerColors = "bg-yellow-50 border-yellow-200 text-yellow-800";
      iconColors = "text-yellow-600";
      cancelHoverColors = "text-yellow-700 hover:bg-yellow-100 hover:text-yellow-800";
      confirmColors = "bg-yellow-600 hover:bg-yellow-700";
      break;
    case 'danger':
      containerColors = "bg-red-50 border-red-200 text-red-800";
      iconColors = "text-red-600";
      cancelHoverColors = "text-red-700 hover:bg-red-100 hover:text-red-800";
      confirmColors = "bg-red-600 hover:bg-red-700";
      break;
    case 'info':
    default:
      containerColors = "bg-blue-50 border-blue-200 text-blue-800";
      iconColors = "text-blue-600";
      cancelHoverColors = "text-blue-700 hover:bg-blue-100 hover:text-blue-800";
      confirmColors = "bg-blue-600 hover:bg-blue-700";
      break;
  }

  useEffect(() => {
    setCountdown(countdownSeconds);
    if (countdownSeconds > 0) {
      timerRef.current = setTimeout(() => {
        onCancel();
      }, countdownSeconds * 1000);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [countdownSeconds, onCancel]);

  useEffect(() => {
    if (countdownSeconds > 0) {
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [countdownSeconds]);

  return (
    <div className={`${baseClasses} ${containerColors}`}>
      <div className="flex items-center gap-3">
        <Info size={20} className={`${iconClasses} ${iconColors}`} />
        <p className={textClasses}>
          {message}
          {countdownSeconds > 0 && (
            <span className="ml-2 opacity-90">({countdown}s)</span>
          )}
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (timerRef.current) clearTimeout(timerRef.current);
            onCancel();
          }}
          className={cancelHoverColors}
        >
          <XCircle size={16} className="mr-1" />
          {cancelButtonText}
        </Button>
        <Button
          variant={variant === 'danger' ? 'danger' : 'primary'} // Use 'primary' for info/warning, 'danger' for danger
          size="sm"
          onClick={() => {
            if (timerRef.current) clearTimeout(timerRef.current);
            onConfirm();
          }}
          className={confirmColors}
        >
          <CheckCircle2 size={16} className="mr-1" />
          {confirmButtonText}
        </Button>
      </div>
    </div>
  );
};
