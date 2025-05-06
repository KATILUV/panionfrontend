import React from 'react';
import { motion } from 'framer-motion';
import { Spinner } from '@/components/ui/spinner';
import { Icon } from '@/components/ui/icon-provider';
import { ICONS } from '@/lib/icon-map';
import { cn } from '@/lib/utils';

interface PulseRingProps {
  size?: number;
  color?: string;
  duration?: number;
  delay?: number;
}

// Animated pulse ring component
const PulseRing: React.FC<PulseRingProps> = ({
  size = 100,
  color = 'rgba(147, 51, 234, 0.5)',
  duration = 2,
  delay = 0,
}) => {
  return (
    <motion.div
      className="absolute rounded-full"
      style={{
        width: size,
        height: size,
        border: `2px solid ${color}`,
        backgroundColor: 'transparent',
      }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ 
        opacity: [0, 0.5, 0], 
        scale: [0.8, 1.2, 1.5],
      }}
      transition={{
        duration,
        repeat: Infinity,
        delay,
        ease: 'easeInOut',
      }}
    />
  );
};

interface AIThinkingProps {
  visible?: boolean;
  size?: 'sm' | 'md' | 'lg';
  mode?: 'minimal' | 'standard' | 'detailed';
  message?: string;
  className?: string;
}

/**
 * Component to indicate AI is processing/thinking
 */
export function AIThinking({
  visible = true,
  size = 'md',
  mode = 'standard',
  message = 'Thinking...',
  className,
}: AIThinkingProps) {
  if (!visible) return null;
  
  // Size maps for different components
  const containerSizes = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-20 w-20',
  };
  
  const iconSizes = {
    sm: 'xs',
    md: 'sm',
    lg: 'md',
  } as const;
  
  const pulseSizes = {
    sm: 32,
    md: 48,
    lg: 80,
  };
  
  const messageSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  // Minimal mode just shows a simple loading spinner
  if (mode === 'minimal') {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Spinner size={size === 'lg' ? 'md' : size === 'md' ? 'sm' : 'xs'} className="text-primary" />
        {message && <span className={cn("text-primary-foreground/70", messageSizes[size])}>{message}</span>}
      </div>
    );
  }

  // Detailed mode shows an animated AI brain indicator with message
  if (mode === 'detailed') {
    return (
      <div className={cn("relative flex flex-col items-center justify-center", className)}>
        <div className={cn("relative flex items-center justify-center", containerSizes[size])}>
          {/* Multiple pulse rings for effect */}
          <PulseRing size={pulseSizes[size]} delay={0} duration={3} />
          <PulseRing size={pulseSizes[size] * 0.85} delay={0.5} duration={3} />
          <PulseRing size={pulseSizes[size] * 0.7} delay={1} duration={3} />
          
          {/* Center icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              animate={{ 
                opacity: [0.7, 1, 0.7],
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <Icon name={ICONS.BRAIN} className="text-primary" size={iconSizes[size]} />
            </motion.div>
          </div>
        </div>
        
        {message && (
          <motion.div 
            className={cn("mt-3 text-primary-foreground/70 text-center", messageSizes[size])}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {message}
          </motion.div>
        )}
      </div>
    );
  }

  // Standard mode (default)
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative">
        <Spinner 
          variant="pulse" 
          size={size === 'lg' ? 'md' : size === 'md' ? 'sm' : 'xs'} 
          className="text-primary"
        />
      </div>
      {message && (
        <motion.span 
          className={cn("text-primary-foreground/70", messageSizes[size])}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          {message}
        </motion.span>
      )}
    </div>
  );
}