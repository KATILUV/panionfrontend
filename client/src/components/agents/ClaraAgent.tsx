import React, { useEffect, useState } from 'react';
import ClaraOrb from '../ClaraOrb';
import ChatInput from '../ChatInput';
import TypingIndicator from '../TypingIndicator';
import ChatCarousel from '../ChatCarousel';
import RotatingTagline from '../RotatingTagline';
import { useChat } from '../../hooks/useChat';
import { log } from '../../state/systemLogStore';
import { useThemeStore } from '../../state/themeStore';
import { AgentStatusType } from '../ui/agent-status';
import { WindowPanel } from '../ui/window-panel';
import { WindowContent } from '../ui/window-content';
import { windowTextStyles } from '../ui/window-components.ts';
import { motion } from 'framer-motion';

const ClaraAgent: React.FC = () => {
  const { messages, isLoading, error, sendMessage } = useChat();
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
  
  // Log when new messages are received
  useEffect(() => {
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
  
  // Error display component
  const ErrorDisplay = () => (
    error ? (
      <WindowContent 
        variant="primary"
        className="bg-red-900/10 text-center"
      >
        <p className={windowTextStyles.error}>{error}</p>
      </WindowContent>
    ) : null
  );
  
  return (
    <WindowPanel 
      title="Clara" 
      status={status}
      fullHeight 
      className="flex flex-col h-full"
    >
      <div className="w-full max-w-full flex flex-col h-full relative overflow-hidden">
        {/* Header with tagline */}
        <div className="sticky top-0 z-10 mb-2 flex justify-center items-center px-2 bg-black/20 backdrop-blur-sm py-1 rounded-b-md">
          <div className="overflow-hidden">
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
              className={`text-sm font-light truncate text-center w-full ${windowTextStyles.muted}`}
            />
          </div>
        </div>

        {/* Main content area with flexible layout */}
        <div className="flex-1 flex flex-col overflow-hidden relative min-h-0">
          {/* Error display */}
          <ErrorDisplay />
          
          {/* Orb */}
          <div className="flex-shrink-0">
            <ClaraOrb isProcessing={isLoading} />
          </div>

          {/* Chat carousel */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex flex-col min-h-0 mb-2"
            style={{ 
              willChange: 'transform',
              transform: 'translateZ(0)'
            }}
          >
            <ChatCarousel messages={messages} isLoading={isLoading} />
            
            {/* Loading indicator */}
            {isLoading && (
              <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2">
                <TypingIndicator />
              </div>
            )}
          </motion.div>
          
          {/* Chat Input - Fixed at bottom */}
          <div className="sticky bottom-0 pt-2 mt-auto px-4 bg-gradient-to-t from-black/10 to-transparent">
            <ChatInput 
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>
    </WindowPanel>
  );
};

export default ClaraAgent;