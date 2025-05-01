import React, { useRef, useEffect } from 'react';
import ClaraOrb from '../components/ClaraOrb';
import ChatBubble from '../components/ChatBubble';
import ChatInput from '../components/ChatInput';
import TypingIndicator from '../components/TypingIndicator';
import useChat from '../hooks/useChat';

const ChatPage: React.FC = () => {
  const { messages, isLoading, error, sendMessage } = useChat();
  const chatContainerRef = useRef<HTMLDivElement>(null);

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
    <div className="min-h-screen flex flex-col items-center py-8 px-4">
      <div className="w-full max-w-2xl flex flex-col h-[85vh]">
        {/* Header */}
        <div className="text-center mb-2">
          <h1 className="text-2xl font-semibold text-white mb-1">Clara</h1>
          <p className="text-white/70 text-sm">Your AI companion</p>
        </div>

        {/* Orb */}
        <ClaraOrb isProcessing={isLoading} />

        {/* Chat Messages Container */}
        <div 
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto mb-4 pr-2 space-y-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-white/50 space-y-4">
              <p>Welcome to Clara! How can I assist you today?</p>
              <p className="text-sm">Ask me anything or share an image with me.</p>
            </div>
          ) : (
            <>
              {messages.map((message, index) => (
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

        {/* Chat Input */}
        <ChatInput 
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
        />
        
        {/* Footer */}
        <div className="text-center text-white/50 text-xs mt-2">
          <p>Clara AI • Your magical companion</p>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;