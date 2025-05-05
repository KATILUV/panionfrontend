import React, { useRef, useEffect, useState } from 'react';
import ClaraOrb from '../ClaraOrb';
import ChatBubble from '../ChatBubble';
import ChatInput from '../ChatInput';
import TypingIndicator from '../TypingIndicator';
import RotatingTagline from '../RotatingTagline';
import { useChat } from '../../hooks/useChat';
import { Message } from '../../types/chat';
import { log } from '../../state/systemLogStore';
import { useThemeStore } from '../../state/themeStore';
import { AgentStatus, AgentStatusType } from '../ui/agent-status';

const ClaraAgent: React.FC = () => {
  const { messages, isLoading, error, sendMessage } = useChat();
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const getCurrentTheme = useThemeStore((state) => state.getCurrentTheme);
  const accent = useThemeStore((state) => state.accent);
  
  // Track Clara's status
  const [status, setStatus] = useState<AgentStatusType>(messages.length > 0 ? "active" : "idle");

  // Log when the component mounts and unmounts
  useEffect(() => {
    log.action('Clara agent window opened');
    
    return () => {
      log.action('Clara agent window closed');
    };
  }, []);

  // Scroll to bottom of chat when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
    
    // Log when new messages are received
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (!lastMessage.isUser) {
        log.thinking('Updated conversation with new response');
      }
    }
  }, [messages]);
  
  // Update agent status based on conversation state
  useEffect(() => {
    if (error) {
      setStatus("error");
    } else if (isLoading) {
      setStatus("thinking");
    } else if (messages.length > 0) {
      setStatus("active");
    } else {
      setStatus("idle");
    }
  }, [isLoading, error, messages.length]);

  const handleSendMessage = (message: string, imageFile?: File | null) => {
    sendMessage(message, imageFile);
  };
  
  return (
    <div className="h-full flex flex-col p-4 text-white">
      <div className="w-full max-w-full flex flex-col h-full">
        {/* Header with status indicator */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="h2 text-primary">Clara</h2>
          <AgentStatus 
            status={status} 
            size="sm"
            className="mr-1" 
          />
        </div>
        
        <div className="text-center mb-2">
          <RotatingTagline 
            phrases={[
              "The future isn't artificial — it's intentional.",
              "Dream deeper. Build smarter. Evolve together.",
              "You architect. She amplifies.",
              "Co-building the future of you.",
              "Your thought partner in progress.",
              "Part interface, part intelligence, all intention.",
              "Dream bigger. Build together."
            ]}
            interval={7000}
            className="text-sm font-light text-white/80"
          />
        </div>

        {/* Orb */}
        <ClaraOrb isProcessing={isLoading} />

        {/* Chat Messages Container */}
        <div 
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto pr-2 space-y-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent"
        >
          {messages.length === 0 ? (
            <div className="window-panel flex flex-col items-center justify-center h-full text-center space-y-4">
              <p className="text-content">Welcome to Clara! How can I assist you today?</p>
              <p className="text-caption">Ask me anything or share an image with me.</p>
            </div>
          ) : (
            <>
              {messages.map((message: Message, index: number) => (
                <ChatBubble 
                  key={index} 
                  message={message} 
                />
              ))}
              {isLoading && <TypingIndicator />}
            </>
          )}
          
          {error && (
            <div className="window-panel bg-red-900/10 text-red-400 text-center">
              {error}
            </div>
          )}
        </div>
        
        {/* Chat Input - Fixed at bottom */}
        <div className="sticky bottom-0 pt-2 bg-gradient-to-t from-black/10 to-transparent">
          <ChatInput 
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
};

export default ClaraAgent;