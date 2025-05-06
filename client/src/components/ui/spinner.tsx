import React from 'react';
import { motion } from 'framer-motion';

interface SpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'white' | 'gray' | 'indigo' | 'purple';
  thickness?: 'thin' | 'regular' | 'thick';
  label?: string;
}

/**
 * Enhanced spinner component with various customization options
 */
const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  color = 'primary',
  thickness = 'regular',
  label
}) => {
  // Map size to dimensions
  const sizeMap = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  // Map thickness
  const thicknessMap = {
    thin: 'border',
    regular: 'border-2',
    thick: 'border-3'
  };

  // Map color to tailwind classes
  const colorMap = {
    primary: {
      spinning: 'border-t-primary border-r-primary/30 border-b-primary/10 border-l-primary/60',
      track: 'border-gray-700/30'
    },
    white: {
      spinning: 'border-t-white border-r-white/30 border-b-white/10 border-l-white/60',
      track: 'border-gray-700/30'
    },
    gray: {
      spinning: 'border-t-gray-300 border-r-gray-300/30 border-b-gray-300/10 border-l-gray-300/60',
      track: 'border-gray-800/30'
    },
    indigo: {
      spinning: 'border-t-indigo-500 border-r-indigo-500/30 border-b-indigo-500/10 border-l-indigo-500/60',
      track: 'border-gray-800/30'
    },
    purple: {
      spinning: 'border-t-purple-500 border-r-purple-500/30 border-b-purple-500/10 border-l-purple-500/60',
      track: 'border-gray-800/30'
    },
  };

  return (
    <div className="flex items-center justify-center space-x-2">
      <div className="relative">
        {/* Background track */}
        <div 
          className={`${sizeMap[size]} ${thicknessMap[thickness]} rounded-full ${colorMap[color].track}`}
        />
        
        {/* Spinning element */}
        <motion.div
          className={`absolute inset-0 ${thicknessMap[thickness]} rounded-full ${colorMap[color].spinning}`}
          animate={{ rotate: 360 }}
          transition={{ 
            duration: 1.2, 
            repeat: Infinity, 
            ease: "linear"
          }}
        />

        {/* Second spinning element for more interesting motion */}
        <motion.div
          className={`absolute inset-0 ${thicknessMap[thickness]} rounded-full ${colorMap[color].spinning} opacity-50`}
          animate={{ rotate: -180 }}
          transition={{ 
            duration: 2, 
            repeat: Infinity, 
            ease: "easeInOut"
          }}
          style={{ borderLeftColor: 'transparent', borderRightColor: 'transparent' }}
        />
      </div>
      
      {label && (
        <span className="text-sm text-gray-300">{label}</span>
      )}
    </div>
  );
};

export default Spinner;