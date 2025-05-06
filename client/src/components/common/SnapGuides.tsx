import React from 'react';
import { motion } from 'framer-motion';

interface SnapGuidesProps {
  isVisible: boolean;
  snapPosition: string;
  windowWidth: number;
  windowHeight: number;
}

/**
 * SnapGuides component displays visual guides when snapping windows
 * to different regions of the screen
 */
const SnapGuides: React.FC<SnapGuidesProps> = ({
  isVisible,
  snapPosition,
  windowWidth,
  windowHeight
}) => {
  if (!isVisible) return null;

  // Styles for different snap positions
  const getHighlightStyles = () => {
    const baseStyle = "absolute rounded-lg border-2 border-indigo-500/80 bg-indigo-500/10 pointer-events-none z-50";
    
    switch (snapPosition) {
      case 'left':
        return `${baseStyle} left-0 top-0 bottom-0 w-1/2`;
      case 'right':
        return `${baseStyle} right-0 top-0 bottom-0 w-1/2`;
      case 'top':
        return `${baseStyle} left-0 top-0 right-0 h-1/2`;
      case 'bottom':
        return `${baseStyle} left-0 bottom-0 right-0 h-1/2`;
      case 'top-left':
        return `${baseStyle} left-0 top-0 w-1/2 h-1/2`;
      case 'top-right':
        return `${baseStyle} right-0 top-0 w-1/2 h-1/2`;
      case 'bottom-left':
        return `${baseStyle} left-0 bottom-0 w-1/2 h-1/2`;
      case 'bottom-right':
        return `${baseStyle} right-0 bottom-0 w-1/2 h-1/2`;
      case 'center':
        // Calculate a centered box that's 70% of the screen
        return `${baseStyle} left-[15%] right-[15%] top-[15%] bottom-[15%] w-[70%] h-[70%] m-auto`;
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

  // Get edge guides (lines at edges of screen)
  const getEdgeGuides = () => {
    const edgeGuideStyle = "absolute bg-indigo-400 pointer-events-none";
    const edgeGuides = [];
    
    // Only show edge guides for relevant snap positions
    if (['left', 'top-left', 'bottom-left'].includes(snapPosition)) {
      // Left edge
      edgeGuides.push(
        <div key="left" className={`${edgeGuideStyle} left-0 top-0 bottom-0 w-0.5`} />
      );
    }
    
    if (['right', 'top-right', 'bottom-right'].includes(snapPosition)) {
      // Right edge
      edgeGuides.push(
        <div key="right" className={`${edgeGuideStyle} right-0 top-0 bottom-0 w-0.5`} />
      );
    }
    
    if (['top', 'top-left', 'top-right'].includes(snapPosition)) {
      // Top edge
      edgeGuides.push(
        <div key="top" className={`${edgeGuideStyle} top-0 left-0 right-0 h-0.5`} />
      );
    }
    
    if (['bottom', 'bottom-left', 'bottom-right'].includes(snapPosition)) {
      // Bottom edge
      edgeGuides.push(
        <div key="bottom" className={`${edgeGuideStyle} bottom-0 left-0 right-0 h-0.5`} />
      );
    }
    
    return edgeGuides;
  };

  // Get center guides (lines at center of screen)
  const getCenterGuides = () => {
    const centerGuideStyle = "absolute bg-indigo-400/60 pointer-events-none";
    const centerGuides = [];
    
    // Only show center guides for certain snap positions
    if (['center', 'left', 'right'].includes(snapPosition)) {
      // Vertical center line
      centerGuides.push(
        <div key="vertical-center" className={`${centerGuideStyle} left-1/2 -ml-px top-0 bottom-0 w-0.5`} />
      );
    }
    
    if (['center', 'top', 'bottom'].includes(snapPosition)) {
      // Horizontal center line
      centerGuides.push(
        <div key="horizontal-center" className={`${centerGuideStyle} top-1/2 -mt-px left-0 right-0 h-0.5`} />
      );
    }
    
    return centerGuides;
  };

  return (
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
        </div>
      </div>
    </motion.div>
  );
};

export default SnapGuides;