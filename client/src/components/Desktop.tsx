import React, { useEffect, useState, useMemo } from 'react';
import Window from './common/Window';
import Taskbar from './common/Taskbar';
import { useAgentStore, AgentId, WindowLayout } from '../state/agentStore';
import { useThemeStore } from '../state/themeStore';
import { useSystemLogStore, log } from '../state/systemLogStore';
import { initializeAgentRegistry } from '../state/agentStore';
import ClaraAgent from './agents/ClaraAgent';
import NotesAgent from './agents/NotesAgent';
import SettingsAgent from './agents/SettingsAgent';
import ClaraContextPanel from './system/ClaraContextPanel';
import CommandPalette from './system/CommandPalette';
import EmptyStateDashboard from './system/EmptyStateDashboard';
import { useToast } from '@/hooks/use-toast';

// Component rendering helper
const renderAgentContent = (agentId: string) => {
  switch (agentId) {
    case 'clara':
      return <ClaraAgent />;
    case 'notes':
      return <NotesAgent />;
    case 'settings':
      return <SettingsAgent />;
    default:
      return <div>Unknown agent type: {agentId}</div>;
  }
};

// Create background component to ensure re-rendering
const DesktopBackground: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const currentTheme = useThemeStore(state => state.getCurrentTheme());
  const accent = useThemeStore(state => state.accent);
  
  // Debug: Log accent changes
  useEffect(() => {
    console.log("Background component - accent color:", accent);
  }, [accent]);
  
  // This is a simpler approach - get direct background color based on theme and accent
  const getBackgroundColor = () => {
    // Handle special cases for dark and light accent with direct colors
    if (accent === 'dark' && currentTheme === 'dark') return '#000000'; // Pure black
    if (accent === 'light' && currentTheme === 'light') return '#ffffff'; // Pure white
    if (accent === 'dark' && currentTheme === 'light') return '#d1d5db'; // Gray-300
    if (accent === 'light' && currentTheme === 'dark') return '#374151'; // Gray-700
    
    // For other accents, fall back to existing gradient styles
    const isDark = currentTheme === 'dark';
    
    switch (accent) {
      case 'purple':
        return isDark ? '#1a1245' : '#f9f7ff'; 
      case 'blue':
        return isDark ? '#0a1a2f' : '#f0f9ff';
      case 'green':
        return isDark ? '#0f2922' : '#f0fdf4';
      case 'orange':
        return isDark ? '#261409' : '#fff7ed';
      case 'pink':
        return isDark ? '#270d1a' : '#fdf2f8';
      default:
        return isDark ? '#1a1245' : '#f9f7ff';
    }
  };
  
  const backgroundColor = getBackgroundColor();
  console.log("Applied background color:", backgroundColor);
  
  return (
    <div className="panion-desktop overflow-auto min-h-screen">
      {/* Fixed position background overlay */}
      <div
        className="fixed top-0 left-0 right-0 bottom-0 w-full h-full -z-10"
        style={{ backgroundColor }}
      />
      
      {/* Content container */}
      <div className="relative z-0">
        {children}
      </div>
    </div>
  );
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

  // Generate background gradient based on current theme and accent
  const getBackgroundGradient = () => {
    // Get fresh values directly from the store
    const isDark = useThemeStore.getState().getCurrentTheme() === 'dark';
    const currentAccent = useThemeStore.getState().accent;
    
    console.log('Generating background for:', { isDark, accent: currentAccent });
    
    switch (currentAccent) {
      case 'purple':
        return isDark 
          ? 'bg-gradient-to-br from-purple-950 via-[#1a1245] to-[#150d38]' 
          : 'bg-gradient-to-br from-purple-50 via-white to-white';
      case 'blue':
        return isDark 
          ? 'bg-gradient-to-br from-blue-950 via-[#0a1a2f] to-[#0c1827]' 
          : 'bg-gradient-to-br from-blue-50 via-white to-white';
      case 'green':
        return isDark 
          ? 'bg-gradient-to-br from-green-950 via-[#0f2922] to-[#0c211c]' 
          : 'bg-gradient-to-br from-green-50 via-white to-white';
      case 'orange':
        return isDark 
          ? 'bg-gradient-to-br from-orange-950 via-[#261409] to-[#1f1107]' 
          : 'bg-gradient-to-br from-orange-50 via-white to-white';
      case 'pink':
        return isDark 
          ? 'bg-gradient-to-br from-pink-950 via-[#270d1a] to-[#1f0b16]' 
          : 'bg-gradient-to-br from-pink-50 via-white to-white';
      case 'dark':
        return isDark 
          ? 'bg-gradient-to-br from-gray-950 via-gray-900 to-black' 
          : 'bg-gradient-to-br from-gray-200 via-gray-100 to-white';
      case 'light':
        return isDark 
          ? 'bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800' 
          : 'bg-gradient-to-br from-white via-gray-50 to-white';
      default:
        return isDark 
          ? 'bg-gradient-to-br from-purple-950 via-[#1a1245] to-[#150d38]' 
          : 'bg-gradient-to-br from-purple-50 via-white to-white';
    }
  };

  return (
    <DesktopBackground>
      {/* Desktop Area */}
      <div className="flex-1 relative">
        {/* Show empty state dashboard if no windows are open */}
        {!hasOpenWindows && <EmptyStateDashboard />}
        
        {/* Render Windows */}
        {Object.values(windows)
          .filter(window => window.isOpen && !window.isMinimized)
          .map(window => (
            <Window
              key={window.id}
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
          ))}
      </div>
      
      {/* Clara's Context Panel - visible when Clara is active */}
      <ClaraContextPanel 
        active={focusedAgentId === 'clara' || Object.values(windows).some(w => w.id === 'clara' && w.isOpen)} 
      />
      
      {/* Command Palette */}
      <CommandPalette />
      
      {/* Taskbar */}
      <Taskbar className="h-14" />
    </DesktopBackground>
  );
};

export default Desktop;