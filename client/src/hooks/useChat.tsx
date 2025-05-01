import { useState } from 'react';
import { Message, ChatResponse } from '../types/chat';

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
      
      // Add user message to state
      const userMessage: Message = {
        content,
        isUser: true,
        timestamp: new Date().toISOString(),
        imageUrl: imageFile ? URL.createObjectURL(imageFile) : undefined
      };
      
      setMessages(prev => [...prev, userMessage]);
      
      // Prepare form data for API request
      const formData = new FormData();
      formData.append('message', content);
      
      if (conversationId) {
        formData.append('conversationId', conversationId);
      }
      
      if (imageFile) {
        formData.append('image', imageFile);
      }
      
      // Send request to API
      const response = await fetch('/api/chat', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }
      
      const data: ChatResponse = await response.json();
      
      // Update conversation ID if provided
      if (data.conversationId) {
        setConversationId(data.conversationId);
      }
      
      // Add AI response to state
      const aiMessage: Message = {
        content: data.response,
        isUser: false,
        timestamp: new Date().toISOString(),
      };
      
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
  };
  
  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
  };
};

export default useChat;