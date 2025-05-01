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
  const [animationType, setAnimationType] = useState<'fade' | 'slide-up' | 'slide-down'>('fade');

  useEffect(() => {
    // Skip effect if no phrases
    if (phrases.length === 0) return;

    const rotationInterval = setInterval(() => {
      // Fade out
      setIsVisible(false);
      
      // Change phrase after fade out and fade in again
      setTimeout(() => {
        // Choose a random animation type for variety
        const animations: ('fade' | 'slide-up' | 'slide-down')[] = ['fade', 'slide-up', 'slide-down'];
        setAnimationType(animations[Math.floor(Math.random() * animations.length)]);
        
        setCurrentIndex((prevIndex) => (prevIndex + 1) % phrases.length);
        setCurrentPhrase(phrases[(currentIndex + 1) % phrases.length]);
        setIsVisible(true);
      }, 600); // 0.6 seconds for fade out
      
    }, interval);

    return () => clearInterval(rotationInterval);
  }, [phrases, interval, currentIndex]);

  // Different animation classes based on the animation type
  const getAnimationClasses = () => {
    switch (animationType) {
      case 'fade':
        return 'transition-opacity duration-500 ease-in-out';
      case 'slide-up':
        return 'transition-all duration-500 ease-in-out transform';
      case 'slide-down':
        return 'transition-all duration-500 ease-in-out transform';
      default:
        return 'transition-opacity duration-500 ease-in-out';
    }
  };

  // Different state classes based on visibility and animation type
  const getStateClasses = () => {
    if (!isVisible) {
      switch (animationType) {
        case 'fade':
          return 'opacity-0';
        case 'slide-up':
          return 'opacity-0 -translate-y-2';
        case 'slide-down':
          return 'opacity-0 translate-y-2';
        default:
          return 'opacity-0';
      }
    } else {
      switch (animationType) {
        case 'fade':
          return 'opacity-100';
        case 'slide-up':
          return 'opacity-100 translate-y-0';
        case 'slide-down':
          return 'opacity-100 translate-y-0';
        default:
          return 'opacity-100';
      }
    }
  };

  return (
    <div className="h-auto min-h-10 flex items-center justify-center"> {/* Flexible height container with centering */}
      <p className={`${getAnimationClasses()} ${getStateClasses()} ${className} text-center max-w-full px-4`}>
        {currentPhrase}
      </p>
    </div>
  );
};

export default RotatingTagline;