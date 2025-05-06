import React, { useState, useEffect } from 'react';

interface RotatingTaglineProps {
  phrases: string[];
  interval?: number; // Time in milliseconds between phrase changes
  className?: string;
}

const RotatingTagline: React.FC<RotatingTaglineProps> = ({ 
  phrases, 
  interval = 5000, // Default 5 seconds
  className = ""
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [currentPhrase, setCurrentPhrase] = useState(phrases[0]);

  useEffect(() => {
    // Skip effect if no phrases
    if (phrases.length === 0) return;

    const rotationInterval = setInterval(() => {
      // Fade out
      setIsVisible(false);
      
      // Change phrase after fade out and fade in again
      setTimeout(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % phrases.length);
        setCurrentPhrase(phrases[(currentIndex + 1) % phrases.length]);
        setIsVisible(true);
      }, 800); // 0.8 seconds for fade out
      
    }, interval);

    return () => clearInterval(rotationInterval);
  }, [phrases, interval, currentIndex]);

  // Simple fade animation with slower timing
  const getAnimationClasses = () => {
    return 'transition-opacity duration-800 ease-in-out';
  };

  // Simple visibility state
  const getStateClasses = () => {
    return isVisible ? 'opacity-100' : 'opacity-0';
  };

  return (
    <div className="h-[60px] md:h-[70px] flex items-center justify-center overflow-hidden relative"> {/* Fixed height container with centering */}
      <p className={`${getAnimationClasses()} ${getStateClasses()} ${className} text-center max-w-full px-2 absolute whitespace-normal md:whitespace-nowrap overflow-hidden text-ellipsis`}>
        {currentPhrase}
      </p>
    </div>
  );
};

export default RotatingTagline;