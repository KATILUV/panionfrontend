import React from 'react';
import { cn } from '../../lib/utils';

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'dots' | 'pulse';
}

export const Spinner = ({ size = 'md', variant = 'default', className, ...props }: SpinnerProps) => {
  const sizeClasses = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-10 w-10',
  };

  // Different spinner variants
  if (variant === 'dots') {
    return (
      <div className={cn("flex items-center justify-center space-x-1", className)} {...props}>
        <div className={`${sizeClasses[size]} animate-pulse rounded-full bg-primary`}></div>
        <div className={`${sizeClasses[size]} animate-pulse rounded-full bg-primary delay-75`}></div>
        <div className={`${sizeClasses[size]} animate-pulse rounded-full bg-primary delay-150`}></div>
      </div>
    );
  }

  if (variant === 'pulse') {
    return (
      <div 
        className={cn(
          "inline-block rounded-full bg-primary animate-ping opacity-75", 
          sizeClasses[size],
          className
        )}
        {...props}
        role="status"
        aria-label="loading"
      >
        <span className="sr-only">Loading...</span>
      </div>
    );
  }

  // Default spinner
  return (
    <div
      className={cn(
        "inline-block animate-spin rounded-full border-2 border-current border-t-transparent text-primary",
        sizeClasses[size],
        className
      )}
      {...props}
      role="status"
      aria-label="loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
};