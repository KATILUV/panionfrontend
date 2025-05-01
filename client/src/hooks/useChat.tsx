import { useState } from 'react';
import { Message, ChatResponse } from '../types/chat';
import { log } from '../state/systemLogStore';

/**
 * Custom hook for managing chat functionality with Clara
 */
export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);

  /**
   * Send a message to Clara and handle the response
   */
  const sendMessage = async (content: string, imageFile?: File | null) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Log user message
      log.action(`User sent message: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`);
      if (imageFile) {
        log.action(`User attached image: ${imageFile.name} (${Math.round(imageFile.size / 1024)} KB)`);
      }
      
      // Add user message to state
      const userMessage: Message = {
        content,
        isUser: true,
        timestamp: new Date().toISOString(),
        imageUrl: imageFile ? URL.createObjectURL(imageFile) : undefined
      };
      
      setMessages(prev => [...prev, userMessage]);
      
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
        const errorMsg = `Error: ${response.status} ${response.statusText}`;
        log.error(errorMsg);
        throw new Error(errorMsg);
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
      const aiMessage: Message = {
        content: data.response,
        isUser: false,
        timestamp: new Date().toISOString(),
        imageUrl: data.imageUrl, // Include image URL if provided by the API
      };
      
      log.action(`Clara responded with: "${data.response.substring(0, 50)}${data.response.length > 50 ? '...' : ''}"`);
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
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

