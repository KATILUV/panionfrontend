import React from 'react';
import { useThemeStore } from '../state/themeStore';

interface ClaraOrbProps {
  isProcessing?: boolean;
}

const ClaraOrb: React.FC<ClaraOrbProps> = ({ isProcessing = false }) => {
  const getCurrentTheme = useThemeStore(state => state.getCurrentTheme);
  const accent = useThemeStore(state => state.accent);
  const isDark = getCurrentTheme() === 'dark';
  const isLightAccent = accent === 'light' && !isDark;
  
  // Random bubble generator
  const generateBubbles = () => {
    const bubbles = [];
    const bubbleCount = 15; // Increased number of bubbles
    
    for (let i = 0; i < bubbleCount; i++) {
      // Create random properties for bubbles
      const size = Math.random() * 3 + 1; // Size between 1-4px
      const left = Math.random() * 70 + 15; // Position between 15-85%
      const bottom = Math.random() * 40; // Start position between 0-40% from bottom
      const duration = Math.random() * 4 + 3; // Duration between 3-7s
      const delay = Math.random() * 5; // Random delay up to 5s
      const opacity = Math.random() * 0.5 + 0.3; // Opacity between 0.3-0.8
      const moveX = (Math.random() * 10 - 5); // Move X between -5px and 5px
      
      bubbles.push(
        <div 
          key={i}
          className="bubble bubble-iridescent"
          style={{ 
            width: `${size}px`, 
            height: `${size}px`, 
            left: `${left}%`, 
            bottom: `${bottom}%`, 
            '--duration': `${duration}s`,
            '--delay': `${delay}s`,
            '--opacity': opacity,
            '--move-x': `${moveX}px`,
            animationDelay: `${delay}s`
          } as React.CSSProperties}
        ></div>
      );
    }
    
    return bubbles;
  };

  // Determine shadow style based on theme and processing state
  const getShadowClass = () => {
    // Light mode with light accent gets nearly invisible shadows
    if (!isDark && accent === 'light') {
      // Extremely subtle shadows in light mode + light accent
      return isProcessing
        ? 'shadow-[0_2px_10px_rgba(200,200,200,0.3),inset_0_0_50px_rgba(255,255,255,0.3)]'
        : 'shadow-[0_2px_8px_rgba(200,200,200,0.2),inset_0_0_40px_rgba(255,255,255,0.2)]';
    } 
    // Light mode with colored accents gets light shadows
    else if (!isDark) {
      // Light shadows for light mode with color accents
      return isProcessing
        ? 'shadow-[0_3px_12px_rgba(150,150,180,0.3),0_0_20px_rgba(150,150,180,0.15),inset_0_0_50px_rgba(255,255,255,0.3)]'
        : 'shadow-[0_3px_10px_rgba(150,150,180,0.25),0_0_15px_rgba(150,150,180,0.1),inset_0_0_40px_rgba(255,255,255,0.25)]';
    }
    // Dark mode gets strong purple/pink glow shadows
    else {
      // Dark mode strong shadows
      return isProcessing
        ? 'shadow-[0_8px_35px_rgba(0,0,0,0.6),0_0_40px_rgba(138,43,226,0.6),0_0_60px_rgba(255,0,128,0.5),inset_0_0_80px_rgba(255,255,255,0.3)]'
        : 'shadow-[0_8px_30px_rgba(0,0,0,0.6),0_0_30px_rgba(138,43,226,0.4),0_0_50px_rgba(255,0,128,0.3),inset_0_0_70px_rgba(255,255,255,0.2)]';
    }
  };

  // Background color class
  const getBgClass = () => {
    if (isDark) {
      return 'bg-white/10'; // Dark mode - standard glass effect
    } else if (isLightAccent) {
      return 'bg-gradient-to-br from-gray-50/30 to-gray-200/20'; // Light mode + light accent - subtle gradient
    } else {
      return 'bg-gradient-to-br from-blue-50/20 to-purple-50/10'; // Light mode + color accent - very subtle color gradient
    }
  };

  // Border class - no border in light mode
  const getBorderClass = () => {
    if (isDark) {
      return 'border border-white/60'; // Dark mode - visible white border
    } else {
      return ''; // Light mode - no border at all
    }
  };

  return (
    <div className="flex justify-center items-center my-6">
      <div 
        className={`
          relative w-32 h-32 rounded-full 
          floating-orb
          bg-opacity-15 backdrop-blur-lg
          ${getBgClass()}
          ${getShadowClass()}
          ${getBorderClass()}
          overflow-hidden
          transition-all duration-300 ease-in-out
          ${isProcessing ? 'scale-105' : ''}
          ${!isDark ? '!border-0 !border-none' : ''}
        `}
      >
        {/* Crystal fluid container */}
        <div className={`crystal-fluid ${isLightAccent ? 'light-fluid' : ''} ${!isDark ? '!border-0 !border-none' : ''}`}>
          {/* Pink blob */}
          <div className={`lava-blob ${
            isLightAccent
              ? 'bg-gradient-radial from-pink-50/40 via-gray-100/30 to-transparent'
              : 'lava-blob-1'
            } animate-blob-float-1`}></div>
          
          {/* Blue blob */}
          <div className={`lava-blob ${
            isLightAccent
              ? 'bg-gradient-radial from-blue-50/30 via-gray-200/25 to-transparent'
              : 'lava-blob-2'
            } animate-blob-float-2`}></div>
          
          {/* Purple blob */}
          <div className={`lava-blob ${
            isLightAccent
              ? 'bg-gradient-radial from-purple-50/35 via-gray-100/25 to-transparent'
              : 'lava-blob-3'
            } animate-blob-float-3`}></div>
          
          {/* Gold blob */}
          <div className={`lava-blob ${
            isLightAccent
              ? 'bg-gradient-radial from-amber-50/35 via-gray-100/25 to-transparent'
              : 'lava-blob-4'
            } animate-blob-float-4`}></div>
          
          {/* Dynamically generated bubbles */}
          {generateBubbles()}
          
          {/* Iridescent overlay */}
          <div className={`${
            isLightAccent
              ? 'bg-gradient-conic from-blue-50/20 via-purple-50/10 to-pink-50/15 opacity-30'
              : 'iridescent-layer'
          } absolute inset-0 rounded-full mix-blend-soft-light animate-shimmer`}></div>
        </div>
        
        {/* Glass highlights */}
        <div className="crystal-highlight"></div>
        <div className="crystal-highlight-small"></div>
        
        {/* Add additional dynamic reflection */}
        <div className={`absolute inset-0 rounded-full opacity-10 
          ${isDark || accent !== 'light'
            ? 'bg-gradient-to-br from-purple-300/30 via-transparent to-pink-300/30'
            : 'bg-gradient-to-br from-blue-100/20 via-transparent to-purple-100/20'
          } mix-blend-overlay animate-reflection`}></div>
      </div>
    </div>
  );
};

export default ClaraOrb;