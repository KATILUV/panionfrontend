/**
 * Enhanced Manus-like Chat Hook with WebSocket capabilities
 * Provides proactive, autonomous, and more intelligent chat experience
 */

import { useState, useCallback, useEffect } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export interface ManusCapabilities {
  proactivity_score: number;
  initiative_actions: any[];
  decomposed_subtasks: any[];
}

export interface SystemMetrics {
  response_time_ms: number;
  websocket_mode: 'active' | 'fallback';
  system_logs: any[];
}

export interface ManusChatResponse {
  response: string;
  thinking: string | null;
  manus_capabilities: ManusCapabilities;
  metrics: SystemMetrics;
}

export interface ManusChatOptions {
  mode?: 'standard' | 'autonomous';
  enableProactivity?: boolean;
  sessionId?: string;
}

export default function useManusChat() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastResponse, setLastResponse] = useState<ManusChatResponse | null>(null);
  const [insights, setInsights] = useState<any[]>([]);
  const { toast } = useToast();

  // Handle proactive insights from the system
  useEffect(() => {
    // This is a placeholder for WebSocket-based proactive insights
    // In a full implementation, we would set up a WebSocket connection
    // to receive real-time insights from the Manus-like backend
    const checkInterval = setInterval(() => {
      // In a real implementation, we would check for new insights
      // from the WebSocket and update the state
    }, 10000); // Check every 10 seconds

    return () => {
      clearInterval(checkInterval);
    };
  }, []);

  // Chat function with enhanced capabilities
  const chat = useCallback(
    async (message: string, options: ManusChatOptions = {}) => {
      try {
        setIsLoading(true);
        setError(null);

        const defaultOptions: ManusChatOptions = {
          mode: 'standard',
          enableProactivity: true,
          sessionId: 'default',
        };

        const mergedOptions = { ...defaultOptions, ...options };
        
        // Use the WebSocket-enhanced endpoint
        const response = await apiRequest(
          'POST',
          '/api/panion/ws-chat',
          {
            message,
            sessionId: mergedOptions.sessionId,
            requestMode: mergedOptions.mode,
            enableProactivity: mergedOptions.enableProactivity,
          }
        );

        const chatResponse = await response.json();
        setLastResponse(chatResponse);

        // If we receive any initiative actions and proactivity is enabled, 
        // notify the user
        if (
          mergedOptions.enableProactivity &&
          chatResponse.manus_capabilities?.initiative_actions?.length > 0
        ) {
          toast({
            title: 'Panion has a suggestion',
            description: 'Based on your conversation, Panion has identified a related action that may be helpful.',
            variant: 'default',
          });

          // Update insights for later use
          setInsights([
            ...insights,
            ...chatResponse.manus_capabilities.initiative_actions,
          ]);
        }

        return chatResponse;
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        toast({
          title: 'Error in chat',
          description: err instanceof Error ? err.message : String(err),
          variant: 'destructive',
        });
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [insights, toast]
  );

  // Clear insights
  const clearInsights = useCallback(() => {
    setInsights([]);
  }, []);

  return {
    chat,
    isLoading,
    error,
    lastResponse,
    insights,
    clearInsights,
  };
}