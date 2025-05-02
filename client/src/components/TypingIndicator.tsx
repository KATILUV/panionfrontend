import React from 'react';
import { useThemeStore } from '../state/themeStore';

const TypingIndicator: React.FC = () => {
  const getCurrentTheme = useThemeStore((state) => state.getCurrentTheme);
  const isDarkMode = getCurrentTheme() === 'dark';
  
  return (
    <div className="flex items-start mb-4 animate-message-in">
      <div className={`${
        isDarkMode 
          ? 'bg-black/20 backdrop-blur-md text-white/90' 
          : 'bg-white/60 backdrop-blur-md text-black border border-gray-200/30 shadow-sm'
        } px-4 py-2 rounded-tl-2xl rounded-tr-2xl rounded-bl-2xl rounded-br-md`}>
        <div className="flex space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            isDarkMode ? 'bg-white/70' : 'bg-indigo-600/70'
          } animate-typing-dot-1`}></div>
          <div className={`w-2 h-2 rounded-full ${
            isDarkMode ? 'bg-white/70' : 'bg-indigo-600/70'
          } animate-typing-dot-2`}></div>
          <div className={`w-2 h-2 rounded-full ${
            isDarkMode ? 'bg-white/70' : 'bg-indigo-600/70'
          } animate-typing-dot-3`}></div>
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;