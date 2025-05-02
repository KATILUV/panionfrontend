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

  // Generate background gradient based on current theme and accent
  const getBackgroundGradient = () => {
    const isDark = currentTheme === 'dark';
    
    // Apply pure black/white backgrounds when using specific mode
    if (isDark) {
      // Pure black background for dark theme
      return 'bg-black';
    } else {
      // Pure white background for light theme
      return 'bg-white';
    }
  };

  return (
    <div className={`panion-desktop overflow-auto min-h-screen ${getBackgroundGradient()}`}>
      {/* Background Decoration */}
      <div className="absolute inset-0 w-full h-full">
        {/* Background pattern based on theme setting */}
        {/* Only show patterns if not in pure black mode */}
        {backgroundPattern === 'grid' && !(activePreset === 'dark' && currentTheme === 'dark') && (
          <div className={`absolute inset-0 w-full h-full ${
            currentTheme === 'dark' ? 'bg-grid-white/5' : 'bg-[url("data:image/svg+xml,%3csvg_xmlns=%27http://www.w3.org/2000/svg%27_viewBox=%270_0_32_32%27_width=%2732%27_height=%2732%27_fill=%27none%27_stroke=%27rgb(0_0_0_/_0.05)%27%3e%3cpath_d=%27M0_.5H31.5V32%27/%3e%3c/svg%3e")]'
          }`}></div>
        )}
        
        {backgroundPattern === 'dots' && !(activePreset === 'dark' && currentTheme === 'dark') && (
          <div className={`absolute inset-0 w-full h-full ${
            currentTheme === 'dark' 
              ? 'bg-[radial-gradient(rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[length:20px_20px]' 
              : 'bg-[radial-gradient(rgba(0,0,0,0.03)_1px,transparent_1px)] bg-[length:20px_20px]'
          }`}></div>
        )}
        
        {backgroundPattern === 'waves' && !(activePreset === 'dark' && currentTheme === 'dark') && (
          <div className={`absolute inset-0 w-full h-full ${
            currentTheme === 'dark' 
              ? 'bg-[url("data:image/svg+xml,%3Csvg_width=%27100%25%27_height=%27100%25%27_viewBox=%270_0_1200_800%27_xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cdefs%3E%3ClinearGradient_id=%27a%27_gradientUnits=%27userSpaceOnUse%27_x1=%27600%27_y1=%27850%27_x2=%27600%27_y2=%27100%27%3E%3Cstop_offset=%270%27_stop-color=%27%23ffffff%27_stop-opacity=%270%27/%3E%3Cstop_offset=%271%27_stop-color=%27%23ffffff%27_stop-opacity=%270.05%27/%3E%3C/linearGradient%3E%3C/defs%3E%3Cpath_fill=%27url(%23a)%27_d=%27M0_0v800c175-125_350-125_525_0s350_125_525_0c175-125_350-125_525_0V0H0z%27/%3E%3C/svg%3E")]' 
              : 'bg-[url("data:image/svg+xml,%3Csvg_width=%27100%25%27_height=%27100%25%27_viewBox=%270_0_1200_800%27_xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cdefs%3E%3ClinearGradient_id=%27a%27_gradientUnits=%27userSpaceOnUse%27_x1=%27600%27_y1=%27850%27_x2=%27600%27_y2=%27100%27%3E%3Cstop_offset=%270%27_stop-color=%27%23000000%27_stop-opacity=%270%27/%3E%3Cstop_offset=%271%27_stop-color=%27%23000000%27_stop-opacity=%270.03%27/%3E%3C/linearGradient%3E%3C/defs%3E%3Cpath_fill=%27url(%23a)%27_d=%27M0_0v800c175-125_350-125_525_0s350_125_525_0c175-125_350-125_525_0V0H0z%27/%3E%3C/svg%3E")]'
          }`}></div>
        )}
        
        {/* For pure black theme, add very subtle noise texture */}
        {activePreset === 'dark' && currentTheme === 'dark' && (
          <div className="absolute inset-0 w-full h-full opacity-10" 
               style={{ backgroundImage: "url('data:image/png;base64,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')", 
                 backgroundBlendMode: "overlay" }}></div>
        )}
        
        {/* Add subtle glow effect with accent color */}
        {(activePreset !== 'dark' || currentTheme !== 'dark') && (
          <div className={`absolute top-0 left-1/4 w-1/2 h-80 rounded-full blur-3xl ${
            currentTheme === 'dark' 
              ? accent === 'purple' ? 'bg-purple-900/20' 
                : accent === 'blue' ? 'bg-blue-900/20'
                  : accent === 'green' ? 'bg-green-900/20'
                    : accent === 'orange' ? 'bg-orange-900/20'
                      : 'bg-pink-900/20'
              : accent === 'purple' ? 'bg-purple-200/40' 
                : accent === 'blue' ? 'bg-blue-200/40'
                  : accent === 'green' ? 'bg-green-200/40'
                    : accent === 'orange' ? 'bg-orange-200/40'
                      : 'bg-pink-200/40'
          }`}></div>
        )}
        
        {/* Theme name indicator for non-system themes */}
        {activePreset !== 'system' && (
          <div className="absolute bottom-20 right-6 text-xs text-white/30 font-mono">
            Theme: {useThemeStore.getState().getThemePresets()[activePreset].displayName}
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