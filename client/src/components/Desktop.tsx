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
  const backgroundPattern = useThemeStore(state => state.backgroundPattern);
  const activePreset = useThemeStore(state => state.activePreset);

  // Generate background gradient based on current theme and accent
  const getBackgroundGradient = () => {
    const isDark = currentTheme === 'dark';
    
    switch (accent) {
      case 'purple':
        return isDark 
          ? 'bg-gradient-to-br from-purple-950 via-[#1a1245] to-[#150d38]' 
          : 'bg-gradient-to-br from-purple-100 via-purple-50/80 to-white/90';
      case 'blue':
        return isDark 
          ? 'bg-gradient-to-br from-blue-950 via-[#0a1a2f] to-[#0c1827]' 
          : 'bg-gradient-to-br from-blue-100 via-blue-50/80 to-white/90';
      case 'green':
        return isDark 
          ? 'bg-gradient-to-br from-green-950 via-[#0f2922] to-[#0c211c]' 
          : 'bg-gradient-to-br from-green-100 via-green-50/80 to-white/90';
      case 'orange':
        return isDark 
          ? 'bg-gradient-to-br from-orange-950 via-[#261409] to-[#1f1107]' 
          : 'bg-gradient-to-br from-orange-100 via-orange-50/80 to-white/90';
      case 'pink':
        return isDark 
          ? 'bg-gradient-to-br from-pink-950 via-[#270d1a] to-[#1f0b16]' 
          : 'bg-gradient-to-br from-pink-100 via-pink-50/80 to-white/90';
      default:
        return isDark 
          ? 'bg-gradient-to-br from-purple-950 via-[#1a1245] to-[#150d38]' 
          : 'bg-gradient-to-br from-purple-100 via-purple-50/80 to-white/90';
    }
  };

  return (
    <div className={`panion-desktop overflow-auto min-h-screen ${getBackgroundGradient()}`}>
      {/* Background Decoration */}
      <div className="absolute inset-0 w-full h-full">
        {/* Background pattern based on theme setting */}
        {backgroundPattern === 'grid' && (
          <div className={`absolute inset-0 w-full h-full ${
            currentTheme === 'dark' ? 'bg-grid-white/5' : 'bg-[url("data:image/svg+xml,%3csvg_xmlns=%27http://www.w3.org/2000/svg%27_viewBox=%270_0_32_32%27_width=%2732%27_height=%2732%27_fill=%27none%27_stroke=%27rgb(0_0_0_/_0.05)%27%3e%3cpath_d=%27M0_.5H31.5V32%27/%3e%3c/svg%3e")]'
          }`}></div>
        )}
        
        {backgroundPattern === 'dots' && (
          <div className={`absolute inset-0 w-full h-full ${
            currentTheme === 'dark' 
              ? 'bg-[radial-gradient(rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[length:20px_20px]' 
              : 'bg-[radial-gradient(rgba(0,0,0,0.03)_1px,transparent_1px)] bg-[length:20px_20px]'
          }`}></div>
        )}
        
        {backgroundPattern === 'waves' && (
          <div className={`absolute inset-0 w-full h-full ${
            currentTheme === 'dark' 
              ? 'bg-[url("data:image/svg+xml,%3Csvg_width=%27100%25%27_height=%27100%25%27_viewBox=%270_0_1200_800%27_xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cdefs%3E%3ClinearGradient_id=%27a%27_gradientUnits=%27userSpaceOnUse%27_x1=%27600%27_y1=%27850%27_x2=%27600%27_y2=%27100%27%3E%3Cstop_offset=%270%27_stop-color=%27%23ffffff%27_stop-opacity=%270%27/%3E%3Cstop_offset=%271%27_stop-color=%27%23ffffff%27_stop-opacity=%270.05%27/%3E%3C/linearGradient%3E%3C/defs%3E%3Cpath_fill=%27url(%23a)%27_d=%27M0_0v800c175-125_350-125_525_0s350_125_525_0c175-125_350-125_525_0V0H0z%27/%3E%3C/svg%3E")]' 
              : 'bg-[url("data:image/svg+xml,%3Csvg_width=%27100%25%27_height=%27100%25%27_viewBox=%270_0_1200_800%27_xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cdefs%3E%3ClinearGradient_id=%27a%27_gradientUnits=%27userSpaceOnUse%27_x1=%27600%27_y1=%27850%27_x2=%27600%27_y2=%27100%27%3E%3Cstop_offset=%270%27_stop-color=%27%23000000%27_stop-opacity=%270%27/%3E%3Cstop_offset=%271%27_stop-color=%27%23000000%27_stop-opacity=%270.03%27/%3E%3C/linearGradient%3E%3C/defs%3E%3Cpath_fill=%27url(%23a)%27_d=%27M0_0v800c175-125_350-125_525_0s350_125_525_0c175-125_350-125_525_0V0H0z%27/%3E%3C/svg%3E")]'
          }`}></div>
        )}
        
        {/* Add subtle glow effect with accent color */}
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