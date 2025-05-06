import React from 'react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon-provider';
import { ICONS } from '@/lib/icon-map';
import { motion } from 'framer-motion';

interface AgentErrorFallbackProps {
  error: Error | null;
  resetError: () => void;
  title?: string;
  showError?: boolean;
  agentName?: string;
}

/**
 * Error fallback component specifically designed for agent windows
 */
export function AgentErrorFallback({
  error,
  resetError,
  title = "Something went wrong",
  showError = true,
  agentName,
}: AgentErrorFallbackProps) {
  return (
    <motion.div 
      className="flex flex-col items-center justify-center w-full h-full p-6 bg-zinc-900/50 text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex flex-col items-center max-w-md space-y-4">
        <motion.div 
          className="flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-red-500/20"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
        >
          <Icon name={ICONS.ALERT_TRIANGLE} size="lg" className="text-red-500" />
        </motion.div>
        
        <motion.h2 
          className="text-xl font-bold text-primary-foreground"
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          {title}
        </motion.h2>
        
        <motion.p 
          className="text-sm text-primary-foreground/70"
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {agentName ? `The ${agentName} agent` : 'This component'} encountered an unexpected error.
          <br />
          Try reloading the agent or contact support if the issue persists.
        </motion.p>
        
        {showError && error && (
          <motion.div 
            className="p-3 mt-2 overflow-auto text-xs text-left bg-black/30 rounded max-h-32 text-white/60 font-mono w-full"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {error.toString()}
          </motion.div>
        )}
        
        <motion.div 
          className="flex gap-3 mt-4"
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Button 
            variant="outline" 
            onClick={resetError}
            className="gap-2"
          >
            <Icon name={ICONS.REFRESH_CW} size="sm" />
            Reload Agent
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}