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
    <div className="flex-1 overflow-y-auto mb-4 px-2 py-4 rounded-lg bg-white bg-opacity-40 backdrop-blur-sm">
      {messages.map((message, index) => (
        <ChatMessage key={index} message={message} />
      ))}
      
      {isLoading && <TypingIndicator />}
      
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatContainer;
