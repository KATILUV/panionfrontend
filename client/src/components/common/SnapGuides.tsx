import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
  if (!isVisible || snapPosition === 'none') return null;
  
  // Calculate positions based on screen dimensions
  const halfWidth = windowWidth / 2;
  const halfHeight = windowHeight / 2;
  
  const getGuideStyles = () => {
    // Base positioning for different snap areas
    switch (snapPosition) {
      case 'left':
        return {
          left: 0,
          top: 0,
          width: halfWidth,
          height: windowHeight,
          borderRight: '2px solid rgba(97, 218, 251, 0.7)'
        };
      case 'right':
        return {
          left: halfWidth,
          top: 0,
          width: halfWidth,
          height: windowHeight,
          borderLeft: '2px solid rgba(97, 218, 251, 0.7)'
        };
      case 'top':
        return {
          left: 0,
          top: 0,
          width: windowWidth,
          height: halfHeight,
          borderBottom: '2px solid rgba(97, 218, 251, 0.7)'
        };
      case 'bottom':
        return {
          left: 0,
          top: halfHeight,
          width: windowWidth,
          height: halfHeight,
          borderTop: '2px solid rgba(97, 218, 251, 0.7)'
        };
      case 'top-left':
        return {
          left: 0,
          top: 0,
          width: halfWidth,
          height: halfHeight,
          borderRight: '2px solid rgba(97, 218, 251, 0.7)',
          borderBottom: '2px solid rgba(97, 218, 251, 0.7)'
        };
      case 'top-right':
        return {
          left: halfWidth,
          top: 0,
          width: halfWidth,
          height: halfHeight,
          borderLeft: '2px solid rgba(97, 218, 251, 0.7)',
          borderBottom: '2px solid rgba(97, 218, 251, 0.7)'
        };
      case 'bottom-left':
        return {
          left: 0,
          top: halfHeight,
          width: halfWidth,
          height: halfHeight,
          borderRight: '2px solid rgba(97, 218, 251, 0.7)',
          borderTop: '2px solid rgba(97, 218, 251, 0.7)'
        };
      case 'bottom-right':
        return {
          left: halfWidth,
          top: halfHeight,
          width: halfWidth,
          height: halfHeight,
          borderLeft: '2px solid rgba(97, 218, 251, 0.7)',
          borderTop: '2px solid rgba(97, 218, 251, 0.7)'
        };
      case 'center':
        const centerWidth = windowWidth * 0.5;
        const centerHeight = windowHeight * 0.5;
        const centerLeft = (windowWidth - centerWidth) / 2;
        const centerTop = (windowHeight - centerHeight) / 2;
        
        return {
          left: centerLeft,
          top: centerTop,
          width: centerWidth,
          height: centerHeight,
          border: '2px solid rgba(97, 218, 251, 0.7)'
        };
      default:
        return {};
    }
  };
  
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 pointer-events-none z-[9998]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <motion.div
            className="absolute"
            style={{
              ...getGuideStyles(),
              backgroundColor: 'rgba(97, 218, 251, 0.1)',
              backdropFilter: 'blur(1px)',
              zIndex: 9999
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
          
          {/* Display snap position label */}
          <motion.div
            className="absolute left-1/2 bottom-8 transform -translate-x-1/2 bg-blue-900/80 text-blue-100 text-xs px-3 py-1.5 rounded-full backdrop-blur-sm border border-blue-500/30"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
          >
            {snapPosition.charAt(0).toUpperCase() + snapPosition.slice(1).replace('-', ' ')}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SnapGuides;