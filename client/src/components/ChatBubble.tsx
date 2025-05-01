import React from 'react';
import { Message } from '../types/chat';

interface ChatBubbleProps {
  message: Message;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const { content, isUser, timestamp, imageUrl } = message;

  // Format timestamp to readable time
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div 
      className={`
        flex flex-col 
        ${isUser ? 'items-end' : 'items-start'} 
        mb-4 animate-message-in
      `}
    >
      {isUser && imageUrl && (
        <div className="relative max-w-[180px] mb-2">
          <img 
            src={imageUrl} 
            alt="User shared image"
            className="max-w-full max-h-[180px] rounded-xl border-3 border-white/20 shadow-lg"
          />
        </div>
      )}
      
      <div 
        className={`
          max-w-[80%] px-4 py-3 rounded-2xl
          ${isUser 
            ? 'chat-bubble-user rounded-tr-2xl rounded-tl-2xl rounded-bl-md rounded-br-2xl' 
            : 'chat-bubble-ai bg-white/85 backdrop-blur-md text-black rounded-tl-2xl rounded-tr-2xl rounded-bl-2xl rounded-br-md'
          }
        `}
      >
        <div className="relative z-10">
          {content}
          <div className={`text-xs mt-1 ${isUser ? 'text-white/70' : 'text-black/50'}`}>
            {formatTime(timestamp)}
          </div>
        </div>
      </div>
      
      {!isUser && imageUrl && (
        <div className="max-w-[240px] mt-2">
          <img 
            src={imageUrl} 
            alt="AI shared image"
            className="max-w-full rounded-xl border border-purple-300/30 shadow-lg"
          />
        </div>
      )}
    </div>
  );
};

export default ChatBubble;