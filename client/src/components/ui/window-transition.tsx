import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface WindowTransitionProps {
  children: React.ReactNode;
  isVisible: boolean;
  duration?: number;
  onExitComplete?: () => void;
}

/**
 * WindowTransition provides a smooth transition effect for windows
 * with configurable enter/exit animations
 */
const WindowTransition: React.FC<WindowTransitionProps> = ({
  children,
  isVisible,
  duration = 0.3,
  onExitComplete
}) => {
  const variants = {
    hidden: {
      opacity: 0,
      scale: 0.96,
      filter: 'blur(2px)',
      y: 8
    },
    visible: {
      opacity: 1,
      scale: 1,
      filter: 'blur(0px)',
      y: 0
    },
    exit: {
      opacity: 0,
      scale: 0.94,
      filter: 'blur(4px)',
      y: 16,
      transition: {
        duration: duration * 0.7
      }
    }
  };

  return (
    <AnimatePresence onExitComplete={onExitComplete}>
      {isVisible && (
        <motion.div
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={variants}
          transition={{
            type: 'spring',
            damping: 25,
            stiffness: 350,
            duration: duration
          }}
          style={{
            willChange: 'transform, opacity, filter',
            transformOrigin: 'center center',
            backfaceVisibility: 'hidden',
            perspective: 1000,
            WebkitFontSmoothing: 'subpixel-antialiased'
          }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WindowTransition;