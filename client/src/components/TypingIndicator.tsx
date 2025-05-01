import React from 'react';

const TypingIndicator: React.FC = () => {
  return (
    <div className="flex items-start mb-4 animate-message-in">
      <div className="bg-black/20 backdrop-blur-md px-4 py-2 rounded-tl-2xl rounded-tr-2xl rounded-bl-2xl rounded-br-md text-white/90">
        <div className="flex space-x-2">
          <div className="w-2 h-2 rounded-full bg-white/70 animate-typing-dot-1"></div>
          <div className="w-2 h-2 rounded-full bg-white/70 animate-typing-dot-2"></div>
          <div className="w-2 h-2 rounded-full bg-white/70 animate-typing-dot-3"></div>
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;