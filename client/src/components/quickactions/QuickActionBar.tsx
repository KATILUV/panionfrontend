/**
 * QuickActionBar Component
 * Provides intelligent shortcuts based on user behavior and context
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Command, 
  MessageCircle, 
  Plus, 
  Star, 
  StarOff, 
  Zap, 
  ChevronDown, 
  ChevronUp,
  Minimize,
  Maximize2, 
  X 
} from 'lucide-react';
import { useAgentStore } from '@/state/agentStore';
import log from '@/utils/logger';

// Quick action interface
interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: () => void;
  shortcut?: string;
  className?: string;
}

// Mock preferences functions until we integrate with the preferences store
const useMockPreferences = () => {
  const [favoriteAgents, setFavoriteAgents] = useState<string[]>([]);
  
  const toggleFavoriteAgent = (agentId: string) => {
    setFavoriteAgents(prev => 
      prev.includes(agentId) 
        ? prev.filter(id => id !== agentId) 
        : [...prev, agentId]
    );
  };
  
  const getTopAgents = (limit: number) => {
    // Return mock data for now
    return [
      { agentId: 'clara', timestamp: Date.now(), count: 10 },
      { agentId: 'marketplace', timestamp: Date.now(), count: 5 },
    ].slice(0, limit);
  };
  
  const logCommandUsage = (commandId: string) => {
    log.debug(`Command used: ${commandId}`);
  };
  
  return {
    favoriteAgents,
    toggleFavoriteAgent,
    getTopAgents,
    logCommandUsage
  };
};

// Mock command palette hook
const useMockCommandPalette = () => {
  const open = () => {
    log.debug('Command palette opened');
  };
  
  return { open };
};

/**
 * QuickActionBar provides contextual shortcuts for common actions
 */
