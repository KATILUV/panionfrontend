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
      <div className="bg-secondary rounded-t-xl rounded-br-xl p-3 shadow-sm flex items-center">
        <div className="flex space-x-2">
          <div className="typing-dot w-2.5 h-2.5 bg-primary rounded-full opacity-80"></div>
          <div className="typing-dot w-2.5 h-2.5 bg-primary rounded-full opacity-80"></div>
          <div className="typing-dot w-2.5 h-2.5 bg-primary rounded-full opacity-80"></div>
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;
