import React, { useState } from 'react';
import { Message } from '../types/chat';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useThemeStore } from '../state/themeStore';
import { windowTextStyles } from './ui/window-components.ts';

interface ChatCarouselProps {
  messages: Message[];
  isLoading: boolean;
}

const ChatCarousel: React.FC<ChatCarouselProps> = ({ messages, isLoading }) => {
  const [currentIndex, setCurrentIndex] = useState(messages.length > 0 ? messages.length - 1 : 0);
  const accent = useThemeStore((state) => state.accent);
  const isDarkMode = true; // Always dark mode for Panion

  // Format timestamp to readable time
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Function to get dot indicator color based on message type
  const getDotColor = (index: number) => {
    if (index >= messages.length) return 'bg-gray-400';
    return messages[index].isUser ? 'bg-purple-500' : 'bg-white';
  };

  const goToPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const goToNext = () => {
    if (currentIndex < messages.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  // If there are no messages, show welcome screen
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center space-y-4 p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-black/30 backdrop-blur-sm rounded-2xl p-8 max-w-md shadow-lg border border-purple-500/20"
        >
          <h2 className={`text-xl font-semibold mb-3 ${windowTextStyles.bright}`}>Welcome to Clara!</h2>
          <p className={windowTextStyles.default}>How can I assist you today?</p>
          <p className={`mt-2 ${windowTextStyles.caption}`}>Ask me anything or share an image with me.</p>
        </motion.div>
      </div>
    );
  }

  // Always show the latest message when new messages arrive
  React.useEffect(() => {
    setCurrentIndex(messages.length - 1);
  }, [messages.length]);

  const currentMessage = messages[currentIndex];

  return (
    <div className="relative flex-1 h-full">
      {/* Main carousel area */}
      <div className="overflow-hidden h-full">
        <div className="flex h-full relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full flex flex-col items-center justify-center p-4"
            >
              <div 
                className={`
                  max-w-[85%] min-h-[150px] px-6 py-4 rounded-2xl shadow-lg
                  ${currentMessage.isUser 
                    ? 'bg-gradient-to-br from-purple-700/90 to-purple-900/90 border-2 border-purple-400/20' 
                    : 'bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-md border-2 border-white/10'
                  }
                  relative overflow-hidden flex flex-col
                `}
              >
                {/* Glowing orb background effect */}
                <div className={`absolute ${currentMessage.isUser ? '-top-10 -right-10' : '-top-10 -left-10'} w-20 h-20 rounded-full blur-xl opacity-30 ${currentMessage.isUser ? 'bg-purple-500' : 'bg-blue-400'}`}></div>
                
                {/* Message header - show who is speaking */}
                <div className={`text-sm font-medium mb-2 ${currentMessage.isUser ? 'text-purple-200' : 'text-blue-200'}`}>
                  {currentMessage.isUser ? 'You' : 'Clara'}
                </div>
                
                {/* Message content */}
                <div className="flex-grow flex flex-col">
                  {currentMessage.imageUrl && (
                    <div className="relative max-w-[240px] mx-auto mb-4">
                      <img 
                        src={currentMessage.imageUrl} 
                        alt={currentMessage.isUser ? "User shared image" : "AI shared image"}
                        className="max-w-full max-h-[240px] rounded-xl shadow-lg border border-white/20"
                      />
                    </div>
                  )}
                  
                  <p className="text-lg flex-grow text-white">
                    {currentMessage.content.split('\n').map((text: string, i: number) => (
                      <React.Fragment key={i}>
                        {text}
                        {i !== currentMessage.content.split('\n').length - 1 && <br />}
                      </React.Fragment>
                    ))}
                  </p>
                </div>
                
                {/* Timestamp */}
                <div className={`text-xs mt-3 self-end ${currentMessage.isUser ? 'text-purple-200/70' : 'text-white/50'}`}>
                  {formatTime(currentMessage.timestamp)}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      
      {/* Navigation controls */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-between items-center px-4">
        <button 
          onClick={goToPrev} 
          disabled={currentIndex === 0}
          className={`p-2 rounded-full ${currentIndex > 0 ? 'bg-black/40 hover:bg-black/60 text-white' : 'bg-black/20 text-white/40'} transition-all`}
        >
          <ChevronLeft size={24} />
        </button>
        
        {/* Pagination dots */}
        <div className="flex space-x-1.5">
          {messages.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                index === currentIndex
                  ? getDotColor(index)
                  : 'bg-gray-500/30 hover:bg-gray-500/50'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
        
        <button 
          onClick={goToNext} 
          disabled={currentIndex === messages.length - 1}
          className={`p-2 rounded-full ${currentIndex < messages.length - 1 ? 'bg-black/40 hover:bg-black/60 text-white' : 'bg-black/20 text-white/40'} transition-all`}
        >
          <ChevronRight size={24} />
        </button>
      </div>
    </div>
  );
};

export default ChatCarousel;