const QuickActionBar: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeContext, setActiveContext] = useState<string | null>(null);
  
  // Get agent-related actions from agent store
  const openAgent = useAgentStore(state => state.openAgent);
  const minimizeAgent = useAgentStore(state => state.minimizeAgent);
  const agents = useAgentStore(state => state.agents || {});  // Fallback to empty object if not available
  const activeAgentId = useAgentStore(state => state.activeAgentId);
  
  // Define maximize agent function compatible with current store
  const maximizeAgent = (agentId: string, isMaximized: boolean) => {
    // This function will adapt to the store's actual implementation
    const maximize = useAgentStore.getState().setWindowProperty;
    if (maximize) {
      maximize(agentId, 'isMaximized', isMaximized);
    }
  };
  
  // Define agent maximization check function
  const isAgentMaximized = (agentId: string): boolean => {
    const windows = useAgentStore.getState().windows || {};
    return windows[agentId]?.isMaximized || false;
  };
  
  // Use mock preferences until we integrate with preferences store
  const { 
    favoriteAgents, 
    toggleFavoriteAgent, 
    getTopAgents, 
    logCommandUsage 
  } = useMockPreferences();
  
  // Use mock command palette until we integrate with command palette
  const { open: openCommandPalette } = useMockCommandPalette();
  
  // Get frequently used agents
  const topAgents = getTopAgents(3);
  
  // Check if current agent is favorited
  const isCurrentAgentFavorite = activeAgentId 
    ? favoriteAgents.includes(activeAgentId)
    : false;
  
  // Get agent name for active agent
  const activeAgentName = activeAgentId && agents[activeAgentId]
    ? agents[activeAgentId].name
    : '';

  // Dynamic contextual actions based on current state
  const contextualActions: QuickAction[] = [
    {
      id: 'command-palette',
      label: 'Command Palette',
      icon: <Command size={16} />,
      action: () => {
        openCommandPalette();
        logCommandUsage('command-palette');
      },
      shortcut: '⌘K',
      className: 'bg-accent text-accent-foreground'
    }
  ];
  
  // Add actions for active agent
  if (activeAgentId) {
    // Toggle favorite action
    contextualActions.push({
      id: 'toggle-favorite',
      label: isCurrentAgentFavorite ? 'Remove from Favorites' : 'Add to Favorites',
      icon: isCurrentAgentFavorite ? <StarOff size={16} /> : <Star size={16} />,
      action: () => {
        toggleFavoriteAgent(activeAgentId);
        logCommandUsage('toggle-favorite');
      },
      className: isCurrentAgentFavorite ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : ''
    });

    // Window controls
    if (isAgentMaximized(activeAgentId)) {
      contextualActions.push({
        id: 'restore-window',
        label: 'Restore Window',
        icon: <Minimize size={16} />,
        action: () => {
          maximizeAgent(activeAgentId, false);
          logCommandUsage('restore-window');
        }
      });
    } else {
      contextualActions.push({
        id: 'maximize-window',
        label: 'Maximize Window',
        icon: <Maximize2 size={16} />,
        action: () => {
          maximizeAgent(activeAgentId, true);
          logCommandUsage('maximize-window');
        }
      });
    }
    
    contextualActions.push({
      id: 'close-window',
      label: 'Close Window',
      icon: <X size={16} />,
      action: () => {
        minimizeAgent(activeAgentId);
        logCommandUsage('close-window');
      }
    });
  }
  
  // Add quick launch for top agents
  topAgents.forEach(agent => {
    if (agents[agent.agentId] && (!activeAgentId || agent.agentId !== activeAgentId)) {
      contextualActions.push({
        id: `open-${agent.agentId}`,
        label: `Open ${agents[agent.agentId].name}`,
        icon: <MessageCircle size={16} />,
        action: () => {
          openAgent(agent.agentId as any);
          logCommandUsage(`open-${agent.agentId}`);
        }
      });
    }
  });
  
  // Add new chat action
  contextualActions.push({
    id: 'new-chat',
    label: 'New Chat',
    icon: <Plus size={16} />,
    action: () => {
      openAgent('clara');
      logCommandUsage('new-chat');
    }
  });
  
  // Animation variants
  const barVariants = {
    collapsed: { 
      height: '48px'
    },
    expanded: { 
      height: 'auto'
    }
  };

  // Toggle expanded state
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
    log.debug(`Quick action bar ${!isExpanded ? 'expanded' : 'collapsed'}`);
  };
  
  // Clear hover state when collapsing
  useEffect(() => {
    if (!isExpanded) {
      setActiveContext(null);
    }
  }, [isExpanded]);

  return (
    <div className="fixed right-4 bottom-16 z-30">
      <motion.div 
        className="quick-action-bar rounded-lg bg-card/95 backdrop-blur-sm border border-border shadow-lg overflow-hidden"
        variants={barVariants}
        initial="collapsed"
        animate={isExpanded ? "expanded" : "collapsed"}
        transition={{ duration: 0.2 }}
      >
        {/* Expand/collapse toggle */}
        <button 
          onClick={toggleExpanded}
          className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground"
          aria-label={isExpanded ? "Collapse actions" : "Expand actions"}
        >
          {isExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </button>
        
        {/* Bar title with context */}
        <div className="flex items-center p-3">
          <Zap size={16} className="text-primary mr-2" />
          <h3 className="text-sm font-medium">
            {activeContext || (activeAgentId 
              ? `${activeAgentName} Actions` 
              : 'Quick Actions')}
          </h3>
        </div>
        
        {/* Actions grid */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div 
              className="p-2 grid grid-cols-2 sm:grid-cols-3 gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {contextualActions.map((action) => (
                <motion.button
                  key={action.id}
                  className={`p-2 rounded-md flex flex-col items-center justify-center text-center hover:bg-accent/80 ${action.className || ''}`}
                  onClick={action.action}
                  onMouseEnter={() => setActiveContext(action.label)}
                  onMouseLeave={() => setActiveContext(null)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="h-6 flex items-center justify-center">
                    {action.icon}
                  </div>
                  <span className="text-xs mt-1 line-clamp-1">{action.label}</span>
                  {action.shortcut && (
                    <span className="text-xs opacity-60 mt-0.5">{action.shortcut}</span>
                  )}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Main action button - always visible */}
        {!isExpanded && (
          <div className="p-2 flex justify-center">
            <motion.button
              className="p-2 rounded-md bg-primary/10 hover:bg-primary/20 text-primary flex items-center"
              onClick={() => {
                openCommandPalette();
                logCommandUsage('command-palette-quick');
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Command size={16} className="mr-2" />
              <span className="text-sm font-medium">Commands</span>
            </motion.button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default QuickActionBar;