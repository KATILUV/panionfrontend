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
import { WindowPanel, WindowContent, windowTextStyles } from '../ui/window-components';
import { motion } from 'framer-motion';

const ClaraAgent: React.FC = () => {
  const { messages, isLoading, error, sendMessage } = useChat();
  // Using unified dark theme
  const accent = useThemeStore((state) => state.accent);
  
  // Track Clara's status
  const [status, setStatus] = useState<AgentStatusType>(messages.length > 0 ? "active" : "idle");
  // Toggle between carousel and traditional view
  const [carouselView, setCarouselView] = useState<boolean>(true);

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
  
  return (
    <WindowPanel 
      title="Clara" 
      status={status}
      fullHeight 
      className="flex flex-col h-full"
    >
      <div className="w-full max-w-full flex flex-col h-full">
        <div className="text-center mb-2 flex justify-between items-center px-2">
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
            className={`text-sm font-light ${windowTextStyles.muted}`}
          />
          
          {/* View toggle button */}
          <button 
            onClick={() => setCarouselView(!carouselView)}
            className="px-2 py-1 text-xs bg-black/20 hover:bg-black/40 rounded-md backdrop-blur-sm transition-all"
          >
            {carouselView ? "Standard View" : "Carousel View"}
          </button>
        </div>

        {/* Orb */}
        {carouselView && <ClaraOrb isProcessing={isLoading} />}

        {/* Main content area - conditionally render carousel or standard view */}
        {carouselView ? (
          // Carousel view
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex flex-col"
          >
            <ChatCarousel messages={messages} isLoading={isLoading} />
            
            {/* Loading indicator */}
            {isLoading && (
              <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2">
                <TypingIndicator />
              </div>
            )}
          </motion.div>
        ) : (
          // Traditional chat view
          <WindowContent
            variant="ghost"
            padding="none"
            className="flex-1 pr-2 space-y-2 overflow-y-auto"
          >
            {messages.length === 0 ? (
              <WindowContent 
                variant="default"
                className="flex flex-col items-center justify-center h-full text-center space-y-4"
              >
                <p className={windowTextStyles.bright}>Welcome to Clara! How can I assist you today?</p>
                <p className={windowTextStyles.caption}>Ask me anything or share an image with me.</p>
              </WindowContent>
            ) : (
              <div className="space-y-2 py-2">
                {messages.map((message, index) => (
                  <div key={index} 
                    className={`flex ${message.isUser ? 'justify-end' : 'justify-start'} mb-4`}
                  >
                    <div 
                      className={`max-w-[80%] px-4 py-3 rounded-2xl
                        ${message.isUser 
                          ? 'bg-gradient-to-br from-purple-700/90 to-purple-900/90 text-white border border-purple-400/20 rounded-tr-md rounded-tl-2xl rounded-bl-2xl rounded-br-md' 
                          : 'bg-gradient-to-br from-gray-900/80 to-black/80 text-white border border-white/10 rounded-tl-md rounded-tr-2xl rounded-bl-md rounded-br-2xl'
                        }
                      `}
                    >
                      {message.imageUrl && (
                        <div className="mb-2">
                          <img 
                            src={message.imageUrl} 
                            alt={message.isUser ? "User shared image" : "AI shared image"}
                            className="max-w-full max-h-[180px] rounded-xl shadow-lg border border-white/20"
                          />
                        </div>
                      )}
                      <div>
                        {message.content.split('\n').map((text, i) => (
                          <React.Fragment key={i}>
                            {text}
                            {i !== message.content.split('\n').length - 1 && <br />}
                          </React.Fragment>
                        ))}
                      </div>
                      <div className={`text-xs mt-1 ${message.isUser ? 'text-purple-200/70' : 'text-white/50'}`}>
                        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && <TypingIndicator />}
              </div>
            )}
            
            {error && (
              <WindowContent 
                variant="primary"
                className="bg-red-900/10 text-center"
              >
                <p className={windowTextStyles.error}>{error}</p>
              </WindowContent>
            )}
          </WindowContent>
        )}
        
        {/* Chat Input - Fixed at bottom */}
        <div className="sticky bottom-0 pt-2 bg-gradient-to-t from-black/10 to-transparent">
          <ChatInput 
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
          />
        </div>
      </div>
    </WindowPanel>
  );
};

export default ClaraAgent;