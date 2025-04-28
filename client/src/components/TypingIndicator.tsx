import React from 'react';

const TypingIndicator: React.FC = () => {
  return (
    <div className="flex mb-4">
      <div className="bg-secondary rounded-t-xl rounded-br-xl p-3 shadow-sm flex items-center">
        <div className="flex space-x-1">
          <div className="typing-dot w-2 h-2 bg-gray-400 rounded-full"></div>
          <div className="typing-dot w-2 h-2 bg-gray-400 rounded-full"></div>
          <div className="typing-dot w-2 h-2 bg-gray-400 rounded-full"></div>
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;
