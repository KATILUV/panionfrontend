import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Rnd } from 'react-rnd';
import { useAgentStore, AgentId } from '../../state/agentStore';
import { useThemeStore } from '../../state/themeStore';
import { Minimize2, X, Maximize2, ArrowLeft, MoreVertical } from 'lucide-react';
import { useWindowSize } from 'react-use';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import { playSnapSound, playOpenSound, playCloseSound } from '../../lib/audioEffects';
import WindowContextMenu from './WindowContextMenu';
import SnapGuides from './SnapGuides';
import WindowGroupIndicator from './WindowGroupIndicator';
import { useScreenSize, useOrientation } from '../../hooks/use-mobile';
import { useTaskbarDimensions } from '../../hooks/use-taskbar-dimensions';
import './Window.css';

// Utility function to debounce function calls
const debounce = <F extends (...args: any[]) => any>(
  func: F,
  waitFor: number
) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const debounced = (...args: Parameters<F>) => {
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), waitFor);
  };

  return debounced as (...args: Parameters<F>) => ReturnType<F>;
};

// Utility function to throttle function calls
const throttle = <F extends (...args: any[]) => any>(
  func: F,
  waitFor: number
) => {
  let lastTime = 0;
  
  const throttled = (...args: Parameters<F>) => {
    const now = Date.now();
    if (now - lastTime >= waitFor) {
      lastTime = now;
      return func(...args);
    }
  };
  
  return throttled as (...args: Parameters<F>) => ReturnType<F>;
};

