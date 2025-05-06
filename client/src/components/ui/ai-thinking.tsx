import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AIThinkingIndicatorProps {
  isThinking: boolean;
  message?: string;
  type?: 'minimal' | 'full' | 'dots';
}

/**
 * AI Thinking Indicator component with different animation styles
 * to show when the AI is processing a request
 */
const AIThinkingIndicator: React.FC<AIThinkingIndicatorProps> = ({
  isThinking,
  message = 'AI is thinking...',
  type = 'full'
}) => {
  if (!isThinking) return null;
  
  // Minimal indicator - just a simple pulsing dot
  if (type === 'minimal') {
    return (
      <AnimatePresence>
        {isThinking && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="inline-flex items-center space-x-1"
          >
            <motion.div
              className="w-2 h-2 rounded-full bg-indigo-400"
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.6, 1, 0.6]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    );
  }
  
  // Dots indicator - three dots that animate
  if (type === 'dots') {
    const dotVariants = {
      initial: { y: 0 },
      animate: (i: number) => ({
        y: [0, -5, 0],
        transition: {
          delay: i * 0.1,
          duration: 0.6,
          repeat: Infinity,
          repeatType: "loop" as const
        }
      })
    };
    
    return (
      <AnimatePresence>
        {isThinking && (
          <motion.div 
            className="inline-flex items-center justify-center space-x-1 py-1 px-2 rounded-full bg-gray-800/40 backdrop-blur-sm"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-indigo-400"
                variants={dotVariants}
                initial="initial"
                animate="animate"
                custom={i}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    );
  }
  
  // Full indicator with message
  return (
    <AnimatePresence>
      {isThinking && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.3 }}
          className="flex items-center space-x-2 py-1.5 px-3 rounded-lg bg-gray-900/50 backdrop-blur-sm text-xs text-gray-200 shadow-md border border-gray-800/50"
        >
          <div className="relative w-4 h-4">
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-t-indigo-500 border-r-transparent border-b-transparent border-l-transparent"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-t-transparent border-r-transparent border-b-indigo-300 border-l-transparent"
              animate={{ rotate: -180 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            />
          </div>
          <span>{message}</span>
          <motion.span
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            ...
          </motion.span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AIThinkingIndicator;