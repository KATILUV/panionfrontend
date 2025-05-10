/**
 * MobileOptimizedWindow Component
 * A mobile-specific window container with touch-friendly controls and gestures
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { X, Minimize2, ArrowLeft, MoreVertical } from 'lucide-react';
import { AgentId, useAgentStore } from '@/state/agentStore';
import { useThemeStore } from '@/state/themeStore';
import { useWindowSize } from 'react-use';
import { useTaskbarDimensions } from '@/hooks/use-taskbar-dimensions';
import { playCloseSound, playOpenSound } from '@/lib/audioEffects';
import log from '@/utils/logger';

interface MobileOptimizedWindowProps {
  id: AgentId;
  title: string;
  children: React.ReactNode;
  isActive: boolean;
  position: { x: number, y: number };
  size: { width: number, height: number };
  zIndex: number;
  onClose: () => void;
  onMinimize: () => void;
  onFocus: () => void;
  isMinimized?: boolean;
}

const MobileOptimizedWindow: React.FC<MobileOptimizedWindowProps> = ({
  id,
  title,
  children,
  isActive,
  position,
  size,
  zIndex,
  onClose,
  onMinimize,
  onFocus,
  isMinimized = false
}) => {
  const updateAgentPosition = useAgentStore(state => state.updateAgentPosition);
  const updateAgentSize = useAgentStore(state => state.updateAgentSize);
  const { width: windowWidth, height: windowHeight } = useWindowSize();
  const { safeAreaInsets } = useTaskbarDimensions();
  const getCurrentTheme = useThemeStore(state => state.getCurrentTheme);
  const accent = useThemeStore(state => state.accent);
  
  // Animation controls
  const controls = useAnimation();
  const swipeThreshold = windowWidth * 0.25; // 25% of screen width
  const windowRef = useRef<HTMLDivElement>(null);
  
  // Touch gesture states
  const [touchStart, setTouchStart] = useState({ x: 0, y: 0 });
  const [touchDelta, setTouchDelta] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  
  // Calculate optimal window size and position based on screen dimensions
  useEffect(() => {
    // Adjust window position and size for mobile
    const calculateWindowDimensions = () => {
      let maximizedWidth, maximizedHeight, x, y;
      
      // Base sizes for different mobile screen sizes
      if (windowWidth < 640) { // Small mobile screens
        // Different handling based on agent type
        if (id === 'marketplace' || id === 'agent-manager') {
          maximizedWidth = windowWidth * 0.95;
          maximizedHeight = windowHeight * 0.65;
        } else if (id === 'panion') { 
          maximizedWidth = windowWidth * 0.98;
          maximizedHeight = windowHeight * 0.78;
        } else if (id === 'settings') {
          maximizedWidth = windowWidth * 0.92;
          maximizedHeight = windowHeight * 0.68;
        } else {
          maximizedWidth = windowWidth * 0.98;
          maximizedHeight = windowHeight * 0.7;
        }
        
        x = windowWidth * 0.01; // 1% margin
        y = windowHeight * 0.05; // 5% from top
      } else if (windowWidth < 768) { // Medium mobile screens
        if (id === 'marketplace' || id === 'agent-manager') {
          maximizedWidth = windowWidth * 0.9;
          maximizedHeight = windowHeight * 0.7;
          x = windowWidth * 0.05;
          y = windowHeight * 0.05;
        } else {
          maximizedWidth = windowWidth * 0.95;
          maximizedHeight = windowHeight * 0.75;
          x = windowWidth * 0.025;
          y = windowHeight * 0.05;
        }
      } else { // Larger mobile screens / tablets
        if (id === 'marketplace' || id === 'agent-manager') {
          maximizedWidth = windowWidth * 0.85;
          maximizedHeight = windowHeight * 0.75;
        } else {
          maximizedWidth = windowWidth * 0.92;
          maximizedHeight = windowHeight * 0.8;
        }
        
        x = (windowWidth - maximizedWidth) / 2;
        y = (windowHeight - maximizedHeight) / 8;
      }
      
      // Apply the calculated position and size
      updateAgentPosition(id, { x, y });
      updateAgentSize(id, { width: maximizedWidth, height: maximizedHeight });
    };
    
    calculateWindowDimensions();
    
    // Log for debugging
    log.debug(`Mobile window resized for agent: ${id}`, {
      windowWidth,
      windowHeight,
      safeAreaInsets
    }, 'window');
    
  }, [windowWidth, windowHeight, id, updateAgentPosition, updateAgentSize, safeAreaInsets]);
  
  // Handle touch events for swipe to minimize/close
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isActive) onFocus();
    
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
    setTouchDelta({ x: 0, y: 0 });
    setIsDragging(true);
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;
    
    setTouchDelta({ x: deltaX, y: deltaY });
    
    // Visual feedback as user swipes
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 20) {
      // Horizontal swipe - apply some rotation and movement
      controls.start({
        x: deltaX * 0.5,
        rotate: deltaX * 0.02,
        transition: { duration: 0, type: 'tween' }
      });
    } else if (deltaY > 20) {
      // Downward swipe - apply subtle scale and opacity change
      const progress = Math.min(1, deltaY / (windowHeight * 0.4));
      controls.start({
        scale: 1 - progress * 0.05,
        opacity: 1 - progress * 0.3,
        y: deltaY * 0.3,
        transition: { duration: 0, type: 'tween' }
      });
    }
  };
  
  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    const { x: deltaX, y: deltaY } = touchDelta;
    
    // Reset any visual changes first
    controls.start({
      x: 0,
      y: 0,
      rotate: 0,
      scale: 1,
      opacity: 1,
      transition: { duration: 0.3, type: 'spring', bounce: 0.2 }
    });
    
    // Handle horizontal swipe
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX > swipeThreshold) {
        // Swipe right - could be previous window or close
        onMinimize();
      } else if (deltaX < -swipeThreshold) {
        // Swipe left - could be next window or close
        onMinimize();
      }
    } 
    // Handle vertical swipe
    else if (deltaY > swipeThreshold) {
      // Swipe down - minimize
      onMinimize();
    } else if (deltaY < -swipeThreshold) {
      // Swipe up - fullscreen or some other action
      // Could implement maximizing behavior here
    }
  };
  
  // Define animation variants
  const variants = {
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      rotate: 0,
      transition: {
        type: 'spring',
        damping: 25,
        stiffness: 300,
        duration: 0.2
      }
    },
    hidden: {
      opacity: 0,
      y: 20,
      scale: 0.95,
      transition: {
        type: 'spring',
        damping: 25,
        stiffness: 300,
        duration: 0.2
      }
    }
  };
  
  // Only render if not minimized
  if (isMinimized) return null;
  
  // Calculate title bar height
  const titleBarHeight = 32; // Mobile title bar height

  return (
    <motion.div
      ref={windowRef}
      className="mobile-window fixed inset-0 z-50 bg-background border border-border overflow-hidden rounded-lg shadow-lg flex flex-col touch-manipulation"
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        zIndex,
        touchAction: 'none' // Prevent browser handling of touch events
      }}
      initial="hidden"
      variants={variants}
      animate={controls}
      exit="hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={onFocus}
    >
      {/* Mobile-optimized title bar */}
      <div 
        className={`mobile-window-titlebar flex items-center px-2 ${
          isActive ? 'bg-primary/10' : 'bg-muted/50'
        }`}
        style={{ height: `${titleBarHeight}px` }}
      >
        <button 
          className="mobile-window-button flex items-center justify-center mr-1 text-muted-foreground hover:text-primary"
          onClick={onMinimize}
          aria-label="Minimize"
        >
          <Minimize2 size={20} />
        </button>
        
        <h2 className="flex-1 text-sm font-medium truncate text-foreground mx-1">
          {title}
        </h2>
        
        <button 
          className="mobile-window-button flex items-center justify-center ml-1 text-muted-foreground hover:text-destructive"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={20} />
        </button>
      </div>
      
      {/* Window content with additional padding for touch targets */}
      <div 
        className="mobile-window-content flex-1 overflow-hidden p-1 bg-background"
        style={{ height: `calc(100% - ${titleBarHeight}px)` }}
      >
        {children}
      </div>
      
      {/* Mobile handle indicator to show window can be dragged */}
      <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-10 h-1 rounded-full bg-muted-foreground/30"></div>
    </motion.div>
  );
};

export default MobileOptimizedWindow;