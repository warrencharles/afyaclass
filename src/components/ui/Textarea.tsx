import React from 'react';
import { cn } from '../../utils/cn';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  id?: string;
  error?: string;
}

export const Textarea: React.FC<TextareaProps> = ({ label, id, error, className, ...props }) => {
  const textareaId = id || (label ? label.toLowerCase().replace(/\s/g, '-') : undefined);

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={textareaId} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={cn(
          'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-red-500 focus-visible:ring-red-500',
          className
        )}
        {...props}
      />
      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </div>
  );
};
