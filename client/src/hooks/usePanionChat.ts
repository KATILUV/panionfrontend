/**
 * Enhanced Panion Intelligence Chat Hook with WebSocket capabilities
 * Provides proactive, autonomous, and more intelligent chat experience
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// Types
export interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: string;
  thinking?: string;
  imageUrl?: string;
}

export interface PanionCapabilities {
  proactivity_score: number;
  initiative_actions: any[];
  decomposed_subtasks: any[];
}

export interface SystemMetrics {
  response_time_ms: number;
  websocket_mode: 'active' | 'fallback';
  system_logs: any[];
}

export interface PanionChatResponse {
  response: string;
  thinking: string | null;
  panion_capabilities: PanionCapabilities;
  metrics: SystemMetrics;
}

export interface PanionChatOptions {
  useEnhancedMode?: boolean;
  autoDetectStrategicMode?: boolean;
  mode?: 'standard' | 'autonomous';
  enableProactivity?: boolean;
  sessionId?: string;
}

export default function usePanionChat(options: PanionChatOptions = {}) {
  // Basic chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Enhanced Panion Intelligence features
  const [lastResponse, setLastResponse] = useState<PanionChatResponse | null>(null);
  const [insights, setInsights] = useState<any[]>([]);
  const [agentStatus, setAgentStatus] = useState<string>('idle');
  const [processingStage, setProcessingStage] = useState<string | null>(null);
  const [processingProgress, setProcessingProgress] = useState<number>(0);
  const [strategicMode, setStrategicMode] = useState<boolean>(false);
  
  // Refs for scrolling and input focus
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  const { toast } = useToast();

  // Initialize with provided options
  const {
    useEnhancedMode = true,
    autoDetectStrategicMode = true,
    sessionId = 'default'
  } = options;

  // Toggle strategic mode
  const toggleStrategicMode = useCallback(() => {
    setStrategicMode(prev => !prev);
  }, []);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Handle proactive insights from the system
  useEffect(() => {
    // This is a placeholder for WebSocket-based proactive insights
    // In a full implementation, we would set up a WebSocket connection
    // to receive real-time insights from the Panion Intelligence backend
    const checkInterval = setInterval(() => {
      // In a real implementation, we would check for new insights
      // from the WebSocket and update the state
    }, 10000); // Check every 10 seconds

    return () => {
      clearInterval(checkInterval);
    };
  }, []);

  // Send a message
  const sendMessage = useCallback(
    async (content: string) => {
      try {
        if (!content.trim()) return;
        
        setIsLoading(true);
        setError(null);
        setAgentStatus('processing');
        setProcessingStage('Analyzing request');
        setProcessingProgress(10);

        // Add user message to state
        const userMessage: ChatMessage = {
          id: Date.now().toString(),
          content,
          isUser: true,
          timestamp: new Date().toISOString()
        };
        
        setMessages(prev => [...prev, userMessage]);
        setInputValue(''); // Clear input after sending
        
        // After a short delay to show the first processing stage
        setTimeout(() => {
          setProcessingStage('Gathering context');
          setProcessingProgress(30);
        }, 500);
        
        setTimeout(() => {
          setProcessingStage('Generating response');
          setProcessingProgress(60);
        }, 1000);
        
        // Use the WebSocket-enhanced endpoint
        const response = await apiRequest(
          'POST',
          '/api/panion/ws-chat',
          {
            message: content,
            sessionId,
            requestMode: strategicMode ? 'autonomous' : 'standard',
            enableProactivity: true
          }
        );

        const chatResponse = await response.json();
        setLastResponse(chatResponse);

        // Update processing state
        setProcessingStage('Finalizing response');
        setProcessingProgress(90);
        
        // Add assistant response to state
        const assistantMessage: ChatMessage = {
          id: Date.now().toString(),
          content: chatResponse.response,
          isUser: false,
          timestamp: new Date().toISOString(),
          thinking: chatResponse.thinking
        };
        
        setMessages(prev => [...prev, assistantMessage]);
        
        // If we receive any initiative actions, notify the user
        if (chatResponse.panion_capabilities?.initiative_actions?.length > 0) {
          toast({
            title: 'Panion has a suggestion',
            description: 'Based on your conversation, Panion has identified a related action that may be helpful.',
            variant: 'default',
          });

          // Update insights for later use
          setInsights([
            ...insights,
            ...chatResponse.panion_capabilities.initiative_actions,
          ]);
        }
        
        // Auto-detect if we should enter strategic mode based on task complexity
        if (autoDetectStrategicMode && 
            chatResponse.panion_capabilities?.proactivity_score > 0.7 && 
            !strategicMode) {
          setStrategicMode(true);
          toast({
            title: 'Strategic Mode Activated',
            description: 'This task seems complex. Strategic mode has been enabled to provide more advanced assistance.',
            variant: 'default',
          });
        }

        return chatResponse;
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        toast({
          title: 'Error in chat',
          description: err instanceof Error ? err.message : String(err),
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
        setAgentStatus('idle');
        setProcessingStage(null);
        setProcessingProgress(100);
        
        // Focus on input after response
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }
    },
    [insights, toast, sessionId, strategicMode, autoDetectStrategicMode]
  );

  // Clear insights
  const clearInsights = useCallback(() => {
    setInsights([]);
  }, []);

  // Clear all chat messages
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    // Chat interface
    messages,
    inputValue,
    setInputValue,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    
    // Enhanced features
    agentStatus,
    processingStage,
    processingProgress,
    strategicMode,
    toggleStrategicMode,
    lastResponse,
    insights,
    clearInsights,
    
    // Refs
    messagesEndRef,
    inputRef
  };
}