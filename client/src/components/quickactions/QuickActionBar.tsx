/**
 * QuickActionBar Component
 * Provides intelligent shortcuts based on user behavior and context
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, 
  Search, 
  Plus, 
  ChevronUp, 
  Maximize2, 
  Minimize2,
  X,
  Settings,
  Zap
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

// Action context interface
interface ActionContext {
  id: string;
  label: string;
  icon: React.ReactNode;
  actions: QuickAction[];
  isActive: boolean;
}

/**
 * QuickActionBar provides contextual shortcuts for common actions
 */
const QuickActionBar: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Get agent-related state from store
  const activeAgentId = useAgentStore(state => state.activeAgentId);
  const openAgent = useAgentStore(state => state.openAgent);
  const minimizeAgent = useAgentStore(state => state.minimizeAgent);
  const closeAgent = useAgentStore(state => state.closeAgent);
  const windows = useAgentStore(state => state.windows || {});
  const setWindowProperty = useAgentStore(state => state.setWindowProperty);
  
  // Static preferences
  const pinnedActions = ['open-search', 'open-notes', 'toggle-maximize'];
  const quickAccessSettings = {
    position: 'bottom-right' as const,
    showLabels: true,
    autoSuggest: true
  };
  
  // Helper function to check if agent is maximized - memoized to avoid recomputing
  const isAgentMaximized = useCallback((agentId: string): boolean => {
    return !!windows[agentId]?.isMaximized;
  }, [windows]);
  
  // Helper function to maximize/minimize agent - memoized to avoid recreation
  const toggleMaximize = useCallback((agentId: string) => {
    const isMax = isAgentMaximized(agentId);
    if (typeof setWindowProperty === 'function') {
      setWindowProperty(agentId, 'isMaximized', !isMax);
      log.debug(`${isMax ? 'Restoring' : 'Maximizing'} agent`);
    }
  }, [isAgentMaximized, setWindowProperty]);
  
  // Define context-specific actions - memoized to avoid recreation on every render
  const globalActions = useMemo(() => [
    {
      id: 'open-clara',
      label: 'Talk to Clara',
      icon: <MessageSquare size={16} />,
      action: () => {
        if (openAgent) openAgent('clara');
        log.debug('Opening Clara agent');
      },
      shortcut: '⌘+C'
    },
    {
      id: 'open-search',
      label: 'Search',
      icon: <Search size={16} />,
      action: () => {
        if (openAgent) openAgent('search');
        log.debug('Opening Search agent');
      },
      shortcut: '⌘+K'
    },
    {
      id: 'open-notes',
      label: 'Notes',
      icon: <Plus size={16} />,
      action: () => {
        if (openAgent) openAgent('notes');
        log.debug('Opening Notes agent');
      }
    },
    {
      id: 'open-settings',
      label: 'Settings',
      icon: <Settings size={16} />,
      action: () => {
        if (openAgent) openAgent('settings');
        log.debug('Opening Settings agent');
      }
    }
  ], [openAgent]);
  
  const agentActions = useMemo(() => [
    {
      id: 'toggle-maximize',
      label: 'Toggle Maximize',
      icon: <Maximize2 size={16} />,
      action: () => {
        if (activeAgentId) {
          toggleMaximize(activeAgentId);
        }
      },
      shortcut: 'M'
    },
    {
      id: 'close-agent',
      label: 'Close',
      icon: <X size={16} />,
      action: () => {
        if (activeAgentId && closeAgent) {
          closeAgent(activeAgentId);
          log.debug(`Closing agent: ${activeAgentId}`);
        }
      },
      className: 'text-red-500'
    }
  ], [activeAgentId, closeAgent, toggleMaximize]);
  
  // Determine which contexts are active
  const contexts = useMemo(() => [
    {
      id: 'global',
      label: 'Global Actions',
      icon: <Zap size={16} />,
      isActive: true, // Always active
      actions: globalActions
    },
    {
      id: 'agent',
      label: 'Agent Actions',
      icon: <MessageSquare size={16} />,
      isActive: !!activeAgentId,
      actions: agentActions
    }
  ], [activeAgentId, globalActions, agentActions]);
  
  // Get active contexts
  const activeContexts = useMemo(() => 
    contexts.filter(context => context.isActive),
  [contexts]);
  
  // Get all actions from active contexts
  const allActions = useMemo(() => 
    activeContexts.flatMap(context => context.actions),
  [activeContexts]);
  
  // Get pinned actions
  const pinnedActionsData = useMemo(() => 
    allActions.filter(action => pinnedActions.includes(action.id)),
  [allActions]);
  
  // Toggle expanded state
  const handleToggleExpand = useCallback(() => {
    setIsExpanded(prev => !prev);
    log.debug(`QuickActionBar: ${isExpanded ? 'collapsing' : 'expanding'}`);
  }, [isExpanded]);
  
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
      transition: { duration: 0.2 }
    },
    exit: { 
      opacity: 0, 
      y: -10,
      transition: { duration: 0.1 }
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
            {pinnedActionsData.length > 0 && (
              <div className="py-2">
                <div className="flex space-x-1 mb-1">
                  {pinnedActionsData.map(action => (
                    <button
                      key={action.id}
                      onClick={() => {
                        action.action();
                        setIsExpanded(false);
                      }}
                      className={`p-2 rounded-md hover:bg-accent transition-colors ${action.className || ''}`}
                      title={action.label}
                    >
                      {action.id === 'toggle-maximize' && activeAgentId && isAgentMaximized(activeAgentId) 
                        ? <Minimize2 size={16} /> 
                        : action.icon}
                    </button>
                  ))}
                </div>
                <div className="border-b border-border my-1" />
              </div>
            )}
            
            {/* Context-specific Actions */}
            <div className="space-y-1 py-1">
              {activeContexts.map(context => (
                <React.Fragment key={context.id}>
                  {context.actions.map(action => (
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
                          {action.id === 'toggle-maximize' && activeAgentId && isAgentMaximized(activeAgentId) 
                            ? <Minimize2 size={16} /> 
                            : action.icon}
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
                </React.Fragment>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default QuickActionBar;