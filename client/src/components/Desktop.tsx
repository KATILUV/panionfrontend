import React, { useEffect, useState, FC } from 'react';
import Window from './common/Window';
import GroupedWindow from './common/GroupedWindow';
import Taskbar from './common/Taskbar';
import { useLocation } from 'wouter';
import { useAgentStore, AgentId } from '../state/agentStore';
import { useThemeStore } from '../state/themeStore';
import { useSystemLogStore, log } from '../state/systemLogStore';
import { useUserPrefsStore } from '../state/userPrefsStore';
import { initializeAgentRegistry } from '../state/agentStore';
import { MessageSquare, FileText, Settings, PlusCircle, Layout, Layers, X } from 'lucide-react';
import { ApplyLayout } from '../lib/layoutUtils';
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
import { useTaskbarDimensions } from '../hooks/use-taskbar-dimensions';

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
  
  return (
    <div 
      className="panion-desktop overflow-auto min-h-screen relative"
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
  const [_, navigate] = useLocation();
  const windows = useAgentStore(state => state.windows);
  const windowGroups = useAgentStore(state => state.windowGroups);
  const focusedAgentId = useAgentStore(state => state.focusedAgentId);
  const closeAgent = useAgentStore(state => state.closeAgent);
  const minimizeAgent = useAgentStore(state => state.minimizeAgent);
  const focusAgent = useAgentStore(state => state.focusAgent);
  const openAgent = useAgentStore(state => state.openAgent);
  // Simple desktop without complex layouts
  const [isMobile, setIsMobile] = useState(false);
  const userName = useUserPrefsStore(state => state.name);
  const setUserName = useUserPrefsStore(state => state.setName);
  const { toast } = useToast();
  
  // Use the enhanced screen size hook
  const { isMobile: isMobileScreen } = useScreenSize();
  
  // Update the mobile state when screen size changes
  useEffect(() => {
    setIsMobile(isMobileScreen);
  }, [isMobileScreen]);
  
  // Initialize agent registry and system logs when component mounts
  useEffect(() => {
    initializeAgentRegistry();
    
    // Add initial system logs to demonstrate functionality
    log.info('Panion OS initialized');
    log.thinking('Loading user preferences and system settings');
    log.memory('Retrieving saved window layouts and theme settings');
    
    // Simple initialization - no complex layouts
    log.action('Using simplified layout system');
    
    // Apply the Split View layout as a demo
    setTimeout(() => {
      try {
        // Use our simplified layout utility to show basic functionality
        ApplyLayout.splitView('clara', 'notes');
        
        toast({
          title: "Welcome to Panion",
          description: "Split view layout applied as a demonstration"
        });
      } catch (err) {
        console.error("Error applying initial layout:", err);
      }
    }, 2000); // Delay to ensure everything is loaded
    
    log.action('System ready for user interaction');
    
    // Don't automatically show the system log on startup
    const setVisibility = useSystemLogStore.getState().setVisibility;
    setVisibility(false);
  }, [toast]);
  
  // Particle settings based on theme
  const getParticleSettings = () => {
    const isDark = useThemeStore.getState().getCurrentTheme() === 'dark';
    
    if (isDark) {
      return {
        particleCount: 40,
        particleOpacity: 0.5,
        particleSize: 2,
        particleSpeed: 0.5
      };
    } else {
      return {
        particleCount: 25,
        particleOpacity: 0.2,
        particleSize: 1.5,
        particleSpeed: 0.3
      };
    }
  };

  // Check if there are any visible windows (open and not minimized) or visible window groups
  const hasVisibleWindows = 
    Object.values(windows).some(window => window.isOpen && !window.isMinimized) ||
    Object.values(windowGroups).some(group => !group.isMinimized);

  // Empty dashboard content with particle effects
  const EmptyDashboard = () => {
    const particleSettings = getParticleSettings();
    const userPrefsName = useUserPrefsStore(state => state.name);
    
    return (
      <>
        {/* Particle background effect only shown on empty desktop */}
        <ParticleBackground 
          particleCount={particleSettings.particleCount}
          particleOpacity={particleSettings.particleOpacity * 1.5} // Make more visible on empty state
          particleSize={particleSettings.particleSize}
          particleSpeed={particleSettings.particleSpeed}
          interactive={true}
          className="z-0"
        />
        <div className="absolute inset-0 z-10 pointer-events-auto flex flex-col items-center justify-center p-4">
          <div className="max-w-xl w-full mx-auto">
            <div className="mb-8 text-center">
              <h1 className="text-4xl font-light mb-2 text-white tracking-wide drop-shadow-lg">
                Welcome <span className="font-semibold">{userPrefsName}</span>,
              </h1>
              <h2 className="text-3xl font-bold text-white tracking-tight drop-shadow-lg bg-clip-text text-transparent bg-gradient-to-r from-white to-white/80">
                this is Panion
              </h2>
              
              {/* Layout buttons removed as requested */}
            </div>
            
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
      </>
    );
  };

  return (
    <DesktopBackground>
      {/* Desktop Area - Adjusted for mobile responsiveness */}
      <div className={`flex-1 relative ${isMobile ? 'pt-2 pb-14' : ''}`}>
        {/* Show empty dashboard with particles when no windows are open */}
        {!hasVisibleWindows && Object.keys(windowGroups).length === 0 && <EmptyDashboard />}
        
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