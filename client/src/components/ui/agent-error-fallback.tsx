import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AgentErrorFallbackProps {
  error?: Error;
  resetErrorBoundary?: () => void;
  agentName?: string;
  className?: string;
}

export function AgentErrorFallback({ 
  error, 
  resetErrorBoundary,
  agentName = 'Agent',
  className 
}: AgentErrorFallbackProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center h-full p-6 bg-muted/30",
      "text-center rounded-md",
      className
    )}>
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 text-red-500 mb-4">
        <AlertTriangle className="h-6 w-6" />
      </div>
      
      <h3 className="text-lg font-medium mb-2">
        {agentName} encountered an error
      </h3>
      
      <p className="text-sm text-muted-foreground mb-4 max-w-md">
        The agent has crashed. This could be due to a temporary issue or a bug in the agent's code.
      </p>
      
      <div className="flex gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={resetErrorBoundary}
        >
          Restart Agent
        </Button>
        
        <Button
          variant="default"
          size="sm"
          onClick={() => window.location.reload()}
        >
          Reload Page
        </Button>
      </div>
      
      {error && process.env.NODE_ENV === 'development' && (
        <div className="mt-6 p-4 bg-muted rounded-md text-left w-full max-w-md overflow-auto">
          <h4 className="text-sm font-medium mb-2">Error Details</h4>
          <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
            {error.message}
          </pre>
        </div>
      )}
    </div>
  );
}