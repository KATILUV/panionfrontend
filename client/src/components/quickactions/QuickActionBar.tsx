/**
 * QuickActionBar Component
 * Provides intelligent shortcuts based on user behavior and context
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, 
  Search, 
  ArrowUpRight, 
  Plus, 
  ChevronUp, 
  Maximize2, 
  Minimize2,
  X,
  Settings,
  ArrowLeft,
  ArrowRight,
  PanelLeft,
  Zap,
  Copy
} from 'lucide-react';
import { useAgentStore } from '@/state/agentStore';
import { useThemeStore } from '@/state/themeStore';
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

// Action context interface
interface ActionContext {
  id: string;
  label: string;
  icon: React.ReactNode;
  actions: QuickAction[];
  isActive: () => boolean;
}

// User preference (mock for now)
interface UserPreferences {
  favoriteAgents: string[];
  pinnedActions: string[];
  quickAccessSettings: {
    position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
    showLabels: boolean;
    autoSuggest: boolean;
  };
}

// Mock preferences
const defaultPreferences: UserPreferences = {
  favoriteAgents: ['clara', 'panion'],
  pinnedActions: ['open-search', 'open-notes', 'toggle-maximize'],
  quickAccessSettings: {
    position: 'bottom-right',
    showLabels: true,
    autoSuggest: true
  }
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
    // Simple fallback that avoids store dependency
    try {
      // Try to access the window property setter
      const store = useAgentStore.getState();
      if (typeof store.setWindowProperty === 'function') {
        store.setWindowProperty(agentId, 'isMaximized', isMaximized);
      } else {
        // Fallback to just minimizing/unminimizing
        if (!isMaximized && minimizeAgent) {
          minimizeAgent(agentId);
        }
      }
    } catch (error) {
      console.error('Failed to maximize agent:', error);
    }
  };
  
  // Define agent maximization check function with error handling
  const isAgentMaximized = (agentId: string): boolean => {
    try {
      const store = useAgentStore.getState();
      const windows = store.windows || {};
      // Check if the window exists and has an isMaximized property
      return !!windows[agentId]?.isMaximized;
    } catch (error) {
      console.error('Failed to check agent maximized state:', error);
      return false;
    }
  };
  
  // Use static preferences for now to avoid infinite loops
  const favoriteAgents = ['clara', 'panion'];
  const pinnedActions = ['open-search', 'open-notes', 'toggle-maximize'];
  const quickAccessSettings = {
    position: 'bottom-right' as const,
    showLabels: true,
    autoSuggest: true
  };
  
  // Define available contexts
  const contexts: ActionContext[] = [
    {
      id: 'global',
      label: 'Global Actions',
      icon: <Zap size={16} />,
      isActive: () => true, // Always active
      actions: [
        {
          id: 'open-clara',
          label: 'Talk to Clara',
          icon: <MessageSquare size={16} />,
          action: () => {
            openAgent('clara');
            log.debug('Opening Clara agent');
          },
          shortcut: '⌘+C'
        },
        {
          id: 'open-search',
          label: 'Search',
          icon: <Search size={16} />,
          action: () => {
            openAgent('search');
            log.debug('Opening Search agent');
          },
          shortcut: '⌘+K'
        },
        {
          id: 'open-notes',
          label: 'Notes',
          icon: <Plus size={16} />,
          action: () => {
            openAgent('notes');
            log.debug('Opening Notes agent');
          }
        },
        {
          id: 'open-settings',
          label: 'Settings',
          icon: <Settings size={16} />,
          action: () => {
            openAgent('settings');
            log.debug('Opening Settings agent');
          }
        }
      ]
    },
    {
      id: 'agent',
      label: 'Agent Actions',
      icon: <MessageSquare size={16} />,
      isActive: () => !!activeAgentId,
      actions: [
        {
          id: 'toggle-maximize',
          label: 'Toggle Maximize',
          icon: isAgentMaximized(activeAgentId || '') ? <Minimize2 size={16} /> : <Maximize2 size={16} />,
          action: () => {
            if (activeAgentId) {
              const isMax = isAgentMaximized(activeAgentId);
              maximizeAgent(activeAgentId, !isMax);
              log.debug(`${isMax ? 'Restoring' : 'Maximizing'} agent`);
            }
          },
          shortcut: 'M'
        },
        {
          id: 'close-agent',
          label: 'Close',
          icon: <X size={16} />,
          action: () => {
            if (activeAgentId) {
              const agentStore = useAgentStore.getState();
              if (agentStore.closeAgent) {
                agentStore.closeAgent(activeAgentId);
                log.debug(`Closing agent: ${activeAgentId}`);
              }
            }
          },
          className: 'text-red-500'
        }
      ]
    }
  ];
  
  // Determine which context is active
  useEffect(() => {
    // Default to global context
    let newContext = 'global';
    
    // Check if agent context should be active
    if (activeAgentId) {
      newContext = 'agent';
    }
    
    setActiveContext(newContext);
  }, [activeAgentId]);
  
  // Get actions for current context
  const getActionsForContext = (): QuickAction[] => {
    if (!activeContext) return [];
    
    const context = contexts.find(c => c.id === activeContext);
    return context?.actions || [];
  };
  
  // Get pinned actions
  const getPinnedActions = (): QuickAction[] => {
    const allActions = contexts.flatMap(context => context.actions);
    return allActions.filter(action => pinnedActions.includes(action.id));
  };
  
  // Toggle expanded state
  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
    log.debug(`QuickActionBar: ${isExpanded ? 'collapsing' : 'expanding'}`);
  };
  
  // Animation variants
  const barVariants = {
    collapsed: { 
      height: '2.5rem', 
      width: 'auto',
      opacity: 0.85
    },
    expanded: { 
      height: 'auto', 
      width: 'auto',
      opacity: 1
    }
  };
  
  const actionVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.2
      }
    },
    exit: { 
      opacity: 0, 
      y: -10,
      transition: { 
        duration: 0.1
      }
    }
  };
  
  // Determine bar position from user preferences
  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4'
  }[quickAccessSettings.position];
  
  return (
    <motion.div
      className={`fixed z-50 ${positionClasses} flex flex-col bg-card/95 backdrop-blur-sm border border-border rounded-lg shadow-lg overflow-hidden`}
      variants={barVariants}
      initial="collapsed"
      animate={isExpanded ? "expanded" : "collapsed"}
      transition={{ duration: 0.3 }}
    >
      {/* Header Bar (always visible) */}
      <div 
        className="px-3 py-2 flex items-center justify-between cursor-pointer"
        onClick={handleToggleExpand}
      >
        <div className="flex items-center space-x-2">
          <div className="text-primary">
            <Zap size={18} />
          </div>
          {(isExpanded || quickAccessSettings.showLabels) && (
            <span className="text-sm font-medium">Quick Actions</span>
          )}
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <ChevronUp size={16} className="text-muted-foreground" />
        </motion.div>
      </div>
      
      {/* Actions Panel (only visible when expanded) */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            key="content"
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={actionVariants}
            className="px-2 pb-2 border-t border-border"
          >
            {/* Pinned Actions */}
            {getPinnedActions().length > 0 && (
              <div className="py-2">
                <div className="flex space-x-1 mb-1">
                  {getPinnedActions().map(action => (
                    <button
                      key={action.id}
                      onClick={() => {
                        action.action();
                        setIsExpanded(false);
                      }}
                      className={`p-2 rounded-md hover:bg-accent transition-colors ${action.className || ''}`}
                      title={action.label}
                    >
                      {action.icon}
                    </button>
                  ))}
                </div>
                <div className="border-b border-border my-1" />
              </div>
            )}
            
            {/* Context-specific Actions */}
            <div className="space-y-1 py-1">
              {getActionsForContext().map(action => (
                <button
                  key={action.id}
                  onClick={() => {
                    action.action();
                    setIsExpanded(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-md hover:bg-accent flex items-center justify-between transition-colors ${action.className || ''}`}
                >
                  <div className="flex items-center space-x-2">
                    <div className={`${action.className || 'text-primary'}`}>
                      {action.icon}
                    </div>
                    <span className="text-sm">{action.label}</span>
                  </div>
                  {action.shortcut && (
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {action.shortcut}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default QuickActionBar;