import React, { useRef, useEffect } from 'react';
import PanionOrb from '../PanionOrb';
import ChatBubble from '../ChatBubble';
import ChatInput from '../ChatInput';
import TypingIndicator from '../TypingIndicator';
import RotatingTagline from '../RotatingTagline';
import { useChat } from '../../hooks/useChat';
import { Message } from '../../types/chat';
import { log } from '../../state/systemLogStore';

const PanionAgent: React.FC = () => {
  const { messages, isLoading, error, sendMessage } = useChat();
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Log when the component mounts and unmounts
  useEffect(() => {
    log.action('Panion agent window opened');
    
    return () => {
      log.action('Panion agent window closed');
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

  const handleSendMessage = (message: string, imageFile?: File | null) => {
    sendMessage(message, imageFile);
  };

  return (
    <div className="h-full flex flex-col items-center bg-gradient-to-b from-transparent to-black/30 p-4">
      <div className="w-full max-w-full flex flex-col h-full">
        {/* Header */}
        <div className="text-center mb-2">
          <RotatingTagline 
            phrases={[
              "The future isn't artificial — it's intentional.",
              "Dream deeper. Build smarter. Evolve together.",
              "You architect. Panion amplifies.",
              "Co-building the future of you.",
              "Your thought partner in progress.",
              "Part interface, part intelligence, all intention.",
              "Dream bigger. Build together."
            ]}
            interval={7000}
            className="text-white/80 text-sm font-light"
          />
        </div>

        {/* Orb */}
        <PanionOrb isProcessing={isLoading} />

        {/* Chat Messages Container */}
        <div 
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto pr-2 space-y-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-white/50 space-y-4">
              <p>Welcome to Panion! How can I assist you today?</p>
              <p className="text-sm">Ask me anything or share an image with me.</p>
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
            <div className="text-red-400 text-center py-2 px-4 rounded-md bg-red-900/20 backdrop-blur-sm">
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

export default PanionAgent;