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
import PanionChatAgent from './agents/PanionChatAgent';
import DaddyDataAgent from './agents/DaddyDataAgent';
import ClaraContextPanel from './system/ClaraContextPanel';
import CommandPalette from './system/CommandPalette';
import SimpleEmptyStateDashboard from './system/SimpleEmptyStateDashboard';
import { useToast } from '@/hooks/use-toast';
import { AnimatePresence } from 'framer-motion';
import { useScreenSize, useOrientation } from '../hooks/use-mobile';
import { useTaskbarDimensions } from '../hooks/use-taskbar-dimensions';
import { unpinAgentDirectly } from '../utils/unpinUtils';

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
  // First check for standard agents
  switch (agentId) {
    case 'clara':
      return <ClaraAgent />;
    case 'notes':
      return <NotesAgent />;
    case 'settings':
      return <SettingsAgent />;
    case 'marketplace':
      return <MarketplaceAgent />;
    case 'panion':
      return <PanionChatAgent />;
    case 'daddy-data':
      return <DaddyDataAgent />;
    default:
      // For dynamic agents, check if it's in the registry
      const registry = useAgentStore.getState().registry;
      const agent = registry.find(a => a.id === agentId);
      
      if (agent && agent.component) {
        // If it has a component, use it
        return agent.component();
      } else if (agentId.startsWith('dynamic_')) {
        // Remove any dynamic agents that don't have proper components
        setTimeout(() => {
          useAgentStore.getState().closeAgent(agentId);
          console.log(`Removed invalid dynamic agent: ${agentId}`);
        }, 100);
        return <div>This agent is no longer available</div>;
      } else {
        return <div>Unknown agent type: {agentId}</div>;
      }
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
    
    // Unpin the smokeshop agent from the taskbar if present
    try {
      // First try the direct method that modifies localStorage
      unpinAgentDirectly('smokeshop');
      log.action('Removed smokeshop agent from taskbar');
    } catch (err) {
      console.error("Error removing smokeshop agent:", err);
    }
    
    // Only open Panion Chat on startup (no split view)
    setTimeout(() => {
      try {
        // Only open the Panion chat agent (no other windows)
        openAgent('panion');
        
        toast({
          title: "Welcome to Panion",
          description: "Panion Chat is ready to assist you"
        });
      } catch (err) {
        console.error("Error initializing Panion Chat:", err);
      }
    }, 2000); // Delay to ensure everything is loaded
    
    log.action('System ready for user interaction');
    
    // Don't automatically show the system log on startup
    const setVisibility = useSystemLogStore.getState().setVisibility;
    setVisibility(false);
  }, [toast]);

  // Check if there are any visible windows (open and not minimized) or visible window groups
  const hasVisibleWindows = 
    Object.values(windows).some(window => window.isOpen && !window.isMinimized) ||
    Object.values(windowGroups).some(group => !group.isMinimized);

  // Simple empty dashboard without particle effects
  const EmptyDashboard = () => {
    return <SimpleEmptyStateDashboard />;
  };

  return (
    <DesktopBackground>
      {/* Desktop Area - Adjusted for mobile responsiveness */}
      <div className={`flex-1 relative ${isMobile ? 'pt-2 pb-14' : ''}`}>
        {/* Show simple empty dashboard when no windows are open */}
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