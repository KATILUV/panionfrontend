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
  
  // Debug: Log accent changes - no longer modifying document body
  useEffect(() => {
    console.log("Background component - accent color:", accent);
  }, [accent]);
  
  // Get direct background color based on accent color
  const getBackgroundColor = () => {
    // In dark mode only, we only need to handle different accent colors
    switch (accent) {
      case 'purple':
        return '#1a1245';
      case 'blue':
        return '#0a1a2f';
      case 'green':
        return '#0f2922';
      case 'orange':
        return '#261409';
      case 'pink':
        return '#270d1a';
      case 'black':
        return '#000000'; // Pure black
      case 'white':
        return '#1a1a1a'; // Dark gray for white accent (not pure white to maintain dark mode)
      default:
        return '#1a1245'; // Default purple background
    }
  };
  
  const backgroundColor = getBackgroundColor();
  console.log("Applied background color:", backgroundColor);
  
  return (
    <div 
      className="panion-desktop overflow-auto min-h-screen"
      style={{ 
        // Use direct inline background as highest priority
        backgroundColor,
        backgroundImage: 'none'
      }}
    >
      {children}
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

  // Generate background gradient based on accent
  const getBackgroundGradient = () => {
    // Get fresh values directly from the store
    const currentAccent = useThemeStore.getState().accent;
    
    console.log('Generating background for:', { accent: currentAccent });
    
    switch (currentAccent) {
      case 'purple':
        return 'bg-gradient-to-br from-purple-950 via-[#1a1245] to-[#150d38]';
      case 'blue':
        return 'bg-gradient-to-br from-blue-950 via-[#0a1a2f] to-[#0c1827]';
      case 'green':
        return 'bg-gradient-to-br from-green-950 via-[#0f2922] to-[#0c211c]';
      case 'orange':
        return 'bg-gradient-to-br from-orange-950 via-[#261409] to-[#1f1107]';
      case 'pink':
        return 'bg-gradient-to-br from-pink-950 via-[#270d1a] to-[#1f0b16]';
      case 'black':
        return 'bg-gradient-to-br from-gray-950 via-black to-gray-900';
      case 'white':
        return 'bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800';
      default:
        return 'bg-gradient-to-br from-purple-950 via-[#1a1245] to-[#150d38]';
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