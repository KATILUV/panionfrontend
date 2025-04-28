import React, { useState, useEffect } from 'react';

interface ClaraOrbProps {
  isProcessing?: boolean;
}

const ClaraOrb: React.FC<ClaraOrbProps> = ({ isProcessing = false }) => {
  const [pulseState, setPulseState] = useState(0);
  const [orbRotation, setOrbRotation] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

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

  // Track mouse for subtle movement
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isHovered) {
        setMousePosition({ 
          x: (e.clientX / window.innerWidth - 0.5) * 10, 
          y: (e.clientY / window.innerHeight - 0.5) * 10 
        });
      }
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isHovered]);

  // Generate dynamic styles
  const orbStyle = {
    transform: `translateY(0) rotate(${orbRotation}deg) translateX(${mousePosition.x}px) translateY(${mousePosition.y}px)`,
    boxShadow: `0 0 ${isProcessing ? '20px' : '15px'} rgba(255, 156, 205, 0.7)`
  };
  
  const innerOrbStyle = {
    transform: `rotate(-${orbRotation * 0.5}deg)`,
  };

  return (
    <div className="relative flex justify-center py-6">
      <div 
        className={`floating-orb w-24 h-24 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center transition-all duration-300 ease-in-out orb-glow ${isProcessing ? 'animate-pulse' : ''}`}
        style={orbStyle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          setMousePosition({ x: 0, y: 0 });
        }}
      >
        <div 
          className={`w-20 h-20 rounded-full bg-white bg-opacity-30 flex items-center justify-center transition-all duration-300 ${pulseState === 0 ? 'scale-105' : 'scale-100'}`}
          style={innerOrbStyle}
        >
          <div 
            className={`w-16 h-16 rounded-full bg-white bg-opacity-50 flex items-center justify-center transition-all duration-300 ${pulseState === 1 ? 'scale-105' : 'scale-100'}`}
          >
            <div 
              className={`w-12 h-12 rounded-full bg-white bg-opacity-70 flex items-center justify-center transition-all duration-300 ${pulseState === 2 ? 'scale-105' : 'scale-100'} ${isProcessing ? 'animate-bounce' : ''}`}
            >
              <div className="w-6 h-6 rounded-full bg-gradient-to-r from-primary via-pink-400 to-secondary animate-pulse shadow-inner"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClaraOrb;
