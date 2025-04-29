import React, { useRef, useEffect } from 'react';
import { Message } from '@/types/chat';
import ChatMessage from './ChatMessage';
import TypingIndicator from './TypingIndicator';

interface ChatContainerProps {
  messages: Message[];
  isLoading: boolean;
}

const ChatContainer: React.FC<ChatContainerProps> = ({ messages, isLoading }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto mb-4 px-4 py-5 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 shadow-lg">
      {messages.map((message, index) => (
        <ChatMessage key={index} message={message} />
      ))}
      
      {isLoading && <TypingIndicator />}
      
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatContainer;
