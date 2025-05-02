import React, { useState, useEffect } from 'react';

interface PanionOrbProps {
  isProcessing?: boolean;
}

const PanionOrb: React.FC<PanionOrbProps> = ({ isProcessing = false }) => {
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
          bg-white/10
          ${isProcessing 
            ? 'shadow-[0_20px_70px_rgba(0,0,0,0.6),0_0_40px_rgba(138,43,226,0.6),0_0_60px_rgba(255,0,128,0.5),inset_0_0_80px_rgba(255,255,255,0.3)]' 
            : 'shadow-[0_20px_70px_rgba(0,0,0,0.6),0_0_30px_rgba(138,43,226,0.4),0_0_50px_rgba(255,0,128,0.3),inset_0_0_70px_rgba(255,255,255,0.2)]'
          }
          border border-white/60
          overflow-hidden
          transition-all duration-300 ease-in-out
          ${isProcessing ? 'scale-105' : ''} 
        `}
      >
        {/* Crystal fluid container */}
        <div className="crystal-fluid">
          {/* Pink blob */}
          <div className="lava-blob lava-blob-1 animate-blob-float-1"></div>
          
          {/* Blue blob */}
          <div className="lava-blob lava-blob-2 animate-blob-float-2"></div>
          
          {/* Purple blob */}
          <div className="lava-blob lava-blob-3 animate-blob-float-3"></div>
          
          {/* Gold blob */}
          <div className="lava-blob lava-blob-4 animate-blob-float-4"></div>
          
          {/* Dynamically generated bubbles */}
          {generateBubbles()}
          
          {/* Iridescent overlay */}
          <div className="iridescent-layer"></div>
        </div>
        
        {/* Glass highlights */}
        <div className="crystal-highlight"></div>
        <div className="crystal-highlight-small"></div>
        
        {/* Add additional dynamic reflection */}
        <div className="absolute inset-0 rounded-full opacity-10 bg-gradient-to-br from-purple-300/30 via-transparent to-pink-300/30 mix-blend-overlay animate-reflection"></div>
      </div>
    </div>
  );
};

export default PanionOrb;