import React from 'react';
import { motion } from 'framer-motion';
import { useTaskbarDimensions } from '../../hooks/use-taskbar-dimensions';

interface SnapGuidesProps {
  isVisible: boolean;
  snapPosition: string;
  windowWidth: number;
  windowHeight: number;
  showGrid?: boolean;
  gridSize?: number;
  snapToGrid?: boolean;
}

/**
 * SnapGuides component displays visual guides when snapping windows
 * to different regions of the screen
 */
const SnapGuides: React.FC<SnapGuidesProps> = ({
  isVisible,
  snapPosition,
  windowWidth,
  windowHeight,
  showGrid = false,
  gridSize = 20,
  snapToGrid = false
}) => {
  // Get taskbar dimensions to adjust guide positions
  const { safeAreaInsets } = useTaskbarDimensions();
  
  if (!isVisible && !showGrid) return null;
  
  // Styles for different snap positions, accounting for taskbar
  const getHighlightStyles = () => {
    const baseStyle = "absolute rounded-lg border-2 border-indigo-500/80 bg-indigo-500/10 pointer-events-none z-50";
    
    // Get styles based on taskbar position
    const styles = {
      left: safeAreaInsets.left ? `left-[${safeAreaInsets.left}px]` : 'left-0',
      right: safeAreaInsets.right ? `right-[${safeAreaInsets.right}px]` : 'right-0',
      top: safeAreaInsets.top ? `top-[${safeAreaInsets.top}px]` : 'top-0',
      bottom: safeAreaInsets.bottom ? `bottom-[${safeAreaInsets.bottom}px]` : 'bottom-0',
    };
    
    // Calculate available screen space
    const availableWidth = windowWidth - safeAreaInsets.left - safeAreaInsets.right;
    const halfWidth = availableWidth / 2;
    const halfWidthPercent = Math.round((halfWidth / windowWidth) * 100);
    
    const availableHeight = windowHeight - safeAreaInsets.top - safeAreaInsets.bottom;
    const halfHeight = availableHeight / 2;
    const halfHeightPercent = Math.round((halfHeight / windowHeight) * 100);
    
    switch (snapPosition) {
      case 'left':
        return `${baseStyle} ${styles.left} ${styles.top} ${styles.bottom} w-[${halfWidthPercent}%]`;
      case 'right':
        return `${baseStyle} ${styles.right} ${styles.top} ${styles.bottom} w-[${halfWidthPercent}%]`;
      case 'top':
        return `${baseStyle} ${styles.left} ${styles.top} ${styles.right} h-[${halfHeightPercent}%]`;
      case 'bottom':
        return `${baseStyle} ${styles.left} ${styles.bottom} ${styles.right} h-[${halfHeightPercent}%]`;
      case 'top-left':
        return `${baseStyle} ${styles.left} ${styles.top} w-[${halfWidthPercent}%] h-[${halfHeightPercent}%]`;
      case 'top-right':
        return `${baseStyle} ${styles.right} ${styles.top} w-[${halfWidthPercent}%] h-[${halfHeightPercent}%]`;
      case 'bottom-left':
        return `${baseStyle} ${styles.left} ${styles.bottom} w-[${halfWidthPercent}%] h-[${halfHeightPercent}%]`;
      case 'bottom-right':
        return `${baseStyle} ${styles.right} ${styles.bottom} w-[${halfWidthPercent}%] h-[${halfHeightPercent}%]`;
      case 'center':
        // Calculate a centered box within the available space
        const centerWidthPercent = 70;
        const centerHeightPercent = 70;
        const leftPercent = safeAreaInsets.left + ((availableWidth - (availableWidth * 0.7)) / 2);
        const topPercent = safeAreaInsets.top + ((availableHeight - (availableHeight * 0.7)) / 2);
        
        return `${baseStyle} left-[${leftPercent}px] top-[${topPercent}px] w-[${centerWidthPercent}%] h-[${centerHeightPercent}%]`;
      default:
        return '';
    }
  };

  const guideAnimation = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2 }
  };

  // Get edge guides (lines at edges of screen, respecting taskbar)
  const getEdgeGuides = () => {
    const edgeGuideStyle = "absolute bg-indigo-400 pointer-events-none";
    const edgeGuides = [];
    
    // Position styles accounting for taskbar
    const left = safeAreaInsets.left ? `left-[${safeAreaInsets.left}px]` : 'left-0';
    const right = safeAreaInsets.right ? `right-[${safeAreaInsets.right}px]` : 'right-0';
    const top = safeAreaInsets.top ? `top-[${safeAreaInsets.top}px]` : 'top-0';
    const bottom = safeAreaInsets.bottom ? `bottom-[${safeAreaInsets.bottom}px]` : 'bottom-0';
    
    // Only show edge guides for relevant snap positions
    if (['left', 'top-left', 'bottom-left'].includes(snapPosition)) {
      // Left edge (accounting for taskbar if on left)
      edgeGuides.push(
        <div key="left" className={`${edgeGuideStyle} ${left} top-0 bottom-0 w-0.5`} />
      );
    }
    
    if (['right', 'top-right', 'bottom-right'].includes(snapPosition)) {
      // Right edge (accounting for taskbar if on right)
      edgeGuides.push(
        <div key="right" className={`${edgeGuideStyle} ${right} top-0 bottom-0 w-0.5`} />
      );
    }
    
    if (['top', 'top-left', 'top-right'].includes(snapPosition)) {
      // Top edge (accounting for taskbar if on top)
      edgeGuides.push(
        <div key="top" className={`${edgeGuideStyle} ${top} left-0 right-0 h-0.5`} />
      );
    }
    
    if (['bottom', 'bottom-left', 'bottom-right'].includes(snapPosition)) {
      // Bottom edge (accounting for taskbar if on bottom)
      edgeGuides.push(
        <div key="bottom" className={`${edgeGuideStyle} ${bottom} left-0 right-0 h-0.5`} />
      );
    }
    
    return edgeGuides;
  };

  // Get center guides (lines at center of screen, respecting taskbar)
  const getCenterGuides = () => {
    const centerGuideStyle = "absolute bg-indigo-400/60 pointer-events-none";
    const centerGuides = [];
    
    // Calculate true center of available area (accounting for taskbar)
    const availableWidth = windowWidth - safeAreaInsets.left - safeAreaInsets.right;
    const availableHeight = windowHeight - safeAreaInsets.top - safeAreaInsets.bottom;
    
    const centerX = safeAreaInsets.left + (availableWidth / 2);
    const centerY = safeAreaInsets.top + (availableHeight / 2);
    
    // Get left offset as percentage for vertical center line
    const centerXPercent = (centerX / windowWidth) * 100;
    
    // Get top offset as percentage for horizontal center line
    const centerYPercent = (centerY / windowHeight) * 100;
    
    // Only show center guides for certain snap positions
    if (['center', 'left', 'right'].includes(snapPosition)) {
      // Vertical center line
      centerGuides.push(
        <div 
          key="vertical-center" 
          className={`${centerGuideStyle} top-0 bottom-0 w-0.5`} 
          style={{ left: `${centerXPercent}%` }}
        />
      );
    }
    
    if (['center', 'top', 'bottom'].includes(snapPosition)) {
      // Horizontal center line
      centerGuides.push(
        <div 
          key="horizontal-center" 
          className={`${centerGuideStyle} left-0 right-0 h-0.5`} 
          style={{ top: `${centerYPercent}%` }}
        />
      );
    }
    
    return centerGuides;
  };

  // Grid rendering function
  const renderGrid = () => {
    if (!showGrid) return null;
    
    const gridLines = [];
    const totalWidth = window.innerWidth;
    const totalHeight = window.innerHeight;
    
    // Calculate number of lines based on grid size
    const numVerticalLines = Math.floor(totalWidth / gridSize);
    const numHorizontalLines = Math.floor(totalHeight / gridSize);
    
    // Base style for grid lines
    const lineStyle = "absolute pointer-events-none";
    
    // Create vertical grid lines
    for (let i = 1; i < numVerticalLines; i++) {
      const position = i * gridSize;
      const opacity = i % 5 === 0 ? 0.15 : 0.08; // Make every 5th line more visible
      
      gridLines.push(
        <div 
          key={`v-${i}`} 
          className={`${lineStyle} top-0 bottom-0 w-px bg-indigo-500`} 
          style={{ 
            left: `${position}px`,
            opacity
          }}
        />
      );
    }
    
    // Create horizontal grid lines
    for (let i = 1; i < numHorizontalLines; i++) {
      const position = i * gridSize;
      const opacity = i % 5 === 0 ? 0.15 : 0.08; // Make every 5th line more visible
      
      gridLines.push(
        <div 
          key={`h-${i}`} 
          className={`${lineStyle} left-0 right-0 h-px bg-indigo-500`} 
          style={{ 
            top: `${position}px`,
            opacity
          }}
        />
      );
    }
    
    return (
      <div className="absolute inset-0 z-30 pointer-events-none">
        {gridLines}
      </div>
    );
  };

  return (
    <>
      {/* Grid (always present when showGrid=true) */}
      {renderGrid()}
      
      {/* Snap guides (only visible when isVisible=true) */}
      {isVisible && (
        <motion.div 
          className="absolute inset-0 z-40 pointer-events-none overflow-hidden"
          initial="initial"
          animate="animate"
          exit="exit"
          variants={guideAnimation}
        >
          {/* Highlight area */}
          <div className={getHighlightStyles()} />
          
          {/* Edge guides */}
          {getEdgeGuides()}
          
          {/* Center guides */}
          {getCenterGuides()}
          
          {/* Position label */}
          <div className="absolute left-1/2 bottom-8 transform -translate-x-1/2 z-50">
            <div className="bg-black/60 text-white text-xs px-2 py-1 rounded-md backdrop-blur-sm">
              {snapPosition.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              {snapToGrid && <span className="ml-1 text-indigo-300">(Grid Snap)</span>}
            </div>
          </div>
        </motion.div>
      )}
    </>
  );
};

export default SnapGuides;