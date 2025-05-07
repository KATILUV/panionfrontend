import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useThemeStore } from '../../state/themeStore';
import { Layers } from 'lucide-react';

interface WindowGroupIndicatorProps {
  isVisible: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  direction: 'top' | 'right' | 'bottom' | 'left' | 'center';
  onCreateGroup: () => void;
}

const WindowGroupIndicator: React.FC<WindowGroupIndicatorProps> = ({
  isVisible,
  position,
  size,
  direction,
  onCreateGroup,
}) => {
  const getCurrentTheme = useThemeStore(state => state.getCurrentTheme);
  const isDarkTheme = getCurrentTheme() === 'dark';
  
  // Determine colors based on theme
  const colors = {
    bg: isDarkTheme ? 'bg-violet-900/80' : 'bg-violet-100/90',
    text: isDarkTheme ? 'text-white' : 'text-violet-950',
    border: isDarkTheme ? 'border-violet-600/50' : 'border-violet-300',
    iconBg: isDarkTheme ? 'bg-violet-700' : 'bg-violet-200',
    shadow: isDarkTheme ? 'shadow-lg shadow-purple-900/30' : 'shadow-lg shadow-purple-300/30',
  };
  
  // Adjust position and size based on direction
  const getIndicatorStyle = () => {
    const { x, y } = position;
    const { width, height } = size;
    
    const baseStyle = {
      width: 180,
      height: 60,
      borderRadius: 6,
    };
    
    switch (direction) {
      case 'top':
        return {
          ...baseStyle,
          left: x + width / 2 - baseStyle.width / 2,
          top: y - baseStyle.height - 10,
        };
      case 'right':
        return {
          ...baseStyle,
          left: x + width + 10,
          top: y + height / 2 - baseStyle.height / 2,
        };
      case 'bottom':
        return {
          ...baseStyle,
          left: x + width / 2 - baseStyle.width / 2,
          top: y + height + 10,
        };
      case 'left':
        return {
          ...baseStyle,
          left: x - baseStyle.width - 10,
          top: y + height / 2 - baseStyle.height / 2,
        };
      case 'center':
      default:
        return {
          ...baseStyle,
          left: x + width / 2 - baseStyle.width / 2,
          top: y + height / 2 - baseStyle.height / 2,
        };
    }
  };
  
  if (!isVisible) return null;
  
  const indicatorStyle = getIndicatorStyle();
  
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={`fixed ${colors.bg} ${colors.border} ${colors.text} ${colors.shadow} backdrop-blur-sm border z-50 flex items-center gap-2 px-3`}
          style={{
            ...indicatorStyle,
            zIndex: 9999,
          }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.2 }}
          onClick={onCreateGroup}
        >
          <div className={`${colors.iconBg} p-1.5 rounded-full`}>
            <Layers className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Group Windows</p>
            <p className="text-xs opacity-70">Click to create a window group</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WindowGroupIndicator;