/**
 * Base Agent Component
 * Provides shared functionality and structure for all agent components
 */

import React, { useState, useEffect, ReactNode } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import log from '@/utils/logger';
import { displayError } from '@/utils/errorHandler';

export interface BaseAgentProps {
  /**
   * Unique identifier for the agent
   */
  agentId: string;
  
  /**
   * Display title for the agent
   */
  title: string;
  
  /**
   * Optional subtitle for the agent
   */
  subtitle?: string;
  
  /**
   * Agent description for accessibility and tooltips
   */
  description?: string;
  
  /**
   * Children components to render inside the agent
   */
  children: ReactNode;
  
  /**
   * Custom initialization function
   */
  onInitialize?: () => Promise<void>;
  
  /**
   * Custom cleanup function
   */
  onCleanup?: () => Promise<void>;
  
  /**
   * Class names to apply to container
   */
  className?: string;
  
  /**
   * Skip initialization step
   */
  skipInitialization?: boolean;
}

/**
 * Base Agent Component
 * Provides shared functionality for all agent components
 */
export const BaseAgent: React.FC<BaseAgentProps> = ({ 
  agentId, 
  title, 
  subtitle, 
  description,
  children,
  onInitialize,
  onCleanup,
  className = '',
  skipInitialization = false
}) => {
  // State
  const [isInitialized, setIsInitialized] = useState(skipInitialization);
  const [isLoading, setIsLoading] = useState(!skipInitialization);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();
  
  // Log component lifecycle
  useEffect(() => {
    log.info(`Agent mounted: ${agentId}`, undefined, 'agent');
    
    return () => {
      log.info(`Agent unmounted: ${agentId}`, undefined, 'agent');
      
      // Call cleanup if provided
      if (onCleanup) {
        onCleanup().catch(err => {
          log.error(`Error during ${title} agent cleanup: ${err.message}`, { error: err }, 'agent');
        });
      }
    };
  }, [agentId, title, onCleanup]);
  
  // Initialization effect
  useEffect(() => {
    const initializeAgent = async () => {
      if (skipInitialization) {
        setIsInitialized(true);
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        log.info(`Initializing agent: ${agentId}`, undefined, 'agent');
        
        // Run custom initialization if provided
        if (onInitialize) {
          await onInitialize();
        }
        
        setIsInitialized(true);
        log.info(`Agent initialized: ${agentId}`, undefined, 'agent');
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        log.error(`Error initializing ${title} agent: ${error.message}`, { error }, 'agent');
        displayError(error, toast);
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeAgent();
  }, [agentId, title, onInitialize, skipInitialization, toast]);
  
  // Error UI
  if (error) {
    return (
      <div className="agent-error flex flex-col items-center justify-center h-full p-6 space-y-4 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <h3 className="text-xl font-semibold">Error Loading {title}</h3>
        <p className="text-muted-foreground">{error.message}</p>
        <Button 
          variant="outline" 
          onClick={() => window.location.reload()}
        >
          Retry
        </Button>
      </div>
    );
  }
  
  // Loading UI
  if (isLoading) {
    return (
      <div className="agent-loading flex flex-col items-center justify-center h-full p-6 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading {title}...</p>
      </div>
    );
  }
  
  // Main agent UI wrapper
  return (
    <div 
      className={`agent-container h-full flex flex-col ${className}`} 
      data-agent-id={agentId}
      aria-label={description || title}
    >
      {children}
    </div>
  );
};

export default BaseAgent;