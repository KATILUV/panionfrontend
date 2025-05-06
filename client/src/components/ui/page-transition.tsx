import React, { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';

// Animation variants for different transition types
const transitions = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  },
  slideDown: {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
  },
  slideLeft: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  },
  slideRight: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
  },
  scale: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 1.05 },
  },
  scaleDown: {
    initial: { opacity: 0, scale: 1.05 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
  },
};

export type TransitionType = keyof typeof transitions;

interface PageTransitionProps {
  children: ReactNode;
  type?: TransitionType;
  duration?: number;
  className?: string;
}

interface TransitionWrapperProps extends PageTransitionProps {
  location: string;
}

// Component that wraps a page with transition animations
export function TransitionWrapper({ 
  children, 
  location, 
  type = 'fade', 
  duration = 0.3,
  className = '',
}: TransitionWrapperProps) {
  const variant = transitions[type];
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={variant}
        transition={{ duration }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * PageTransition component that wraps children in transition animations
 * based on route changes
 */
export function PageTransition({ 
  children, 
  type = 'fade',
  duration = 0.3,
  className = '',
}: PageTransitionProps) {
  const [location] = useLocation();
  
  return (
    <TransitionWrapper 
      location={location} 
      type={type} 
      duration={duration}
      className={className}
    >
      {children}
    </TransitionWrapper>
  );
}

/**
 * ElementTransition component for individual elements that need transitions
 * without being tied to route changes
 */
export function ElementTransition({
  children,
  type = 'fade',
  duration = 0.3,
  className = '',
  show = true,
  layoutId,
}: PageTransitionProps & { show?: boolean; layoutId?: string }) {
  const variant = transitions[type];
  
  return (
    <AnimatePresence mode="wait">
      {show && (
        <motion.div
          layoutId={layoutId}
          initial="initial"
          animate="animate"
          exit="exit"
          variants={variant}
          transition={{ duration }}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}