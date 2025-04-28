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
        
        {/* Inner crystal content - looks like whispy clouds */}
        <div className="crystal-clouds" style={innerCloudStyle}></div>
        
        {/* Subtle sparkling effects inside the crystal */}
        <div className="absolute w-full h-full rounded-full flex items-center justify-center">
          {/* Just add small sparkles throughout */}
          <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-white rounded-full opacity-80"></div>
          <div className="absolute top-1/3 right-1/3 w-1.5 h-1.5 bg-white rounded-full opacity-90"></div>
          <div className="absolute bottom-1/4 right-1/4 w-1 h-1 bg-white rounded-full opacity-70"></div>
          
          {/* Very subtle glow when processing */}
          {isProcessing && (
            <div className="absolute inset-0 w-full h-full rounded-full bg-pink-100 blur-md opacity-30 animate-pulse"></div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClaraOrb;
