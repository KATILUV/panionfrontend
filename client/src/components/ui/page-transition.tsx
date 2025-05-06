import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type TransitionType = 'fade' | 'slideUp' | 'slideDown' | 'slideLeft' | 'slideRight' | 'scale';

interface PageTransitionProps {
  children: React.ReactNode;
  type?: TransitionType;
  duration?: number; // in seconds
  className?: string;
}

interface ElementTransitionProps {
  children: React.ReactNode;
  show?: boolean;
  type?: TransitionType;
  duration?: number; // in seconds
  className?: string;
}

const getTransitionVariants = (type: TransitionType, duration: number) => {
  const variants = {
    fade: {
      initial: { opacity: 0 },
      animate: { opacity: 1, transition: { duration } },
      exit: { opacity: 0, transition: { duration: duration * 0.75 } }
    },
    slideUp: {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0, transition: { duration } },
      exit: { opacity: 0, y: -20, transition: { duration: duration * 0.75 } }
    },
    slideDown: {
      initial: { opacity: 0, y: -20 },
      animate: { opacity: 1, y: 0, transition: { duration } },
      exit: { opacity: 0, y: 20, transition: { duration: duration * 0.75 } }
    },
    slideLeft: {
      initial: { opacity: 0, x: 20 },
      animate: { opacity: 1, x: 0, transition: { duration } },
      exit: { opacity: 0, x: -20, transition: { duration: duration * 0.75 } }
    },
    slideRight: {
      initial: { opacity: 0, x: -20 },
      animate: { opacity: 1, x: 0, transition: { duration } },
      exit: { opacity: 0, x: 20, transition: { duration: duration * 0.75 } }
    },
    scale: {
      initial: { opacity: 0, scale: 0.95 },
      animate: { opacity: 1, scale: 1, transition: { duration } },
      exit: { opacity: 0, scale: 1.05, transition: { duration: duration * 0.75 } }
    }
  };

  return variants[type];
};

export function PageTransition({ 
  children, 
  type = 'fade',
  duration = 0.3,
  className 
}: PageTransitionProps) {
  const [isVisible, setIsVisible] = useState(false);
  const variants = getTransitionVariants(type, duration);

  useEffect(() => {
    // Small delay to ensure the component mounts before animating
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 10);

    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          key="page-transition"
          initial="initial"
          animate="animate"
          exit="exit"
          variants={variants}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ElementTransition({
  children,
  show = true,
  type = 'fade',
  duration = 0.3,
  className
}: ElementTransitionProps) {
  const variants = getTransitionVariants(type, duration);
  
  return (
    <AnimatePresence mode="wait">
      {show && (
        <motion.div
          key="element-transition"
          initial="initial"
          animate="animate"
          exit="exit"
          variants={variants}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}