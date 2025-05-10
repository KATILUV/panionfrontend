import React, { useRef, useEffect, useState } from 'react';
import ClaraOrb from '../components/ClaraOrb';
import { ChatInterface } from '@/components/chat/ChatInterface';
import RotatingTagline from '../components/RotatingTagline';
import { ErrorMessage } from '../components/ui/error-message';
import { useChat } from '../hooks/useChat';
import { useThemeStore } from '@/state/themeStore';
import { ChatMessage, AgentStatusType } from '@/types/chat';

const ChatPage: React.FC = () => {
  const { messages, isLoading, error, sendMessage } = useChat();
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const currentTheme = useThemeStore(state => state.getCurrentTheme());
  const accent = useThemeStore(state => state.accent);
  const [message, setMessage] = useState("");

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

  // Determine the agent status
  const [agentStatus, setAgentStatus] = useState<AgentStatusType>('idle');
  
  useEffect(() => {
    if (error) {
      setAgentStatus('error');
    } else if (isLoading) {
      setAgentStatus('thinking');
    } else if (messages.length > 0) {
      setAgentStatus('active');
    } else {
      setAgentStatus('idle');
    }
  }, [isLoading, error, messages.length]);

  // Handle send message (we're using the simplified interface)
  const handleSendMessage = (text: string) => {
    sendMessage(text);
    setMessage('');
  };

  return (
    <div className={`h-screen flex flex-col items-center bg-gradient-to-br ${getGradient()}`}>
      <div className="w-full max-w-2xl flex flex-col h-full p-2">
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

        {/* ChatInterface - unified component */}
        <div className="flex-1 relative">
          <ChatInterface
            messages={messages}
            inputValue={message}
            setInputValue={setMessage}
            isLoading={isLoading}
            agentStatus={agentStatus}
            sendMessage={handleSendMessage}
            messagesEndRef={chatContainerRef}
            title="Clara"
            subtitle="Personal Assistant"
            showSettings={false}
          />
          
          {error && !messages.some(m => m.content.includes(error)) && (
            <div className="absolute bottom-16 left-0 right-0 px-4 py-4 z-10">
              <ErrorMessage
                type={error.toLowerCase().includes('network') ? 'network' : 
                      error.toLowerCase().includes('timeout') ? 'timeout' :
                      error.toLowerCase().includes('not found') ? 'notFound' :
                      error.toLowerCase().includes('unauthorized') ? 'unauthorized' :
                      error.toLowerCase().includes('forbidden') ? 'forbidden' :
                      error.toLowerCase().includes('validation') ? 'validation' :
                      'server'}
                message={error}
                retryFn={() => sendMessage(messages[messages.length - 1]?.content || "")}
                size="md"
                variant="inline"
                dismissable={true}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatPage;