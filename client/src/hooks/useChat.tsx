import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Message, ChatResponse } from '@/types/chat';

export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const selectedImageRef = useRef<string | null>(null);

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
    // Get the current selected image (if any)
    const currentImage = selectedImageRef.current;
    
    // Add user message to the chat
    const newMessage: Message = {
      content: message,
      isUser: true,
      timestamp: new Date().toISOString(),
      imageUrl: currentImage || undefined
    };
    
    setMessages((prev) => [...prev, newMessage]);
    
    // Reset the selected image
    selectedImageRef.current = null;
    
    // Send message to the API
    mutate(message);
  };

  // Function to handle form submission from ChatInputArea
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if there's at least a message or an image
    if (inputValue.trim() || selectedImageRef.current) {
      sendMessage(inputValue);
      setInputValue('');
    }
  };

  // Function to set the selected image
  const setSelectedImage = (imageDataUrl: string | null) => {
    selectedImageRef.current = imageDataUrl;
  };

  return {
    messages,
    isLoading,
    sendMessage,
    inputValue,
    setInputValue,
    handleSubmit,
    setSelectedImage
  };
};
