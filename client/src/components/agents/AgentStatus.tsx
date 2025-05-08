import React from 'react';
import { cn } from '@/lib/utils';

type StatusType = 'idle' | 'thinking' | 'active' | 'paused' | 'error' | 'success' | 'waiting' | 'learning';

interface AgentStatusProps {
  status: StatusType;
  size?: 'sm' | 'md';
  showLabel?: boolean;
  pulsingAnimation?: boolean;
  className?: string;
}

export const AgentStatus: React.FC<AgentStatusProps> = ({
  status,
  size = 'md',
  showLabel = true,
  pulsingAnimation = true,
  className
}) => {
  const statusConfig = {
    idle: {
      color: 'bg-slate-400',
      label: 'Idle',
      pulsing: false
    },
    thinking: {
      color: 'bg-blue-400',
      label: 'Thinking',
      pulsing: true
    },
    active: {
      color: 'bg-emerald-500',
      label: 'Active',
      pulsing: true
    },
    paused: {
      color: 'bg-amber-400',
      label: 'Paused',
      pulsing: false
    },
    error: {
      color: 'bg-red-500',
      label: 'Error',
      pulsing: false
    },
    success: {
      color: 'bg-green-500',
      label: 'Success',
      pulsing: false
    },
    waiting: {
      color: 'bg-purple-400',
      label: 'Waiting',
      pulsing: true
    },
    learning: {
      color: 'bg-cyan-400',
      label: 'Learning',
      pulsing: true
    }
  };

  const config = statusConfig[status];
  const shouldPulse = pulsingAnimation && config.pulsing;
  
  return (
    <div 
      className={cn(
        "flex items-center space-x-1.5",
        className
      )}
    >
      <div className="relative flex items-center justify-center">
        <div 
          className={cn(
            config.color,
            size === 'sm' ? 'h-2 w-2' : 'h-3 w-3',
            'rounded-full'
          )}
        />
        
        {shouldPulse && (
          <div 
            className={cn(
              config.color,
              size === 'sm' ? 'h-2 w-2' : 'h-3 w-3',
              'absolute rounded-full opacity-60 animate-ping'
            )}
          />
        )}
      </div>
      
      {showLabel && (
        <span className={cn(
          "text-xs",
          size === 'sm' ? 'text-[10px]' : 'text-xs',
        )}>
          {config.label}
        </span>
      )}
    </div>
  );
};