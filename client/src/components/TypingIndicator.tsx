import React, { useState, useEffect } from 'react';

const TypingIndicator: React.FC = () => {
  const [visible, setVisible] = useState(false);
  
  // Animation effect when component mounts
  useEffect(() => {
    setVisible(true);
    
    return () => {
      setVisible(false);
    };
  }, []);

  return (
    <div className={`flex mb-4 ${visible ? 'message-in' : 'opacity-0'}`}>
      <div className="chat-bubble chat-bubble-ai p-4 flex items-center">
        <div className="flex space-x-3">
          <div className="typing-dot w-3 h-3 bg-blue-500 rounded-full opacity-80"></div>
          <div className="typing-dot w-3 h-3 bg-purple-500 rounded-full opacity-80"></div>
          <div className="typing-dot w-3 h-3 bg-pink-500 rounded-full opacity-80"></div>
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;
