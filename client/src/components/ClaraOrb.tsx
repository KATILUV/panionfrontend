import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface ClaraOrbProps {
  isProcessing?: boolean;
}

export function ClaraOrb({ isProcessing = false }: ClaraOrbProps) {
  return (
    <div className="flex items-center justify-center py-8">
      <motion.div
        className={cn(
          "relative flex items-center justify-center",
          "w-32 h-32 rounded-full bg-gradient-to-br from-purple-600/80 to-indigo-600/80",
          "shadow-lg shadow-indigo-900/30 border border-indigo-500/30",
          "transition-all duration-500"
        )}
        initial={{ scale: 0.9, opacity: 0.5 }}
        animate={{ 
          scale: [0.98, 1.02, 0.98],
          opacity: isProcessing ? [0.7, 0.9, 0.7] : 1
        }}
        transition={{ 
          repeat: Infinity, 
          duration: isProcessing ? 1.5 : 4, 
          ease: "easeInOut" 
        }}
      >
        {/* Inner core */}
        <motion.div
          className="absolute w-20 h-20 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 opacity-80"
          animate={{ 
            scale: isProcessing ? [0.9, 1.1, 0.9] : [0.95, 1.05, 0.95]
          }}
          transition={{ 
            repeat: Infinity, 
            duration: isProcessing ? 1.2 : 3,
            ease: "easeInOut" 
          }}
        />
        
        {/* Outer glow */}
        <div className="absolute w-40 h-40 rounded-full bg-indigo-500/20 blur-xl"></div>
        
        {/* Light reflections */}
        <div className="absolute top-5 left-7 w-6 h-6 rounded-full bg-white/40 blur-sm"></div>
        <div className="absolute bottom-8 right-8 w-4 h-4 rounded-full bg-white/30 blur-sm"></div>
        
        {/* Energy ripples (only when processing) */}
        {isProcessing && (
          <>
            <motion.div
              className="absolute w-full h-full rounded-full border border-indigo-400/50"
              initial={{ scale: 0.6, opacity: 0.7 }}
              animate={{ scale: 1.2, opacity: 0 }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }}
            />
            <motion.div
              className="absolute w-full h-full rounded-full border border-purple-400/40"
              initial={{ scale: 0.8, opacity: 0.5 }}
              animate={{ scale: 1.3, opacity: 0 }}
              transition={{ repeat: Infinity, duration: 2.5, delay: 0.2, ease: "easeOut" }}
            />
          </>
        )}
      </motion.div>
    </div>
  );
}