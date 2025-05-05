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

// Edge positions
type SnapPosition = 'left' | 'right' | 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'none';

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
}) => {
  const updateAgentPosition = useAgentStore(state => state.updateAgentPosition);
  const updateAgentSize = useAgentStore(state => state.updateAgentSize);
  const [isMaximized, setIsMaximized] = useState(false);
  const [preMaximizeState, setPreMaximizeState] = useState({ position, size });
  const [currentSnapPosition, setCurrentSnapPosition] = useState<SnapPosition>('none');
  const [isDragging, setIsDragging] = useState(false);
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
    setIsMaximized(!isMaximized);
    
    if (isMaximized) {
      // Restore to pre-maximized state
      updateAgentPosition(id, preMaximizeState.position);
      updateAgentSize(id, preMaximizeState.size);
    } else {
      // Save current state and maximize
      setPreMaximizeState({ position, size });
      updateAgentPosition(id, { x: 0, y: 0 });
      updateAgentSize(id, { width: windowWidth, height: windowHeight });
    }
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
  
  // Handle drag during dragging
  const handleDrag = (_e: any, d: { x: number, y: number }) => {
    if (!isDragging) return;
    
    // Detect snap areas while dragging
    const snapPosition = detectSnapPosition(d.x, d.y);
    setCurrentSnapPosition(snapPosition);
    
    // Visual indicator could be added here
  };
  
  // Prevent windows from being dragged completely off-screen and handle snapping
  const handleDragStop = (_e: any, d: { x: number, y: number }) => {
    setIsDragging(false);
    
    // Check if we should snap
    const snapPosition = detectSnapPosition(d.x, d.y);
    
    if (snapPosition !== 'none') {
      // Apply the snap position
      applySnapPosition(snapPosition);
      return;
    }
    
    // If not snapping, apply normal bounds
    // Ensure at least 20% of the window remains within the viewport
    const minVisibleX = -size.width * 0.8;
    const minVisibleY = 0; // Don't allow dragging above the viewport
    const maxVisibleX = windowWidth - size.width * 0.2;
    const maxVisibleY = windowHeight - 40; // Keep title bar visible

    const boundedX = Math.max(minVisibleX, Math.min(d.x, maxVisibleX));
    const boundedY = Math.max(minVisibleY, Math.min(d.y, maxVisibleY));

    const newPosition = { x: boundedX, y: boundedY };
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

  // Calculate content height (window height minus title bar)
  const contentHeight = size.height - 24; // 6px height for title bar

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

  // Animation variants for different window states - simplified for stability
  const windowVariants = {
    open: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: "tween", // Changed to tween for more stability
        duration: 0.2,
        ease: "easeOut"
      }
    },
    closed: {
      opacity: 0,
      scale: 0.95,
      y: 10,
      transition: {
        type: "tween", // Changed to tween for more stability
        duration: 0.15,
        ease: "easeIn"
      }
    },
    minimized: {
      opacity: 0,
      scale: 0.9,
      y: 25,
      transition: {
        type: "tween", // Changed to tween for more stability
        duration: 0.15,
        ease: "easeIn"
      }
    }
  };

  // Window content animations - simplified
  const contentVariants = {
    open: {
      opacity: 1,
      transition: {
        duration: 0.1,
        delay: 0.05
      }
    },
    closed: {
      opacity: 0,
      transition: {
        duration: 0.1
      }
    }
  };

  return (
    <MotionConfig transition={{ 
      type: "tween",
      duration: 0.2,
      ease: "easeOut"
    }}>
      <Rnd
        style={{
          zIndex,
        }}
        default={{
          ...position,
          ...size,
        }}
        position={isMaximized ? { x: 0, y: 0 } : position}
        size={isMaximized ? { width: windowWidth, height: windowHeight } : size}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragStop={handleDragStop}
        onResizeStop={handleResizeStop}
        onMouseDown={onFocus}
        disableDragging={isMaximized}
        enableResizing={!isMaximized}
        dragHandleClassName="window-drag-handle"
        bounds="parent"
        minWidth={300}
        minHeight={200}
        className={getSnapIndicatorClass()}
      >
        <motion.div 
          className={`flex flex-col rounded-lg backdrop-blur-xl h-full overflow-hidden
            ${getCurrentTheme() === 'dark'
              ? isActive 
                ? 'border border-white/20 bg-black/40 shadow-[0_15px_40px_rgba(0,0,0,0.5)]' 
                : 'border border-white/10 bg-black/30 shadow-[0_10px_30px_rgba(0,0,0,0.4)]'
              : isActive 
                ? 'border border-primary/30 bg-white/90 shadow-[0_10px_25px_rgba(0,0,0,0.1)]' 
                : 'border border-gray-200/70 bg-white/80 shadow-[0_5px_15px_rgba(0,0,0,0.05)]'
            }
          `}
          initial="closed"
          animate={isMinimized ? "minimized" : "open"}
          exit="closed"
          variants={windowVariants}
          layout
          onContextMenu={handleContextMenu}
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
          className={`window-drag-handle flex items-center justify-between px-3 h-6 cursor-move ${
            getCurrentTheme() === 'dark'
              ? 'bg-black/40 border-b border-white/10'
              : 'bg-gray-100 border-b border-gray-200'
          }`}
          onDoubleClick={toggleMaximize}
        >
          <div className="flex items-center">
            <div className="flex items-center space-x-1.5 mr-3">
              {/* Increase button size for better clickability and ensure proper z-index */}
              <motion.button 
                className="w-3 h-3 rounded-full bg-red-500 cursor-pointer z-50 flex items-center justify-center"
                whileHover={{ scale: 1.2 }}
                onClick={(e) => {
                  e.stopPropagation(); // Prevent event propagation
                  onClose();
                }}
                style={{ zIndex: 9999 }}
              />
              <motion.button 
                className="w-3 h-3 rounded-full bg-yellow-500 cursor-pointer z-50 flex items-center justify-center" 
                whileHover={{ scale: 1.2 }}
                onClick={(e) => {
                  e.stopPropagation(); // Prevent event propagation
                  onMinimize();
                }}
                style={{ zIndex: 9999 }}
              />
              <motion.button 
                className="w-3 h-3 rounded-full bg-green-500 cursor-pointer z-50 flex items-center justify-center"
                whileHover={{ scale: 1.2 }}
                onClick={(e) => {
                  e.stopPropagation(); // Prevent event propagation
                  toggleMaximize();
                }}
                style={{ zIndex: 9999 }}
              />
            </div>
            <div className={`text-xs font-medium truncate ${
              getCurrentTheme() === 'dark' 
                ? 'text-white/70'
                : 'text-gray-700'
            }`}>
              {title}
            </div>
          </div>
          
          {/* Alternative window controls for all users */}
          <div className="flex items-center space-x-1">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onMinimize();
              }}
              className="p-1 rounded text-white/70 hover:text-white hover:bg-white/20 z-50"
              style={{ zIndex: 9999 }}
            >
              <Minimize2 size={12} />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                toggleMaximize();
              }}
              className="p-1 rounded text-white/70 hover:text-white hover:bg-white/20 z-50"
              style={{ zIndex: 9999 }}
            >
              <Maximize2 size={12} />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-1 rounded text-white/70 hover:text-white hover:bg-red-600/70 z-50"
              style={{ zIndex: 9999 }}
            >
              <X size={12} />
            </button>
          </div>
        </div>
        <motion.div 
          className="flex-1 overflow-auto p-3 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
          style={{ height: contentHeight }}
          variants={contentVariants}
          initial="closed"
          animate={isMinimized ? "closed" : "open"}
        >
          <div className="h-full">
            {children}
          </div>
        </motion.div>
      </motion.div>
    </Rnd>
    
    {/* Context Menu */}
    <WindowContextMenu
      isVisible={contextMenu.isVisible}
      position={contextMenu.position}
      onClose={onClose}
      onMinimize={onMinimize}
      onMaximize={toggleMaximize}
      onMoveToFront={handleMoveToFront}
      onCenter={handleCenterWindow}
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
    </MotionConfig>
  );
};

export default Window;