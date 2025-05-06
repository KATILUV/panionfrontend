import React, { useState, useEffect, useRef } from 'react';
import { Rnd } from 'react-rnd';
import { useAgentStore, AgentId } from '../../state/agentStore';
import { useThemeStore } from '../../state/themeStore';
import { Minimize2, X, Maximize2 } from 'lucide-react';
import { useWindowSize } from 'react-use';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import { playSnapSound, playOpenSound, playCloseSound } from '../../lib/audioEffects';
import WindowContextMenu from './WindowContextMenu';

// Snap threshold in pixels
const SNAP_THRESHOLD = 20;
const GRID_SIZE = 20; // Grid size for snap-to-grid feature

// Edge positions
type SnapPosition = 'left' | 'right' | 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'none';

// Grid position for snap-to-grid
interface GridPosition {
  x: number;
  y: number;
}

interface WindowProps {
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
  isMobile?: boolean;
}

const Window: React.FC<WindowProps> = ({
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
  isMinimized = false,
  isMobile = false,
}) => {
  const updateAgentPosition = useAgentStore(state => state.updateAgentPosition);
  const updateAgentSize = useAgentStore(state => state.updateAgentSize);
  const registry = useAgentStore(state => state.registry);
  const [isMaximized, setIsMaximized] = useState(false);
  const [preMaximizeState, setPreMaximizeState] = useState({ position, size });
  const [currentSnapPosition, setCurrentSnapPosition] = useState<SnapPosition>('none');
  const [isDragging, setIsDragging] = useState(false);
  const lastPositionKeyRef = useRef<string>('');
  const [contextMenu, setContextMenu] = useState({ 
    isVisible: false, 
    position: { x: 0, y: 0 } 
  });
  const { width: windowWidth, height: windowHeight } = useWindowSize();
  const getCurrentTheme = useThemeStore(state => state.getCurrentTheme);
  const accent = useThemeStore(state => state.accent);
  
  // Update stored position and size when maximized status changes
  useEffect(() => {
    if (isMaximized) {
      // Save the current position/size before maximizing
      setPreMaximizeState({ position, size });
    }
  }, [isMaximized]);

  const toggleMaximize = () => {
    if (isMaximized) {
      // Restore to pre-maximized state
      updateAgentPosition(id, preMaximizeState.position);
      updateAgentSize(id, preMaximizeState.size);
      setIsMaximized(false);
    } else {
      // Save current state and maximize
      setPreMaximizeState({ position, size });
      
      // Add margins to the maximized window to make it easier to access desktop elements
      const maximizedWidth = windowWidth * 0.95; // 95% of screen width
      const maximizedHeight = windowHeight * 0.85; // 85% of screen height
      
      // Center the window
      const x = (windowWidth - maximizedWidth) / 2;
      const y = (windowHeight - maximizedHeight) / 2;
      
      updateAgentPosition(id, { x, y });
      updateAgentSize(id, { width: maximizedWidth, height: maximizedHeight });
      setIsMaximized(true);
    }
    
    // Play sound for feedback
    playSnapSound();
  };
  
  // Detect which edge/corner we are near
  const detectSnapPosition = (x: number, y: number): SnapPosition => {
    const rightEdge = windowWidth - SNAP_THRESHOLD;
    const bottomEdge = windowHeight - SNAP_THRESHOLD;
    const centerX = windowWidth / 2;
    const centerY = windowHeight / 2;
    
    // Check corners first (they have priority)
    if (x <= SNAP_THRESHOLD && y <= SNAP_THRESHOLD) return 'top-left';
    if (x >= rightEdge && y <= SNAP_THRESHOLD) return 'top-right';
    if (x <= SNAP_THRESHOLD && y >= bottomEdge - 40) return 'bottom-left';
    if (x >= rightEdge && y >= bottomEdge - 40) return 'bottom-right';
    
    // Then check edges
    if (x <= SNAP_THRESHOLD) return 'left';
    if (x >= rightEdge) return 'right';
    if (y <= SNAP_THRESHOLD) return 'top';
    if (y >= bottomEdge - 40) return 'bottom';
    
    // Check center position
    if (Math.abs(x - centerX) <= SNAP_THRESHOLD * 2 && Math.abs(y - centerY) <= SNAP_THRESHOLD * 2) {
      return 'center';
    }
    
    return 'none';
  };
  
  // Apply snap positioning
  const applySnapPosition = (snapPosition: SnapPosition) => {
    let newPosition = { ...position };
    let newSize = { ...size };
    
    const halfWidth = windowWidth / 2;
    const halfHeight = windowHeight / 2;
    
    switch (snapPosition) {
      case 'left':
        newPosition = { x: 0, y: 0 };
        newSize = { width: halfWidth, height: windowHeight };
        break;
      case 'right':
        newPosition = { x: halfWidth, y: 0 };
        newSize = { width: halfWidth, height: windowHeight };
        break;
      case 'top':
        newPosition = { x: 0, y: 0 };
        newSize = { width: windowWidth, height: halfHeight };
        break;
      case 'bottom':
        newPosition = { x: 0, y: halfHeight };
        newSize = { width: windowWidth, height: halfHeight };
        break;
      case 'top-left':
        newPosition = { x: 0, y: 0 };
        newSize = { width: halfWidth, height: halfHeight };
        break;
      case 'top-right':
        newPosition = { x: halfWidth, y: 0 };
        newSize = { width: halfWidth, height: halfHeight };
        break;
      case 'bottom-left':
        newPosition = { x: 0, y: halfHeight };
        newSize = { width: halfWidth, height: halfHeight };
        break;
      case 'bottom-right':
        newPosition = { x: halfWidth, y: halfHeight };
        newSize = { width: halfWidth, height: halfHeight };
        break;
      case 'center':
        // Center the window with its current size
        newPosition = {
          x: (windowWidth - size.width) / 2,
          y: (windowHeight - size.height) / 2
        };
        break;
      default:
        return; // No snap
    }
    
    // Play snap sound when window snaps to a position
    playSnapSound();
    
    setCurrentSnapPosition(snapPosition);
    updateAgentPosition(id, newPosition);
    
    if (snapPosition !== 'center') {
      updateAgentSize(id, newSize);
    }
  };
  
  // Handle drag start
  const handleDragStart = () => {
    setIsDragging(true);
    onFocus();
  };
  
  // Snap position to grid
  const snapToGrid = (position: { x: number, y: number }): GridPosition => {
    // Snap to the nearest grid position
    return {
      x: Math.round(position.x / GRID_SIZE) * GRID_SIZE,
      y: Math.round(position.y / GRID_SIZE) * GRID_SIZE
    };
  };

  // Check if Shift key is pressed to enable snap-to-grid
  const [isShiftKeyPressed, setIsShiftKeyPressed] = useState(false);
  
  // Setup key listeners for shift key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift' && !isShiftKeyPressed) {
        setIsShiftKeyPressed(true);
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftKeyPressed(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isShiftKeyPressed]);
  
  // Handle drag during dragging with optimized performance
  const handleDrag = (_e: any, d: { x: number, y: number }) => {
    if (!isDragging) return;
    
    // Only detect snap areas every few pixels to improve performance
    // Using a debounce-like approach based on position
    const snapDebounceThreshold = 5; // Only check every 5px of movement
    
    // Create a "position key" that changes less frequently
    const posKeyX = Math.floor(d.x / snapDebounceThreshold);
    const posKeyY = Math.floor(d.y / snapDebounceThreshold);
    const positionKey = `${posKeyX}-${posKeyY}`;
    
    // Store the last position key as a ref to avoid unnecessary updates
    if (lastPositionKeyRef.current !== positionKey) {
      lastPositionKeyRef.current = positionKey;
      
      // Detect snap areas while dragging
      const snapPosition = detectSnapPosition(d.x, d.y);
      if (currentSnapPosition !== snapPosition) {
        setCurrentSnapPosition(snapPosition);
      }
    }
  };
  
  // Prevent windows from being dragged completely off-screen and handle snapping
  const handleDragStop = (_e: any, d: { x: number, y: number }) => {
    setIsDragging(false);
    
    // Check if we should snap to screen edges/corners
    const snapPosition = detectSnapPosition(d.x, d.y);
    
    if (snapPosition !== 'none') {
      // Apply the snap position to screen edges
      applySnapPosition(snapPosition);
      return;
    }
    
    // Apply normal bounds
    // Ensure at least 20% of the window remains within the viewport
    const minVisibleX = -size.width * 0.8;
    const minVisibleY = 0; // Don't allow dragging above the viewport
    const maxVisibleX = windowWidth - size.width * 0.2;
    const maxVisibleY = windowHeight - 40; // Keep title bar visible

    const boundedX = Math.max(minVisibleX, Math.min(d.x, maxVisibleX));
    const boundedY = Math.max(minVisibleY, Math.min(d.y, maxVisibleY));

    let newPosition = { x: boundedX, y: boundedY };
    
    // Apply snap-to-grid if shift key is pressed
    if (isShiftKeyPressed) {
      newPosition = snapToGrid(newPosition);
      // Play snap sound for feedback
      playSnapSound();
    }
    
    updateAgentPosition(id, newPosition);
    setCurrentSnapPosition('none');
  };

  // Handle resize
  const handleResizeStop = (_e: any, _direction: any, ref: any, _delta: any, position: { x: number, y: number }) => {
    const newSize = {
      width: parseInt(ref.style.width),
      height: parseInt(ref.style.height),
    };
    updateAgentSize(id, newSize);
    updateAgentPosition(id, position);
  };
  
  // Handle context menu
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    // Focus the window when right-clicking on it
    onFocus();
    
    // Position the context menu
    setContextMenu({
      isVisible: true,
      position: { x: e.clientX, y: e.clientY }
    });
  };
  
  // Handle closing context menu
  const handleCloseContextMenu = () => {
    setContextMenu({ ...contextMenu, isVisible: false });
  };
  
  // Handle bring to front action from context menu
  const handleMoveToFront = () => {
    onFocus();
  };
  
  // Handle center window action from context menu
  const handleCenterWindow = () => {
    const newPosition = {
      x: (windowWidth - size.width) / 2,
      y: (windowHeight - size.height) / 2
    };
    updateAgentPosition(id, newPosition);
  };
  
  // Handle restore to default position and size
  const handleRestoreDefault = () => {
    const agent = registry.find(a => a.id === id);
    if (agent) {
      // Play snap sound for feedback
      playSnapSound();
      
      const defaultPosition = agent.defaultPosition || { x: 100, y: 100 };
      const defaultSize = agent.defaultSize || { width: 600, height: 500 };
      
      // Set position and size to defaults
      updateAgentPosition(id, defaultPosition);
      updateAgentSize(id, defaultSize);
      
      // If window was maximized, unmaximize it
      if (isMaximized) {
        setIsMaximized(false);
      }
    }
  };

  // Calculate content height (window height minus title bar)
  const titleBarHeight = isMobile ? 32 : 24; // 8px height for mobile title bar, 6px for desktop
  const contentHeight = size.height - titleBarHeight;
  
  // Handle mobile-specific adjustments with agent-specific customization
  useEffect(() => {
    if (isMobile) {
      // Automatically maximize and position windows on mobile
      let maximizedWidth, maximizedHeight, x, y;
      
      // Base sizes for different mobile screen sizes
      if (windowWidth < 640) { // Small mobile screens
        // Different handling based on agent type
        if (id === 'marketplace' || id === 'agent-manager') {
          // Make marketplace agent windows smaller on small screens
          maximizedWidth = windowWidth * 0.95;
          maximizedHeight = windowHeight * 0.65; // Shorter for easier browsing
        } else {
          // Default behavior for most agents
          maximizedWidth = windowWidth * 0.98;
          maximizedHeight = windowHeight * 0.7;
        }
        
        // Position near the top to give more room at the bottom for taskbar
        x = windowWidth * 0.01; // 1% margin
        y = windowHeight * 0.05; // 5% from top
      } else if (windowWidth < 768) { // Medium mobile screens
        if (id === 'marketplace' || id === 'agent-manager') {
          // Better size for medium-sized screens
          maximizedWidth = windowWidth * 0.9;
          maximizedHeight = windowHeight * 0.7;
          x = windowWidth * 0.05; // 5% margin
          y = windowHeight * 0.05; // Position toward top
        } else {
          // Default behavior
          maximizedWidth = windowWidth * 0.95;
          maximizedHeight = windowHeight * 0.75;
          x = windowWidth * 0.025; // 2.5% margin
          y = windowHeight * 0.05; // Position toward top
        }
      } else { // Larger mobile screens / tablets
        if (id === 'marketplace' || id === 'agent-manager') {
          // Even more comfortable size for tablet-sized screens
          maximizedWidth = windowWidth * 0.85;
          maximizedHeight = windowHeight * 0.75;
        } else {
          // Default behavior for most agents
          maximizedWidth = windowWidth * 0.92;
          maximizedHeight = windowHeight * 0.8;
        }
        
        // Center the window
        x = (windowWidth - maximizedWidth) / 2;
        y = (windowHeight - maximizedHeight) / 8; // Position toward top third
      }
      
      // Apply the calculated position and size
      updateAgentPosition(id, { x, y });
      updateAgentSize(id, { width: maximizedWidth, height: maximizedHeight });
      
      // Only set maximized if not already set to avoid re-renders
      if (!isMaximized) {
        setIsMaximized(true);
      }
    }
  }, [isMobile, windowWidth, windowHeight, id, isMaximized, updateAgentPosition, updateAgentSize]);

  // Create CSS classes based on snap position for visual feedback
  const getSnapIndicatorClass = () => {
    if (!isDragging || currentSnapPosition === 'none') return '';
    
    switch (currentSnapPosition) {
      case 'left':
        return 'window-snap-left';
      case 'right':
        return 'window-snap-right';
      case 'top':
        return 'window-snap-top';
      case 'bottom':
        return 'window-snap-bottom';
      case 'top-left':
        return 'window-snap-top-left';
      case 'top-right':
        return 'window-snap-top-right';
      case 'bottom-left':
        return 'window-snap-bottom-left';
      case 'bottom-right':
        return 'window-snap-bottom-right';
      case 'center':
        return 'window-snap-center';
      default:
        return '';
    }
  };

  // Optimized animation variants for different window states
  // More performant, higher quality animations
  const windowVariants = {
    open: {
      opacity: 1,
      scale: 1,
      y: 0,
      filter: "blur(0px)",
      transition: {
        type: "spring",
        stiffness: 350, // Slightly stiffer for less bouncy, more focused feel
        damping: 28,    // Higher damping for faster settling
        mass: 0.6,      // Slightly more mass for a more substantial feel
        velocity: 4     // Lower starting velocity for smoother start
      }
    },
    closed: {
      opacity: 0,
      scale: 0.95,
      y: 10,
      filter: "blur(4px)",
      transition: {
        type: "spring",
        stiffness: 450,
        damping: 35,
        mass: 0.5,
        restDelta: 0.001 // More precise animation ending
      }
    },
    minimized: {
      opacity: 0,
      scale: 0.9,
      y: 25,
      filter: "blur(4px)",
      transition: {
        type: "spring",
        stiffness: 450,
        damping: 35,
        mass: 0.5
      }
    }
  };

  // High-performance window content animations
  // Using hardware-accelerated properties and simpler transitions
  const contentVariants = {
    open: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.25, // Slightly faster
        delay: 0.05,    // Less delay for more responsive feel
        ease: [0.33, 1, 0.68, 1] // Optimized cubic-bezier for smoother feel
      }
    },
    closed: {
      opacity: 0,
      y: 5, // Smaller transform distance for smoother animation
      transition: {
        duration: 0.15, // Faster exit
        ease: [0.4, 0, 1, 1]
      }
    }
  };

  // Create a visual grid overlay when shift is pressed
  const renderGridOverlay = () => {
    if (!isShiftKeyPressed || !isDragging) return null;
    
    return (
      <motion.div 
        className="fixed inset-0 pointer-events-none z-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)
          `,
          backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
          zIndex: 9990
        }}
      />
    );
  };

  // Create depth-based shadow effect based on z-index
  const getShadowDepth = () => {
    // Map z-index to shadow values - higher z-index = deeper shadow
    const baseDepth = Math.min(10, Math.max(1, Math.floor(zIndex / 50)));
    return isActive 
      ? `0 ${baseDepth * 2}px ${baseDepth * 6}px rgba(0,0,0,0.15), 0 ${baseDepth}px ${baseDepth * 2}px rgba(var(--color-primary-rgb), 0.${baseDepth + 1})` 
      : `0 ${baseDepth}px ${baseDepth * 3}px rgba(0,0,0,0.1)`;
  };

  return (
    <MotionConfig transition={{ 
      type: "spring",
      stiffness: 350,
      damping: 30,
      mass: 0.8
    }}>
      {/* Grid overlay when shift is pressed */}
      <AnimatePresence>
        {renderGridOverlay()}
      </AnimatePresence>
      
      <Rnd
        style={{
          zIndex,
          transform: 'translate3d(0,0,0)', // Force GPU acceleration
          willChange: 'transform', // Hint to browser to optimize
          isolation: 'isolate', // Create a new stacking context
        }}
        default={{
          ...position,
          ...size,
        }}
        position={position}
        size={size}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragStop={handleDragStop}
        onResizeStop={handleResizeStop}
        onMouseDown={onFocus}
        disableDragging={isMaximized || isMobile} // Disable dragging on mobile or when maximized
        enableResizing={!isMaximized && !isMobile} // Disable resizing on mobile or when maximized
        dragHandleClassName="window-drag-handle"
        bounds="parent"
        minWidth={isMobile ? windowWidth * 0.95 : 300} // Adjusted width for mobile
        minHeight={isMobile ? windowHeight * 0.7 : 200} // Adjusted height for mobile
        cancel=".window-control-button, .window-control-button *, button" // Prevent drag when clicking buttons
        resizeHandleStyles={{
          bottomRight: { zIndex: 2, display: isMobile ? 'none' : 'block' }, // Hide resize handles on mobile
          bottomLeft: { zIndex: 2, display: isMobile ? 'none' : 'block' },
          topRight: { zIndex: 2, display: isMobile ? 'none' : 'block' },
          topLeft: { zIndex: 2, display: isMobile ? 'none' : 'block' }
        }}
        className={getSnapIndicatorClass()}
      >
        <motion.div 
          className={`flex flex-col rounded-lg backdrop-blur-xl h-full overflow-hidden
            transition-all duration-200 theme-transition
            ${isActive 
              ? 'border border-primary/30 bg-black/40 window-focus-glow' 
              : 'border border-white/10 bg-black/30'
            }
          `}
          initial="closed"
          animate={isMinimized ? "minimized" : "open"}
          exit="closed"
          variants={windowVariants}
          layout="position"
          layoutRoot
          style={{ 
            willChange: 'transform, opacity',
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden',
            perspective: 1000,
            boxShadow: getShadowDepth()
          }}
          onContextMenu={isMobile ? undefined : handleContextMenu}
        >
        {/* Snap Overlay Indicators */}
        <AnimatePresence>
          {isDragging && currentSnapPosition !== 'none' && (
            <motion.div
              className="absolute inset-0 z-10 pointer-events-none rounded-lg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className={`absolute inset-0 rounded-lg border-2 border-primary bg-primary/20`} />
            </motion.div>
          )}
        </AnimatePresence>
        
        <div 
          className={`window-drag-handle flex items-center justify-between px-3 ${isMobile ? 'h-8' : 'h-6'} cursor-move transition-all duration-200 theme-transition
            ${isActive 
              ? 'bg-primary/20 border-b border-primary/30' 
              : 'bg-black/40 border-b border-white/10'
            }`}
          onDoubleClick={toggleMaximize}
        >
          <div className="flex items-center justify-between flex-1">
            <div className="flex items-center">
              <div className="flex items-center space-x-1.5 mr-3">
                {/* Improved window control buttons with larger hit areas */}
                <motion.button 
                  className={`window-control-button ${isMobile ? 'w-5 h-5' : 'w-4 h-4'} rounded-full bg-red-500 cursor-pointer z-50 flex items-center justify-center`}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  title="Close"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent event propagation
                    onClose();
                  }}
                  style={{ zIndex: 9999, boxShadow: '0 0 0 1px rgba(0,0,0,0.1)' }}
                />
                <motion.button 
                  className={`window-control-button ${isMobile ? 'w-5 h-5' : 'w-4 h-4'} rounded-full bg-yellow-500 cursor-pointer z-50 flex items-center justify-center`}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  title="Minimize"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent event propagation
                    onMinimize();
                  }}
                  style={{ zIndex: 9999, boxShadow: '0 0 0 1px rgba(0,0,0,0.1)' }}
                />
                <motion.button 
                  className={`window-control-button ${isMobile ? 'w-5 h-5' : 'w-4 h-4'} rounded-full bg-green-500 cursor-pointer z-50 flex items-center justify-center`}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  title={isMaximized ? "Restore" : "Maximize"}
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent event propagation
                    toggleMaximize();
                  }}
                  style={{ zIndex: 9999, boxShadow: '0 0 0 1px rgba(0,0,0,0.1)' }}
                />
              </div>
              <div className={`${isMobile ? 'text-sm' : 'text-xs'} font-medium truncate transition-all duration-200 theme-transition ${isActive ? 'text-primary font-semibold' : 'text-white/70'}`}>
                {title}
              </div>
            </div>
          </div>
        </div>
        <motion.div 
          className={`flex-1 overflow-auto ${isMobile ? 'p-4' : 'p-3'} scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent`}
          style={{ 
            height: contentHeight,
            willChange: 'transform, opacity',
            transform: 'translateZ(0)',
          }}
          variants={contentVariants}
          initial="closed"
          animate={isMinimized ? "closed" : "open"}
        >
          <div className={`h-full ${isMobile ? 'touch-manipulation' : ''}`}>
            {children}
          </div>
        </motion.div>
      </motion.div>
    </Rnd>
    
    {/* Context Menu - Hide on mobile devices */}
    {!isMobile && (
      <WindowContextMenu
        isVisible={contextMenu.isVisible}
        position={contextMenu.position}
        onClose={onClose}
        onMinimize={onMinimize}
        onMaximize={toggleMaximize}
        onMoveToFront={handleMoveToFront}
        onCenter={handleCenterWindow}
        onRestoreDefault={handleRestoreDefault}
        onSnapToSide={(side) => {
          const snapMap: Record<string, SnapPosition> = {
            'left': 'left',
            'right': 'right',
            'top': 'top',
            'bottom': 'bottom'
          };
          applySnapPosition(snapMap[side]);
        }}
        onCloseMenu={handleCloseContextMenu}
        isMaximized={isMaximized}
      />
    )}
    </MotionConfig>
  );
};

export default Window;