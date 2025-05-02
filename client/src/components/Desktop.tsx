import React, { useEffect, useState } from 'react';
import Window from './common/Window';
import Taskbar from './common/Taskbar';
import { useAgentStore, AgentId, WindowLayout } from '../state/agentStore';
import { useThemeStore } from '../state/themeStore';
import { useSystemLogStore, log } from '../state/systemLogStore';
import { initializeAgentRegistry } from '../state/agentStore';
import ClaraAgent from './agents/ClaraAgent';
import NotesAgent from './agents/NotesAgent';
import ClaraContextPanel from './system/ClaraContextPanel';
import CommandPalette from './system/CommandPalette';
import EmptyStateDashboard from './system/EmptyStateDashboard';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

// Component rendering helper
const renderAgentContent = (agentId: string) => {
  switch (agentId) {
    case 'clara':
      return <ClaraAgent />;
    case 'notes':
      return <NotesAgent />;
    default:
      return <div>Unknown agent type</div>;
  }
};

const Desktop: React.FC = () => {
  const windows = useAgentStore(state => state.windows);
  const focusedAgentId = useAgentStore(state => state.focusedAgentId);
  const closeAgent = useAgentStore(state => state.closeAgent);
  const minimizeAgent = useAgentStore(state => state.minimizeAgent);
  const focusAgent = useAgentStore(state => state.focusAgent);
  const layouts = useAgentStore(state => state.layouts);
  const activeLayoutId = useAgentStore(state => state.activeLayoutId);
  const saveLayout = useAgentStore(state => state.saveLayout);
  const loadLayout = useAgentStore(state => state.loadLayout);
  const deleteLayout = useAgentStore(state => state.deleteLayout);
  const [showLayoutPrompt, setShowLayoutPrompt] = useState(false);
  const [newLayoutName, setNewLayoutName] = useState('');
  const { toast } = useToast();
  
  // Initialize agent registry and system logs when component mounts
  useEffect(() => {
    initializeAgentRegistry();
    
    // Add initial system logs to demonstrate functionality
    log.info('Panion OS initialized');
    log.thinking('Loading user preferences and system settings');
    log.memory('Retrieving saved window layouts and theme settings');
    log.action('System ready for user interaction');
    
    // Show the system log by default on first run
    const setVisibility = useSystemLogStore.getState().setVisibility;
    setVisibility(true);
  }, []);
  
  // Load layout handler
  const handleLoadLayout = (layoutId: string) => {
    loadLayout(layoutId);
    const layout = layouts.find(l => l.id === layoutId);
    if (layout) {
      toast({
        title: "Layout loaded",
        description: `Window layout "${layout.name}" has been applied`,
      });
    }
  };
  
  // Check if there are any open windows
  const hasOpenWindows = Object.values(windows).some(window => window.isOpen && !window.isMinimized);

  // Get current theme settings
  const currentTheme = useThemeStore(state => state.getCurrentTheme());
  const accent = useThemeStore(state => state.accent);
  const mode = useThemeStore(state => state.mode);
  const backgroundPattern = useThemeStore(state => state.backgroundPattern);
  const activePreset = useThemeStore(state => state.activePreset);

  // Apply background color based on theme
  const getBackgroundClass = () => {
    return 'bg-background'; // We'll use the CSS variable defined in our theme
  };

  return (
    <div className={`panion-desktop overflow-auto min-h-screen ${getBackgroundClass()}`}>
      {/* Background Decoration */}
      <div className="absolute inset-0 w-full h-full pointer-events-none">
        {/* Background patterns based on theme settings */}
        {backgroundPattern === 'grid' && (
          <div className="absolute inset-0 bg-grid-white/5 opacity-50"></div>
        )}
        {backgroundPattern === 'dots' && (
          <div className="absolute inset-0 bg-dots-white/5 opacity-50"></div>
        )}
        {backgroundPattern === 'waves' && (
          <div className="absolute inset-0 bg-waves-white/5 opacity-50"></div>
        )}
        
        {/* Theme-specific visual elements */}
        {activePreset === 'twilight' && (
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-purple-700/30 to-transparent opacity-20"></div>
        )}
        {activePreset === 'ocean' && (
          <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-cyan-700/20 to-transparent opacity-20"></div>
        )}
        {activePreset === 'forest' && (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(0,100,0,0.15)_0%,transparent_50%)]"></div>
        )}
        {activePreset === 'sunset' && (
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-orange-300/10 blur-3xl -z-10"></div>
        )}
        {activePreset === 'candy' && (
          <div className="absolute top-20 left-20 w-80 h-80 rounded-full bg-pink-200/15 blur-3xl -z-10"></div>
        )}
        
        {/* Theme name indicator for non-system themes */}
        {activePreset !== 'system' && (
          <div className="absolute bottom-8 right-8 text-xs font-mono px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 dark:text-white/70 text-foreground/70 backdrop-blur-sm shadow-sm">
            <span className="mr-2 inline-block w-2 h-2 rounded-full bg-primary"></span>
            {useThemeStore.getState().getThemePresets()[activePreset].displayName}
          </div>
        )}
      </div>
      
      {/* Desktop Area */}
      <div className="flex-1 relative">
        {/* Show empty state dashboard if no windows are open */}
        {!hasOpenWindows && <EmptyStateDashboard />}
        
        {/* Render Windows */}
        <AnimatePresence>
          {Object.values(windows)
            .filter(window => window.isOpen && !window.isMinimized)
            .map(window => (
              <motion.div
                key={window.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ 
                  opacity: 0,
                  scale: 0.9,
                  transition: { duration: 0.2, ease: "easeInOut" }
                }}
              >
                <Window
                  id={window.id}
                  title={window.title}
                  isActive={focusedAgentId === window.id}
                  position={window.position}
                  size={window.size}
                  zIndex={window.zIndex}
                  onClose={() => closeAgent(window.id)}
                  onMinimize={() => minimizeAgent(window.id)}
                  onFocus={() => focusAgent(window.id)}
                >
                  {renderAgentContent(window.id)}
                </Window>
              </motion.div>
            ))}
        </AnimatePresence>
      </div>
      
      {/* Clara's Context Panel - visible when Clara is active */}
      <ClaraContextPanel 
        active={focusedAgentId === 'clara' || Object.values(windows).some(w => w.id === 'clara' && w.isOpen)} 
      />
      
      {/* Command Palette */}
      <CommandPalette />
      
      {/* Taskbar */}
      <Taskbar className="h-14" />
    </div>
  );
};

export default Desktop;