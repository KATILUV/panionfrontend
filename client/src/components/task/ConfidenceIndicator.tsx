import React from 'react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Shield, ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react';

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

// A visual indicator for confidence scores
export const ConfidenceIndicator: React.FC<ConfidenceIndicatorProps> = ({
  score,
  showLabel = true,
  size = 'md',
  tooltipText
}) => {
  // Normalize score to be between 0 and 1
  const normalizedScore = Math.max(0, Math.min(1, score));
  
  // Determine size classes
  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  };
  
  // Get color based on score
  const getColor = (score: number) => {
    if (score < 0.33) return 'bg-red-500';
    if (score < 0.66) return 'bg-yellow-500';
    return 'bg-green-500';
  };
  
  // Get label text based on score
  const getLabelText = (score: number) => {
    if (score < 0.33) return 'Low confidence';
    if (score < 0.66) return 'Medium confidence';
    return 'High confidence';
  };
  
  const scorePercentage = Math.round(normalizedScore * 100);
  const barColor = getColor(normalizedScore);
  const labelText = getLabelText(normalizedScore);
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              {showLabel && (
                <span className="text-xs text-muted-foreground">{labelText}</span>
              )}
              <span className="text-xs font-medium">{scorePercentage}%</span>
            </div>
            <div className={cn("w-full bg-muted rounded-full overflow-hidden", sizeClasses[size])}>
              <div 
                className={cn("rounded-full", barColor)}
                style={{ width: `${scorePercentage}%`, height: '100%' }}
              ></div>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" align="center">
          <p>{tooltipText || `Confidence score: ${scorePercentage}%`}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// A badge for showing confidence levels
export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({
  score,
  size = 'md',
  tooltipText
}) => {
  // Normalize score to be between 0 and 1
  const normalizedScore = Math.max(0, Math.min(1, score));
  
  // Get icon and variant based on score
  const getIconAndVariant = (score: number): { icon: React.ReactNode; variant: 'default' | 'outline' | 'secondary' | 'destructive' } => {
    if (score < 0.33) {
      return { 
        icon: <ShieldAlert className="h-3 w-3 mr-1" />, 
        variant: 'destructive'
      };
    }
    if (score < 0.66) {
      return { 
        icon: <ShieldQuestion className="h-3 w-3 mr-1" />, 
        variant: 'secondary'
      };
    }
    return { 
      icon: <ShieldCheck className="h-3 w-3 mr-1" />, 
      variant: 'default'
    };
  };
  
  // Size classes for the badge
  const sizeClasses = {
    sm: 'text-[10px] px-1 py-0 h-4',
    md: 'text-xs px-2 py-0 h-5',
    lg: 'text-sm px-2.5 py-0.5 h-6',
  };
  
  const { icon, variant } = getIconAndVariant(normalizedScore);
  const scorePercentage = Math.round(normalizedScore * 100);
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant={variant}
            className={cn("flex items-center", sizeClasses[size])}
          >
            {icon}
            <span>{scorePercentage}% confident</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="right" align="center">
          <p>{tooltipText || `Confidence level: ${scorePercentage}%`}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};