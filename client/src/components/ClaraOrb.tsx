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
      // Rotate faster when processing
      const rotateSpeed = isProcessing ? 0.5 : 0.2;
      setInnerRotation((prev) => (prev + rotateSpeed) % 360);
    }, 50);
    
    return () => clearInterval(rotateInterval);
  }, [isProcessing]);

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
        className={`floating-orb w-28 h-28 rounded-full relative flex items-center justify-center transition-all duration-300 crystal-ball crystal-glow ${isProcessing ? 'animate-pulse shadow-lg shadow-pink-600/30' : ''}`}
        style={{
          ...orbStyle,
          boxShadow: isProcessing ? '0 0 25px rgba(255, 0, 128, 0.35), 0 0 40px rgba(138, 43, 226, 0.25), inset 0 0 50px rgba(255, 255, 255, 0.2)' : ''
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Light reflections */}
        <div className="crystal-highlight"></div>
        <div className="crystal-highlight-small"></div>
        
        {/* Fluid animation inside the crystal ball */}
        <div className="crystal-fluid">
          {/* Iridescent shimmer overlay */}
          <div className="iridescent-layer"></div>
          
          {/* Lava lamp blobs */}
          <div className="lava-blob lava-blob-1"></div>
          <div className="lava-blob lava-blob-2"></div>
          <div className="lava-blob lava-blob-3"></div>
          <div className="lava-blob lava-blob-4"></div>
          
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
          
          <div className="bubble bubble-iridescent w-1 h-1" style={{ 
            left: '30%', 
            bottom: '8%',
            '--duration': '4.5s', 
            '--opacity': '0.4',
            '--move-x': '7px'
          } as React.CSSProperties}></div>
          
          <div className="bubble bubble-iridescent w-1.5 h-1.5" style={{ 
            left: '70%', 
            bottom: '12%',
            '--duration': '7.5s', 
            '--opacity': '0.6',
            '--move-x': '-8px'
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
              {/* Energetic lava glow */}
              <div className="absolute inset-0 w-full h-full rounded-full bg-gradient-radial from-pink-200 via-transparent to-transparent blur-md opacity-50 animate-pulse"></div>
              
              {/* Extra lava blobs that appear when processing */}
              <div className="lava-blob lava-blob-active" style={{
                width: '30%',
                height: '30%',
                background: 'radial-gradient(circle at 40% 40%, rgb(255, 102, 196) 0%, rgba(255, 0, 128, 0.7) 50%, rgba(255, 0, 128, 0) 100%)',
                left: '35%',
                bottom: '35%',
                animation: 'blob-float 4s ease-in-out infinite, pulse 2s infinite'
              }}></div>
              
              {/* Active bubbles */}
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
