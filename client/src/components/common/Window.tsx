import React, { useState, useEffect, useRef } from 'react';
import { Rnd } from 'react-rnd';
import { useAgentStore, AgentId } from '../../state/agentStore';
import { Minimize2, X, Maximize2 } from 'lucide-react';
import { useWindowSize } from 'react-use';
import { motion, AnimatePresence } from 'framer-motion';
import { playSnapSound, playOpenSound, playCloseSound } from '../../lib/audioEffects';

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
}) => {
  const updateAgentPosition = useAgentStore(state => state.updateAgentPosition);
  const updateAgentSize = useAgentStore(state => state.updateAgentSize);
  const [isMaximized, setIsMaximized] = useState(false);
  const [preMaximizeState, setPreMaximizeState] = useState({ position, size });
  const [currentSnapPosition, setCurrentSnapPosition] = useState<SnapPosition>('none');
  const [isDragging, setIsDragging] = useState(false);
  const { width: windowWidth, height: windowHeight } = useWindowSize();
  
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
    
    // Update state with the new snap position
    setCurrentSnapPosition(snapPosition);
    
    // First update position with a slight delay before size for better visual effect
    requestAnimationFrame(() => {
      updateAgentPosition(id, newPosition);
      
      // Add a small delay before resizing for better animation effect
      if (snapPosition !== 'center') {
        setTimeout(() => {
          updateAgentSize(id, newSize);
        }, 50);
      }
    });
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

  // Calculate content height (window height minus title bar)
  const contentHeight = size.height - 40;

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

  return (
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
        className={`flex flex-col rounded-lg backdrop-blur-lg h-full overflow-hidden
          ${isActive 
            ? 'border border-primary/40 bg-white/10 dark:bg-black/30 light-mode-shadow dark:shadow-xl' 
            : 'border border-gray-200/30 dark:border-white/20 bg-white/5 dark:bg-black/20 light-mode-shadow-inactive dark:shadow-lg'
          }
        `}
        initial={{ opacity: 0, scale: 0.95, y: -10 }}
        animate={{ 
          opacity: 1, 
          scale: 1,
          y: 0,
          transition: { 
            type: "spring",
            damping: 25,
            stiffness: 300,
            duration: 0.4,
            ease: [0.34, 1.56, 0.64, 1] // Custom cubic bezier for a more natural bounce
          }
        }}
        exit={{
          opacity: 0,
          scale: 0.95,
          y: 20,
          transition: {
            duration: 0.25,
            ease: "easeInOut"
          }
        }}
        layout="position"
        transition={{
          type: "spring",
          damping: 22,
          stiffness: 280,
          mass: 1.2,
          duration: 0.35
        }}
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
          className="window-drag-handle flex items-center justify-between px-4 h-10 cursor-move bg-primary/90 dark:bg-black/30"
          onDoubleClick={toggleMaximize}
        >
          <div className="font-medium text-white truncate">{title}</div>
          <motion.div className="flex items-center space-x-2">
            <motion.button 
              onClick={onMinimize}
              className="p-1 text-white/90 hover:text-white hover:bg-white/30 rounded"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <Minimize2 size={16} className="drop-shadow-sm" />
            </motion.button>
            <motion.button 
              onClick={toggleMaximize}
              className="p-1 text-white/90 hover:text-white hover:bg-white/30 rounded"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <Maximize2 size={16} className="drop-shadow-sm" />
            </motion.button>
            <motion.button 
              onClick={onClose}
              className="p-1 text-white/90 hover:text-white hover:bg-red-600 rounded"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <X size={16} className="drop-shadow-sm" />
            </motion.button>
          </motion.div>
        </div>
        <motion.div 
          className="flex-1 overflow-auto"
          style={{ height: contentHeight }}
          animate={{ 
            opacity: 1,
            y: 0,
            transition: {
              delay: 0.05, 
              duration: 0.25,
              ease: "easeOut" 
            }
          }}
          initial={{ 
            opacity: 0, 
            y: 10
          }}
        >
          {children}
        </motion.div>
      </motion.div>
    </Rnd>
  );
};

export default Window;