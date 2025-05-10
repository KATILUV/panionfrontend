import { useState } from 'react';
import { ChatMessage, ChatResponse } from '../types/chat';
import { log } from '../state/systemLogStore';
import { handleError, mapErrorTypeFromStatus } from '../lib/errorHandler'; 
import { useToast } from './use-toast';
import { ErrorType } from '@/components/ui/error-message';

/**
 * Custom hook for managing chat functionality with Panion
 */
// For simulating errors during development/testing
const shouldSimulateError = (content: string): { simulate: boolean, type: ErrorType } => {
  if (content.toLowerCase().includes('#err-network')) {
    return { simulate: true, type: 'network' };
  }
  if (content.toLowerCase().includes('#err-server')) {
    return { simulate: true, type: 'server' };
  }
  if (content.toLowerCase().includes('#err-timeout')) {
    return { simulate: true, type: 'timeout' };
  }
  if (content.toLowerCase().includes('#err-notfound')) {
    return { simulate: true, type: 'notFound' };
  }
  return { simulate: false, type: 'unknown' };
};

export const useChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const { toast } = useToast();

  /**
   * Send a message to Panion and handle the response
   * Includes automatic retry for certain types of errors
   */
  const sendMessage = async (content: string, imageFile?: File | null, retryCount = 0) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Log user message
      log.action(`User sent message: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`);
      if (imageFile) {
        log.action(`User attached image: ${imageFile.name} (${Math.round(imageFile.size / 1024)} KB)`);
      }
      
      // Add user message to state
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        content,
        isUser: true,
        timestamp: new Date().toISOString(),
        imageUrl: imageFile ? URL.createObjectURL(imageFile) : undefined
      };
      
      setMessages(prev => [...prev, userMessage]);
      
      // Check for test/debug commands to simulate errors
      const { simulate, type } = shouldSimulateError(content);
      if (simulate && process.env.NODE_ENV === 'development') {
        log.info(`Simulating ${type} error for testing`);
        // Simulate a delay before showing the error
        await new Promise(resolve => setTimeout(resolve, 1000));
        throw new Error(`Simulated ${type} error for testing`);
      }
      
      // Prepare form data or JSON for API request
      let requestOptions: RequestInit = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content,
          conversationId: conversationId || null
        }),
      };
      
      // If we have an image, use the image upload endpoint
      let response;
      if (imageFile) {
        const formData = new FormData();
        formData.append('message', content);
        if (conversationId) {
          formData.append('conversationId', conversationId);
        }
        formData.append('image', imageFile);
        
        // Use the image upload endpoint
        response = await fetch('/api/upload-image', {
          method: 'POST',
          body: formData,
        });
      } else {
        // Send text-only message to regular chat endpoint
        response = await fetch('/api/chat', requestOptions);
      }
      
      if (!response.ok) {
        const errorType = mapErrorTypeFromStatus(response.status);
        const errorMsg = `Error ${response.status}: ${response.statusText}`;
        log.error(`API error (${errorType}): ${errorMsg}`);
        
        // Throw the response object so our error handler can properly categorize it
        throw response;
      }
      
      const data: ChatResponse = await response.json();
      
      // Update conversation ID if provided
      if (data.conversationId) {
        setConversationId(data.conversationId);
        log.info(`Conversation ID updated: ${data.conversationId}`);
      }
      
      // Log thinking and memory access
      log.thinking(`Processing response for: "${content.substring(0, 30)}${content.length > 30 ? '...' : ''}"`);
      log.memory(`Retrieving relevant memories for context`);
      
      // Add AI response to state
      const aiMessage: ChatMessage = {
        id: Date.now().toString(),
        content: data.response,
        isUser: false,
        timestamp: new Date().toISOString(),
        thinking: data.thinking,
        imageUrl: data.imageUrl // Include image URL if provided by the API
      };
      
      log.action(`Panion responded with: "${data.response.substring(0, 50)}${data.response.length > 50 ? '...' : ''}"`);
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      console.error('Error sending message:', err);
      const { type, message } = handleError(err);
      log.error(`Chat error (${type}): ${message}`);
      
      // Retry logic for network and server errors
      // Only retry up to 2 times (total of 3 attempts)
      const MAX_RETRIES = 2;
      
      if ((type === 'network' || type === 'server' || type === 'timeout') && retryCount < MAX_RETRIES) {
        const nextRetryCount = retryCount + 1;
        const delayMs = 1000 * Math.pow(2, retryCount); // Exponential backoff
        
        log.info(`Retrying request (attempt ${nextRetryCount} of ${MAX_RETRIES}) in ${delayMs}ms...`);
        
        // Show retry toast
        toast({
          title: "Reconnecting...",
          description: `Retrying in ${delayMs/1000} seconds (attempt ${nextRetryCount} of ${MAX_RETRIES})`,
          variant: "info",
        });
        
        // Set a temporary connection error message
        setError(`Connection issue. Retrying in ${delayMs/1000} seconds...`);
        
        // Try again after delay with exponential backoff
        setTimeout(() => {
          sendMessage(content, imageFile, nextRetryCount);
        }, delayMs);
        
        return; // Exit early, we'll handle the error in the retry
      }
      
      // If we've reached max retries or it's not a retryable error, display final error
      setError(message);
      
      // Show toast notification for network errors
      if (type === 'network') {
        toast({
          variant: 'destructive',
          title: 'Connection Error',
          description: `${message} Please check your internet connection.`,
        });
      } else if (type === 'server') {
        toast({
          variant: 'destructive',
          title: 'Server Error',
          description: message,
        });
      }
    } finally {
      // Only set loading to false if this is a final attempt
      // or if there was no error (success case)
      if (retryCount >= 2 || !error) {
        setIsLoading(false);
      }
    }
  };
  
  /**
   * Clear all messages
   */
  const clearMessages = () => {
    setMessages([]);
    setConversationId(undefined);
    log.action('Conversation history cleared');
  };
  
  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
  };
};

