import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Database, Target, Sparkles, Coffee, BookOpen, CircuitBoard } from 'lucide-react';
import { useThemeStore } from '../../state/themeStore';
import { usePreferencesStore } from '../../state/preferencesStore';
import { ConversationMode, CONVERSATION_MODES, DEFAULT_CONVERSATION_MODE } from '../../types/conversationModes';

interface ContextPanelProps {
  active?: boolean;
  className?: string;
}

const PanionContextPanel: React.FC<ContextPanelProps> = ({ active = false, className = '' }) => {
  const [currentMemory, setCurrentMemory] = useState<string | null>(null);
  const [currentGoal, setCurrentGoal] = useState<string | null>("Help the user achieve their goals");
  const [expanded, setExpanded] = useState(false);
  
  // Get current conversation mode
  const conversationMode = usePreferencesStore(
    state => (state.agents?.panion?.conversationMode as ConversationMode) || DEFAULT_CONVERSATION_MODE
  );
  
  // Use theme settings
  const accent = useThemeStore(state => state.accent);
  const getCurrentTheme = useThemeStore(state => state.getCurrentTheme);
  
  // Get accent color class based on theme accent and current theme
  const getAccentClass = () => {
    const isDark = getCurrentTheme() === 'dark';
    
    switch (accent) {
      case 'light':
        return isDark 
          ? 'border-gray-500/30 bg-gray-900/10' 
          : 'border-gray-300 bg-gray-50';
      case 'blue': 
        return isDark 
          ? 'border-blue-500/30 bg-blue-900/10' 
          : 'border-blue-300 bg-blue-50';
      case 'purple': 
        return isDark 
          ? 'border-purple-500/30 bg-purple-900/10' 
          : 'border-purple-300 bg-purple-50';
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
      default: 
        return isDark 
          ? 'border-blue-500/30 bg-blue-900/10' 
          : 'border-blue-300 bg-blue-50';
    }
  };
  
  // Get conversation mode details
  const modeConfig = CONVERSATION_MODES[conversationMode];
  
  // Get icon component based on conversation mode
  const getModeIcon = () => {
    switch (conversationMode) {
      case 'casual': return <Coffee size={16} />;
      case 'deep': return <BookOpen size={16} />;
      case 'strategic': return <Target size={16} />;
      case 'logical': return <CircuitBoard size={16} />;
      default: return <Coffee size={16} />;
    }
  };
  
  // Get color based on conversation mode
  const getModeColor = () => {
    switch (conversationMode) {
      case 'casual': return 'text-blue-500';
      case 'deep': return 'text-purple-500';
      case 'strategic': return 'text-green-500';
      case 'logical': return 'text-amber-500';
      default: return 'text-blue-500';
    }
  };
  
  // Panel variants for animation
  const panelVariants = {
    hidden: { opacity: 0, y: 50, scale: 0.9 },
    visible: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 20, scale: 0.9 }
  };
  
  // Toggle expanded state
  const toggleExpanded = () => {
    setExpanded(!expanded);
  };
  
  // Simulated memories - these would be pulled from a real memory system
  const getRandomMemory = () => {
    const memories = [
      "User is working on a desktop environment for AI agents",
      "User likes clean, minimal interfaces",
      "User mentioned having too many windows open",
      "User prefers structured responses",
      "User is building an AI assistant platform",
      null
    ];
    
    return memories[Math.floor(Math.random() * memories.length)];
  };
  
  // Update memory randomly to simulate memory system activity
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (active && Math.random() > 0.5) {
        setCurrentMemory(getRandomMemory());
      }
    }, 12000);
    
    return () => clearInterval(intervalId);
  }, [active]);
  
  if (!active) return null;
  
  return (
    <div className={`fixed bottom-16 right-4 z-40 ${className}`}>
      <AnimatePresence mode="wait">
        {expanded ? (
          <motion.div
            key="expanded"
            className={`rounded-lg border ${getAccentClass()} shadow-md backdrop-blur-sm p-4 w-64`}
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.2 }}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium text-sm">Panion Context</h3>
              <button 
                onClick={toggleExpanded}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            
            <div className="space-y-3">
              {/* Conversation Mode */}
              <div className="flex items-start gap-2">
                <div className={`mt-1 ${getModeColor()}`}>
                  {getModeIcon()}
                </div>
                <div>
                  <div className="text-xs font-medium text-muted-foreground">Mode</div>
                  <div className="text-sm">{modeConfig.name}</div>
                </div>
              </div>
              
              {/* Current Goal */}
              {currentGoal && (
                <div className="flex items-start gap-2">
                  <div className="mt-1 text-orange-500">
                    <Target size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-muted-foreground">Current Goal</div>
                    <div className="text-sm">{currentGoal}</div>
                  </div>
                </div>
              )}
              
              {/* Working Memory */}
              {currentMemory && (
                <div className="flex items-start gap-2">
                  <div className="mt-1 text-purple-500">
                    <Brain size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-muted-foreground">Memory</div>
                    <div className="text-sm">{currentMemory}</div>
                  </div>
                </div>
              )}
              
              {/* Knowledge Access */}
              <div className="flex items-start gap-2">
                <div className="mt-1 text-blue-500">
                  <Database size={16} />
                </div>
                <div>
                  <div className="text-xs font-medium text-muted-foreground">Knowledge Access</div>
                  <div className="text-sm">Default knowledge base</div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.button
            key="collapsed"
            className={`rounded-full w-10 h-10 flex items-center justify-center border ${getAccentClass()} shadow-md`}
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.2 }}
            onClick={toggleExpanded}
          >
            <Sparkles size={18} className={getModeColor()} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PanionContextPanel;