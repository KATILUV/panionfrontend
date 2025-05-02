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
  const activePreset = useThemeStore(state => state.activePreset);
  const getActiveSettings = useThemeStore(state => state.getActiveSettings);

  // Generate background gradient based on current theme and accent
  const getBackgroundGradient = () => {
    const isDark = currentTheme === 'dark';
    const { accent } = useThemeStore.getState().getActiveSettings();
    
    switch (accent) {
      case 'purple':
        return isDark 
          ? 'bg-gradient-to-br from-black via-[#110a2e] to-[#0a0520]' // Darker purple
          : 'bg-gradient-to-br from-white via-white to-purple-50/30'; // Lighter purple
      case 'blue':
        return isDark 
          ? 'bg-gradient-to-br from-black via-[#05101c] to-[#030a12]' // Darker blue
          : 'bg-gradient-to-br from-white via-white to-blue-50/30'; // Lighter blue
      case 'green':
        return isDark 
          ? 'bg-gradient-to-br from-black via-[#051512] to-[#020a08]' // Darker green
          : 'bg-gradient-to-br from-white via-white to-green-50/30'; // Lighter green
      case 'orange':
        return isDark 
          ? 'bg-gradient-to-br from-black via-[#160b05] to-[#0c0603]' // Darker orange
          : 'bg-gradient-to-br from-white via-white to-orange-50/30'; // Lighter orange
      case 'pink':
        return isDark 
          ? 'bg-gradient-to-br from-black via-[#18040d] to-[#0c0208]' // Darker pink
          : 'bg-gradient-to-br from-white via-white to-pink-50/30'; // Lighter pink
      default:
        return isDark 
          ? 'bg-gradient-to-br from-black via-[#110a2e] to-[#0a0520]' // Darker purple default
          : 'bg-gradient-to-br from-white via-white to-purple-50/30'; // Lighter purple default
    }
  };

  return (
    <div className={`panion-desktop overflow-auto min-h-screen ${getBackgroundGradient()}`}>
      {/* Background Decoration */}
      <div className="absolute inset-0 w-full h-full">
        {/* Background pattern based on theme setting */}
        {(() => {
          const { backgroundPattern, accent } = getActiveSettings();
          
          if (backgroundPattern === 'grid') {
            return (
              <div className={`absolute inset-0 w-full h-full ${
                currentTheme === 'dark' 
                  ? 'bg-grid-white/5' 
                  : 'bg-[url("data:image/svg+xml,%3csvg_xmlns=%27http://www.w3.org/2000/svg%27_viewBox=%270_0_32_32%27_width=%2732%27_height=%2732%27_fill=%27none%27_stroke=%27rgb(0_0_0_/_0.02)%27%3e%3cpath_d=%27M0_.5H31.5V32%27/%3e%3c/svg%3e")]'
              }`}></div>
            );
          } else if (backgroundPattern === 'dots') {
            return (
              <div className={`absolute inset-0 w-full h-full ${
                currentTheme === 'dark' 
                  ? 'bg-[radial-gradient(rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[length:20px_20px]' 
                  : 'bg-[radial-gradient(rgba(0,0,0,0.01)_1px,transparent_1px)] bg-[length:20px_20px]'
              }`}></div>
            );
          } else if (backgroundPattern === 'waves') {
            return (
              <div className={`absolute inset-0 w-full h-full ${
                currentTheme === 'dark' 
                  ? 'bg-[url("data:image/svg+xml,%3Csvg_width=%27100%25%27_height=%27100%25%27_viewBox=%270_0_1200_800%27_xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cdefs%3E%3ClinearGradient_id=%27a%27_gradientUnits=%27userSpaceOnUse%27_x1=%27600%27_y1=%27850%27_x2=%27600%27_y2=%27100%27%3E%3Cstop_offset=%270%27_stop-color=%27%23ffffff%27_stop-opacity=%270%27/%3E%3Cstop_offset=%271%27_stop-color=%27%23ffffff%27_stop-opacity=%270.05%27/%3E%3C/linearGradient%3E%3C/defs%3E%3Cpath_fill=%27url(%23a)%27_d=%27M0_0v800c175-125_350-125_525_0s350_125_525_0c175-125_350-125_525_0V0H0z%27/%3E%3C/svg%3E")]' 
                  : 'bg-[url("data:image/svg+xml,%3Csvg_width=%27100%25%27_height=%27100%25%27_viewBox=%270_0_1200_800%27_xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cdefs%3E%3ClinearGradient_id=%27a%27_gradientUnits=%27userSpaceOnUse%27_x1=%27600%27_y1=%27850%27_x2=%27600%27_y2=%27100%27%3E%3Cstop_offset=%270%27_stop-color=%27%23000000%27_stop-opacity=%270%27/%3E%3Cstop_offset=%271%27_stop-color=%27%23000000%27_stop-opacity=%270.02%27/%3E%3C/linearGradient%3E%3C/defs%3E%3Cpath_fill=%27url(%23a)%27_d=%27M0_0v800c175-125_350-125_525_0s350_125_525_0c175-125_350-125_525_0V0H0z%27/%3E%3C/svg%3E")]'
              }`}></div>
            );
          }
          
          return null;
        })()}
        
        {/* Enhanced glow effects */}
        {(() => {
          const { accent } = getActiveSettings();
          const isDark = currentTheme === 'dark';
          
          let glowColor = '';
          if (accent === 'purple') glowColor = isDark ? 'bg-purple-800/30' : 'bg-purple-200/20';
          else if (accent === 'blue') glowColor = isDark ? 'bg-blue-800/30' : 'bg-blue-200/20';
          else if (accent === 'green') glowColor = isDark ? 'bg-green-800/30' : 'bg-green-200/20';
          else if (accent === 'orange') glowColor = isDark ? 'bg-orange-800/30' : 'bg-orange-200/20';
          else if (accent === 'pink') glowColor = isDark ? 'bg-pink-800/30' : 'bg-pink-200/20';
          
          return (
            <>
              {/* Primary glow */}
              <div className={`absolute top-0 left-1/4 w-1/2 h-80 rounded-full blur-3xl ${glowColor}`}></div>
              
              {/* Secondary subtle glow */}
              <div className={`absolute bottom-40 right-1/3 w-96 h-96 rounded-full blur-3xl ${
                isDark 
                  ? `opacity-20 ${accent === 'purple' ? 'bg-indigo-900' : 
                      accent === 'blue' ? 'bg-cyan-900' : 
                      accent === 'green' ? 'bg-emerald-900' : 
                      accent === 'orange' ? 'bg-amber-900' : 
                      'bg-rose-900'}`
                  : `opacity-10 ${accent === 'purple' ? 'bg-indigo-300' : 
                      accent === 'blue' ? 'bg-cyan-300' : 
                      accent === 'green' ? 'bg-emerald-300' : 
                      accent === 'orange' ? 'bg-amber-300' : 
                      'bg-rose-300'}`
              }`}></div>
            </>
          );
        })()}
        
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