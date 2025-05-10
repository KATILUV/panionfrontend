/**
 * SmartSuggestions Component
 * Provides contextual suggestions based on user history and current context
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Lightbulb, 
  MessageSquare, 
  Search, 
  History, 
  Sparkles, 
  X, 
  ArrowRight 
} from 'lucide-react';
import { useAgentStore } from '@/state/agentStore';
import log from '@/utils/logger';

// Suggestion interface
interface Suggestion {
  id: string;
  text: string;
  action: () => void;
  source: 'history' | 'context' | 'intelligence' | 'favorite';
  icon?: React.ReactNode;
}

// Mock recent conversations for demo
const mockRecentConversations = [
  { 
    id: 'conv1', 
    excerpt: "How can I optimize my workflow with AI?",
    agentId: 'clara'
  },
  { 
    id: 'conv2', 
    excerpt: "What are the latest AI trends in healthcare?",
    agentId: 'research'
  },
  { 
    id: 'conv3', 
    excerpt: "Can you help me draft an email to my team?",
    agentId: 'clara'
  }
];

// Component props
interface SmartSuggestionsProps {
  className?: string;
  maxSuggestions?: number;
}

/**
 * SmartSuggestions component provides intelligent suggestions based on context
 */
const SmartSuggestions: React.FC<SmartSuggestionsProps> = ({
  className = '',
  maxSuggestions = 5
}) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isDismissed, setIsDismissed] = useState(false);
  const [activeAgentContext, setActiveAgentContext] = useState<string | null>(null);
  
  // Get agent store data
  const openAgent = useAgentStore(state => state.openAgent);
  const activeAgentId = useAgentStore(state => state.activeAgentId);
  const agents = useAgentStore(state => state.agents || {});
  
  // Generate contextual suggestions based on current state
  useEffect(() => {
    if (isDismissed) return;
    
    const newSuggestions: Suggestion[] = [];
    
    // Get active agent context
    const agentContext = activeAgentId 
      ? agents[activeAgentId]?.name || null 
      : null;
    
    setActiveAgentContext(agentContext);
    
    // Add history-based suggestions
    mockRecentConversations.forEach(conversation => {
      newSuggestions.push({
        id: `continue-${conversation.id}`,
        text: `Continue: "${conversation.excerpt}"`,
        action: () => {
          openAgent(conversation.agentId as any);
          log.debug(`Opening conversation: ${conversation.id}`);
        },
        source: 'history',
        icon: <History size={16} />
      });
    });
    
    // Add context-based suggestions
    if (activeAgentId === 'clara') {
      newSuggestions.push({
        id: 'clara-workflow',
        text: 'How can AI improve my daily workflow?',
        action: () => {
          log.debug('Sending suggestion to Panion');
        },
        source: 'context',
        icon: <MessageSquare size={16} />
      });
      
      newSuggestions.push({
        id: 'clara-summarize',
        text: 'Summarize our recent conversations',
        action: () => {
          log.debug('Sending summarize request to Panion');
        },
        source: 'context',
        icon: <MessageSquare size={16} />
      });
    }
    
    // Add intelligence-based suggestions
    newSuggestions.push({
      id: 'smart-suggestion',
      text: 'Analyze my communication patterns',
      action: () => {
        openAgent('clara');
        log.debug('Opening communication analysis');
      },
      source: 'intelligence',
      icon: <Sparkles size={16} />
    });
    
    // Add search suggestion
    newSuggestions.push({
      id: 'search-knowledge',
      text: 'Search your knowledge base',
      action: () => {
        openAgent('search');
        log.debug('Opening search');
      },
      source: 'favorite',
      icon: <Search size={16} />
    });
    
    // Limit suggestions
    setSuggestions(newSuggestions.slice(0, maxSuggestions));
    
  }, [activeAgentId, isDismissed, maxSuggestions, openAgent, agents]);
  
  // Dismiss suggestions
  const handleDismiss = () => {
    setIsDismissed(true);
    log.debug('Suggestions dismissed');
  };
  
  // Reset dismissed state when context changes
  useEffect(() => {
    setIsDismissed(false);
  }, [activeAgentContext]);
  
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        staggerChildren: 0.05
      }
    },
    exit: { opacity: 0, y: -10 }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, x: -5 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 5 }
  };
  
  // Nothing to show if dismissed or no suggestions
  if (isDismissed || suggestions.length === 0) {
    return null;
  }

  return (
    <div className={`relative rounded-lg bg-card/95 backdrop-blur-sm border border-border shadow-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center">
          <Lightbulb className="w-4 h-4 text-amber-500 mr-2" />
          <h3 className="text-sm font-medium">
            {activeAgentContext 
              ? `Suggestions for ${activeAgentContext}`
              : 'Smart Suggestions'}
          </h3>
        </div>
        
        <button
          onClick={handleDismiss}
          className="text-muted-foreground hover:text-foreground rounded-full"
          aria-label="Dismiss suggestions"
        >
          <X size={14} />
        </button>
      </div>
      
      {/* Suggestions list */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="p-2 space-y-1"
      >
        <AnimatePresence>
          {suggestions.map((suggestion) => (
            <motion.button
              key={suggestion.id}
              variants={itemVariants}
              className="w-full text-left px-3 py-2 rounded-md hover:bg-accent flex items-center justify-between group transition-colors"
              onClick={() => {
                suggestion.action();
                handleDismiss();
              }}
            >
              <div className="flex items-center space-x-2">
                <div className="text-primary">
                  {suggestion.icon || <MessageSquare size={16} />}
                </div>
                <span className="text-sm truncate max-w-xs">{suggestion.text}</span>
              </div>
              <ArrowRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.button>
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default SmartSuggestions;