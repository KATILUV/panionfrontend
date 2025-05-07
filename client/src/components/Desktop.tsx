import React, { useEffect, useState, useMemo } from 'react';
import Window from './common/Window';
import GroupedWindow from './common/GroupedWindow';
import Taskbar from './common/Taskbar';
import { useLocation } from 'wouter';
import { useAgentStore, AgentId, WindowLayout } from '../state/agentStore';
import { useThemeStore } from '../state/themeStore';
import { useSystemLogStore, log } from '../state/systemLogStore';
import { initializeAgentRegistry } from '../state/agentStore';
import { MessageSquare, FileText, Settings, PlusCircle } from 'lucide-react';
import ClaraAgent from './agents/ClaraAgent';
import NotesAgent from './agents/NotesAgent';
import SettingsAgent from './agents/SettingsAgent';
import MarketplaceAgent from './agents/MarketplaceAgent';
import ClaraContextPanel from './system/ClaraContextPanel';
import CommandPalette from './system/CommandPalette';
import SimpleEmptyStateDashboard from './system/SimpleEmptyStateDashboard';
import { useToast } from '@/hooks/use-toast';
import { AnimatePresence } from 'framer-motion';

// Component rendering helper
const renderAgentContent = (agentId: string) => {
  switch (agentId) {
    case 'clara':
      return <ClaraAgent />;
    case 'notes':
      return <NotesAgent />;
    case 'settings':
      return <SettingsAgent />;
    case 'marketplace':
      return <MarketplaceAgent />;
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
  
  // Using linear-gradient backgrounds for all accents
  const getBackgroundGradient = () => {
    // Force extreme values for dark and light accents
    if (accent === 'dark') {
      // Always use black gradient for dark accent regardless of theme mode
      return 'linear-gradient(135deg, #000000, #141414, #000000)';
    }
    if (accent === 'light') {
      // Always use white gradient for light accent regardless of theme mode
      return 'linear-gradient(135deg, #ffffff, #f4f4f4, #ffffff)';
    }
    
    // For other accents, use attractive gradients
    const isDark = currentTheme === 'dark';
    
    switch (accent) {
      case 'purple':
        return isDark 
          ? 'linear-gradient(135deg, #1a1245 0%, #2e1f6f 50%, #4728a7 75%, #1a1245 100%)' 
          : 'linear-gradient(135deg, #f9f7ff 0%, #ffffff 50%, #f9f7ff 100%)'; 
      case 'blue':
        return isDark 
          ? 'linear-gradient(135deg, #0a1a2f 0%, #0f3460 50%, #2563eb 75%, #0a1a2f 100%)' 
          : 'linear-gradient(135deg, #f0f9ff 0%, #ffffff 50%, #f0f9ff 100%)';
      case 'green':
        return isDark 
          ? 'linear-gradient(135deg, #0f2922 0%, #10543f 50%, #15b981 75%, #0f2922 100%)' 
          : 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 50%, #f0fdf4 100%)';
      case 'orange': // now black
        return isDark 
          ? 'linear-gradient(135deg, #0a0a0a 0%, #1c1c1c 35%, #252525 65%, #0a0a0a 100%)' 
          : 'linear-gradient(135deg, #fff7ed 0%, #ffffff 50%, #fff7ed 100%)';
      case 'pink':
        return isDark 
          ? 'linear-gradient(135deg, #5a2641 0%, #c32a6e 50%, #e5508a 75%, #5a2641 100%)' 
          : 'linear-gradient(135deg, #fdf2f8 0%, #ffffff 50%, #fdf2f8 100%)';
      default:
        return isDark 
          ? 'linear-gradient(135deg, #1a1245 0%, #2e1f6f 50%, #4728a7 75%, #1a1245 100%)' 
          : 'linear-gradient(135deg, #f9f7ff 0%, #ffffff 50%, #f9f7ff 100%)';
    }
  };
  
  const backgroundGradient = getBackgroundGradient();
  console.log("Applied background gradient:", backgroundGradient);
  
  return (
    <div 
      className="panion-desktop overflow-auto min-h-screen"
      style={{ 
        // Use direct inline background gradient as highest priority
        backgroundImage: backgroundGradient,
        backgroundColor: 'transparent' // Fallback only
      }}
    >
      {children}
    </div>
  );
};

const Desktop: React.FC = () => {
  const windows = useAgentStore(state => state.windows);
  const windowGroups = useAgentStore(state => state.windowGroups);
  const focusedAgentId = useAgentStore(state => state.focusedAgentId);
  const closeAgent = useAgentStore(state => state.closeAgent);
  const minimizeAgent = useAgentStore(state => state.minimizeAgent);
  const focusAgent = useAgentStore(state => state.focusAgent);
  const openAgent = useAgentStore(state => state.openAgent);
  const layouts = useAgentStore(state => state.layouts);
  const activeLayoutId = useAgentStore(state => state.activeLayoutId);
  const saveLayout = useAgentStore(state => state.saveLayout);
  const loadLayout = useAgentStore(state => state.loadLayout);
  const deleteLayout = useAgentStore(state => state.deleteLayout);
  const [showLayoutPrompt, setShowLayoutPrompt] = useState(false);
  const [newLayoutName, setNewLayoutName] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const { toast } = useToast();
  
  // Detect mobile devices on mount and window resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Initial check
    checkMobile();
    
    // Setup resize listener
    window.addEventListener('resize', checkMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Create a demo window group for testing
  const createDemoWindowGroup = () => {
    const { 
      openAgent, 
      createWindowGroup,
      updateGroupPosition,
      updateGroupSize
    } = useAgentStore.getState();
    
    // First, make sure we have some agents open
    openAgent('notes');
    openAgent('marketplace');
    
    // Small delay to ensure windows are created
    setTimeout(() => {
      // Create a window group with these agents
      const groupId = createWindowGroup(['notes', 'marketplace'], 'Productivity Suite');
      
      // Position the group in a good spot
      updateGroupPosition(groupId, { x: 200, y: 100 });
      updateGroupSize(groupId, { width: 800, height: 600 });
      
      // Add a toast notification
      toast({
        title: "Window Group Created",
        description: "Demo window group 'Productivity Suite' has been created with Notes and Marketplace agents",
      });
      
      // Log the action
      log.action("Created demo window group: Productivity Suite");
    }, 300);
  };
  
  // Initialize agent registry and system logs when component mounts
  useEffect(() => {
    initializeAgentRegistry();
    
    // Add initial system logs to demonstrate functionality
    log.info('Panion OS initialized');
    log.thinking('Loading user preferences and system settings');
    log.memory('Retrieving saved window layouts and theme settings');
    
    // Check for default layout and load it if found
    const allLayouts = useAgentStore.getState().layouts;
    const defaultLayout = allLayouts.find(layout => layout.isDefault);
    
    if (defaultLayout) {
      log.action(`Loading default layout: ${defaultLayout.name}`);
      setTimeout(() => {
        loadLayout(defaultLayout.id);
        toast({
          title: "Default layout applied",
          description: `Layout "${defaultLayout.name}" has been loaded automatically`,
        });
      }, 500); // Small delay to ensure everything is initialized
    } else {
      log.action('No default layout found, using standard configuration');
    }
    
    // Initialize window layout auto-save
    const { autoSaveCurrentLayout, autoSaveEnabled, autoSaveInterval } = useAgentStore.getState();
    if (autoSaveEnabled) {
      log.info(`Auto-save enabled with interval: ${autoSaveInterval/1000} seconds`);
      autoSaveCurrentLayout(); // Start the auto-save cycle
    }
    
    // Uncomment the following to create a demo window group
    // setTimeout(() => {
    //   createDemoWindowGroup();
    // }, 2000);
    
    log.action('System ready for user interaction');
    
    // Don't automatically show the system log on startup
    const setVisibility = useSystemLogStore.getState().setVisibility;
    setVisibility(false);
    
    // Cleanup auto-save when component unmounts
    return () => {
      // We don't need explicit cleanup here since the timeout is handled
      // in the autoSaveCurrentLayout function in the store
      log.info('Desktop component unmounted, auto-save will be stopped');
    };
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
  
  // Check if there are any visible windows (open and not minimized) or visible window groups
  const hasVisibleWindows = 
    Object.values(windows).some(window => window.isOpen && !window.isMinimized) ||
    Object.values(windowGroups).some(group => !group.isMinimized);

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
          ? 'bg-gradient-to-br from-gray-950 via-gray-900 to-black' 
          : 'bg-gradient-to-br from-orange-50 via-white to-white';
      case 'pink':
        return isDark 
          ? 'bg-gradient-to-br from-pink-600 via-[#662245] to-[#4a1f35]' 
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
      {/* Desktop Area - Adjusted for mobile responsiveness */}
      <div className={`flex-1 relative ${isMobile ? 'pt-2 pb-14' : ''}`}>
        {/* Show emergency dashboard if no visible windows and no window groups */}
        {!hasVisibleWindows && Object.keys(windowGroups).length === 0 && (
          <div className="absolute inset-0 z-10 pointer-events-auto flex flex-col items-center justify-center p-4">
            <div className="max-w-xl w-full mx-auto">
              <h1 className="text-2xl font-bold mb-6 text-center">Welcome to Panion</h1>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Directly embedded action cards with simple HTML */}
                <button 
                  onClick={() => {
                    openAgent('clara');
                    console.log("Clara button clicked");
                  }}
                  className="bg-gradient-to-br from-purple-500 to-indigo-600 p-[1px] rounded-xl shadow-lg"
                >
                  <div className="bg-card/50 backdrop-blur-sm p-4 rounded-xl h-full">
                    <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      Chat with Clara
                    </h3>
                    <p className="text-sm opacity-80">Start a conversation with Clara, your AI assistant</p>
                  </div>
                </button>

                <button 
                  onClick={() => {
                    openAgent('notes');
                    console.log("Notes button clicked");
                  }}
                  className="bg-gradient-to-br from-indigo-400 to-purple-700 p-[1px] rounded-xl shadow-lg"
                >
                  <div className="bg-card/50 backdrop-blur-sm p-4 rounded-xl h-full">
                    <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Take Notes
                    </h3>
                    <p className="text-sm opacity-80">Open the Notes agent to capture your thoughts</p>
                  </div>
                </button>

                <button 
                  onClick={() => {
                    openAgent('settings');
                    console.log("Settings button clicked");
                  }}
                  className="bg-gradient-to-br from-violet-500 to-purple-600 p-[1px] rounded-xl shadow-lg"
                >
                  <div className="bg-card/50 backdrop-blur-sm p-4 rounded-xl h-full">
                    <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Settings
                    </h3>
                    <p className="text-sm opacity-80">Configure your Panion desktop environment</p>
                  </div>
                </button>

                <button 
                  onClick={() => {
                    openAgent('marketplace');
                    console.log("Marketplace agent button clicked");
                  }}
                  className="bg-gradient-to-br from-purple-500 to-indigo-600 p-[1px] rounded-xl shadow-lg"
                >
                  <div className="bg-card/50 backdrop-blur-sm p-4 rounded-xl h-full">
                    <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
                      <PlusCircle className="h-5 w-5" />
                      Marketplace
                    </h3>
                    <p className="text-sm opacity-80">Discover and install new agents for your workspace</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Render Individual Windows */}
        <AnimatePresence>
          {Object.values(windows)
            .filter(window => window.isOpen && !window.groupId) // Only show ungrouped windows
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
                isMinimized={window.isMinimized}
                isMobile={isMobile}
              >
                {renderAgentContent(window.id)}
              </Window>
            ))}
        </AnimatePresence>
        
        {/* Render Window Groups */}
        {Object.entries(windowGroups).map(([groupId, group]) => (
          <GroupedWindow
            key={groupId}
            groupId={groupId}
            group={group}
          />
        ))}
      </div>
      
      {/* Clara's Context Panel - only visible when Clara agent is actually open */}
      <ClaraContextPanel 
        active={Object.values(windows).some(w => w.id === 'clara' && w.isOpen && !w.isMinimized)} 
      />
      
      {/* Command Palette */}
      <CommandPalette />
      
      {/* Taskbar - position is handled via the useTaskbarStore */}
      <Taskbar isMobile={isMobile} />
    </DesktopBackground>
  );
};

export default Desktop;