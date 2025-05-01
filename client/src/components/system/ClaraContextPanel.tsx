import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Database, Target, Sparkles } from 'lucide-react';
import { useThemeStore } from '../../state/themeStore';

interface ContextPanelProps {
  active?: boolean;
  className?: string;
}

const ClaraContextPanel: React.FC<ContextPanelProps> = ({ active = true, className = '' }) => {
  const [currentMemory, setCurrentMemory] = useState<string | null>(null);
  const [currentGoal, setCurrentGoal] = useState<string | null>("Help the user build a modular agent system");
  const [currentTone, setCurrentTone] = useState<string>("🤔");
  const [expanded, setExpanded] = useState(false);
  
  // Use accent color from theme
  const accent = useThemeStore(state => state.accent);
  
  // Get accent color class based on theme accent
  const getAccentClass = () => {
    switch (accent) {
      case 'blue': return 'border-blue-500/30 bg-blue-900/10';
      case 'green': return 'border-green-500/30 bg-green-900/10';
      case 'orange': return 'border-orange-500/30 bg-orange-900/10';
      case 'pink': return 'border-pink-500/30 bg-pink-900/10';
      case 'purple':
      default: return 'border-purple-500/30 bg-purple-900/10';
    }
  };
  
  // Simulating changing context based on user interactions
  // In a real implementation, this would subscribe to a context store
  useEffect(() => {
    if (!active) return;
    
    // Demo context changes
    const contextChangeInterval = setInterval(() => {
      // Rotate between different memories
      const memories = [
        "Previous discussion about UI components",
        "User's preference for dark mode",
        "Past request for window management features",
        null
      ];
      
      // Rotate between different goals
      const goals = [
        "Help the user build a modular agent system",
        "Implement UI improvements",
        "Explain system architecture",
        "Provide assistance with API integration"
      ];
      
      // Rotate between different tones
      const tones = ["🤔", "💡", "❤️", "✨", "🔍"];
      
      setCurrentMemory(memories[Math.floor(Math.random() * memories.length)]);
      setCurrentGoal(goals[Math.floor(Math.random() * goals.length)]);
      setCurrentTone(tones[Math.floor(Math.random() * tones.length)]);
    }, 8000);
    
    return () => clearInterval(contextChangeInterval);
  }, [active]);
  
  if (!active) return null;
  
  return (
    <AnimatePresence>
      <motion.div 
        className={`fixed bottom-20 left-4 text-xs rounded-lg backdrop-blur-md border overflow-hidden z-40 ${getAccentClass()} ${className}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.2 }}
      >
        <div 
          className="p-2 cursor-pointer hover:bg-white/5 transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center">
            <div className="text-xl mr-2">{currentTone}</div>
            <div className="font-medium">Clara's Context</div>
          </div>
        </div>
        
        {expanded && (
          <div className="px-3 pb-3 space-y-2">
            <div className="space-y-1">
              <div className="flex items-center text-green-300">
                <Target className="w-3 h-3 mr-1" /> 
                <span className="text-xs uppercase font-semibold">Current Goal</span>
              </div>
              <div className="text-white/80 text-xs pl-4">{currentGoal || "No specific goal"}</div>
            </div>
            
            {currentMemory && (
              <div className="space-y-1">
                <div className="flex items-center text-blue-300">
                  <Database className="w-3 h-3 mr-1" /> 
                  <span className="text-xs uppercase font-semibold">Relevant Memory</span>
                </div>
                <div className="text-white/80 text-xs pl-4">{currentMemory}</div>
              </div>
            )}
            
            <div className="space-y-1">
              <div className="flex items-center text-purple-300">
                <Sparkles className="w-3 h-3 mr-1" /> 
                <span className="text-xs uppercase font-semibold">Current Tone</span>
              </div>
              <div className="text-white/80 text-xs pl-4">
                {currentTone === "🤔" && "Thinking"}
                {currentTone === "💡" && "Insightful"}
                {currentTone === "❤️" && "Supportive"}
                {currentTone === "✨" && "Creative"}
                {currentTone === "🔍" && "Analytical"}
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default ClaraContextPanel;