import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Command, CommandType, useCommandStore } from '../../state/commandStore';
import { useThemeStore } from '../../state/themeStore';
import { Search, X, Command as CommandIcon, Monitor, Paintbrush, LayoutGrid, Terminal, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';

const CommandPalette: React.FC = () => {
  const { isOpen, getAvailableCommands, setIsOpen } = useCommandStore();
  const getCurrentTheme = useThemeStore(state => state.getCurrentTheme);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCommands, setFilteredCommands] = useState<Command[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const commandsRef = useRef<HTMLDivElement>(null);
  
  // Memoize commands to prevent infinite renders
  const allCommands = useMemo(() => {
    if (isOpen) {
      return getAvailableCommands();
    }
    return [];
  }, [isOpen, getAvailableCommands]);
  
  // Filter commands based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredCommands(allCommands);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = allCommands.filter(command => {
      // Match by title
      if (command.title.toLowerCase().includes(query)) {
        return true;
      }
      
      // Match by description
      if (command.description?.toLowerCase().includes(query)) {
        return true;
      }
      
      // Match by keywords
      if (command.keywords?.some(keyword => keyword.toLowerCase().includes(query))) {
        return true;
      }
      
      return false;
    });
    
    setFilteredCommands(filtered);
    setSelectedIndex(0);
  }, [searchQuery, allCommands]);
  
  // Reset state when command palette opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedIndex(0);
      setFilteredCommands(allCommands);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, allCommands]);
  
  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
      }
      
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      }
      
      if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex]);
  
  // Scroll selected item into view
  useEffect(() => {
    if (!commandsRef.current) return;
    
    const selectedElement = commandsRef.current.querySelector(`[data-index="${selectedIndex}"]`);
    if (selectedElement) {
      selectedElement.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);
  
  // Get icon for command type
  const getCommandIcon = (type: CommandType) => {
    switch (type) {
      case 'window':
        return <LayoutGrid className="w-4 h-4" />;
      case 'agent':
        return <Sparkles className="w-4 h-4" />;
      case 'system':
        return <Terminal className="w-4 h-4" />;
      case 'theme':
        return <Paintbrush className="w-4 h-4" />;
      case 'suggestion':
        return <Sparkles className="w-4 h-4" />;
      default:
        return <CommandIcon className="w-4 h-4" />;
    }
  };
  
  // Get class for command type
  const getCommandTypeClass = (type: CommandType) => {
    const isDark = getCurrentTheme() === 'dark';
    const isLightAccent = useThemeStore.getState().accent === 'light' && !isDark;
    
    switch (type) {
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
  
  if (!isOpen) return null;
  
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center">
        {/* Backdrop */}
        <motion.div 
          className={`absolute inset-0 backdrop-blur-sm ${
            getCurrentTheme() === 'dark' 
              ? 'bg-black/50' 
              : 'bg-slate-900/30'
          }`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsOpen(false)}
        />
        
        {/* Command palette */}
        <motion.div
          className={`relative w-full max-w-lg mt-20 backdrop-blur-xl rounded-lg shadow-2xl overflow-hidden ${
            getCurrentTheme() === 'dark'
              ? 'bg-black/70 border border-purple-500/30 text-white'
              : (useThemeStore.getState().accent === 'light' 
                 ? 'bg-white/95 border border-gray-200 text-gray-900'
                 : 'bg-white/95 border border-purple-200 text-gray-900')
          }`}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          {/* Search header */}
          <div className={`flex items-center px-4 py-3 border-b ${
            getCurrentTheme() === 'dark' 
              ? 'border-purple-500/20' 
              : (useThemeStore.getState().accent === 'light'
                 ? 'border-gray-200' 
                 : 'border-purple-100')
          }`}>
            <Search className={`w-5 h-5 mr-2 ${
              getCurrentTheme() === 'dark' 
                ? 'text-white/50' 
                : (useThemeStore.getState().accent === 'light'
                   ? 'text-gray-400'
                   : 'text-purple-400')
            }`} />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Type a command or search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`flex-1 bg-transparent border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 ${
                getCurrentTheme() === 'dark'
                  ? 'text-white placeholder:text-white/50'
                  : 'text-gray-800 placeholder:text-gray-400'
              }`}
            />
            <div className={`flex items-center gap-1 text-xs ${
              getCurrentTheme() === 'dark' 
                ? 'text-white/40' 
                : 'text-gray-500'
            }`}>
              <kbd className={`px-1.5 py-0.5 rounded ${
                getCurrentTheme() === 'dark' 
                  ? 'bg-white/10' 
                  : (useThemeStore.getState().accent === 'light'
                     ? 'bg-gray-100 border border-gray-200'
                     : 'bg-purple-50 border border-purple-100')
              }`}>↑↓</kbd>
              <span>to navigate</span>
              <kbd className={`px-1.5 py-0.5 rounded ${
                getCurrentTheme() === 'dark' 
                  ? 'bg-white/10' 
                  : (useThemeStore.getState().accent === 'light'
                     ? 'bg-gray-100 border border-gray-200'
                     : 'bg-purple-50 border border-purple-100')
              }`}>↵</kbd>
              <span>to select</span>
              <kbd className={`px-1.5 py-0.5 rounded ${
                getCurrentTheme() === 'dark' 
                  ? 'bg-white/10' 
                  : (useThemeStore.getState().accent === 'light'
                     ? 'bg-gray-100 border border-gray-200'
                     : 'bg-purple-50 border border-purple-100')
              }`}>esc</kbd>
              <span>to close</span>
            </div>
          </div>
          
          {/* Commands */}
          <div 
            ref={commandsRef}
            className="overflow-y-auto max-h-80"
          >
            {filteredCommands.length === 0 ? (
              <div className={`p-4 text-center ${
                getCurrentTheme() === 'dark' 
                  ? 'text-white/50' 
                  : 'text-gray-500'
              }`}>
                No commands found
              </div>
            ) : (
              <div className="p-2">
                {filteredCommands.map((command, index) => (
                  <div
                    key={command.id}
                    data-index={index}
                    className={`flex items-center px-3 py-2 rounded-md cursor-pointer transition-colors ${
                      index === selectedIndex 
                        ? getCurrentTheme() === 'dark' 
                          ? 'bg-purple-800/30 border border-purple-700/30' 
                          : (useThemeStore.getState().accent === 'light'
                             ? 'bg-gray-100 border border-gray-200'
                             : 'bg-purple-100 border border-purple-200')
                        : getCurrentTheme() === 'dark'
                          ? 'hover:bg-black/30'
                          : (useThemeStore.getState().accent === 'light'
                             ? 'hover:bg-gray-50'
                             : 'hover:bg-purple-50')
                    }`}
                    onClick={() => {
                      command.action();
                    }}
                  >
                    <div className={`mr-3 ${getCommandTypeClass(command.type)}`}>
                      {command.icon ? (
                        <div dangerouslySetInnerHTML={{ __html: command.icon }} className="w-4 h-4" />
                      ) : (
                        getCommandIcon(command.type)
                      )}
                    </div>
                    <div className="flex-1">
                      <div className={`text-sm font-medium ${
                        getCurrentTheme() === 'dark' 
                          ? 'text-white' 
                          : 'text-gray-800'
                      }`}>{command.title}</div>
                      {command.description && (
                        <div className={`text-xs ${
                          getCurrentTheme() === 'dark' 
                            ? 'text-white/50' 
                            : 'text-gray-500'
                        }`}>{command.description}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className={`flex items-center justify-between px-4 py-2 border-t text-xs ${
            getCurrentTheme() === 'dark' 
              ? 'border-purple-500/20 text-white/50' 
              : (useThemeStore.getState().accent === 'light'
                 ? 'border-gray-200 text-gray-500'
                 : 'border-purple-100 text-gray-500')
          }`}>
            <div>
              <span className="mr-1">Press</span>
              <kbd className={`px-1.5 py-0.5 rounded ${
                getCurrentTheme() === 'dark' 
                  ? 'bg-white/10' 
                  : (useThemeStore.getState().accent === 'light'
                     ? 'bg-gray-100 border border-gray-200'
                     : 'bg-purple-50 border border-purple-100')
              }`}>Ctrl</kbd>
              <span className="mx-1">+</span>
              <kbd className={`px-1.5 py-0.5 rounded ${
                getCurrentTheme() === 'dark' 
                  ? 'bg-white/10' 
                  : (useThemeStore.getState().accent === 'light'
                     ? 'bg-gray-100 border border-gray-200'
                     : 'bg-purple-50 border border-purple-100')
              }`}>K</kbd>
              <span className="ml-1">to open command palette</span>
            </div>
            <div>
              {filteredCommands.length} command{filteredCommands.length !== 1 ? 's' : ''}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CommandPalette;