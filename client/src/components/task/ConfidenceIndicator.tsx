import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ConfidenceIndicatorProps {
  score: number; // 0-1 confidence score
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  label?: string;
  className?: string;
  tooltipContent?: React.ReactNode;
}

const ConfidenceIndicator: React.FC<ConfidenceIndicatorProps> = ({
  score,
  size = 'md',
  showLabel = false,
  label,
  className,
  tooltipContent,
}) => {
  // Ensure score is between 0 and 1
  const normalizedScore = Math.max(0, Math.min(1, score));
  
  // Get color based on confidence score
  const getColor = (score: number): string => {
    if (score >= 0.8) return 'bg-green-500';
    if (score >= 0.6) return 'bg-blue-500';
    if (score >= 0.4) return 'bg-yellow-500';
    if (score >= 0.2) return 'bg-orange-500';
    return 'bg-red-500';
  };
  
  // Get label text based on confidence score
  const getConfidenceLabel = (score: number): string => {
    if (score >= 0.8) return 'Very High';
    if (score >= 0.6) return 'High';
    if (score >= 0.4) return 'Medium';
    if (score >= 0.2) return 'Low';
    return 'Very Low';
  };
  
  // Size classes
  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };
  
  // Format percentage
  const percentage = Math.round(normalizedScore * 100);
  
  // Default tooltip content
  const defaultTooltipContent = (
    <div className="text-xs">
      <div className="font-semibold mb-1">Confidence: {getConfidenceLabel(normalizedScore)}</div>
      <div>Score: {percentage}%</div>
    </div>
  );

  const indicator = (
    <div className={cn("w-full flex flex-col space-y-1", className)}>
      {(showLabel || label) && (
        <div className="flex justify-between items-center text-xs">
          <span>{label || 'Confidence'}</span>
          <span className="font-medium">{percentage}%</span>
        </div>
      )}
      <div className={cn("w-full bg-muted rounded-full overflow-hidden", sizeClasses[size])}>
        <div
          className={`${getColor(normalizedScore)} h-full transition-all duration-300 ease-in-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );

  if (tooltipContent || !showLabel) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {indicator}
          </TooltipTrigger>
          <TooltipContent side="right">
            {tooltipContent || defaultTooltipContent}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return indicator;
};

// Pill-style confidence badge
export const ConfidenceBadge: React.FC<{
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showScore?: boolean;
  className?: string;
}> = ({ score, size = 'md', showScore = true, className }) => {
  // Ensure score is between 0 and 1
  const normalizedScore = Math.max(0, Math.min(1, score));
  
  // Get color based on confidence score
  const getColor = (score: number): string => {
    if (score >= 0.8) return 'bg-green-500/20 text-green-700 border-green-500';
    if (score >= 0.6) return 'bg-blue-500/20 text-blue-700 border-blue-500';
    if (score >= 0.4) return 'bg-yellow-500/20 text-yellow-700 border-yellow-500';
    if (score >= 0.2) return 'bg-orange-500/20 text-orange-700 border-orange-500';
    return 'bg-red-500/20 text-red-700 border-red-500';
  };
  
  // Get label text based on confidence score
  const getConfidenceLabel = (score: number): string => {
    if (score >= 0.8) return 'Very High';
    if (score >= 0.6) return 'High';
    if (score >= 0.4) return 'Medium';
    if (score >= 0.2) return 'Low';
    return 'Very Low';
  };
  
  // Size classes
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-xs px-2 py-1',
    lg: 'text-sm px-2.5 py-1',
  };
  
  const percentage = Math.round(normalizedScore * 100);
  
  return (
    <span 
      className={cn(
        "inline-flex items-center rounded-full border font-medium", 
        sizeClasses[size],
        getColor(normalizedScore),
        className
      )}
    >
      {getConfidenceLabel(normalizedScore)}
      {showScore && <span className="ml-1 opacity-70">{percentage}%</span>}
    </span>
  );
};

// Data item with confidence score
export const ConfidenceItem: React.FC<{
  label: string;
  value: string | React.ReactNode;
  confidence: number;
  showIndicator?: boolean;
  className?: string;
}> = ({
  label,
  value,
  confidence,
  showIndicator = true,
  className,
}) => {
  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <ConfidenceBadge score={confidence} size="sm" />
      </div>
      <div className="text-sm">{value}</div>
      {showIndicator && (
        <ConfidenceIndicator 
          score={confidence} 
          size="sm" 
          className="mt-1"
        />
      )}
    </div>
  );
};

export default ConfidenceIndicator;