import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Message, ChatResponse } from '@/types/chat';

export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');

  const { mutate, isPending: isLoading } = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest('POST', '/api/chat', { message });
      const data: ChatResponse = await response.json();
      return data;
    },
    onSuccess: (data) => {
      const newMessage: Message = {
        content: data.response,
        isUser: false,
        timestamp: new Date().toISOString()
      };
      setMessages((prev) => [...prev, newMessage]);
    },
    onError: (error) => {
      console.error('Error sending message:', error);
      // Add error handling here - could show a toast notification
    }
  });

  const sendMessage = (message: string) => {
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
    sendMessage,
    inputValue,
    setInputValue
  };
};
