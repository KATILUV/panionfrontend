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
      <div className="chat-bubble chat-bubble-ai p-2.5 flex items-center">
        <div className="flex space-x-2">
          <div className="typing-dot w-2 h-2 bg-blue-500 rounded-full opacity-80"></div>
          <div className="typing-dot w-2 h-2 bg-purple-500 rounded-full opacity-80"></div>
          <div className="typing-dot w-2 h-2 bg-pink-500 rounded-full opacity-80"></div>
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;
