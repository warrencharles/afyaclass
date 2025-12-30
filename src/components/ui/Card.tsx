import React from 'react';
import { cn } from '../../utils/cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children: React.ReactNode;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(({ className, children, ...props }, ref) => {
  return (
    <div 
      ref={ref}
      className={cn(
        'p-6 rounded-3xl shadow-xl border border-white/20 transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-2xl hover:-translate-y-1', // Added 3D effects
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});

Card.displayName = 'Card';

interface CardHeaderProps {
  className?: string;
  children: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ className, children }) => {
  return (
    <div 
      className={cn(
        'px-6 py-4 border-b border-gray-200/50 bg-gradient-to-r from-gray-50/80 to-white/80 backdrop-blur-sm',
        className
      )}
    >
      {children}
    </div>
  );
};

interface CardTitleProps {
  className?: string;
  children: React.ReactNode;
}

export const CardTitle: React.FC<CardTitleProps> = ({ className, children }) => {
  return (
    <h3 
      className={cn(
        'text-lg font-semibold text-gray-900',
        className
      )}
    >
      {children}
    </h3>
  );
};

interface CardContentProps {
  className?: string;
  children: React.ReactNode;
}

export const CardContent: React.FC<CardContentProps> = ({ className, children }) => {
  return (
    <div 
      className={cn(
        'px-6 py-4',
        className
      )}
    >
      {children}
    </div>
  );
};

interface CardFooterProps {
  className?: string;
  children: React.ReactNode;
}

export const CardFooter: React.FC<CardFooterProps> = ({ className, children }) => {
  return (
    <div 
      className={cn(
        'px-6 py-4 border-t border-gray-200/50 bg-gradient-to-r from-gray-50/80 to-white/80 backdrop-blur-sm',
        className
      )}
    >
      {children}
    </div>
  );
};