// Snap threshold in pixels - increased for easier snapping
const SNAP_THRESHOLD = 30;
const GRID_SIZE = 20; // Grid size for snap-to-grid feature
const SNAP_ENABLED_BY_DEFAULT = true; // Enable snapping by default

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
  
  // Handle responsive scaling based on window size changes
  useEffect(() => {
    // Only apply responsive adjustments if window isn't already being controlled
    if (!isMaximized && !isDragging) {
      // Ensure windows stay visible if screen size changes
      let newPosition = { ...position };
      let needsUpdate = false;
      
      // Check if window is off screen horizontally
      if (position.x + size.width > windowWidth) {
        newPosition.x = Math.max(0, windowWidth - size.width);
        needsUpdate = true;
      }
      
      // Check if window is off screen vertically
      if (position.y + size.height > windowHeight) {
        newPosition.y = Math.max(0, windowHeight - size.height);
        needsUpdate = true;
      }
      
      // Update position if needed
      if (needsUpdate) {
        updateAgentPosition(id, newPosition);
      }
    }
  }, [windowWidth, windowHeight, isMaximized, isDragging]);

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
  
  // Import taskbar dimensions hook at component level
  const { safeAreaInsets } = useTaskbarDimensions();
  
  // Detect which edge/corner we are near, respecting taskbar position
  const detectSnapPosition = (x: number, y: number): SnapPosition => {
    // If shift is pressed, disable snapping
    if (keyModifiers.shift) return 'none';
    
    // Use a hysteresis approach to prevent rapid flipping between snap positions
    // Only change snap positions when clearly in a new zone or clearly out of all zones
    const EDGE_THRESHOLD = 50; // Increased for better UX
    const CORNER_THRESHOLD = 70; // Larger threshold for corners
    const CENTER_THRESHOLD = 80; // Larger threshold for center detection
    
    // Calculate screen edges considering taskbar placement
    const leftEdge = safeAreaInsets.left + EDGE_THRESHOLD;
    const rightEdge = windowWidth - size.width - EDGE_THRESHOLD - safeAreaInsets.right;
    const topEdge = safeAreaInsets.top + EDGE_THRESHOLD;
    const bottomEdge = windowHeight - size.height - EDGE_THRESHOLD - safeAreaInsets.bottom;
    
    // Calculate center position respecting safe areas
    const availableWidth = windowWidth - safeAreaInsets.left - safeAreaInsets.right;
    const availableHeight = windowHeight - safeAreaInsets.top - safeAreaInsets.bottom;
    const centerX = safeAreaInsets.left + (availableWidth / 2) - (size.width / 2);
    const centerY = safeAreaInsets.top + (availableHeight / 2) - (size.height / 2);
    
    // Coordinates of window center (not corner)
    const windowCenterX = x + (size.width / 2);
    const windowCenterY = y + (size.height / 2);
    
    // If we're already in a snap position, use a larger threshold to exit it
    // This creates a "sticky" effect and prevents oscillation
    const EXIT_THRESHOLD = 100;
    
    // If we're currently in a snap position, check if we should exit it
    if (currentSnapPosition !== 'none') {
      const screen = {
        left: safeAreaInsets.left,
        right: windowWidth - safeAreaInsets.right,
        top: safeAreaInsets.top,
        bottom: windowHeight - safeAreaInsets.bottom,
        centerX: centerX + (size.width / 2),
        centerY: centerY + (size.height / 2)
      };
      
      // Calculate if we're far enough from the current snap zone to exit
      switch (currentSnapPosition) {
        case 'left':
          if (Math.abs(x - screen.left) > EXIT_THRESHOLD) return 'none';
          break;
        case 'right':
          if (Math.abs(x + size.width - screen.right) > EXIT_THRESHOLD) return 'none';
          break;
        case 'top':
          if (Math.abs(y - screen.top) > EXIT_THRESHOLD) return 'none';
          break;
        case 'bottom':
          if (Math.abs(y + size.height - screen.bottom) > EXIT_THRESHOLD) return 'none';
          break;
        case 'center':
          if (Math.abs(windowCenterX - screen.centerX) > EXIT_THRESHOLD || 
              Math.abs(windowCenterY - screen.centerY) > EXIT_THRESHOLD) return 'none';
          break;
        // Handle corners similarly
        default:
          // For compound positions (corners), require significant movement to exit
          if (currentSnapPosition.includes('-')) {
            const isLeft = currentSnapPosition.includes('left');
            const isRight = currentSnapPosition.includes('right');
            const isTop = currentSnapPosition.includes('top');
            const isBottom = currentSnapPosition.includes('bottom');
            
            let shouldExit = false;
            
            if ((isLeft && Math.abs(x - screen.left) > EXIT_THRESHOLD) ||
                (isRight && Math.abs(x + size.width - screen.right) > EXIT_THRESHOLD) ||
                (isTop && Math.abs(y - screen.top) > EXIT_THRESHOLD) ||
                (isBottom && Math.abs(y + size.height - screen.bottom) > EXIT_THRESHOLD)) {
              shouldExit = true;
            }
            
            if (shouldExit) return 'none';
          }
      }
      
      // If we didn't exit, keep the current snap position
      return currentSnapPosition;
    }
    
    // Check corners first (they have priority)
    if (x <= leftEdge && y <= topEdge) return 'top-left';
    if (x >= rightEdge && y <= topEdge) return 'top-right';
    if (x <= leftEdge && y >= bottomEdge) return 'bottom-left';
    if (x >= rightEdge && y >= bottomEdge) return 'bottom-right';
    
    // Then check edges
    if (x <= leftEdge) return 'left';
    if (x >= rightEdge) return 'right';
    if (y <= topEdge) return 'top';
    if (y >= bottomEdge) return 'bottom';
    
    // Check center position - use window center point rather than top-left
    if (Math.abs(windowCenterX - (centerX + size.width/2)) <= CENTER_THRESHOLD && 
        Math.abs(windowCenterY - (centerY + size.height/2)) <= CENTER_THRESHOLD) {
      return 'center';
    }
    
    return 'none';
  };
  
  // Apply snap positioning with respect to taskbar
  const applySnapPosition = (snapPosition: SnapPosition) => {
    let newPosition = { ...position };
    let newSize = { ...size };
    
    // Calculate available space accounting for taskbar
    const availableWidth = windowWidth - safeAreaInsets.left - safeAreaInsets.right;
    const availableHeight = windowHeight - safeAreaInsets.top - safeAreaInsets.bottom;
    
    // Calculate half-sizes respecting the safe areas
    const halfWidth = availableWidth / 2;
    const halfHeight = availableHeight / 2;
    
    // Adjusted starting positions accounting for taskbar placement
    const startX = safeAreaInsets.left;
    const startY = safeAreaInsets.top;
    const midX = startX + halfWidth;
    const midY = startY + halfHeight;
    
    switch (snapPosition) {
      case 'left':
        newPosition = { x: startX, y: startY };
        newSize = { width: halfWidth, height: availableHeight };
        break;
      case 'right':
        newPosition = { x: midX, y: startY };
        newSize = { width: halfWidth, height: availableHeight };
        break;
      case 'top':
        newPosition = { x: startX, y: startY };
        newSize = { width: availableWidth, height: halfHeight };
        break;
      case 'bottom':
        newPosition = { x: startX, y: midY };
        newSize = { width: availableWidth, height: halfHeight };
        break;
      case 'top-left':
        newPosition = { x: startX, y: startY };
        newSize = { width: halfWidth, height: halfHeight };
        break;
      case 'top-right':
        newPosition = { x: midX, y: startY };
        newSize = { width: halfWidth, height: halfHeight };
        break;
      case 'bottom-left':
        newPosition = { x: startX, y: midY };
        newSize = { width: halfWidth, height: halfHeight };
        break;
      case 'bottom-right':
        newPosition = { x: midX, y: midY };
        newSize = { width: halfWidth, height: halfHeight };
        break;
      case 'center':
        // Center the window with its current size
        newPosition = {
          x: startX + (availableWidth - size.width) / 2,
          y: startY + (availableHeight - size.height) / 2
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
  
  // Toggle grid visibility
  const handleToggleGrid = () => {
    setShowGrid(prevState => !prevState);
  };
  
  // Toggle snap-to-grid feature
  const handleToggleSnapToGrid = () => {
    setSnapToGridEnabled(prevState => !prevState);
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

  // State for keyboard modifiers
  const [keyModifiers, setKeyModifiers] = useState({
    shift: false,
    ctrl: false,
    alt: false
  });
  
  // Grid feature states
  const [showGrid, setShowGrid] = useState(false);
  const [snapToGridEnabled, setSnapToGridEnabled] = useState(false);
  
  // Create optimized update functions for position and size
  const debouncedUpdatePosition = useCallback(
    debounce((newPosition: { x: number, y: number }) => {
      updateAgentPosition(id, newPosition);
    }, 16), // 16ms delay for smoother 60fps performance
    [updateAgentPosition, id]
  );
  
  // Enhanced position update with local state for immediate visual feedback
  const enhancedUpdatePosition = useCallback(
    throttle((newPosition: { x: number, y: number }) => {
      // Apply optimistic UI update before propagating to store
      // This creates the perception of instant response while the actual state update happens in background
      requestAnimationFrame(() => {
        debouncedUpdatePosition(newPosition);
      });
    }, 16), // Using requestAnimationFrame timing (60fps) for smoother updates
    [debouncedUpdatePosition]
  );
  
  const throttledUpdateSize = useCallback(
    throttle((newSize: { width: number, height: number }) => {
      // Use requestAnimationFrame to sync with browser rendering cycle
      requestAnimationFrame(() => {
        updateAgentSize(id, newSize);
      });
    }, 16), // Match with browser frame rate for smoother resize
    [updateAgentSize, id]
  );
  
  // Taskbar safe area insets already obtained at component level
  
  // Enhanced function to keep window within viewport bounds and respect taskbar
  const keepWindowInBounds = useCallback((position: { x: number, y: number }) => {
    // Ensure window doesn't get hidden offscreen but also respects taskbar position
    const minVisibleAmount = 100;
    
    // Calculate maximum positions accounting for taskbar safe areas
    const maxX = Math.max(0, windowWidth - minVisibleAmount - safeAreaInsets.right);
    const maxY = Math.max(0, windowHeight - minVisibleAmount - safeAreaInsets.bottom);
    
    // Calculate minimum positions accounting for taskbar safe areas
    const minX = Math.min(safeAreaInsets.left, minVisibleAmount - size.width);
    const minY = safeAreaInsets.top; // Start at top safe area
    
    return {
      x: Math.min(maxX, Math.max(minX, position.x)),
      y: Math.min(maxY, Math.max(minY, position.y))
    };
  }, [windowWidth, windowHeight, size, safeAreaInsets]);
  
  // Setup key listeners for modifier keys and shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Update modifier key states
      if (e.key === 'Shift' && !keyModifiers.shift) {
        setKeyModifiers(prev => ({ ...prev, shift: true }));
      }
      if ((e.key === 'Control' || e.key === 'Meta') && !keyModifiers.ctrl) {
        setKeyModifiers(prev => ({ ...prev, ctrl: true }));
      }
      if (e.key === 'Alt' && !keyModifiers.alt) {
        setKeyModifiers(prev => ({ ...prev, alt: true }));
      }
      
      // Only process keyboard shortcuts when this window is active
      if (!isActive) return;

      // Shift + Arrow keys for half-screen positioning
      if (keyModifiers.shift && !keyModifiers.ctrl && !e.altKey) {
        let snapPosition: SnapPosition = 'none';
        
        switch (e.key) {
          case 'ArrowLeft':
            snapPosition = 'left';
            break;
          case 'ArrowRight':
            snapPosition = 'right';
            break;
          case 'ArrowUp':
            snapPosition = 'top';
            break;
          case 'ArrowDown':
            snapPosition = 'bottom';
            break;
        }
        
        if (snapPosition !== 'none') {
          e.preventDefault(); // Prevent default scrolling behavior
          applySnapPosition(snapPosition);
        }
      }
      
      // Ctrl + Arrow keys for quarter-screen positioning
      if (keyModifiers.ctrl && !keyModifiers.shift && !e.altKey) {
        let snapPosition: SnapPosition = 'none';
        
        switch (e.key) {
          case 'ArrowLeft':
            snapPosition = 'bottom-left'; // Bottom left quadrant
            break;
          case 'ArrowRight':
            snapPosition = 'bottom-right'; // Bottom right quadrant 
            break;
          case 'ArrowDown':
            snapPosition = 'bottom'; // Bottom half screen
            break;
          case 'ArrowUp':
            snapPosition = 'center'; // Center window
            break;
        }
        
        if (snapPosition !== 'none') {
          e.preventDefault();
          applySnapPosition(snapPosition);
        }
      }
      
      // Ctrl + Shift + Enter for maximizing
      if (keyModifiers.ctrl && keyModifiers.shift && e.key === 'Enter') {
        e.preventDefault();
        toggleMaximize();
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      // Update modifier key states on key up
      if (e.key === 'Shift') {
        setKeyModifiers(prev => ({ ...prev, shift: false }));
      }
      if (e.key === 'Control' || e.key === 'Meta') {
        setKeyModifiers(prev => ({ ...prev, ctrl: false }));
      }
      if (e.key === 'Alt') {
        setKeyModifiers(prev => ({ ...prev, alt: false }));
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isActive, keyModifiers, applySnapPosition, toggleMaximize]);
  
  // Enhanced handle drag with smoother magnetic snap and improved visual feedback
  const handleDrag = (_e: any, d: { x: number, y: number }) => {
    if (!isDragging) return;
    
    // Only detect snap areas every few pixels to improve performance
    // Using a debounce-like approach based on position
    const snapDebounceThreshold = 10; // Increased threshold for better performance
    
    // Create a "position key" that changes less frequently
    const posKeyX = Math.floor(d.x / snapDebounceThreshold);
    const posKeyY = Math.floor(d.y / snapDebounceThreshold);
    const positionKey = `${posKeyX}-${posKeyY}`;
    
    // Store the last position key as a ref to avoid unnecessary updates
    if (lastPositionKeyRef.current !== positionKey) {
      lastPositionKeyRef.current = positionKey;
      
      // Apply bounds checking during drag to prevent dragging off-screen
      const boundedPosition = keepWindowInBounds({ x: d.x, y: d.y });
      
      // Create a new position object that we'll modify for the magnetic effect
      let magneticPosition = { ...boundedPosition };
      
      // Enhanced snap detection with magnetic effect
      const snapPosition = detectSnapPosition(boundedPosition.x, boundedPosition.y);
      const snapPositionChanged = currentSnapPosition !== snapPosition;
      
      // Only play sound when snap position changes to avoid constant noise
      if (snapPositionChanged) {
        // Update visual snap indicators
        setCurrentSnapPosition(snapPosition);
        
        if (snapPosition !== 'none') {
          // Play sound feedback only when entering a snap zone, not during movement within it
          playSnapSound();
        }
      }
      
      // Check for nearby windows for potential grouping (only when Shift is pressed)
      if (keyModifiers.shift) {
        // Use a moderate distance threshold
        const nearby = detectNearbyWindows(boundedPosition.x, boundedPosition.y);
        
        // Only play sound when detecting a new nearby window
        if (nearby && nearby.id !== nearbyWindow?.id) {
          playSnapSound();
        }
        
        setNearbyWindow(nearby);
      } else if (nearbyWindow) {
        // Clear nearby window if shift is not pressed
        setNearbyWindow(null);
      }
      
      // Apply smooth magnetic effect when near snap points
      if (snapPosition !== 'none' && (SNAP_ENABLED_BY_DEFAULT || keyModifiers.alt)) {
        // Calculate available space accounting for taskbar
        const availableWidth = windowWidth - safeAreaInsets.left - safeAreaInsets.right;
        const availableHeight = windowHeight - safeAreaInsets.top - safeAreaInsets.bottom;
        
        // Calculate snap target positions
        let targetX = boundedPosition.x;
        let targetY = boundedPosition.y;
        
        // Determine target position based on snap position
        switch (snapPosition) {
          case 'left':
            targetX = safeAreaInsets.left;
            break;
          case 'right':
            targetX = windowWidth - size.width - safeAreaInsets.right;
            break;
          case 'top':
            targetY = safeAreaInsets.top;
            break;
          case 'bottom':
            targetY = windowHeight - size.height - safeAreaInsets.bottom;
            break;
          case 'center':
            targetX = safeAreaInsets.left + (availableWidth - size.width) / 2;
            targetY = safeAreaInsets.top + (availableHeight - size.height) / 2;
            break;
          // Handle corners
          case 'top-left':
            targetX = safeAreaInsets.left;
            targetY = safeAreaInsets.top;
            break;
          case 'top-right':
            targetX = windowWidth - size.width - safeAreaInsets.right;
            targetY = safeAreaInsets.top;
            break;
          case 'bottom-left':
            targetX = safeAreaInsets.left;
            targetY = windowHeight - size.height - safeAreaInsets.bottom;
            break;
          case 'bottom-right':
            targetX = windowWidth - size.width - safeAreaInsets.right;
            targetY = windowHeight - size.height - safeAreaInsets.bottom;
            break;
        }
        
        // Apply a subtle magnetic pull effect (15% pull)
        // This creates a smooth attraction toward snap points without jumping
        const PULL_STRENGTH = 0.15;
        
        magneticPosition = {
          x: boundedPosition.x * (1 - PULL_STRENGTH) + targetX * PULL_STRENGTH,
          y: boundedPosition.y * (1 - PULL_STRENGTH) + targetY * PULL_STRENGTH
        };
        
        // Use the magnetic position for smoother movement
        debouncedUpdatePosition(magneticPosition);
      } else {
        // No snapping, just use the bounded position
        debouncedUpdatePosition(boundedPosition);
      }
    }
  };
  
  // Handle drag stop with improved bounds checking and snapping
  const handleDragStop = (_e: any, d: { x: number, y: number }) => {
    setIsDragging(false);
    
    // Check if user is trying to create a window group
    if (nearbyWindow && keyModifiers.shift) {
      // Create a window group with the nearby window
      handleCreateGroup();
      return;
    }
    
    // Clear nearby window
    setNearbyWindow(null);
    
    // Apply bounds checking
    const boundedPosition = keepWindowInBounds({ x: d.x, y: d.y });
    
    // Check if we should snap to screen edges/corners
    const snapPosition = currentSnapPosition !== 'none' 
      ? currentSnapPosition // Use the current snap position from drag
      : detectSnapPosition(boundedPosition.x, boundedPosition.y); // Detect it again
    
    if (snapPosition !== 'none' && (SNAP_ENABLED_BY_DEFAULT || keyModifiers.alt)) {
      // Apply the snap position to screen edges
      applySnapPosition(snapPosition);
      return;
    }
    
    // Final position with bounds applied
    let finalPosition = { ...boundedPosition };
    
    // Apply snap-to-grid if enabled
    if (snapToGridEnabled) {
      finalPosition = snapToGrid(finalPosition);
      // Play snap sound for feedback
      playSnapSound();
    }
    
    // Use direct update on drag stop for immediate position change
    updateAgentPosition(id, finalPosition);
    setCurrentSnapPosition('none');
  };
  
  // Handle group creation
  const handleCreateGroup = () => {
    if (nearbyWindow) {
      const createWindowGroup = useAgentStore.getState().createWindowGroup;
      createWindowGroup([id, nearbyWindow.id], `Group: ${title}`);
      setNearbyWindow(null);
      playSnapSound();
    }
  };

  // Handle resize with throttling for better performance
  const handleResize = useCallback(
    (_e: any, _direction: any, ref: any, _delta: any, position: { x: number, y: number }) => {
      // Throttle resize updates for better performance
      const newWidth = Math.max(200, parseInt(ref.style.width));
      const newHeight = Math.max(150, parseInt(ref.style.height));
      
      throttledUpdateSize({ width: newWidth, height: newHeight });
      debouncedUpdatePosition(position);
    },
    [throttledUpdateSize, debouncedUpdatePosition]
  );
  
  // Handle resize stop - update final size and position
  const handleResizeStop = (_e: any, _direction: any, ref: any, _delta: any, position: { x: number, y: number }) => {
    const newSize = {
      width: Math.max(200, parseInt(ref.style.width)),
      height: Math.max(150, parseInt(ref.style.height)),
    };
    
    // Apply bounds checking to ensure window stays in viewport
    const boundedPosition = keepWindowInBounds(position);
    
    // Direct update on resize stop for immediate size change
    updateAgentSize(id, newSize);
    updateAgentPosition(id, boundedPosition);
    
    // Play feedback sound
    playSnapSound();
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
  
  // Window grouping detection state
  const [nearbyWindow, setNearbyWindow] = useState<{
    id: string;
    position: { x: number, y: number };
    size: { width: number, height: number };
    direction: 'top' | 'right' | 'bottom' | 'left' | 'center';
  } | null>(null);
  
  const detectNearbyWindows = (x: number, y: number) => {
    // Skip detection if we're already in a group
    const currentWindow = useAgentStore.getState().windows[id];
    if (currentWindow?.groupId) return null;
    
    // Get all other open windows
    const allWindows = useAgentStore.getState().windows;
    const otherWindows = Object.values(allWindows).filter(w => 
      w.id !== id && 
      w.isOpen && 
      !w.isMinimized && 
      !w.groupId // Not already in a group
    );
    
    // If no other windows, return null
    if (otherWindows.length === 0) return null;
    
    // Define the overlap threshold
    const OVERLAP_THRESHOLD = 60; // pixels
    
    // Check each window for proximity to current window
    for (const otherWindow of otherWindows) {
      const otherX = otherWindow.position.x;
      const otherY = otherWindow.position.y;
      const otherWidth = otherWindow.size.width;
      const otherHeight = otherWindow.size.height;
      
      // Define the edges of the current window being dragged
      const currentLeft = x;
      const currentRight = x + size.width;
      const currentTop = y;
      const currentBottom = y + size.height;
      
      // Define the edges of the other window
      const otherLeft = otherX;
      const otherRight = otherX + otherWidth;
      const otherTop = otherY;
      const otherBottom = otherY + otherHeight;
      
      // Check for overlap or close proximity
      const horizontalProximity = 
        (Math.abs(currentRight - otherLeft) < OVERLAP_THRESHOLD) || // Current window right edge near other window left edge
        (Math.abs(currentLeft - otherRight) < OVERLAP_THRESHOLD);   // Current window left edge near other window right edge
      
      const verticalProximity = 
        (Math.abs(currentBottom - otherTop) < OVERLAP_THRESHOLD) || // Current window bottom edge near other window top edge
        (Math.abs(currentTop - otherBottom) < OVERLAP_THRESHOLD);   // Current window top edge near other window bottom edge
      
      // Determine proximity direction
      let direction: 'top' | 'right' | 'bottom' | 'left' | 'center' = 'center';
      
      if (Math.abs(currentRight - otherLeft) < OVERLAP_THRESHOLD) {
        direction = 'right'; // Current window's right edge is near other window's left edge
      } else if (Math.abs(currentLeft - otherRight) < OVERLAP_THRESHOLD) {
        direction = 'left'; // Current window's left edge is near other window's right edge
      } else if (Math.abs(currentBottom - otherTop) < OVERLAP_THRESHOLD) {
        direction = 'bottom'; // Current window's bottom edge is near other window's top edge
      } else if (Math.abs(currentTop - otherBottom) < OVERLAP_THRESHOLD) {
        direction = 'top'; // Current window's top edge is near other window's bottom edge
      }
      
      if (horizontalProximity || verticalProximity) {
        return {
          id: otherWindow.id,
          position: otherWindow.position,
          size: otherWindow.size,
          direction
        };
      }
    }
    
    return null;
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
  
  // Handle mobile-specific adjustments with agent-specific customization and improved transitions
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
        } else if (id === 'panion') { 
          // Panion agent needs more vertical space for chat history
          maximizedWidth = windowWidth * 0.98;
          maximizedHeight = windowHeight * 0.78;
        } else if (id === 'settings') {
          // Settings panel can be more compact
          maximizedWidth = windowWidth * 0.92;
          maximizedHeight = windowHeight * 0.68;
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
  // Enhanced window animations with theme-aware effects
  const windowVariants = {
    open: {
      opacity: 1,
      scale: 1,
      y: 0,
      filter: "blur(0px)",
      transition: {
        type: "spring",
        stiffness: 380, // Stiffer for more precise movement
        damping: 30,    // Higher damping for faster settling
        mass: 0.7,      // More substantial feel
        velocity: 3,    // Smoother start
        onComplete: () => {
          // Remove any lingering ghost outlines 
          document.querySelectorAll('.snap-guide-highlight').forEach(el => el.remove());
        }
      }
    },
    closed: {
      opacity: 0,
      scale: 0.95,
      y: 10,
      filter: "blur(8px)",
      transition: {
        type: "spring",
        stiffness: 450,
        damping: 35,
        mass: 0.5,
        restDelta: 0.001, // More precise animation ending
        onComplete: () => {
          // Ensure clean removal of window elements on close
          document.querySelectorAll('.snap-guide-highlight').forEach(el => el.remove());
        }
      }
    },
    minimized: {
      opacity: 0,
      scale: 0.8,
      y: 20,
      filter: "blur(4px)",
      display: "none", // Force remove from render tree when minimized
      transition: {
        type: "spring",
        stiffness: 500,
        damping: 40,
        mass: 0.5,
        restDelta: 0.001 // More precise animation ending
      }
    }
  };

  // Enhanced high-performance window content animations with screen-size awareness
  // Using hardware-accelerated properties and optimized transitions
  const contentVariants = {
    open: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: isMobile ? 0.2 : 0.25, // Slightly faster on mobile
        delay: isMobile ? 0.02 : 0.05,   // Less delay on mobile for more responsive feel
        ease: [0.33, 1, 0.68, 1],        // Optimized cubic-bezier for smoother feel
        scale: { 
          type: "spring", 
          stiffness: 400, 
          damping: 30 
        } // Spring physics for scale
      }
    },
    closed: {
      opacity: 0,
      y: isMobile ? 3 : 5,              // Smaller transform distance on mobile
      scale: 0.98,                       // Subtle scale effect
      transition: {
        duration: isMobile ? 0.12 : 0.15, // Faster exit on mobile
        ease: [0.4, 0, 1, 1],
        scale: {
          type: "spring",
          stiffness: 500,
          damping: 35
        }
      }
    }
  };

  // Create a visual grid overlay when shift is pressed or showGrid is enabled
  const renderGridOverlay = () => {
    // Only show the grid overlay if either shift is pressed or showGrid is enabled 
    // (but not if already using SnapGuides grid display)
    if ((!keyModifiers.shift && !showGrid) || (showGrid && isDragging)) return null;
    
    // Create a more sophisticated grid with primary and secondary lines
    return (
      <motion.div 
        className="grid-overlay fixed inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: keyModifiers.shift || showGrid ? 1 : 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {/* Primary grid lines */}
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(to right, rgba(93, 123, 255, 0.1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(93, 123, 255, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: `${GRID_SIZE * 5}px ${GRID_SIZE * 5}px`,
          zIndex: 9990
        }} />
        
        {/* Secondary grid lines */}
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
          zIndex: 9991
        }} />
        
        {/* Guide lines for center alignment */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-indigo-500/30" />
        <div className="absolute top-1/2 left-0 right-0 h-px bg-indigo-500/30" />
        
        {/* Indication text - only show when using shift key, not when grid is toggled on permanently */}
        {keyModifiers.shift && !showGrid && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white text-xs px-3 py-1 rounded-full backdrop-blur-sm border border-white/10">
            Grid Mode: Use Shift + Drag to snap windows
          </div>
        )}
        
        {/* Different indication when grid is enabled permanently */}
        {showGrid && snapToGridEnabled && !keyModifiers.shift && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white text-xs px-3 py-1 rounded-full backdrop-blur-sm border border-indigo-500/30">
            Grid Snapping Enabled
          </div>
        )}
      </motion.div>
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
      
      {/* Visual snap guides and grid */}
      <SnapGuides 
        isVisible={isDragging && currentSnapPosition !== 'none'}
        snapPosition={currentSnapPosition}
        windowWidth={windowWidth}
        windowHeight={windowHeight}
        showGrid={showGrid}
        gridSize={GRID_SIZE}
        snapToGrid={snapToGridEnabled}
      />
      
      {/* Window grouping indicator */}
      <WindowGroupIndicator 
        isVisible={!!nearbyWindow && keyModifiers.shift}
        position={nearbyWindow?.position || { x: 0, y: 0 }}
        size={nearbyWindow?.size || { width: 0, height: 0 }}
        direction={nearbyWindow?.direction || 'center'}
        onCreateGroup={handleCreateGroup}
      />
      
      <Rnd
        style={{
          zIndex,
          transform: 'translate3d(0,0,0)', // Force GPU acceleration
          willChange: 'transform, opacity', // Hint to browser to optimize
          backfaceVisibility: 'hidden', // Prevent visual glitches
          perspective: '1000px', // For better 3D perception
          transformStyle: 'preserve-3d', // Better 3D effects
          isolation: 'isolate', // Create a new stacking context
          contain: 'layout paint', // Optimize rendering
          boxShadow: isActive 
            ? `0 0 0 ${isDragging ? '0' : '2px'} var(--primary), 0 8px 30px 0 rgba(0, 0, 0, 0.3)` 
            : '0 4px 15px 0 rgba(0, 0, 0, 0.2)',
          transition: isActive && !isDragging ? 'box-shadow 0.3s ease' : 'none' // Only animate when not dragging
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
        onResize={handleResize}
        onResizeStop={handleResizeStop}
        onMouseDown={onFocus}
        onTouchStart={onFocus}
        disableDragging={isMaximized || isMobile} // Disable dragging on mobile or when maximized
        enableResizing={!isMaximized && !isMobile} // Disable resizing on mobile or when maximized
        dragHandleClassName="window-drag-handle"
        bounds="parent"
        minWidth={isMobile ? windowWidth * 0.95 : 200} // Adjusted width for mobile
        minHeight={isMobile ? windowHeight * 0.7 : 150} // Adjusted height for mobile
        cancel=".window-control-button, .window-control-button *, button, a, input, textarea, select" // Prevent drag when clicking buttons and interactive elements
        dragGrid={snapToGridEnabled ? [GRID_SIZE, GRID_SIZE] : undefined} // Add grid snapping for drag
        resizeGrid={snapToGridEnabled ? [GRID_SIZE, GRID_SIZE] : undefined} // Add grid snapping for resize
        resizeHandleStyles={{
          bottomRight: { zIndex: 2, display: isMobile ? 'none' : 'block' }, // Hide resize handles on mobile
          bottomLeft: { zIndex: 2, display: isMobile ? 'none' : 'block' },
          topRight: { zIndex: 2, display: isMobile ? 'none' : 'block' },
          topLeft: { zIndex: 2, display: isMobile ? 'none' : 'block' }
        }}
        className={getSnapIndicatorClass()}
      >
        <motion.div 
          className={`window flex flex-col rounded-lg h-full overflow-hidden
            ${isActive 
              ? 'window-focused' 
              : 'window-blurred'
            }
          `}
          initial="closed"
          animate={isMinimized ? "minimized" : "open"}
          exit="closed"
          variants={windowVariants}
          layout="position"
          layoutRoot
          style={{ 
            willChange: 'transform, opacity, box-shadow',
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden',
            perspective: 1000
          }}
          onContextMenu={isMobile ? undefined : handleContextMenu}
        >
          {/* Accent color bar at the top of focused windows */}
          <div className="window-accent-bar"></div>
        {/* Enhanced Snap Overlay Indicators */}
        {/* Completely simplified outline - no animations */}
        {isDragging && currentSnapPosition !== 'none' && (
          <div
            className="absolute inset-0 z-10 pointer-events-none rounded-lg overflow-hidden"
            style={{
              opacity: 0.8,
              transform: 'translateZ(0)',
              willChange: 'transform',
              backfaceVisibility: 'hidden'
            }}
          >
            <div 
              className="absolute inset-0 rounded-lg border-2 border-primary bg-primary/20"
              style={{
                boxShadow: '0 0 20px rgba(var(--primary-rgb)/0.3)',
                transform: 'translateZ(0)'
              }}
            />
          </div>
        )}
        
        <div 
          className={`window-drag-handle window-titlebar flex items-center justify-between cursor-move
            ${isActive 
              ? 'window-titlebar-focused' 
              : 'window-titlebar-blurred'
            }`}
          style={{
            height: isMobile ? '32px' : useThemeStore.getState().getSpacingForDensity(24) + 'px',
            paddingLeft: useThemeStore.getState().getSpacingForDensity(12) + 'px',
            paddingRight: useThemeStore.getState().getSpacingForDensity(12) + 'px'
          }}
          onDoubleClick={toggleMaximize}
        >
          <div className="flex items-center justify-between flex-1">
            <div className="flex items-center">
              <div className="flex items-center group" style={{
                gap: useThemeStore.getState().getSpacingForDensity(6) + 'px',
                marginRight: useThemeStore.getState().getSpacingForDensity(12) + 'px'
              }}>
                {/* Improved window control buttons with larger hit areas */}
                <motion.div 
                  className="window-control-button rounded-full bg-red-500 cursor-pointer z-50 flex items-center justify-center group"
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.95 }}
                  title="Close"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent event propagation
                    playCloseSound();
                    onClose();
                  }}
                  style={{ 
                    zIndex: 9999, 
                    boxShadow: '0 0 0 1px rgba(0,0,0,0.1)',
                    width: isMobile ? '20px' : useThemeStore.getState().getSpacingForDensity(16) + 'px',
                    height: isMobile ? '20px' : useThemeStore.getState().getSpacingForDensity(16) + 'px'
                  }}
                >
                  {/* Optional X icon */}
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity text-black/70" style={{fontSize: '8px'}}>×</span>
                </motion.div>
                <motion.div 
                  className="window-control-button rounded-full bg-yellow-500 cursor-pointer z-50 flex items-center justify-center group"
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.95 }}
                  title="Minimize"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent event propagation
                    playSnapSound();
                    onMinimize();
                  }}
                  style={{ 
                    zIndex: 9999, 
                    boxShadow: '0 0 0 1px rgba(0,0,0,0.1)',
                    width: isMobile ? '20px' : useThemeStore.getState().getSpacingForDensity(16) + 'px',
                    height: isMobile ? '20px' : useThemeStore.getState().getSpacingForDensity(16) + 'px'
                  }}
                >
                  {/* Optional minimize icon */}
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity text-black/70" style={{fontSize: '8px'}}>_</span>
                </motion.div>
                <motion.div 
                  className="window-control-button rounded-full bg-green-500 cursor-pointer z-50 flex items-center justify-center group"
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.95 }}
                  title={isMaximized ? "Restore" : "Maximize"}
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent event propagation
                    toggleMaximize();
                  }}
                  style={{ 
                    zIndex: 9999, 
                    boxShadow: '0 0 0 1px rgba(0,0,0,0.1)',
                    width: isMobile ? '20px' : useThemeStore.getState().getSpacingForDensity(16) + 'px',
                    height: isMobile ? '20px' : useThemeStore.getState().getSpacingForDensity(16) + 'px'
                  }}
                >
                  {/* Optional maximize icon */}
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity text-black/70" style={{fontSize: '8px'}}>+</span>
                </motion.div>
              </div>
              <div className={`${isMobile ? 'text-sm' : 'text-xs'} font-medium truncate transition-all duration-200 theme-transition ${isActive ? 'text-primary font-semibold' : 'text-white/70'}`}>
                {title}
              </div>
            </div>
          </div>
        </div>
        <motion.div 
          className={`window-body flex-1 overflow-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent overscroll-contain
            ${isActive ? 'window-body-focused' : 'window-body-blurred'}`}
          style={{ 
            height: contentHeight,
            willChange: 'transform, opacity',
            transform: 'translateZ(0)',
            padding: useThemeStore.getState().getSpacingForDensity(isMobile ? 16 : 12) + 'px',
            WebkitOverflowScrolling: 'touch', // Enable momentum scrolling on iOS
            overflowY: 'auto',
            overflowX: 'hidden',
            msOverflowStyle: 'auto', // Improves scrolling on Windows
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
        windowId={id}
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
        onToggleGrid={handleToggleGrid}
        onToggleSnapToGrid={handleToggleSnapToGrid}
        isMaximized={isMaximized}
        showGrid={showGrid}
        snapToGridEnabled={snapToGridEnabled}
        isInGroup={!!useAgentStore.getState().windows[id]?.groupId}
      />
    )}
    

    </MotionConfig>
  );
};

export default Window;