import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type SpinnerVariant = 'default' | 'dots' | 'pulse';

interface SpinnerProps {
  variant?: SpinnerVariant;
  size?: SpinnerSize;
  className?: string;
  text?: string;
}

export function Spinner({ 
  variant = 'default', 
  size = 'md', 
  className,
  text
}: SpinnerProps) {
  const sizeMap: Record<SpinnerSize, string> = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12',
  };

  const textSizeMap: Record<SpinnerSize, string> = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg',
  };

  // Container conditional styles
  const containerClasses = cn(
    'flex items-center justify-center',
    text && 'flex-col gap-2',
    className
  );

  // Render different spinner types based on variant
  const renderSpinner = () => {
    switch (variant) {
      case 'dots':
        return (
          <div className="flex space-x-1.5">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  'rounded-full bg-current animate-pulse',
                  sizeMap[size].replace('w-', 'w-[').replace('h-', 'h-[') + ']'
                )}
                style={{ 
                  animationDelay: `${i * 0.15}s`,
                  animationDuration: '0.9s'
                }}
              />
            ))}
          </div>
        );
      
      case 'pulse':
        return (
          <div className="relative">
            <div 
              className={cn(
                'absolute top-0 left-0 rounded-full border-2 border-current opacity-75',
                sizeMap[size],
                'animate-ping'
              )}
            />
            <div 
              className={cn(
                'relative rounded-full border-2 border-current opacity-90',
                sizeMap[size]
              )}
            />
          </div>
        );
      
      case 'default':
      default:
        return (
          <Loader2 
            className={cn(
              sizeMap[size],
              'animate-spin'
            )} 
          />
        );
    }
  };

  return (
    <div className={containerClasses}>
      {renderSpinner()}
      {text && (
        <span className={cn(
          'text-muted-foreground animate-pulse',
          textSizeMap[size]
        )}>
          {text}
        </span>
      )}
    </div>
  );
}