import React, { useRef, useEffect } from 'react';
import ClaraOrb from '../components/ClaraOrb';
import ChatBubble from '../components/ChatBubble';
import ChatInput from '../components/ChatInput';
import TypingIndicator from '../components/TypingIndicator';
import RotatingTagline from '../components/RotatingTagline';
import { ErrorMessage } from '../components/ui/error-message';
import { useChat } from '../hooks/useChat';
import { useThemeStore } from '@/state/themeStore';
import { Message } from '../types/chat';

const ChatPage: React.FC = () => {
  const { messages, isLoading, error, sendMessage } = useChat();
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const currentTheme = useThemeStore(state => state.getCurrentTheme());
  const accent = useThemeStore(state => state.accent);

  // Generate gradient classes based on current theme and accent
  const getGradient = () => {
    const isDark = currentTheme === 'dark';
    
    switch (accent) {
      case 'purple':
        return isDark 
          ? 'from-purple-950 via-[#1a1245] to-[#150d38]' 
          : 'from-purple-100 via-purple-50 to-white';
      case 'blue':
        return isDark 
          ? 'from-blue-950 via-[#0a1a2f] to-[#0c1827]' 
          : 'from-blue-100 via-blue-50 to-white';
      case 'green':
        return isDark 
          ? 'from-green-950 via-[#0f2922] to-[#0c211c]' 
          : 'from-green-100 via-green-50 to-white';
      case 'orange':
        return isDark 
          ? 'from-orange-950 via-[#261409] to-[#1f1107]' 
          : 'from-orange-100 via-orange-50 to-white';
      case 'pink':
        return isDark 
          ? 'from-pink-950 via-[#270d1a] to-[#1f0b16]' 
          : 'from-pink-100 via-pink-50 to-white';
      default:
        return isDark 
          ? 'from-purple-950 via-[#1a1245] to-[#150d38]' 
          : 'from-purple-100 via-purple-50 to-white';
    }
  };

  // Text colors based on theme
  const getTextColor = () => {
    return currentTheme === 'dark' ? 'text-white' : 'text-gray-900';
  };
  
  const getMutedTextColor = () => {
    return currentTheme === 'dark' ? 'text-white/80' : 'text-gray-600';
  };

  const getEmptyStateTextColor = () => {
    return currentTheme === 'dark' ? 'text-white/50' : 'text-gray-500';
  };

  const getScrollbarColor = () => {
    return currentTheme === 'dark' 
      ? 'scrollbar-thumb-white/10 scrollbar-track-transparent' 
      : 'scrollbar-thumb-gray-300 scrollbar-track-transparent';
  };

  // Generate bottom gradient for inputs
  const getBottomGradient = () => {
    return currentTheme === 'dark'
      ? 'from-[#150d38] to-transparent'
      : 'from-white to-transparent';
  };

  // Scroll to bottom of chat when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = (message: string, imageFile?: File | null) => {
    sendMessage(message, imageFile);
  };

  return (
    <div className={`h-screen flex flex-col items-center bg-gradient-to-br ${getGradient()}`}>
      <div className="w-full max-w-2xl flex flex-col h-full">
        {/* Header */}
        <div className="text-center pt-6 mb-2">
          <h1 className={`text-2xl font-semibold ${getTextColor()} mb-1`}>Clara</h1>
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
            className={`${getMutedTextColor()} text-sm font-light`}
          />
        </div>

        {/* Orb */}
        <ClaraOrb isProcessing={isLoading} />

        {/* Chat Messages Container */}
        <div 
          ref={chatContainerRef}
          className={`flex-1 overflow-y-auto pr-2 space-y-2 scrollbar-thin ${getScrollbarColor()}`}
        >
          {messages.length === 0 ? (
            <div className={`flex flex-col items-center justify-center h-full text-center ${getEmptyStateTextColor()} space-y-4`}>
              <p>Welcome to Clara! How can I assist you today?</p>
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
            <div className="px-4 py-2">
              <ErrorMessage
                type="server"
                message={error}
                retryFn={() => sendMessage(messages[messages.length - 1]?.content || "")}
                size="md"
                variant="inline"
              />
            </div>
          )}
        </div>
        
        {/* Chat Input - Fixed at bottom */}
        <div className={`sticky bottom-0 pb-6 pt-2 bg-gradient-to-t ${getBottomGradient()}`}>
          <ChatInput 
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
};

export default ChatPage;