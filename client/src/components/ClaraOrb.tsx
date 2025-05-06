import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAgentStore } from '@/state/agentStore';
import { BrainCircuit } from 'lucide-react';

interface ClaraOrbProps {
  isProcessing?: boolean;
}

export function ClaraOrb({ isProcessing = false }: ClaraOrbProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const openAgent = useAgentStore((state) => state.openAgent);
  const focusAgent = useAgentStore((state) => state.focusAgent);

  // Position the orb in the bottom right of the screen by default
  useEffect(() => {
    const updatePosition = () => {
      const posX = window.innerWidth - 100;
      const posY = window.innerHeight - 100;
      setPosition({ x: posX, y: posY });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    
    return () => {
      window.removeEventListener('resize', updatePosition);
    };
  }, []);

  // Add occasional pulse animation
  useEffect(() => {
    const interval = setInterval(() => {
      setIsPulsing(true);
      setTimeout(() => setIsPulsing(false), 2000);
    }, 15000);
    
    return () => clearInterval(interval);
  }, []);

  const handleOrbClick = () => {
    if (!isDragging) {
      openAgent('clara');
      focusAgent('clara');
    }
  };

  return (
    <motion.div
      className="fixed z-50"
      initial={position}
      animate={position}
      drag
      dragMomentum={false}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={(_, info) => {
        setIsDragging(false);
        setPosition({ x: position.x + info.offset.x, y: position.y + info.offset.y });
      }}
      whileDrag={{ scale: 1.1 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <div 
        className={cn(
          "relative flex items-center justify-center",
          "cursor-pointer transition-all duration-300"
        )}
        onClick={handleOrbClick}
      >
        {/* Background glow effect */}
        <motion.div
          className={cn(
            "absolute rounded-full bg-primary/20",
            "filter blur-md"
          )}
          animate={{
            width: isPulsing || isHovered ? 70 : 50,
            height: isPulsing || isHovered ? 70 : 50,
            opacity: isPulsing ? 0.8 : isHovered ? 0.6 : 0.3
          }}
          transition={{ 
            duration: isPulsing ? 2 : 0.3,
            ease: isPulsing ? "easeInOut" : "easeOut" 
          }}
        />
        
        {/* Main orb */}
        <motion.div
          className={cn(
            "relative flex items-center justify-center",
            "w-14 h-14 rounded-full bg-primary/60 backdrop-blur-md",
            "shadow-lg border border-primary/30",
            isProcessing ? "animate-pulse" : ""
          )}
          animate={{
            scale: isPulsing ? 1.1 : isHovered ? 1.05 : 1,
          }}
          transition={{ 
            duration: isPulsing ? 2 : 0.3,
            ease: isPulsing ? "easeInOut" : "easeOut" 
          }}
        >
          <BrainCircuit className="w-6 h-6 text-background" />
        </motion.div>
        
        {/* Hint tooltip */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              className="absolute top-[-40px] bg-background/95 text-foreground rounded-md px-3 py-1 shadow-md whitespace-nowrap"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              transition={{ duration: 0.2 }}
            >
              Open Clara AI
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}