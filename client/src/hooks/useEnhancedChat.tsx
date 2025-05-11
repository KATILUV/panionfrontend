/**
 * Enhanced Chat Hook
 * Adds personality traits, thinking states, and user adaptation to the chat experience
 */

import { useState, useEffect, useRef } from 'react';
import { useUserPreferencesStore } from '@/state/userPreferencesStore';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessage, ThinkingState, MessageSentiment } from '@/types/chat';
import { useToast } from './use-toast';
import { generateThinkingSequence, determineSentiment } from '@/lib/thinkingStates';
import { getRandomTraits, getContextualTraits } from '@/lib/personalityTraits';

/**
 * Hook options
 */
interface UseEnhancedChatOptions {
  userId?: number;
  initialMessages?: ChatMessage[];
  sessionId?: string;
  onError?: (error: Error) => void;
}

/**
 * Enhanced chat hook with Manus-like features
 */
export const useEnhancedChat = (options: UseEnhancedChatOptions = {}) => {
  const { userId, initialMessages = [], sessionId = 'default', onError } = options;
  
  // Access preferences
  const preferences = useUserPreferencesStore();
  
  // States
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentThinkingState, setCurrentThinkingState] = useState<ThinkingState | null>(null);
  const [currentSentiment, setCurrentSentiment] = useState<MessageSentiment>('neutral');
  const [personalityTraits, setPersonalityTraits] = useState<string[]>([]);
  const [thinkingProgress, setThinkingProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const thinkingSequenceRef = useRef<{
    states: ThinkingState[];
    durations: number[];
    timers: NodeJS.Timeout[];
  }>({
    states: [],
    durations: [],
    timers: []
  });
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Toast for notifications
  const { toast } = useToast();
  
  // Cleanup thinking state timers on unmount
  useEffect(() => {
    return () => {
      // Clear any running timers
      thinkingSequenceRef.current.timers.forEach(timer => clearTimeout(timer));
      
      // Abort any in-flight requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Start a thinking sequence
  const startThinkingSequence = (complexity: number = 5, needsMemory: boolean = true) => {
    // Clear any existing sequence
    thinkingSequenceRef.current.timers.forEach(timer => clearTimeout(timer));
    thinkingSequenceRef.current.timers = [];
    
    // Generate new sequence
    const expectedResponseLength = preferences.responseLength === 'concise' ? 150 : 
                                  preferences.responseLength === 'detailed' ? 400 : 250;
    
    const { states, durations } = generateThinkingSequence(
      complexity,
      needsMemory,
      expectedResponseLength
    );
    
    thinkingSequenceRef.current.states = states;
    thinkingSequenceRef.current.durations = durations;
    
    // Start with the first state
    setCurrentThinkingState(states[0]);
    
    // Create timers for the rest of the sequence
    let elapsed = 0;
    
    for (let i = 1; i < states.length; i++) {
      elapsed += durations[i-1];
      
      const timer = setTimeout(() => {
        setCurrentThinkingState(states[i]);
        
        // Update progress percentage
        const progressPercentage = (i / (states.length - 1)) * 100;
        setThinkingProgress(progressPercentage);
        
      }, elapsed);
      
      thinkingSequenceRef.current.timers.push(timer);
    }
  };
  
  // Add a message to the chat
  const addMessage = (message: Partial<ChatMessage>) => {
    const newMessage: ChatMessage = {
      id: message.id || uuidv4(),
      content: message.content || '',
      isUser: message.isUser || false,
      timestamp: message.timestamp || new Date().toISOString(),
      thinking: message.thinking,
      imageUrl: message.imageUrl,
      component: message.component,
      thinkingState: message.thinkingState || 'complete',
      sentiment: message.sentiment || 'neutral',
      isTyping: message.isTyping || false,
      personalityTraits: message.personalityTraits || []
    };
    
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  };
  
  // Update a message
  const updateMessage = (id: string, updates: Partial<ChatMessage>) => {
    setMessages(prev => prev.map(msg => 
      msg.id === id ? { ...msg, ...updates } : msg
    ));
  };
  
  // Send a message
  const sendMessage = async (messageText: string) => {
    if (!messageText.trim()) return;
    
    try {
      // Clear any previous error
      setError(null);
      
      // Add user message
      const userMessage = addMessage({
        content: messageText,
        isUser: true
      });
      
      // Create placeholder for assistant response with typing indicator
      const responseMessageId = uuidv4();
      
      // Select personality traits for this response
      const traits = getContextualTraits(messageText, 3);
      setPersonalityTraits(traits);
      
      // Add assistant message with typing indicator
      addMessage({
        id: responseMessageId,
        content: '',
        isUser: false,
        isTyping: true,
        thinkingState: 'listening',
        sentiment: 'neutral',
        personalityTraits: traits
      });
      
      // Start thinking sequence
      const complexity = preferences.detailLevel === 'simple' ? 3 : 
                         preferences.detailLevel === 'comprehensive' ? 8 : 5;
                         
      const needsMemory = preferences.memoryUtilizationLevel !== 'minimal';
      startThinkingSequence(complexity, needsMemory);
      
      // Set loading state
      setIsLoading(true);
      
      // Create a new abort controller for this request
      abortControllerRef.current = new AbortController();
      
      // Prepare the request
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: messageText,
          sessionId,
          preferredMode: preferences.preferredMode,
          userPreferences: {
            personalityTraits: preferences.personalityTraits,
            detailLevel: preferences.detailLevel,
            responseLength: preferences.responseLength,
            memoryUtilizationLevel: preferences.memoryUtilizationLevel
          }
        }),
        signal: abortControllerRef.current.signal
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const responseData = await response.json();
      
      // Select a sentiment for the response
      const responseSentiment = determineSentiment(responseData.response || '');
      setCurrentSentiment(responseSentiment);
      
      // Update the message with real content
      updateMessage(responseMessageId, {
        content: responseData.response || 'I apologize, but I encountered an issue processing your request.',
        thinking: responseData.thinking || '',
        isTyping: false,
        thinkingState: 'complete',
        sentiment: responseSentiment,
        personalityTraits: traits,
        imageUrl: responseData.imageUrl,
        component: responseData.component
      });
    } catch (err) {
      console.error('Error sending message:', err);
      
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      
      // Only report if not an abort error
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err as Error);
        
        if (onError) {
          onError(err as Error);
        }
        
        toast({
          title: 'Error',
          description: 'Failed to send message. Please try again.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
      setCurrentThinkingState('complete');
      setThinkingProgress(100);
      abortControllerRef.current = null;
    }
  };
  
  // Clear all messages
  const clearMessages = () => {
    setMessages([]);
  };
  
  // Upload an image
  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('sessionId', sessionId);
      
      // Use multi-agent analysis if enabled in preferences
      const uploadEndpoint = preferences.multiAgentAnalysisEnabled ? 
        '/api/visual-collaboration' : 
        '/api/upload-image';
      
      const response = await fetch(uploadEndpoint, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.imageUrl) {
        return data.imageUrl;
      } else {
        throw new Error(data.error || 'Failed to upload image');
      }
    } catch (err) {
      console.error('Error uploading image:', err);
      
      toast({
        title: 'Error',
        description: 'Failed to upload image. Please try again.',
        variant: 'destructive',
      });
      
      return null;
    }
  };
  
  return {
    // Chat state
    messages,
    inputValue,
    setInputValue,
    isLoading,
    error,
    
    // Core chat actions
    sendMessage,
    clearMessages,
    
    // Enhanced features
    currentThinkingState,
    currentSentiment,
    personalityTraits,
    thinkingProgress,
    
    // Image handling
    uploadImage,
    
    // Refs
    messagesEndRef,
    inputRef
  };
};

export default useEnhancedChat;