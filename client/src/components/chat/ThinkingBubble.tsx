/**
 * ThinkingBubble Component
 * Displays an animated thinking indicator for the chat interface
 */

import React from 'react';
import { motion } from 'framer-motion';

interface ThinkingBubbleProps {
  /**
   * Message to display
   */
  message?: string;
  
  /**
   * Optional CSS class names
   */
  className?: string;
}

/**
 * Animated thinking bubble component for chat interfaces
 */
export const ThinkingBubble: React.FC<ThinkingBubbleProps> = ({
  message = 'Thinking...',
  className = ''
}) => {
  // Animation variants for the dots
  const dotVariants = {
    initial: { y: 0 },
    animate: (i: number) => ({
      y: [0, -5, 0],
      transition: {
        delay: i * 0.15,
        duration: 0.6,
        repeat: Infinity,
        repeatType: 'loop' as const
      }
    })
  };
  
  return (
    <div className={`thinking-bubble flex items-center ${className}`}>
      <div className="thinking-bubble-content bg-muted/70 text-muted-foreground rounded-lg py-2 px-3 text-sm flex items-center">
        <span className="mr-2">{message}</span>
        <div className="dots-container flex space-x-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              custom={i}
              variants={dotVariants}
              initial="initial"
              animate="animate"
              className="w-1.5 h-1.5 bg-current rounded-full"
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ThinkingBubble;