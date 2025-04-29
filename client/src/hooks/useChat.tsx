import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Message, ChatResponse } from '@/types/chat';

/**
 * Custom hook for managing chat functionality
 * Simplified version that handles messages and API communication
 */
export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);

  // API mutation for sending messages to the server
  const { mutate, isPending: isLoading } = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest('POST', '/api/chat', { message });
      const data: ChatResponse = await response.json();
      return data;
    },
    onSuccess: (data) => {
      // Add Clara's response to the messages
      const newMessage: Message = {
        content: data.response,
        isUser: false,
        timestamp: new Date().toISOString()
      };
      setMessages((prev) => [...prev, newMessage]);
    },
    onError: (error) => {
      console.error('Error sending message:', error);
      // TODO: Add better error handling here - could show a toast notification
    }
  });

  /**
   * Send a message to the API and add it to the chat
   */
  const sendMessage = (message: string) => {
    if (!message.trim()) return;
    
    // Add user message to the chat
    const newMessage: Message = {
      content: message,
      isUser: true,
      timestamp: new Date().toISOString()
    };
    
    setMessages((prev) => [...prev, newMessage]);
    
    // Send message to the API
    mutate(message);
  };

  return {
    messages,
    isLoading,
    sendMessage
  };
};
