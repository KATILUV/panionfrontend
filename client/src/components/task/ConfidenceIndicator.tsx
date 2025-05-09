import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ConfidenceIndicatorProps {
  score: number; // 0 to 1
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  tooltipText?: string;
}

interface ConfidenceBadgeProps {
  score: number; // 0 to 1
  size?: 'sm' | 'md' | 'lg';
  tooltipText?: string;
}

export const ConfidenceIndicator: React.FC<ConfidenceIndicatorProps> = ({
  score,
  showLabel = true,
  size = 'md',
  tooltipText
}) => {
  // Normalize score between 0 and 1
  const normalizedScore = Math.max(0, Math.min(1, score));
  
  // Convert to percentage for display
  const percent = Math.round(normalizedScore * 100);
  
  // Determine size variables
  const sizeClasses = {
    sm: 'h-1.5 w-20',
    md: 'h-2 w-28',
    lg: 'h-3 w-40'
  };
  
  // Determine color based on confidence level
  const getColor = () => {
    if (normalizedScore >= 0.75) return 'bg-green-500';
    if (normalizedScore >= 0.5) return 'bg-yellow-500';
    if (normalizedScore >= 0.25) return 'bg-orange-500';
    return 'bg-red-500';
  };
  
  // Get label text based on confidence level
  const getLabel = () => {
    if (normalizedScore >= 0.75) return 'High';
    if (normalizedScore >= 0.5) return 'Medium';
    if (normalizedScore >= 0.25) return 'Low';
    return 'Very Low';
  };
  
  const indicator = (
    <div className="flex flex-col gap-1">
      <div className={cn("relative bg-muted rounded-full overflow-hidden", sizeClasses[size])}>
        <div
          className={cn("absolute left-0 top-0 h-full rounded-full", getColor())}
          style={{ width: `${percent}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{getLabel()}</span>
          <span>{percent}%</span>
        </div>
      )}
    </div>
  );
  
  // If tooltip is provided, wrap in tooltip component
  if (tooltipText) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {indicator}
          </TooltipTrigger>
          <TooltipContent>
            <p>{tooltipText}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  return indicator;
};

export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({
  score,
  size = 'md',
  tooltipText
}) => {
  // Normalize score between 0 and 1
  const normalizedScore = Math.max(0, Math.min(1, score));
  
  // Convert to percentage for display
  const percent = Math.round(normalizedScore * 100);
  
  // Determine size variables
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-0.5',
    lg: 'text-base px-2.5 py-1'
  };
  
  // Determine variant based on confidence level
  const getVariant = () => {
    if (normalizedScore >= 0.75) return 'outline border-green-500 text-green-500';
    if (normalizedScore >= 0.5) return 'outline border-yellow-500 text-yellow-500';
    if (normalizedScore >= 0.25) return 'outline border-orange-500 text-orange-500';
    return 'outline border-red-500 text-red-500';
  };
  
  // Get label text based on confidence level
  const getLabel = () => {
    if (normalizedScore >= 0.75) return 'High';
    if (normalizedScore >= 0.5) return 'Medium';
    if (normalizedScore >= 0.25) return 'Low';
    return 'Very Low';
  };
  
  const badge = (
    <Badge className={cn(sizeClasses[size], getVariant())}>
      {getLabel()} ({percent}%)
    </Badge>
  );
  
  // If tooltip is provided, wrap in tooltip component
  if (tooltipText) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {badge}
          </TooltipTrigger>
          <TooltipContent>
            <p>{tooltipText}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  return badge;
};