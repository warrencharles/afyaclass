import React, { Fragment, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { cn } from '../../utils/cn';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full';
  contentPaddingClass?: string;
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
  const modalRef = useRef<HTMLDivElement>(null);

  // Size mappings - ensuring it's not "too large" by default but responsive
  const sizeClasses = {
    sm: 'w-[95%] md:w-full max-w-sm',
    md: 'w-[95%] md:w-full max-w-md',
    lg: 'w-[95%] md:w-full max-w-lg',
    xl: 'w-[95%] md:w-full max-w-xl',
    '2xl': 'w-[95%] md:w-full max-w-2xl',
    '3xl': 'w-[95%] md:w-full max-w-3xl',
    '4xl': 'w-[95%] md:w-full max-w-4xl',
    '5xl': 'w-[95%] md:w-full max-w-5xl',
    full: 'w-[98%] max-w-[95vw]',
  };

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <Fragment>
      {/* Backdrop with blur and smooth fade */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] transition-all duration-300 flex items-center justify-center p-4"
        aria-hidden="true"
      >
        {/* Modal Container */}
        <div
          ref={modalRef}
          className={cn(
            'relative bg-white rounded-3xl shadow-2xl shadow-blue-900/20 border border-white/60 flex flex-col max-h-[85vh] animate-in zoom-in-95 fade-in duration-200',
            sizeClasses[size],
            className
          )}
          role="dialog"
          aria-modal="true"
        >
          {/* Header - Elegant & Clean */}
          {title && (
            <div className="flex-shrink-0 flex items-center justify-between px-6 py-5 border-b border-slate-100/80">
              <h3 className="text-xl font-black text-slate-800 tracking-tight">
                {title}
              </h3>
              <button
                onClick={onClose}
                className="group p-2 rounded-full bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all active:scale-95"
                title="Close"
              >
                <X size={20} className="transition-transform group-hover:rotate-90" />
              </button>
            </div>
          )}

          {/* Content - Scrollable if needed */}
          <div className={cn(
            'flex-grow overflow-y-auto custom-scrollbar',
            contentPaddingClass || 'p-6 md:p-8' // Increased default padding for "Classic" look
          )}>
            {children}
          </div>
        </div>
      </div>
    </Fragment>,
    document.body
  );
};
