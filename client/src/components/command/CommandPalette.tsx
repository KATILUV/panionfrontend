/**
 * CommandPalette Component
 * A keyboard-accessible command palette for quick actions
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Command, Search, X, Settings, MessageCircle, HelpCircle, Home, Maximize2, Minimize2 } from 'lucide-react';
import { useAgentStore } from '@/state/agentStore';
import { useThemeStore } from '@/state/themeStore';
import log from '@/utils/logger';

// Command interface
interface CommandItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
  category: 'navigation' | 'window' | 'agent' | 'system' | 'help';
}

// Component props
interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * CommandPalette provides a keyboard-accessible interface for quick actions
 */
const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  // Get agent and theme store functions
  const { 
    openAgent, 
    minimizeAgent, 
    maximizeAgent, 
    minimizeAllAgents, 
    isAgentOpen,
    isAgentMaximized,
    agents
  } = useAgentStore();
  
  const { setTheme, themes, activeTheme } = useThemeStore();
  
  // Define all available commands
  const commands = useMemo(() => {
    const baseCommands: CommandItem[] = [
      {
        id: 'home',
        title: 'Go to Home',
        description: 'Return to the home screen',
        icon: <Home size={18} />,
        shortcut: 'Alt+H',
        action: () => {
          minimizeAllAgents();
          onClose();
        },
        category: 'navigation'
      },
      {
        id: 'settings',
        title: 'Open Settings',
        description: 'Configure application settings',
        icon: <Settings size={18} />,
        shortcut: 'Alt+S',
        action: () => {
          openAgent('settings');
          onClose();
        },
        category: 'navigation'
      },
      {
        id: 'help',
        title: 'Get Help',
        description: 'View help and documentation',
        icon: <HelpCircle size={18} />,
        action: () => {
          // Open help agent or documentation
          openAgent('help');
          onClose();
        },
        category: 'help'
      }
    ];
    
    // Add agent-specific commands
    const agentCommands = Object.entries(agents).map(([id, agent]) => ({
      id: `open-${id}`,
      title: `Open ${agent.name}`,
      description: agent.description || `Open the ${agent.name} agent`,
      icon: <MessageCircle size={18} />,
      action: () => {
        openAgent(id as any);
        onClose();
      },
      category: 'agent' as const
    }));
    
    // Add theme commands
    const themeCommands = themes.map(theme => ({
      id: `theme-${theme.id}`,
      title: `Theme: ${theme.name}`,
      description: `Switch to ${theme.name} theme`,
      icon: <div 
        className="w-4 h-4 rounded-full"
        style={{ backgroundColor: theme.primary }}
      />,
      action: () => {
        setTheme(theme.id);
        onClose();
      },
      category: 'system' as const
    }));
    
    // Add window management commands
    const windowCommands: CommandItem[] = [];
    
    // Only add minimize/maximize commands for open agents
    Object.entries(agents).forEach(([id, agent]) => {
      if (isAgentOpen(id as any)) {
        if (isAgentMaximized(id as any)) {
          windowCommands.push({
            id: `restore-${id}`,
            title: `Restore ${agent.name}`,
            description: `Restore ${agent.name} window to normal size`,
            icon: <Minimize2 size={18} />,
            action: () => {
              maximizeAgent(id as any, false);
              onClose();
            },
            category: 'window'
          });
        } else {
          windowCommands.push({
            id: `maximize-${id}`,
            title: `Maximize ${agent.name}`,
            description: `Maximize ${agent.name} window`,
            icon: <Maximize2 size={18} />,
            action: () => {
              maximizeAgent(id as any, true);
              onClose();
            },
            category: 'window'
          });
        }
        
        windowCommands.push({
          id: `minimize-${id}`,
          title: `Minimize ${agent.name}`,
          description: `Minimize ${agent.name} window`,
          icon: <Minimize2 size={18} />,
          action: () => {
            minimizeAgent(id as any);
            onClose();
          },
          category: 'window'
        });
      }
    });
    
    return [...baseCommands, ...agentCommands, ...windowCommands, ...themeCommands];
  }, [agents, openAgent, minimizeAgent, maximizeAgent, minimizeAllAgents, isAgentOpen, isAgentMaximized, themes, setTheme, onClose]);
  
  // Filter commands based on search query
  const filteredCommands = useMemo(() => {
    if (!searchQuery) return commands;
    
    const lowerQuery = searchQuery.toLowerCase();
    return commands.filter(command => 
      command.title.toLowerCase().includes(lowerQuery) || 
      command.description.toLowerCase().includes(lowerQuery) ||
      command.category.toLowerCase().includes(lowerQuery)
    );
  }, [commands, searchQuery]);
  
  // Reset selected index when filtered results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredCommands.length]);
  
  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < filteredCommands.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => prev > 0 ? prev - 1 : prev);
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);
  
  // Register keyboard shortcut to open command palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl+K to open command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (!isOpen) {
          // Logic to open command palette would go here
          log.debug('Command palette opened via keyboard shortcut');
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);
  
  // Animation variants
  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.2 } }
  };
  
  const paletteVariants = {
    hidden: { opacity: 0, y: -20, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1, 
      transition: { 
        type: 'spring',
        damping: 25,
        stiffness: 300
      } 
    }
  };

  // Group commands by category for display
  const groupedCommands = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    
    filteredCommands.forEach(command => {
      if (!groups[command.category]) {
        groups[command.category] = [];
      }
      groups[command.category].push(command);
    });
    
    return groups;
  }, [filteredCommands]);
  
  // Don't render if not open
  if (!isOpen) return null;
  
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center">
          {/* Backdrop overlay */}
          <motion.div
            className="fixed inset-0 bg-black/40"
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={overlayVariants}
            onClick={onClose}
          />
          
          {/* Command palette */}
          <motion.div
            className="relative w-full max-w-lg mt-32 bg-popover rounded-lg shadow-lg overflow-hidden border border-border"
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={paletteVariants}
          >
            {/* Search input */}
            <div className="flex items-center px-4 border-b border-border">
              <Search className="w-5 h-5 text-muted-foreground" />
              <input
                className="w-full py-3 px-2 bg-transparent border-0 focus:outline-none text-foreground"
                placeholder="Search commands..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            
            {/* Command list */}
            <div className="max-h-80 overflow-y-auto">
              {Object.entries(groupedCommands).length > 0 ? (
                Object.entries(groupedCommands).map(([category, items]) => (
                  <div key={category} className="px-1 py-2">
                    <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase">
                      {category}
                    </div>
                    <div className="mt-1">
                      {items.map((command, index) => {
                        const isSelected = filteredCommands.indexOf(command) === selectedIndex;
                        return (
                          <div
                            key={command.id}
                            className={`px-3 py-2 rounded-md cursor-pointer flex items-center ${
                              isSelected ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
                            }`}
                            onClick={() => command.action()}
                            onMouseEnter={() => setSelectedIndex(filteredCommands.indexOf(command))}
                          >
                            <div className="mr-3 text-primary">
                              {command.icon}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-sm">{command.title}</div>
                              <div className="text-xs text-muted-foreground">
                                {command.description}
                              </div>
                            </div>
                            {command.shortcut && (
                              <div className="ml-2 px-2 py-1 rounded-md bg-muted text-xs font-mono">
                                {command.shortcut}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-4 py-8 text-center text-muted-foreground">
                  No commands found
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// Create a hook to manage command palette state
export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  
  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);
  
  return {
    isOpen,
    open,
    close,
    CommandPalette: (props: Omit<CommandPaletteProps, 'isOpen' | 'onClose'>) => (
      <CommandPalette isOpen={isOpen} onClose={close} {...props} />
    )
  };
}

export default CommandPalette;