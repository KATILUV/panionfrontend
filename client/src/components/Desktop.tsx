import React, { useEffect, useState, useMemo, FC } from 'react';
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
import ParticleBackground from './effects/ParticleBackground';
import { useToast } from '@/hooks/use-toast';
import { AnimatePresence } from 'framer-motion';
import { useScreenSize, useOrientation } from '../hooks/use-mobile';

// ThemeAwareButton Component for Empty Dashboard
interface ThemeAwareButtonProps {
  onClick: () => void;
  title: string;
  description: string;
  icon: React.ReactNode;
  colorIndex: number;
}

const ThemeAwareButton: FC<ThemeAwareButtonProps> = ({ 
  onClick, 
  title, 
  description, 
  icon, 
  colorIndex 
}) => {
  // Get current theme accent directly in the component render
  const accent = useThemeStore(state => state.accent);
  const [renderKey, setRenderKey] = useState(0);
  
  // Re-render when accent changes
  useEffect(() => {
    console.log(`ThemeAwareButton (${title}): Accent changed to ${accent}`);
    setRenderKey(prev => prev + 1);
  }, [accent, title]);
  
  // Determine gradient based on theme and index
  const getGradient = () => {
    const variant = colorIndex % 3;
    
    switch (accent) {
      case 'purple':
        return variant === 0 
          ? 'from-purple-500 to-indigo-600' 
          : variant === 1 
            ? 'from-indigo-400 to-purple-700' 
            : 'from-violet-500 to-purple-600';
      case 'blue':
        return variant === 0 
          ? 'from-blue-500 to-cyan-600' 
          : variant === 1 
            ? 'from-cyan-400 to-blue-700' 
            : 'from-sky-500 to-blue-600';
      case 'green':
        return variant === 0 
          ? 'from-green-500 to-emerald-600' 
          : variant === 1 
            ? 'from-emerald-400 to-green-700' 
            : 'from-teal-500 to-green-600';
      case 'orange': // Dark theme
        return variant === 0 
          ? 'from-gray-800 to-black' 
          : variant === 1 
            ? 'from-zinc-800 to-gray-900' 
            : 'from-neutral-800 to-gray-950';
      case 'pink':
        return variant === 0 
          ? 'from-pink-500 to-rose-600' 
          : variant === 1 
            ? 'from-rose-400 to-pink-700' 
            : 'from-fuchsia-500 to-pink-600';
      default: // Default to purple
        return variant === 0 
          ? 'from-purple-500 to-indigo-600' 
          : variant === 1 
            ? 'from-indigo-400 to-purple-700' 
            : 'from-violet-500 to-purple-600';
    }
  };
  
  // Get the current gradient based on theme
  const gradient = getGradient();
  
  return (
    <button 
      key={`theme-btn-${title}-${renderKey}`}
      onClick={onClick}
      className={`bg-gradient-to-br ${gradient} p-[1px] rounded-xl shadow-lg`}
    >
      <div className="bg-card/50 backdrop-blur-sm p-4 rounded-xl h-full">
        <h3 className="font-bold text-lg mb-1 flex items-center gap-2 text-white">
          {React.isValidElement(icon) 
            ? React.cloneElement(icon as React.ReactElement, { className: "h-5 w-5 text-white" })
            : icon}
          {title}
        </h3>
        <p className="text-sm text-white/90">{description}</p>
      </div>
    </button>
  );
};

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
  
  // Determine particle settings based on theme
  const getParticleSettings = () => {
    const isDark = currentTheme === 'dark';
    if (!isDark) {
      // Light theme has more subtle particles
      return {
        particleCount: 25,
        particleOpacity: 0.2,
        particleSize: 1.5,
        particleSpeed: 0.3
      };
    }
    
    // Dark theme has more prominent particles
    return {
      particleCount: 40,
      particleOpacity: 0.5,
      particleSize: 2,
      particleSpeed: 0.5
    };
  };
  
  const particleSettings = getParticleSettings();
  
  return (
    <div 
      className="panion-desktop overflow-auto min-h-screen relative"
      style={{ 
        // Use direct inline background gradient as highest priority
        backgroundImage: backgroundGradient,
        backgroundColor: 'transparent' // Fallback only
      }}
    >
      {/* Particle background effect for enhanced visual interest */}
      <ParticleBackground 
        particleCount={particleSettings.particleCount}
        particleOpacity={particleSettings.particleOpacity}
        particleSize={particleSettings.particleSize}
        particleSpeed={particleSettings.particleSpeed}
        interactive={true}
      />
      {children}
    </div>
  );
};

const Desktop: React.FC = () => {
  const [_, navigate] = useLocation();
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
  
  // Use the enhanced screen size hook
  const { isMobile: isMobileScreen, isTablet, size } = useScreenSize();
  
  // Update the mobile state when screen size changes
  useEffect(() => {
    setIsMobile(isMobileScreen);
  }, [isMobileScreen]);
  
  // Get device orientation
  const orientation = useOrientation();
  
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
              <h1 className="text-2xl font-bold mb-6 text-center text-white drop-shadow-md">Welcome to Panion</h1>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Theme-aware action cards */}
                <ThemeAwareButton
                  onClick={() => {
                    openAgent('clara');
                    console.log("Clara button clicked");
                  }}
                  colorIndex={0}
                  icon={<MessageSquare className="h-5 w-5" />}
                  title="Chat with Clara"
                  description="Start a conversation with Clara, your AI assistant"
                />

                <ThemeAwareButton
                  onClick={() => {
                    openAgent('notes');
                    console.log("Notes button clicked");
                  }}
                  colorIndex={1}
                  icon={<FileText className="h-5 w-5" />}
                  title="Take Notes"
                  description="Open the Notes agent to capture your thoughts"
                />

                <ThemeAwareButton
                  onClick={() => {
                    openAgent('settings');
                    console.log("Settings button clicked");
                  }}
                  colorIndex={2}
                  icon={<Settings className="h-5 w-5" />}
                  title="Settings"
                  description="Configure your Panion desktop environment"
                />

                <ThemeAwareButton
                  onClick={() => {
                    navigate('/marketplace');
                    console.log("Marketplace page navigation clicked");
                  }}
                  colorIndex={0}
                  icon={<PlusCircle className="h-5 w-5" />}
                  title="Marketplace"
                  description="Discover and install new agents for your workspace"
                />
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
        {Object.entries(windowGroups).map(([groupId, _]) => (
          <GroupedWindow
            key={groupId}
            groupId={groupId}
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