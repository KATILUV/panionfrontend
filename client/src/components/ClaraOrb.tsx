import React, { useState, useEffect, useRef } from 'react';

interface ClaraOrbProps {
  isProcessing?: boolean;
}

const ClaraOrb: React.FC<ClaraOrbProps> = ({ isProcessing = false }) => {
  const [innerRotation, setInnerRotation] = useState(0);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const orbRef = useRef<HTMLDivElement>(null);

  // Effect for inner content rotation - slower and smoother
  useEffect(() => {
    const rotateInterval = setInterval(() => {
      setInnerRotation((prev) => (prev + 0.2) % 360);
    }, 50);
    
    return () => clearInterval(rotateInterval);
  }, []);

  // Track mouse for 3D tilt effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!orbRef.current || !isHovered) return;
      
      const rect = orbRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      
      // Calculate tilt based on mouse position relative to orb center
      setTilt({
        x: y / (rect.height / 2) * 12, // Tilt X axis (up/down) based on Y mouse position
        y: -x / (rect.width / 2) * 12,  // Tilt Y axis (left/right) based on X mouse position
      });
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isHovered]);

  // Reset tilt when not hovered
  useEffect(() => {
    if (!isHovered) {
      const resetTimer = setTimeout(() => {
        setTilt({ x: 0, y: 0 });
      }, 300);
      
      return () => clearTimeout(resetTimer);
    }
  }, [isHovered]);

  // Generate dynamic styles for 3D effect
  const orbStyle = {
    transform: `perspective(800px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
    transition: isHovered ? 'transform 0.1s ease' : 'transform 0.3s ease-out'
  };

  const innerCloudStyle = {
    transform: `rotate(${innerRotation}deg)`,
  };

  return (
    <div className="relative flex justify-center py-8">
      {/* Ground reflection/shadow */}
      <div className="absolute w-20 h-3 bg-black opacity-10 rounded-full blur-md bottom-0 scale-x-110"></div>
      
      {/* Crystal Ball */}
      <div 
        ref={orbRef}
        className={`floating-orb w-28 h-28 rounded-full relative flex items-center justify-center transition-all duration-300 crystal-ball crystal-glow ${isProcessing ? 'animate-pulse' : ''}`}
        style={orbStyle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Light reflections */}
        <div className="crystal-highlight"></div>
        <div className="crystal-highlight-small"></div>
        
        {/* Fluid animation inside the crystal ball */}
        <div className="crystal-fluid">
          {/* New iridescent base layer */}
          <div className="iridescent-layer"></div>
          
          {/* Original fluid layers with updated colors */}
          <div className="fluid-layer-1"></div>
          <div className="fluid-layer-2"></div>
          <div className="fluid-layer-3"></div>
          <div className="fluid-layer-4"></div>
          
          {/* Add iridescent floating bubbles */}
          <div className="bubble bubble-iridescent w-3 h-3" style={{ 
            left: '30%', 
            bottom: '10%',
            '--duration': '7s', 
            '--opacity': '0.7',
            '--move-x': '10px'
          } as React.CSSProperties}></div>
          
          <div className="bubble bubble-iridescent w-2 h-2" style={{ 
            left: '60%', 
            bottom: '5%',
            '--duration': '10s', 
            '--opacity': '0.8',
            '--move-x': '-15px'
          } as React.CSSProperties}></div>
          
          <div className="bubble bubble-iridescent w-1.5 h-1.5" style={{ 
            left: '45%', 
            bottom: '0%',
            '--duration': '6s', 
            '--opacity': '0.6',
            '--move-x': '5px'
          } as React.CSSProperties}></div>
          
          <div className="bubble bubble-iridescent w-2 h-2" style={{ 
            left: '20%', 
            bottom: '15%',
            '--duration': '8s', 
            '--opacity': '0.7',
            '--move-x': '-5px'
          } as React.CSSProperties}></div>
          
          <div className="bubble bubble-iridescent w-1 h-1" style={{ 
            left: '80%', 
            bottom: '8%',
            '--duration': '5s', 
            '--opacity': '0.5',
            '--move-x': '3px'
          } as React.CSSProperties}></div>
        </div>
        
        {/* Subtle sparkling effects inside the crystal */}
        <div className="absolute w-full h-full rounded-full flex items-center justify-center">
          {/* Just add small sparkles throughout */}
          <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-white rounded-full opacity-80"></div>
          <div className="absolute top-1/3 right-1/3 w-1.5 h-1.5 bg-white rounded-full opacity-90"></div>
          <div className="absolute bottom-1/4 right-1/4 w-1 h-1 bg-white rounded-full opacity-70"></div>
          
          {/* More active fluid effect when processing */}
          {isProcessing && (
            <>
              <div className="absolute inset-0 w-full h-full rounded-full bg-gradient-radial from-pink-200 via-transparent to-transparent blur-md opacity-40 animate-pulse"></div>
              <div className="bubble bubble-iridescent w-2 h-2 animate-bounce" style={{ 
                left: '25%', 
                bottom: '15%',
                '--duration': '3s', 
                '--opacity': '0.9',
                '--move-x': '8px'
              } as React.CSSProperties}></div>
              <div className="bubble bubble-iridescent w-2.5 h-2.5 animate-bounce" style={{ 
                left: '70%', 
                bottom: '20%',
                '--duration': '4s', 
                '--opacity': '0.9',
                '--move-x': '-12px'
              } as React.CSSProperties}></div>
              <div className="bubble bubble-iridescent w-1.5 h-1.5" style={{ 
                left: '40%', 
                bottom: '30%',
                '--duration': '2.5s', 
                '--opacity': '0.8',
                '--move-x': '5px'
              } as React.CSSProperties}></div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClaraOrb;
