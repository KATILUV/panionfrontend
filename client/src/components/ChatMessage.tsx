import React, { useEffect, useState } from 'react';
import { Message } from '@/types/chat';

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const { content, isUser, timestamp } = message;
  const [isVisible, setIsVisible] = useState(false);
  
  // Format time as hours and minutes
  const time = new Date(timestamp).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  // Animation effect on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const renderContentWithLinks = (text: string) => {
    // Simple URL regex pattern
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    
    // Split by URLs and render
    const parts = text.split(urlPattern);
    
    return parts.map((part, index) => {
      // Check if part is a URL
      if (part.match(urlPattern)) {
        return (
          <a 
            key={index} 
            href={part} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            {part}
          </a>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  if (isUser) {
    return (
      <div className={`flex justify-end mb-4 ${isVisible ? 'message-in' : 'opacity-0'}`}>
        <div className="chat-bubble chat-bubble-user max-w-[70%] p-3">
          <p className="text-white text-sm">{renderContentWithLinks(content)}</p>
          <span className="chat-time text-white/80 block text-right mt-1">{time}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex mb-4 ${isVisible ? 'message-in' : 'opacity-0'}`}>
      <div className="chat-bubble chat-bubble-ai max-w-[70%] p-3">
        <p className="text-gray-800 text-sm">{renderContentWithLinks(content)}</p>
        <span className="chat-time text-gray-500 block mt-1">{time}</span>
      </div>
    </div>
  );
};

export default ChatMessage;
