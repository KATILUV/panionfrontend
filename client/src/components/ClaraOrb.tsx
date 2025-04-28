import React, { useState, useEffect, useRef } from 'react';

interface ClaraOrbProps {
  isProcessing?: boolean;
}

const ClaraOrb: React.FC<ClaraOrbProps> = ({ isProcessing = false }) => {
  const [pulseState, setPulseState] = useState(0);
  const [orbRotation, setOrbRotation] = useState(0);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const orbRef = useRef<HTMLDivElement>(null);

  // Effect for pulsing animation
  useEffect(() => {
    const pulseInterval = setInterval(() => {
      setPulseState((prev) => (prev + 1) % 3);
    }, isProcessing ? 400 : 1500);
    
    return () => clearInterval(pulseInterval);
  }, [isProcessing]);

  // Effect for subtle rotation
  useEffect(() => {
    const rotateInterval = setInterval(() => {
      setOrbRotation((prev) => (prev + 0.5) % 360);
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
      // Divide by larger value for more subtle effect
      setTilt({
        x: y / (rect.height / 2) * 15, // Tilt X axis (up/down) based on Y mouse position
        y: -x / (rect.width / 2) * 15,  // Tilt Y axis (left/right) based on X mouse position
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

  const innerOrbStyle = {
    transform: `rotate(-${orbRotation * 0.5}deg)`,
  };

  return (
    <div className="relative flex justify-center py-8">
      {/* Add subtle shadow underneath */}
      <div className="absolute w-20 h-4 bg-black opacity-10 rounded-full blur-md -bottom-2"></div>
      
      <div 
        ref={orbRef}
        className={`floating-orb w-24 h-24 rounded-full relative flex items-center justify-center transition-all duration-300 ease-in-out orb-3d ${isProcessing ? 'animate-pulse' : ''}`}
        style={orbStyle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Light highlight effect */}
        <div className="orb-highlight"></div>
        
        <div 
          className={`w-20 h-20 rounded-full bg-white/30 flex items-center justify-center transition-all duration-300 orb-inner-shadow ${pulseState === 0 ? 'scale-105' : 'scale-100'}`}
          style={innerOrbStyle}
        >
          <div 
            className={`w-16 h-16 rounded-full bg-white/40 flex items-center justify-center transition-all duration-300 orb-inner-shadow ${pulseState === 1 ? 'scale-105' : 'scale-100'}`}
          >
            <div 
              className={`w-12 h-12 rounded-full bg-white/60 flex items-center justify-center transition-all duration-300 ${pulseState === 2 ? 'scale-105' : 'scale-100'} ${isProcessing ? 'animate-bounce' : ''}`}
            >
              {/* Core orb with glow effect */}
              <div className="w-7 h-7 rounded-full bg-gradient-radial from-pink-300 via-primary to-secondary animate-pulse shadow-lg relative">
                {/* Small sparkle in the core */}
                <div className="absolute top-1 left-1 w-2 h-2 bg-white rounded-full opacity-80"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClaraOrb;
