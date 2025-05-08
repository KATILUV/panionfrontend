import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle, CheckCircle2, Ellipsis } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AgentStatusProps {
  status: 'idle' | 'thinking' | 'active' | 'error';
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const AgentStatus: React.FC<AgentStatusProps> = ({ 
  status, 
  showLabel = true,
  size = 'md'
}) => {
  let icon: React.ReactNode;
  let label: string;
  let variant: 'outline' | 'secondary' | 'destructive' | 'default' = 'outline';
  
  switch (status) {
    case 'thinking':
      icon = <Loader2 className="h-3 w-3 animate-spin" />;
      label = 'Thinking';
      variant = 'secondary';
      break;
    case 'active':
      icon = <CheckCircle2 className="h-3 w-3" />;
      label = 'Active';
      variant = 'default';
      break;
    case 'error':
      icon = <AlertCircle className="h-3 w-3" />;
      label = 'Error';
      variant = 'destructive';
      break;
    case 'idle':
    default:
      icon = <Ellipsis className="h-3 w-3" />;
      label = 'Idle';
      variant = 'outline';
  }
  
  // Adjust size
  const sizeClass = {
    sm: 'text-xs py-0 h-5',
    md: 'text-xs',
    lg: 'text-sm'
  }[size];
  
  return (
    <Badge 
      variant={variant} 
      className={cn(
        "gap-1 font-normal", 
        sizeClass
      )}
    >
      {icon}
      {showLabel && <span>{label}</span>}
    </Badge>
  );
};