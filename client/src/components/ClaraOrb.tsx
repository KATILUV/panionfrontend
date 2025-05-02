import React, { useState, useEffect } from 'react';
import { useThemeStore } from '../state/themeStore';

interface ClaraOrbProps {
  isProcessing?: boolean;
}

const ClaraOrb: React.FC<ClaraOrbProps> = ({ isProcessing = false }) => {
  const getCurrentTheme = useThemeStore(state => state.getCurrentTheme);
  const accent = useThemeStore(state => state.accent);
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

  return (
    <div className="flex justify-center items-center my-6">
      <div 
        className={`
          relative w-32 h-32 rounded-full 
          floating-orb
          bg-opacity-15 backdrop-blur-lg
          ${getCurrentTheme() === 'dark' 
            ? 'bg-white/10' 
            : (accent === 'light' ? 'bg-white/30' : 'bg-white/20')
          }
          ${getCurrentTheme() === 'dark' || accent !== 'light'
            ? (isProcessing 
              ? 'shadow-[0_20px_70px_rgba(0,0,0,0.6),0_0_40px_rgba(138,43,226,0.6),0_0_60px_rgba(255,0,128,0.5),inset_0_0_80px_rgba(255,255,255,0.3)]' 
              : 'shadow-[0_20px_70px_rgba(0,0,0,0.6),0_0_30px_rgba(138,43,226,0.4),0_0_50px_rgba(255,0,128,0.3),inset_0_0_70px_rgba(255,255,255,0.2)]')
            : (isProcessing
              ? 'shadow-[0_20px_70px_rgba(0,0,0,0.2),0_0_40px_rgba(150,150,150,0.35),0_0_60px_rgba(200,200,200,0.4),inset_0_0_80px_rgba(255,255,255,0.5)]'
              : 'shadow-[0_20px_70px_rgba(0,0,0,0.15),0_0_30px_rgba(150,150,150,0.25),0_0_50px_rgba(200,200,200,0.3),inset_0_0_70px_rgba(255,255,255,0.4)]')
          }
          ${getCurrentTheme() === 'dark' 
            ? 'border border-white/60' 
            : (accent === 'light' ? 'border-2 border-gray-200/80' : 'border border-white/70')
          }
          overflow-hidden
          transition-all duration-300 ease-in-out
          ${isProcessing ? 'scale-105' : ''} 
        `}
      >
        {/* Crystal fluid container */}
        <div className="crystal-fluid">
          {/* Pink blob */}
          <div className={`lava-blob ${
            accent === 'light' && getCurrentTheme() === 'light'
              ? 'bg-gradient-radial from-gray-400/80 via-gray-300/50 to-gray-300/0'
              : 'lava-blob-1'
            } animate-blob-float-1`}></div>
          
          {/* Blue blob */}
          <div className={`lava-blob ${
            accent === 'light' && getCurrentTheme() === 'light'
              ? 'bg-gradient-radial from-gray-500/70 via-gray-400/50 to-gray-400/0'
              : 'lava-blob-2'
            } animate-blob-float-2`}></div>
          
          {/* Purple blob */}
          <div className={`lava-blob ${
            accent === 'light' && getCurrentTheme() === 'light'
              ? 'bg-gradient-radial from-gray-300/80 via-gray-200/60 to-gray-200/0'
              : 'lava-blob-3'
            } animate-blob-float-3`}></div>
          
          {/* Gold blob */}
          <div className={`lava-blob ${
            accent === 'light' && getCurrentTheme() === 'light'
              ? 'bg-gradient-radial from-gray-200/90 via-gray-300/60 to-gray-300/0'
              : 'lava-blob-4'
            } animate-blob-float-4`}></div>
          
          {/* Dynamically generated bubbles */}
          {generateBubbles()}
          
          {/* Iridescent overlay */}
          <div className={`${
            accent === 'light' && getCurrentTheme() === 'light'
              ? 'bg-gradient-conic from-gray-200/40 via-white/40 to-gray-300/40 opacity-40'
              : 'iridescent-layer'
          } absolute inset-0 rounded-full mix-blend-soft-light`}></div>
        </div>
        
        {/* Glass highlights */}
        <div className="crystal-highlight"></div>
        <div className="crystal-highlight-small"></div>
        
        {/* Add additional dynamic reflection */}
        <div className={`absolute inset-0 rounded-full opacity-10 
          ${getCurrentTheme() === 'dark' || accent !== 'light'
            ? 'bg-gradient-to-br from-purple-300/30 via-transparent to-pink-300/30'
            : 'bg-gradient-to-br from-gray-300/30 via-transparent to-gray-300/30'
          } mix-blend-overlay animate-reflection`}></div>
      </div>
    </div>
  );
};

export default ClaraOrb;