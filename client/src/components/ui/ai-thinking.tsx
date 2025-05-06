import React from 'react';
import { cn } from '@/lib/utils';
import { Spinner } from './spinner';
import { Brain } from 'lucide-react';

type AIThinkingSize = 'sm' | 'md' | 'lg';
type AIThinkingMode = 'minimal' | 'standard' | 'detailed';

interface AIThinkingProps {
  message?: string;
  mode?: AIThinkingMode;
  size?: AIThinkingSize;
  className?: string;
}

export function AIThinking({
  message = 'Processing...',
  mode = 'standard',
  size = 'md',
  className
}: AIThinkingProps) {
  const sizeMap: Record<AIThinkingSize, string> = {
    sm: 'h-8 text-xs',
    md: 'h-12 text-sm',
    lg: 'h-16 text-base',
  };

  const iconSizeMap: Record<AIThinkingSize, any> = {
    sm: 'xs',
    md: 'sm',
    lg: 'md',
  };

  const renderMinimal = () => (
    <div className={cn(
      'flex items-center gap-2',
      sizeMap[size],
      className
    )}>
      <Spinner size={iconSizeMap[size]} />
      <span className="text-muted-foreground">{message}</span>
    </div>
  );

  const renderStandard = () => (
    <div className={cn(
      'flex items-center justify-center gap-3 border border-border rounded-md px-4 py-2 bg-background/80',
      sizeMap[size],
      className
    )}>
      <Spinner size={iconSizeMap[size]} variant="pulse" />
      <span className="font-medium text-foreground/90">{message}</span>
    </div>
  );

  const renderDetailed = () => (
    <div className={cn(
      'flex flex-col items-center justify-center border border-primary/30 rounded-lg px-5 py-3 bg-primary/5',
      'shadow-sm',
      className
    )}>
      <div className="flex items-center gap-2 mb-2">
        <Brain className={cn(
          'text-primary',
          size === 'sm' ? 'h-4 w-4' : size === 'md' ? 'h-5 w-5' : 'h-6 w-6'
        )} />
        <span className={cn(
          'font-semibold',
          size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base'
        )}>Clara AI</span>
      </div>
      
      <div className="flex items-center gap-3">
        <Spinner size={iconSizeMap[size]} variant="dots" />
        <span className={cn(
          'text-muted-foreground',
          size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base'
        )}>
          {message}
        </span>
      </div>
    </div>
  );

  switch (mode) {
    case 'minimal':
      return renderMinimal();
    case 'detailed':
      return renderDetailed();
    case 'standard':
    default:
      return renderStandard();
  }
}