import React, { Fragment, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom'; // Import ReactDOM
import { cn } from '../../utils/cn';
import { X, Sparkles } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full'; // Added 'full' size
  contentPaddingClass?: string; // New prop for content padding
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className,
  size = 'lg',
  contentPaddingClass,
}) => {
  const effectiveContentPaddingClass = size === 'full' ? '' : (contentPaddingClass || 'p-4');
  const modalRef = useRef<HTMLDivElement>(null);

  // Size mappings with proper responsive widths
  const sizeClasses = {
    sm: 'w-full max-w-sm',
    md: 'w-full max-w-md',
    lg: 'w-full max-w-lg',
    xl: 'w-full max-w-xl',
    '2xl': 'w-full max-w-2xl',
    '3xl': 'w-full max-w-3xl',
    '4xl': 'w-full max-w-4xl',
    '5xl': 'w-full max-w-5xl',
    full: 'w-full max-w-7xl', // Changed to max-w-7xl for a large, but not full-screen, modal
  };

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('mousedown', handleClickOutside);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
      // Restore body scroll when modal closes
      document.body.style.overflow = 'unset';
      document.documentElement.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <Fragment>
      {/* Backdrop - Fixed positioning with proper z-index and flex for centering */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300 flex items-center justify-center"
        aria-hidden="true"
      >
        {/* Modal Container - Centered and height determined by content */}
        <div
          ref={modalRef}
          tabIndex={-1} // Make the modal container focusable
          className={cn(
            'relative z-50 flex flex-col focus:outline-none', // Add focus-outline-none for better UX
            size === 'full'
              ? 'max-h-[90vh] w-full max-w-7xl bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden'
              : 'max-h-[90vh] bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden',
            sizeClasses[size],
            className
          )}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'modal-title' : undefined}
        >
          {/* Header - Fixed at top */}
          {title && (
            <div className="flex-shrink-0 flex items-center justify-between px-4 pt-8 pb-4 border-b border-gray-200"> {/* Adjusted padding for title to add more space */}
              <h3 id="modal-title" className="text-lg font-semibold text-gray-900">
                {title}
              </h3>
              <button
                onClick={onClose}
                className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all duration-200"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>
          )}

            {/* Content */}
            <div className={cn('overflow-y-auto flex-grow', contentPaddingClass)}> {/* Reverted to flex-grow */}
              {children}
            </div>
        </div> {/* Closing div for Modal Container */}
      </div> {/* Closing div for Backdrop */}
    </Fragment>,
    document.body // Render the modal directly into the body
  );
};
