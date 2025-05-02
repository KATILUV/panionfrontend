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
  
  // Use theme settings
  const accent = useThemeStore(state => state.accent);
  const getCurrentTheme = useThemeStore(state => state.getCurrentTheme);
  
  // Get accent color class based on theme accent and current theme
  const getAccentClass = () => {
    const isDark = getCurrentTheme() === 'dark';
    
    switch (accent) {
      case 'blue': 
        return isDark 
          ? 'border-blue-500/30 bg-blue-900/10' 
          : 'border-blue-300 bg-blue-50';
      case 'green': 
        return isDark 
          ? 'border-green-500/30 bg-green-900/10' 
          : 'border-green-300 bg-green-50';
      case 'orange': 
        return isDark 
          ? 'border-orange-500/30 bg-orange-900/10' 
          : 'border-orange-300 bg-orange-50';
      case 'pink': 
        return isDark 
          ? 'border-pink-500/30 bg-pink-900/10' 
          : 'border-pink-300 bg-pink-50';
      case 'purple':
      default: 
        return isDark 
          ? 'border-purple-500/30 bg-purple-900/10'
          : 'border-purple-300 bg-purple-50';
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
          className={`p-2 cursor-pointer transition-colors ${
            getCurrentTheme() === 'dark' 
              ? 'hover:bg-white/5' 
              : 'hover:bg-purple-100/50'
          }`}
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center">
            <div className="text-xl mr-2">{currentTone}</div>
            <div className={`font-medium ${
              getCurrentTheme() === 'dark' 
                ? 'text-white' 
                : 'text-gray-800'
            }`}>Clara's Context</div>
          </div>
        </div>
        
        {expanded && (
          <div className="px-3 pb-3 space-y-2">
            <div className="space-y-1">
              <div className={`flex items-center ${
                getCurrentTheme() === 'dark' 
                  ? 'text-green-300' 
                  : 'text-green-600'
              }`}>
                <Target className="w-3 h-3 mr-1" /> 
                <span className="text-xs uppercase font-semibold">Current Goal</span>
              </div>
              <div className={`text-xs pl-4 ${
                getCurrentTheme() === 'dark' 
                  ? 'text-white/80' 
                  : 'text-gray-700'
              }`}>{currentGoal || "No specific goal"}</div>
            </div>
            
            {currentMemory && (
              <div className="space-y-1">
                <div className={`flex items-center ${
                  getCurrentTheme() === 'dark' 
                    ? 'text-blue-300' 
                    : 'text-blue-600'
                }`}>
                  <Database className="w-3 h-3 mr-1" /> 
                  <span className="text-xs uppercase font-semibold">Relevant Memory</span>
                </div>
                <div className={`text-xs pl-4 ${
                  getCurrentTheme() === 'dark' 
                    ? 'text-white/80' 
                    : 'text-gray-700'
                }`}>{currentMemory}</div>
              </div>
            )}
            
            <div className="space-y-1">
              <div className={`flex items-center ${
                getCurrentTheme() === 'dark' 
                  ? 'text-purple-300' 
                  : 'text-purple-600'
              }`}>
                <Sparkles className="w-3 h-3 mr-1" /> 
                <span className="text-xs uppercase font-semibold">Current Tone</span>
              </div>
              <div className={`text-xs pl-4 ${
                getCurrentTheme() === 'dark' 
                  ? 'text-white/80' 
                  : 'text-gray-700'
              }`}>
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