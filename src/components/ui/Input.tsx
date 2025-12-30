import React, { forwardRef, ReactNode } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
  icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, fullWidth = false, className = '', icon, id, ...props }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const errorId = `${inputId}-error`;

    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {label && (
          <label 
            htmlFor={inputId} 
            className="block text-sm font-semibold text-gray-700 mb-2"
          >
            {label}
            {props.required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`
              px-4 py-3 bg-white/80 backdrop-blur-sm border-2 shadow-lg border-gray-200 
              placeholder-gray-400 focus:outline-none focus:border-primary-500 
              focus:ring-4 focus:ring-primary-200 block rounded-2xl sm:text-sm 
              transition-all duration-300
              ${icon ? 'pl-12' : ''}
              ${error ? 'border-error-500 focus:border-error-500 focus:ring-error-200' : ''}
              ${fullWidth ? 'w-full' : ''}
              ${className}
            `}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? errorId : undefined}
            {...props}
          />
        </div>
        {error && (
          <p id={errorId} className="mt-2 text-sm text-error-500 flex items-center" role="alert">
            <span className="w-1 h-1 bg-error-500 rounded-full mr-2"></span>
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';