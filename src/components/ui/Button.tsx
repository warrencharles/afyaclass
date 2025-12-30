import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  fullWidth?: boolean;
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  fullWidth = false,
  isLoading = false,
  className = '',
  disabled,
  ...props
}) => {
  const variants = {
    primary: 'bg-gradient-to-r from-primary-500 to-blue-600 text-white hover:from-primary-600 hover:to-blue-700 focus:ring-primary-500',
    secondary: 'bg-gradient-to-r from-secondary-600 to-indigo-700 text-white hover:from-secondary-700 hover:to-indigo-800 focus:ring-secondary-500',
    outline: 'bg-white/80 backdrop-blur-sm border-2 border-primary-500 text-primary-500 hover:bg-primary-50 focus:ring-primary-500',
    ghost: 'bg-white/50 backdrop-blur-sm hover:bg-white/80 text-gray-700 focus:ring-gray-500',
    danger: 'bg-gradient-to-r from-error-500 to-red-600 text-white hover:from-error-600 hover:to-red-700 focus:ring-error-500',
    success: 'bg-gradient-to-r from-success-500 to-emerald-600 text-white hover:from-success-600 hover:to-emerald-700 focus:ring-success-500',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs rounded-lg',
    md: 'px-4 py-2 text-sm rounded-xl',
    lg: 'px-6 py-3 text-base rounded-2xl',
  };

  const baseClasses = `
    font-semibold transition-all duration-300 
    focus:outline-none focus:ring-4 focus:ring-offset-2 
    shadow-lg hover:shadow-xl transform hover:-translate-y-0.5
    disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none disabled:hover:transform-none
  `;

  return (
    <button
      disabled={disabled || isLoading}
      className={`
        ${baseClasses}
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {isLoading ? (
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-current border-b-transparent mr-2"></div>
          Loading...
        </div>
      ) : (
        <span className="flex items-center justify-center">
          {children}
        </span>
      )}
    </button>
  );
};
