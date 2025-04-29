import React, { useEffect, useState } from 'react';
import { Message } from '@/types/chat';

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const { content, isUser, timestamp, imageUrl } = message;
  const [isVisible, setIsVisible] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  
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

  const renderImage = () => {
    if (!imageUrl) return null;
    
    return (
      <div className="mt-2 mb-1 overflow-hidden rounded-lg">
        <img 
          src={imageUrl} 
          alt="Shared image" 
          className={`w-full h-auto object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`} 
          onLoad={() => setImageLoaded(true)}
        />
      </div>
    );
  };

  if (isUser) {
    return (
      <div className={`flex justify-end mb-4 ${isVisible ? 'message-in' : 'opacity-0'}`}>
        <div className="chat-bubble chat-bubble-user max-w-[70%] p-3">
          {imageUrl && renderImage()}
          <p className="text-white text-sm">{renderContentWithLinks(content)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex mb-4 ${isVisible ? 'message-in' : 'opacity-0'}`}>
      <div className="chat-bubble chat-bubble-ai max-w-[70%] p-3">
        {imageUrl && renderImage()}
        <p className="text-gray-800 text-sm">{renderContentWithLinks(content)}</p>
      </div>
    </div>
  );
};

export default ChatMessage;
