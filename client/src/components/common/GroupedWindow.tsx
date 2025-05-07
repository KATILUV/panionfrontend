import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAgentStore } from '../../state/agentStore';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';
import { useThemeStore } from '../../state/themeStore';
import Window from './Window';
import { useIsMobile } from '../../hooks/use-mobile';

interface GroupedWindowProps {
  groupId: string;
}

const GroupedWindow: React.FC<GroupedWindowProps> = ({ groupId }) => {
  const { 
    windowGroups, 
    windows, 
    registry,
    setActiveGroupWindow,
    ungroupWindow,
    updateGroupPosition,
    updateGroupSize,
    closeWindowGroup,
    focusWindowGroup,
    minimizeWindowGroup
  } = useAgentStore();
  
  const getCurrentTheme = useThemeStore(state => state.getCurrentTheme);
  const isMobile = useIsMobile();
  
  // Get the group from the store
  const group = windowGroups[groupId];
  
  if (!group) return null;
  
  const { windows: windowIds, activeWindowId, position, size, zIndex, isMinimized } = group;
  
  // Calculate tab width based on number of windows (with a minimum and maximum)
  const tabWidth = Math.min(Math.max(120, size.width / windowIds.length), 200);
  
  // State for tab overflow handling
  const [startTabIndex, setStartTabIndex] = useState(0);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  
  // Update tab navigation arrows
  useEffect(() => {
    const visibleTabCount = Math.floor((size.width - 40) / tabWidth); // 40px for padding and buttons
    setShowLeftArrow(startTabIndex > 0);
    setShowRightArrow(startTabIndex + visibleTabCount < windowIds.length);
  }, [startTabIndex, windowIds.length, size.width, tabWidth]);
  
  // Handle tab navigation
  const scrollTabsLeft = () => {
    setStartTabIndex(Math.max(0, startTabIndex - 1));
  };
  
  const scrollTabsRight = () => {
    const visibleTabCount = Math.floor((size.width - 40) / tabWidth);
    setStartTabIndex(Math.min(windowIds.length - visibleTabCount, startTabIndex + 1));
  };
  
  // Get the currently active window to render
  const activeWindow = activeWindowId ? windows[activeWindowId] : null;
  
  if (!activeWindow) return null;
  
  // Define the tab bar's visual theme based on the current theme
  const getTabBarStyle = () => {
    const isDark = getCurrentTheme() === 'dark';
    return {
      backgroundColor: isDark ? 'rgba(20, 20, 30, 0.8)' : 'rgba(240, 240, 255, 0.9)',
      borderBottom: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
    };
  };
  
  // Handle closing a window in the group
  const handleCloseWindow = (windowId: string) => {
    // If this is the last window in the group, close the entire group
    if (windowIds.length === 1) {
      closeWindowGroup(groupId);
    } else {
      ungroupWindow(windowId);
    }
  };
  
  // Get active agent details for title and icon
  const activeAgent = registry.find(agent => agent.id === activeWindowId);
  
  return (
    <div 
      className="grouped-window"
      style={{
        position: 'absolute',
        top: position.y,
        left: position.x,
        width: size.width,
        height: size.height,
        zIndex,
        display: isMinimized ? 'none' : 'flex',
        flexDirection: 'column',
        borderRadius: 8,
        overflow: 'hidden',
        boxShadow: '0 4px 25px rgba(0, 0, 0, 0.2)'
      }}
    >
      {/* Tab Bar */}
      <div 
        className="grouped-window-tabs flex items-center"
        style={{
          ...getTabBarStyle(),
          height: 32,
          padding: '0 4px',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)'
        }}
      >
        {/* Left scroll button */}
        {showLeftArrow && (
          <button 
            className="p-1 rounded-full hover:bg-black/10 flex items-center justify-center"
            onClick={scrollTabsLeft}
          >
            <ChevronLeft size={16} />
          </button>
        )}
        
        {/* Tabs */}
        <div className="flex-1 flex overflow-hidden">
          <AnimatePresence initial={false}>
            {windowIds.slice(startTabIndex).map((windowId, index) => {
              const window = windows[windowId];
              const isActive = windowId === activeWindowId;
              const agent = registry.find(a => a.id === windowId);
              
              if (!window || index >= Math.floor((size.width - 40) / tabWidth)) return null;
              
              return (
                <motion.div
                  key={windowId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.15 }}
                  className={`group tab-item flex items-center ${isActive ? 'bg-black/10' : 'hover:bg-black/5'}`}
                  style={{
                    width: tabWidth,
                    height: 28,
                    margin: '0 2px',
                    borderRadius: 4,
                    cursor: 'pointer',
                    transition: 'background-color 0.2s ease'
                  }}
                  onClick={() => setActiveGroupWindow(groupId, windowId)}
                >
                  {agent?.icon && (
                    <div className="flex-shrink-0 w-4 h-4 mx-2">
                      {agent.icon}
                    </div>
                  )}
                  <div className="flex-1 truncate text-xs font-medium px-1">
                    {window.title}
                  </div>
                  <button
                    className="w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-black/20 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCloseWindow(windowId);
                    }}
                  >
                    <X size={12} />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
        
        {/* Right scroll button */}
        {showRightArrow && (
          <button 
            className="p-1 rounded-full hover:bg-black/10 flex items-center justify-center"
            onClick={scrollTabsRight}
          >
            <ChevronRight size={16} />
          </button>
        )}
      </div>
      
      {/* Render the active window content */}
      <div className="flex-1 relative">
        {activeWindowId && (
          <Window
            id={activeWindowId}
            title={activeWindow.title}
            isActive={true}
            position={{x: 0, y: 0}} // Position is relative to the group container
            size={{width: size.width, height: size.height - 32}} // Adjust for tab bar height
            zIndex={1}
            onClose={() => closeWindowGroup(groupId)}
            onMinimize={() => minimizeWindowGroup(groupId)}
            onFocus={() => focusWindowGroup(groupId)}
            isMobile={isMobile}
          >
            {activeAgent && React.isValidElement(activeAgent.component) 
              ? activeAgent.component 
              : <div>No content available</div>}
          </Window>
        )}
      </div>
    </div>
  );
};

export default GroupedWindow;