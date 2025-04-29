import React from 'react';
import ClaraOrb from '@/components/ClaraOrb';
import ChatContainer from '@/components/ChatContainer';
import SimpleInput from '@/components/SimpleInput';
import { useChat } from '@/hooks/useChat';

/**
 * Main Chat page for Clara
 * Handles displaying chat messages, input, and visual elements
 */
const Chat: React.FC = () => {
  // Use our simplified chat hook
  const { messages, isLoading, sendMessage } = useChat();

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto px-4 md:px-6 py-4">
      {/* Clara's orb with animated processing state */}
      <ClaraOrb isProcessing={isLoading} />

      {/* Title and status */}
      <div className="text-center mb-5">
        <h1 className="text-3xl font-semibold text-white transition-all duration-300 hover:text-primary">
          Clara
        </h1>
        <p className="text-sm text-gray-300">
          {isLoading ? 'Thinking...' : 'Your AI Companion'}
        </p>
      </div>

      {/* Chat messages */}
      <ChatContainer 
        messages={messages} 
        isLoading={isLoading} 
      />
  
      {/* Chat input */}
      <SimpleInput 
        onSubmit={sendMessage}
        isLoading={isLoading}
      />

      {/* Footer */}
      <div className="text-center text-xs text-gray-300 mt-2 mb-1">
        <p>✨ Clara remembers important information from your conversations ✨</p>
      </div>
    </div>
  );
};

export default Chat;
