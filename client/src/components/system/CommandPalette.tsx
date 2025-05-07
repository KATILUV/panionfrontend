import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Command as CommandType, useCommandStore } from '../../state/commandStore';
import { useThemeStore } from '../../state/themeStore';
import { useScreenSize } from '@/hooks/use-mobile';
import Fuse from 'fuse.js';
import { 
  Search, Command as CommandIcon, Monitor, Paintbrush, 
  LayoutGrid, Terminal, Sparkles, Star, Clock, Settings
} from 'lucide-react';

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";

const CommandPalette: React.FC = () => {
  const { isOpen, getAvailableCommands, setIsOpen } = useCommandStore();
  const getCurrentTheme = useThemeStore(state => state.getCurrentTheme);
  const { isMobile } = useScreenSize();
  const [searchQuery, setSearchQuery] = useState('');
  const [recentCommands, setRecentCommands] = useState<string[]>([]);
  const [favoriteCommands, setFavoriteCommands] = useState<string[]>([]);

  // Load recent and favorite commands from localStorage on mount
  useEffect(() => {
    try {
      const storedRecent = localStorage.getItem('recentCommands');
      if (storedRecent) {
        setRecentCommands(JSON.parse(storedRecent));
      }
      
      const storedFavorites = localStorage.getItem('favoriteCommands');
      if (storedFavorites) {
        setFavoriteCommands(JSON.parse(storedFavorites));
      }
    } catch (error) {
      console.error('Error loading command history:', error);
    }
  }, []);
  
  // Memoize commands to prevent unnecessary renders
  const allCommands = useMemo(() => {
    if (isOpen) {
      return getAvailableCommands();
    }
    return [];
  }, [isOpen, getAvailableCommands]);
  
  // Group commands by type for better organization
  const groupedCommands = useMemo(() => {
    const groups: Record<string, CommandType[]> = {
      window: [],
      agent: [],
      system: [],
      theme: [],
      suggestion: [],
      recent: [],
      favorite: []
    };
    
    // First, fill recent and favorites if they exist
    if (recentCommands.length > 0) {
      groups.recent = allCommands.filter(cmd => recentCommands.includes(cmd.id)).slice(0, 5);
    }
    
    if (favoriteCommands.length > 0) {
      groups.favorite = allCommands.filter(cmd => favoriteCommands.includes(cmd.id));
    }
    
    // Then fill the type-based groups
    allCommands.forEach(command => {
      if (command.type in groups) {
        groups[command.type].push(command);
      }
    });
    
    return groups;
  }, [allCommands, recentCommands, favoriteCommands]);
  
  // Set up fuzzy search for better command matching
  const fuse = useMemo(() => {
    return new Fuse(allCommands, {
      keys: ['title', 'description', 'keywords'],
      includeScore: true,
      threshold: 0.4,
    });
  }, [allCommands]);
  
  // Filter commands based on search query using fuzzy search
  const filteredCommands = useMemo(() => {
    if (!searchQuery.trim()) {
      return allCommands;
    }
    
    return fuse.search(searchQuery).map(result => result.item);
  }, [searchQuery, allCommands, fuse]);
  
  // Add command to recent history
  const addToRecentCommands = useCallback((commandId: string) => {
    setRecentCommands(prev => {
      // Remove if it exists already to avoid duplicates
      const filtered = prev.filter(id => id !== commandId);
      // Add to beginning of array and limit to 10 items
      const updated = [commandId, ...filtered].slice(0, 10);
      
      // Save to localStorage
      try {
        localStorage.setItem('recentCommands', JSON.stringify(updated));
      } catch (error) {
        console.error('Error saving recent commands:', error);
      }
      
      return updated;
    });
  }, []);
  
  // Toggle favorite command
  const toggleFavoriteCommand = useCallback((commandId: string) => {
    setFavoriteCommands(prev => {
      let updated;
      if (prev.includes(commandId)) {
        updated = prev.filter(id => id !== commandId);
      } else {
        updated = [...prev, commandId];
      }
      
      // Save to localStorage
      try {
        localStorage.setItem('favoriteCommands', JSON.stringify(updated));
      } catch (error) {
        console.error('Error saving favorite commands:', error);
      }
      
      return updated;
    });
  }, []);
  
  // Run command with side effects
  const runCommand = useCallback((command: CommandType) => {
    command.action();
    addToRecentCommands(command.id);
  }, [addToRecentCommands]);
  
  // Get icon for command type
  const getCommandIcon = (type: string, command: CommandType) => {
    // If command has a custom icon, try to use it first
    if (command.icon) {
      // For safety, we'll wrap this in a try-catch
      try {
        // Check if it's an SVG string (starts with <svg)
        if (typeof command.icon === 'string' && command.icon.trim().startsWith('<svg')) {
          return <div dangerouslySetInnerHTML={{ __html: command.icon }} className="w-4 h-4" />;
        }
        
        // If it's not an SVG string, it might be a string reference to an icon component
        return <div className="w-4 h-4">{command.icon}</div>;
      } catch (error) {
        console.error('Error rendering command icon:', error);
      }
    }
    
    // Fall back to default icons based on command type
    switch (type) {
      case 'recent':
        return <Clock className="size-4" />;
      case 'favorite':
        return <Star className="size-4" />;
      case 'window':
        return <LayoutGrid className="size-4" />;
      case 'agent':
        return <Sparkles className="size-4" />;
      case 'system':
        return <Terminal className="size-4" />;
      case 'theme':
        return <Paintbrush className="size-4" />;
      case 'suggestion':
        return <Sparkles className="size-4" />;
      default:
        return <CommandIcon className="size-4" />;
    }
  };
  
  // Get appropriate group label
  const getGroupLabel = (groupKey: string) => {
    switch (groupKey) {
      case 'recent':
        return 'Recent Commands';
      case 'favorite':
        return 'Favorites';
      case 'window':
        return 'Window Management';
      case 'agent':
        return 'Agents';
      case 'system':
        return 'System';
      case 'theme':
        return 'Appearance';
      case 'suggestion':
        return 'Suggestions';
      default:
        return groupKey.charAt(0).toUpperCase() + groupKey.slice(1);
    }
  };
  
  // Command palette UI classes based on theme
  const getCommandUIClasses = () => {
    const isDark = getCurrentTheme() === 'dark';
    const isLightAccent = useThemeStore.getState().accent === 'light' && !isDark;
    
    return {
      dialog: isDark 
        ? 'bg-black/70 border border-purple-500/30 text-white' 
        : (isLightAccent 
           ? 'bg-white/95 border border-gray-200 text-gray-900' 
           : 'bg-white/95 border border-purple-200 text-gray-900'),
      backdrop: isDark ? 'bg-black/50' : 'bg-slate-900/30',
      input: isDark
        ? 'text-white placeholder:text-white/50'
        : 'text-gray-800 placeholder:text-gray-400',
      kbd: isDark
        ? 'bg-white/10 text-white/70'
        : (isLightAccent
           ? 'bg-gray-100 border border-gray-200 text-gray-600'
           : 'bg-purple-50 border border-purple-100 text-purple-700'),
      groupHeading: isDark
        ? 'text-white/60'
        : (isLightAccent
           ? 'text-gray-500'
           : 'text-purple-600'),
      itemSelected: isDark
        ? 'bg-purple-800/30 border border-purple-700/30'
        : (isLightAccent
           ? 'bg-gray-100 border border-gray-200'
           : 'bg-purple-100 border border-purple-200'),
      itemHover: isDark
        ? 'hover:bg-black/30'
        : (isLightAccent
           ? 'hover:bg-gray-50'
           : 'hover:bg-purple-50'),
    };
  };
  
  // Get command type color class
  const getCommandTypeClass = (type: string) => {
    const isDark = getCurrentTheme() === 'dark';
    const isLightAccent = useThemeStore.getState().accent === 'light' && !isDark;
    
    switch (type) {
      case 'recent':
        return isDark ? 'text-amber-400' : 'text-amber-600';
      case 'favorite': 
        return isDark ? 'text-yellow-400' : 'text-yellow-600';
      case 'window':
        return isDark ? 'text-blue-400' : 'text-blue-600';
      case 'agent':
        return isDark 
          ? 'text-purple-400' 
          : (isLightAccent ? 'text-gray-600' : 'text-purple-600');
      case 'system':
        return isDark 
          ? 'text-indigo-400' 
          : (isLightAccent ? 'text-gray-600' : 'text-indigo-600');
      case 'theme':
        return isDark 
          ? 'text-violet-400' 
          : (isLightAccent ? 'text-gray-600' : 'text-violet-600');
      case 'suggestion':
        return isDark 
          ? 'text-fuchsia-400' 
          : (isLightAccent ? 'text-gray-600' : 'text-fuchsia-600');
      default:
        return isDark ? 'text-white' : 'text-gray-900';
    }
  };
  
  // Determine if we should use the dialog mode (recommended) or inline mode
  // Dialog is better for accessibility and mobile use
  const uiClasses = getCommandUIClasses();
  
  if (!isOpen) return null;
  
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 md:p-8">
        {/* Backdrop */}
        <motion.div 
          className={`absolute inset-0 backdrop-blur-sm ${uiClasses.backdrop}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsOpen(false)}
        />
        
        {/* Command palette */}
        <motion.div
          className={`relative w-full max-w-lg mt-8 sm:mt-16 backdrop-blur-xl rounded-lg shadow-2xl overflow-hidden ${uiClasses.dialog}`}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          <Command className="rounded-lg border-none bg-transparent">
            <CommandInput 
              placeholder="Type a command or search..." 
              className={uiClasses.input}
              value={searchQuery}
              onValueChange={setSearchQuery}
              autoFocus
            />
            
            <CommandList className="max-h-[300px] sm:max-h-[400px] overflow-auto">
              <CommandEmpty>
                <div className="py-6 text-center text-sm">
                  No commands found for "{searchQuery}"
                </div>
              </CommandEmpty>
              
              {searchQuery.trim() === '' ? (
                // Show categorized commands when not searching
                <>
                  {/* Recent commands section */}
                  {groupedCommands.recent.length > 0 && (
                    <>
                      <CommandGroup heading="Recent Commands" className={`${uiClasses.groupHeading}`}>
                        {groupedCommands.recent.map((command) => (
                          <CommandItem
                            key={`recent-${command.id}`}
                            onSelect={() => runCommand(command)}
                            className="flex items-center"
                          >
                            <div className={`mr-2 ${getCommandTypeClass('recent')}`}>
                              {getCommandIcon('recent', command)}
                            </div>
                            <span>{command.title}</span>
                            {command.description && (
                              <span className="text-xs text-muted-foreground ml-2">
                                {command.description}
                              </span>
                            )}
                            {/* Favorite button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavoriteCommand(command.id);
                              }}
                              className="ml-auto"
                            >
                              <Star 
                                className={`size-4 ${
                                  favoriteCommands.includes(command.id) 
                                    ? 'fill-yellow-400 text-yellow-400' 
                                    : 'text-muted-foreground'
                                }`} 
                              />
                            </button>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                      <CommandSeparator />
                    </>
                  )}
                  
                  {/* Favorite commands section */}
                  {groupedCommands.favorite.length > 0 && (
                    <>
                      <CommandGroup heading="Favorites" className={`${uiClasses.groupHeading}`}>
                        {groupedCommands.favorite.map((command) => (
                          <CommandItem
                            key={`favorite-${command.id}`}
                            onSelect={() => runCommand(command)}
                            className="flex items-center"
                          >
                            <div className={`mr-2 ${getCommandTypeClass('favorite')}`}>
                              {getCommandIcon(command.type, command)}
                            </div>
                            <span>{command.title}</span>
                            {command.description && (
                              <span className="text-xs text-muted-foreground ml-2">
                                {command.description}
                              </span>
                            )}
                            {/* Unfavorite button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavoriteCommand(command.id);
                              }}
                              className="ml-auto"
                            >
                              <Star className="size-4 fill-yellow-400 text-yellow-400" />
                            </button>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                      <CommandSeparator />
                    </>
                  )}
                  
                  {/* Command groups by type */}
                  {Object.entries(groupedCommands).map(([groupKey, commands]) => {
                    // Skip empty groups, recent and favorite which we've already shown
                    if (commands.length === 0 || groupKey === 'recent' || groupKey === 'favorite') {
                      return null;
                    }
                    
                    return (
                      <React.Fragment key={groupKey}>
                        <CommandGroup heading={getGroupLabel(groupKey)} className={`${uiClasses.groupHeading}`}>
                          {commands.map((command) => (
                            <CommandItem
                              key={command.id}
                              onSelect={() => runCommand(command)}
                              className="flex items-center"
                            >
                              <div className={`mr-2 ${getCommandTypeClass(command.type)}`}>
                                {getCommandIcon(command.type, command)}
                              </div>
                              <span>{command.title}</span>
                              {command.description && (
                                <span className="text-xs text-muted-foreground ml-2">
                                  {command.description}
                                </span>
                              )}
                              {/* Favorite button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleFavoriteCommand(command.id);
                                }}
                                className="ml-auto"
                              >
                                <Star 
                                  className={`size-4 ${
                                    favoriteCommands.includes(command.id) 
                                      ? 'fill-yellow-400 text-yellow-400' 
                                      : 'text-muted-foreground'
                                  }`} 
                                />
                              </button>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                        <CommandSeparator />
                      </React.Fragment>
                    );
                  })}
                </>
              ) : (
                // Show search results
                <CommandGroup heading="Search Results">
                  {filteredCommands.map((command) => (
                    <CommandItem
                      key={`search-${command.id}`}
                      onSelect={() => runCommand(command)}
                      className="flex items-center"
                    >
                      <div className={`mr-2 ${getCommandTypeClass(command.type)}`}>
                        {getCommandIcon(command.type, command)}
                      </div>
                      <span>{command.title}</span>
                      {command.description && (
                        <span className="text-xs text-muted-foreground ml-2">
                          {command.description}
                        </span>
                      )}
                      {/* Favorite button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavoriteCommand(command.id);
                        }}
                        className="ml-auto"
                      >
                        <Star 
                          className={`size-4 ${
                            favoriteCommands.includes(command.id) 
                              ? 'fill-yellow-400 text-yellow-400' 
                              : 'text-muted-foreground'
                          }`} 
                        />
                      </button>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              
              {/* Footer with keyboard shortcuts */}
              <div className="p-2 border-t border-border">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span>Press</span>
                    <kbd className={`px-1.5 py-0.5 rounded text-xs ${uiClasses.kbd}`}>↑↓</kbd>
                    <span>to navigate</span>
                    <kbd className={`px-1.5 py-0.5 rounded text-xs ${uiClasses.kbd}`}>↵</kbd>
                    <span>to select</span>
                    <kbd className={`px-1.5 py-0.5 rounded text-xs ${uiClasses.kbd}`}>esc</kbd>
                    <span>to close</span>
                  </div>
                  
                  <div>
                    {!searchQuery.trim() ? 
                      Object.values(groupedCommands).reduce((count, cmds) => count + cmds.length, 0) : 
                      filteredCommands.length} command{filteredCommands.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            </CommandList>
          </Command>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CommandPalette;