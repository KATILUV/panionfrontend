import React from 'react';
import { Message } from '@/types/chat';

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const { content, isUser, timestamp } = message;
  
  // Format time as hours and minutes
  const time = new Date(timestamp).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  if (isUser) {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[80%] bg-white rounded-t-xl rounded-bl-xl p-3 shadow-sm border border-gray-100">
          <p className="text-dark-gray">{content}</p>
          <span className="text-xs text-gray-400 block text-right mt-1">{time}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex mb-4">
      <div className="max-w-[80%] bg-secondary rounded-t-xl rounded-br-xl p-3 shadow-sm">
        <p className="text-dark-gray">{content}</p>
        <span className="text-xs text-gray-400 block mt-1">{time}</span>
      </div>
    </div>
  );
};

export default ChatMessage;
