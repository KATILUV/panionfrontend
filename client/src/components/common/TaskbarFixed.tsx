import React, { useState, useRef, useEffect } from 'react';
import { Settings, Moon, Sun, Search, Plus, Save, CheckCircle, Clock, Terminal, Layout, Pin, PinOff, AppWindow, Copy, X } from 'lucide-react';
import { useAgentStore } from '@/state/agentStore';
import { useTaskbarStore } from '@/state/taskbarStore';
import { useSystemLogStore } from '@/state/systemLogStore';
import { AgentId } from '@/state/agentStore';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useThemeStore } from '@/state/themeStore';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import '../ui/clara-themes.css';

// Taskbar button component for icons and buttons
interface TaskbarButtonProps {
  icon: React.ReactNode | string;
  label: string;
  isActive: boolean;
  onClick: () => void;
  className?: string;
  hasIndicator?: boolean;
}

const TaskbarButton: React.FC<TaskbarButtonProps> = ({ 
  icon, 
  label, 
  isActive, 
  onClick, 
  className = '', 
  hasIndicator = false 
}) => {
  const { showLabels } = useTaskbarStore(state => ({
    showLabels: state.showLabels,
  }));
  
  const { position } = useTaskbarStore(state => ({
    position: state.position,
  }));
  
  // Determine if we're in a vertical taskbar
  const isVertical = position.location === 'left' || position.location === 'right';
  
  return (
    <button
      onClick={onClick}
      className={`
        group flex ${isVertical ? 'flex-col items-center' : 'items-center'} 
        ${isVertical ? 'py-2 px-1' : 'py-1 px-2'} rounded-md
        ${isActive ? 'bg-primary/20 text-white' : 'text-white/80 hover:text-white hover:bg-white/10'} 
        transition-colors duration-200 relative
        ${className}
      `}
      title={label}
    >
      <span className={`text-xl ${showLabels && isVertical ? 'mb-1' : (showLabels && !isVertical ? 'mr-1.5' : '')}`}>{icon}</span>
      {showLabels && <span className="text-xs font-medium whitespace-nowrap">{label}</span>}
      
      {/* Active indicator */}
      {isActive && <div className="absolute -left-1 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full"></div>}
      
      {/* Running indicator dot */}
      {hasIndicator && !isActive && (
        <div className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 bg-primary rounded-full"></div>
      )}
    </button>
  );
};

// Agent icon button with additional features (pin, context menu, etc.)
interface AgentIconButtonProps {
  id: AgentId;
  icon: React.ReactNode;
  title: string;
  isActive: boolean;
  hasRunningIndicator?: boolean;
  isPinned: boolean;
  onClick: (id: AgentId) => void;
}

const AgentIconButton: React.FC<AgentIconButtonProps> = ({
  id,
  icon,
  title,
  isActive,
  hasRunningIndicator = false,
  isPinned,
  onClick
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const bounceClass = isHovered ? 'animate-bounce-subtle' : '';
  
  // Access functions from agent and taskbar stores
  const { minimizeAgent, closeAgent } = useAgentStore();
  const { unpinAgent, pinAgent } = useTaskbarStore();
  
  // Function to handle pin/unpin
  const handlePinUnpin = () => {
    if (isPinned) {
      unpinAgent(id);
    } else {
      pinAgent(id);
    }
  };

  // Function to directly unpin on click for the X button
  const handleDirectUnpin = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the button's onClick
    unpinAgent(id);
  };
  
  // Access taskbar settings
  const { position, showLabels } = useTaskbarStore(state => ({
    position: state.position,
    showLabels: state.showLabels
  }));
  
  // Determine if we're in a vertical taskbar
  const isVertical = position.location === 'left' || position.location === 'right';
  
  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div className="relative group">
          <button
            onClick={() => onClick(id)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`
              group flex ${isVertical ? 'flex-col items-center' : 'items-center'} 
              ${isVertical ? 'py-2 px-1' : 'py-1 px-2'} rounded-md
              ${isActive ? 'bg-primary/20 text-white' : 'text-white/80 hover:text-white hover:bg-white/10'} 
              transition-colors duration-200 relative ${bounceClass}
            `}
            title={title}
          >
            <span className={`text-xl ${showLabels && isVertical ? 'mb-1' : (showLabels && !isVertical ? 'mr-1.5' : '')}`}>{icon}</span>
            {showLabels && <span className="text-xs font-medium whitespace-nowrap">{title}</span>}
            
            {/* Active indicator */}
            {isActive && <div className="absolute -left-1 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full"></div>}
            
            {/* Running indicator dot */}
            {hasRunningIndicator && !isActive && (
              <div className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 bg-primary rounded-full"></div>
            )}
            
            {/* Pin indicator */}
            {isPinned && (
              <div className="absolute -top-1 -right-1 text-[8px] text-primary">
                <Pin size={8} className="text-primary/70" />
              </div>
            )}
          </button>
          
          {/* Added unpin button that appears on hover */}
          {isPinned && (
            <button 
              onClick={handleDirectUnpin}
              className="absolute -top-2 -right-2 bg-black/80 rounded-full p-0.5 text-white/70 hover:text-white hover:bg-red-900/80 opacity-0 group-hover:opacity-100 transition-opacity"
              title="Unpin from taskbar"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </ContextMenuTrigger>
      
      <ContextMenuContent className="min-w-[180px] bg-black/80 backdrop-blur-md border border-primary/20">
        <ContextMenuItem onClick={() => onClick(id)} className="flex items-center cursor-pointer">
          <AppWindow size={15} className="mr-2" />
          {isActive ? "Focus Window" : "Open Window"}
        </ContextMenuItem>
        
        {isActive && (
          <ContextMenuItem onClick={() => minimizeAgent(id)} className="flex items-center cursor-pointer">
            <span className="mr-2">🗕</span>
            Minimize
          </ContextMenuItem>
        )}
        
        {isActive && (
          <ContextMenuItem onClick={() => closeAgent(id)} className="flex items-center cursor-pointer">
            <X size={15} className="mr-2" />
            Close
          </ContextMenuItem>
        )}
        
        <ContextMenuSeparator />
        
        <ContextMenuItem onClick={handlePinUnpin} className="flex items-center cursor-pointer">
          {isPinned ? (
            <>
              <PinOff size={15} className="mr-2" />
              Unpin from Taskbar
            </>
          ) : (
            <>
              <Pin size={15} className="mr-2" />
              Pin to Taskbar
            </>
          )}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};

// Main Taskbar component
interface TaskbarProps {
  className?: string;
}

const Taskbar: React.FC<TaskbarProps> = ({ className = '' }) => {
  // State for custom layout name input
  const [customLayoutName, setCustomLayoutName] = useState('');
  const [isQuickSaveOpen, setIsQuickSaveOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const taskbarRef = useRef<HTMLDivElement>(null);
  
  // State for dynamic transparency
  const [transparency, setTransparency] = useState(0.2); // Initial transparency
  
  // Get current time for clock widget
  const [currentTime, setCurrentTime] = useState(new Date());
  const formattedTime = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  // Get theme values for better visual integration
  const accent = useThemeStore(state => state.accent);
  
  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);
  
  // Add scroll listener for dynamic transparency
  useEffect(() => {
    const handleScroll = () => {
      // Calculate transparency based on scroll position
      // More scroll = more opaque taskbar
      const scrollPosition = window.scrollY;
      const maxScroll = document.body.scrollHeight - window.innerHeight;
      const scrollPercentage = Math.min(scrollPosition / 300, 1); // Max effect at 300px scroll
      
      // Scale from 0.2 (transparent) to 0.85 (mostly opaque)
      const newTransparency = 0.2 + scrollPercentage * 0.65;
      setTransparency(newTransparency);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Hooks for accessing store states
  const { registry, windows, focusAgent, openAgent, restoreAgent } = useAgentStore();
  const { position, visibleWidgets, enableBlur, showLabels, autohide } = useTaskbarStore(state => ({
    position: state.position,
    visibleWidgets: state.visibleWidgets,
    enableBlur: state.enableBlur,
    showLabels: state.showLabels,
    autohide: state.autohide,
  }));
  
  // Get system log visibility state
  const isSystemLogVisible = useSystemLogStore(state => state.isVisible);
  const toggleSystemLog = useSystemLogStore(state => state.toggleVisibility);
  
  // Get layout manager state
  const activeLayoutId = useAgentStore(state => state.activeLayoutId);
  const saveLayout = useAgentStore(state => state.saveLayout);
  const getActiveLayoutName = () => {
    const layouts = useAgentStore.getState().layouts;
    const activeLayout = layouts.find(layout => layout.id === activeLayoutId);
    return activeLayout?.name || '';
  };
  const { toast } = useToast();
  
  // Handle agent icon clicks
  const handleIconClick = (id: AgentId) => {
    const agentWindow = windows[id];
    
    if (!agentWindow?.isOpen) {
      openAgent(id);
    } else if (agentWindow.isMinimized) {
      restoreAgent(id);
    } else {
      focusAgent(id);
    }
  };
  
  // Handle QuickSave popover open/close
  const handlePopoverOpenChange = (open: boolean) => {
    setIsQuickSaveOpen(open);
    if (open) {
      // Focus the input when popover opens
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setCustomLayoutName('');
    }
  };
  
  // Handle QuickSave button click
  const handleQuickSave = () => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    saveLayout(`Quick Save (${timestamp})`);
    setIsQuickSaveOpen(false);
    toast({
      title: "Layout Saved",
      description: `Layout saved as "Quick Save (${timestamp})"`,
    });
  };
  
  // Handle CustomSave button click
  const handleCustomSave = () => {
    if (customLayoutName.trim()) {
      saveLayout(customLayoutName);
      setIsQuickSaveOpen(false);
      toast({
        title: "Layout Saved",
        description: `Layout saved as "${customLayoutName}"`,
      });
      setCustomLayoutName('');
    }
  };
  
  // Determine if we're using a vertical layout
  const isVertical = position.location === 'left' || position.location === 'right';
  
  // Get the side for popovers based on taskbar position
  const getPopoverSide = () => {
    switch (position.location) {
      case 'top': return 'bottom';
      case 'bottom': return 'top';
      case 'left': return 'right';
      case 'right': return 'left';
      default: return 'top';
    }
  };
  
  // Create taskbar container styles based on position
  const getTaskbarStyles = (): React.CSSProperties => {
    // Calculate a dynamic blur amount based on transparency
    const blurAmount = enableBlur ? `blur(${4 + (transparency * 8)}px)` : 'none';
    
    // Create a gradient background based on theme accent and transparency
    let gradientBg;
    switch(accent) {
      case 'purple':
        gradientBg = `linear-gradient(to ${isVertical ? (position.location === 'left' ? 'right' : 'left') : 'bottom'}, 
                      rgba(43, 24, 103, ${transparency}), 
                      rgba(20, 12, 50, ${transparency * 0.9}))`;
        break;
      case 'blue':
        gradientBg = `linear-gradient(to ${isVertical ? (position.location === 'left' ? 'right' : 'left') : 'bottom'}, 
                      rgba(24, 43, 103, ${transparency}), 
                      rgba(12, 20, 50, ${transparency * 0.9}))`;
        break;
      default:
        gradientBg = `linear-gradient(to ${isVertical ? (position.location === 'left' ? 'right' : 'left') : 'bottom'}, 
                      rgba(0, 0, 0, ${transparency}), 
                      rgba(20, 20, 20, ${transparency * 0.9}))`;
    }
    
    const baseStyles: React.CSSProperties = {
      position: 'fixed',
      display: 'flex',
      backgroundColor: 'transparent',
      backgroundImage: gradientBg,
      backdropFilter: blurAmount,
      boxShadow: `0 0 20px rgba(0, 0, 0, ${transparency * 0.5})`,
      transition: 'background-color 0.3s ease, backdrop-filter 0.3s ease, box-shadow 0.3s ease',
      zIndex: 100,
    };
    
    if (isVertical) {
      // Vertical taskbar (left or right)
      return {
        ...baseStyles,
        top: 0,
        bottom: 0,
        [position.location]: 0, // 'left: 0' or 'right: 0'
        width: showLabels ? '5rem' : '3.5rem',
        maxWidth: '80px',
        height: '100vh',
        flexDirection: 'column',
        padding: '0.75rem 0.375rem',
        borderRight: position.location === 'left' ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
        borderLeft: position.location === 'right' ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
        alignItems: 'center',
        justifyContent: position.alignment === 'space-between' ? 'space-between' : 
                       position.alignment === 'center' ? 'center' : 
                       position.alignment === 'end' ? 'flex-end' : 'flex-start',
      };
    } else {
      // Horizontal taskbar (top or bottom)
      return {
        ...baseStyles,
        left: 0,
        right: 0,
        [position.location]: 0, // 'top: 0' or 'bottom: 0'
        height: '3.5rem',
        width: '100%',
        flexDirection: 'row',
        padding: '0.375rem 0.75rem',
        borderTop: position.location === 'bottom' ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
        borderBottom: position.location === 'top' ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
        alignItems: 'center',
        justifyContent: position.alignment === 'space-between' ? 'space-between' : 
                       position.alignment === 'center' ? 'center' : 
                       position.alignment === 'end' ? 'flex-end' : 'flex-start',
      };
    }
  };

  // Log position change for debugging
  React.useEffect(() => {
    console.log("Setting taskbar position to:", position.location);
  }, [position.location]);

  // Function to clear all pinned agents
  const handleClearAllPins = () => {
    const clearPinnedAgents = useTaskbarStore.getState().clearPinnedAgents;
    clearPinnedAgents();
    toast({
      title: "Taskbar Cleared",
      description: "All agents have been unpinned from the taskbar",
    });
  };

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger>
          <div 
            ref={taskbarRef}
            style={getTaskbarStyles()}
            className={`taskbar ${className} ${autohide ? 'opacity-30 hover:opacity-100 transition-opacity duration-300' : ''}`}
          >
            {/* Agent icons section - with customizable pinned agents (macOS dock style) */}
            <div className={`
              flex-1 ${isVertical ? 'flex flex-col space-y-1.5 py-2' : 'flex flex-row items-center space-x-1.5'}
            `}>
              {/* Get pinned agents from taskbar store */}
              {(() => {
                // Get pinned agents list
                const pinnedAgents = useTaskbarStore(state => state.pinnedAgents);
                
                // Create a map of all agents by ID for quicker access
                const agentsMap = registry.reduce((map, agent) => {
                  map[agent.id] = agent;
                  return map;
                }, {} as Record<AgentId, typeof registry[0]>);
                
                // Return pinned agents that exist in registry
                return pinnedAgents
                  .filter(id => agentsMap[id])
                  .map(id => {
                    const agent = agentsMap[id];
                    const isOpen = windows[id]?.isOpen;
                    const isMinimized = windows[id]?.isMinimized;
                    const isActive = isOpen && !isMinimized;
                    const isRunning = isOpen && !isActive; // Running but not focused
                    
                    return (
                      <AgentIconButton
                        key={id}
                        id={id}
                        icon={agent.icon}
                        title={agent.title}
                        isActive={isActive}
                        isPinned={true}
                        hasRunningIndicator={isRunning}
                        onClick={handleIconClick}
                      />
                    );
                  });
              })()}
              
              {/* Separator between pinned and running non-pinned agents */}
              {(() => {
                const pinnedAgents = useTaskbarStore(state => state.pinnedAgents);
                
                // Check if there are any running non-pinned agents
                const hasRunningNonPinned = registry.some(agent => {
                  const isOpen = windows[agent.id]?.isOpen;
                  const isPinned = pinnedAgents.includes(agent.id);
                  return isOpen && !isPinned;
                });
                
                if (hasRunningNonPinned && pinnedAgents.length > 0) {
                  return (
                    <div className={isVertical 
                      ? "w-6 h-px bg-white/20 my-1" 
                      : "h-6 w-px bg-white/20 mx-1"
                    }></div>
                  );
                }
                return null;
              })()}
              
              {/* Show running non-pinned agents */}
              {(() => {
                const pinnedAgents = useTaskbarStore(state => state.pinnedAgents);
                
                return registry
                  .filter(agent => {
                    const isOpen = windows[agent.id]?.isOpen;
                    const isPinned = pinnedAgents.includes(agent.id);
                    return isOpen && !isPinned;
                  })
                  .map(agent => {
                    const isMinimized = windows[agent.id]?.isMinimized;
                    const isActive = windows[agent.id]?.isOpen && !isMinimized;
                    
                    return (
                      <AgentIconButton
                        key={agent.id}
                        id={agent.id}
                        icon={agent.icon}
                        title={agent.title}
                        isActive={isActive}
                        isPinned={false}
                        hasRunningIndicator={!isActive}
                        onClick={handleIconClick}
                      />
                    );
                  });
              })()}
                
              {/* Clear button to remove all pinned agents */}
              <button
                onClick={handleClearAllPins}
                className={`
                  group flex ${isVertical ? 'flex-col items-center' : 'items-center'} 
                  ${isVertical ? 'py-2 px-1' : 'py-1 px-2'} rounded-md
                  text-red-500/80 hover:text-red-500 hover:bg-white/10 
                  transition-colors duration-200
                `}
                title="Clear Taskbar"
              >
                <X size={16} />
                {showLabels && <span className="text-xs font-medium whitespace-nowrap">Clear</span>}
              </button>
              
              {/* Plus button to add agents to taskbar */}
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className={`
                      group flex ${isVertical ? 'flex-col items-center' : 'items-center'} 
                      ${isVertical ? 'py-2 px-1' : 'py-1 px-2'} rounded-md
                      text-white/80 hover:text-white hover:bg-white/10 
                      transition-colors duration-200
                    `}
                    title="Add Agents"
                  >
                    <Plus size={16} />
                    {showLabels && <span className="text-xs font-medium whitespace-nowrap">Add Agents</span>}
                  </button>
                </PopoverTrigger>
                <PopoverContent 
                  className="w-56 p-0 bg-black/80 backdrop-blur-md border border-primary/20"
                  side={getPopoverSide()}
                >
                  <div className="py-2 px-1">
                    <div className="mb-2 px-2 text-xs font-semibold text-primary/80">ADD TO TASKBAR</div>
                    <div className="max-h-[calc(100vh-150px)] overflow-y-auto">
                      {(() => {
                        const pinnedAgents = useTaskbarStore(state => state.pinnedAgents);
                        const pinAgent = useTaskbarStore(state => state.pinAgent);
                        
                        // Show agents that aren't pinned yet
                        return registry
                          .filter(agent => !pinnedAgents.includes(agent.id))
                          .map(agent => (
                            <button
                              key={agent.id}
                              onClick={() => {
                                pinAgent(agent.id);
                                toast({
                                  title: "Agent Pinned",
                                  description: `Added ${agent.title} to taskbar`,
                                  variant: "default",
                                });
                              }}
                              className="w-full text-left px-2 py-1.5 rounded hover:bg-primary/20 transition-colors flex items-center"
                            >
                              <span className="text-xl mr-2">{agent.icon}</span>
                              <span>{agent.title}</span>
                            </button>
                          ));
                      })()}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            
            {/* Widgets section */}
            <div className={`
              ${isVertical ? 'flex flex-col space-y-2 items-center' : 'flex flex-row items-center space-x-2'}
            `}>
              {/* Search Bar Widget - horizontal version */}
              {visibleWidgets.includes('searchBar') && !isVertical && (
                <div className="relative w-40 lg:w-48">
                  <Input
                    className="h-8 bg-black/40 border-primary/20 text-white placeholder:text-white/50 pr-8"
                    placeholder="Search..."
                    onClick={() => toast({
                      title: "Search Feature",
                      description: "Global search will be implemented in a future update",
                      variant: "default",
                    })}
                  />
                  <div className="absolute right-2 top-2">
                    <Search className="w-4 h-4 text-white/50" />
                  </div>
                </div>
              )}
              
              {/* Simplified Search Button for vertical taskbars */}
              {visibleWidgets.includes('searchBar') && isVertical && (
                <TaskbarButton
                  icon={<Search size={16} />}
                  label="Search"
                  isActive={false}
                  onClick={() => toast({
                    title: "Search Feature",
                    description: "Global search will be implemented in a future update",
                    variant: "default",
                  })}
                />
              )}

              {/* Notifications Widget */}
              {visibleWidgets.includes('notifications') && (
                <Popover>
                  <PopoverTrigger asChild>
                    <TaskbarButton
                      icon={<div className="relative">
                        <span className="absolute -top-1 -right-1 bg-primary text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                          3
                        </span>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                      </div>}
                      label="Notifications"
                      isActive={false}
                      onClick={() => {}}
                    />
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0" side={getPopoverSide()}>
                    <div className="bg-black/60 backdrop-blur-md rounded-md overflow-hidden border border-primary/20">
                      <div className="p-3 border-b border-primary/10 flex items-center justify-between">
                        <h3 className="text-sm font-medium text-white">Notifications</h3>
                        <button className="text-xs text-primary hover:text-primary/80 transition-colors">Mark all as read</button>
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="p-3 border-b border-primary/10 hover:bg-primary/10 transition-colors">
                            <div className="flex items-start gap-3">
                              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                                {i === 1 ? (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                  </svg>
                                ) : i === 2 ? (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                ) : (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                              <div className="flex-1">
                                <p className="text-sm text-white">
                                  {i === 1 ? "New agent available in Marketplace" : 
                                   i === 2 ? "System update available" : 
                                   "Layout 'Productivity Setup' created"}
                                </p>
                                <p className="text-xs text-white/60 mt-1">
                                  {i === 1 ? "2 minutes ago" : 
                                   i === 2 ? "10 minutes ago" : 
                                   "15 minutes ago"}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="p-2 border-t border-primary/10 flex justify-center">
                        <button className="text-xs text-primary hover:text-primary/80 transition-colors">
                          View all notifications
                        </button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
              
              {/* AI Status Widget */}
              {visibleWidgets.includes('aiStatus') && (
                <div className="flex items-center space-x-1 bg-primary/10 px-2 py-1 rounded-full">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  {showLabels && <span className="text-xs text-white/80">AI Active</span>}
                </div>
              )}
              
              {/* System Console Widget */}
              {visibleWidgets.includes('systemConsole') && (
                <TaskbarButton
                  icon={<Terminal size={16} />}
                  label="System Console"
                  isActive={isSystemLogVisible}
                  onClick={toggleSystemLog}
                />
              )}
              
              {/* Layout Manager Widget */}
              {visibleWidgets.includes('layoutManager') && (
                <Popover>
                  <PopoverTrigger asChild>
                    <TaskbarButton
                      icon={<Layout size={16} />}
                      label="Layouts"
                      isActive={false}
                      onClick={() => {}}
                    />
                  </PopoverTrigger>
                  <PopoverContent 
                    className="w-64 p-0 bg-black/80 backdrop-blur-md border border-primary/20 shadow-lg"
                    side={getPopoverSide()}
                  >
                    <div className="p-3 border-b border-primary/10 flex flex-col">
                      <div className="text-xs uppercase tracking-wide text-primary/60 mb-1">Active Layout</div>
                      <div className="text-sm font-medium text-white">{getActiveLayoutName() || "Default Layout"}</div>
                    </div>
                    
                    <div className="p-2 max-h-[300px] overflow-y-auto thin-scrollbar">
                      <div className="text-xs text-white/70 mb-2 px-1">Quick Save</div>
                      <div className="flex space-x-2 mb-3">
                        <button 
                          onClick={handleQuickSave}
                          className="flex-1 flex items-center justify-center space-x-1 bg-primary/20 hover:bg-primary/30 transition-colors py-1.5 px-2 rounded-md text-white text-xs font-medium"
                        >
                          <Save size={12} />
                          <span>Quick Save</span>
                        </button>
                        
                        <Popover open={isQuickSaveOpen} onOpenChange={handlePopoverOpenChange}>
                          <PopoverTrigger asChild>
                            <button 
                              className="flex items-center justify-center space-x-1 bg-gray-700/50 hover:bg-gray-700/70 transition-colors py-1.5 px-2 rounded-md text-white text-xs font-medium"
                            >
                              <span>Custom</span>
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-60 p-3" side="top">
                            <Label htmlFor="customName" className="text-xs text-white/80 mb-2 block">
                              Name your layout
                            </Label>
                            <div className="flex space-x-2">
                              <Input
                                id="customName"
                                ref={inputRef}
                                value={customLayoutName}
                                onChange={(e) => setCustomLayoutName(e.target.value)}
                                placeholder="e.g., Productivity Setup"
                                className="flex-1 h-8 text-sm bg-black/20"
                              />
                              <button
                                onClick={handleCustomSave}
                                disabled={!customLayoutName.trim()}
                                className="bg-primary/70 hover:bg-primary transition-colors text-white rounded-md px-2 py-1 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Save
                              </button>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                      
                      <div className="text-xs text-white/70 my-2 px-1">Saved Layouts</div>
                      {(() => {
                        const layouts = useAgentStore.getState().layouts;
                        if (layouts.length === 0) {
                          return (
                            <div className="py-2 px-1 text-xs text-white/50 italic">
                              No saved layouts yet
                            </div>
                          );
                        }
                        
                        return layouts.map(layout => (
                          <button
                            key={layout.id}
                            onClick={() => {
                              useAgentStore.getState().loadLayout(layout.id);
                              toast({
                                title: "Layout Loaded",
                                description: `Loaded "${layout.name}" layout`,
                              });
                            }}
                            className={`
                              w-full text-left px-2 py-1.5 rounded mb-1
                              ${layout.id === activeLayoutId ? 'bg-primary/30 text-white' : 'hover:bg-primary/10 text-white/80'} 
                              transition-colors flex items-center justify-between group
                            `}
                          >
                            <span className="flex items-center">
                              {layout.id === activeLayoutId && <CheckCircle size={12} className="text-primary mr-1.5" />}
                              <span className="text-sm">{layout.name}</span>
                            </span>
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                              <Copy size={12} className="text-white/60 hover:text-white cursor-pointer" onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(JSON.stringify(layout));
                                toast({
                                  title: "Layout Copied",
                                  description: `Layout data copied to clipboard`,
                                  variant: "default",
                                });
                              }} />
                              <X size={12} className="text-white/60 hover:text-white cursor-pointer" onClick={(e) => {
                                e.stopPropagation();
                                useAgentStore.getState().deleteLayout(layout.id);
                                toast({
                                  title: "Layout Deleted",
                                  description: `"${layout.name}" layout deleted`,
                                  variant: "destructive",
                                });
                              }} />
                            </span>
                          </button>
                        ));
                      })()}
                    </div>
                  </PopoverContent>
                </Popover>
              )}
                            
              {/* Quick Save Widget */}
              {visibleWidgets.includes('quickSave') && (
                <Popover>
                  <PopoverTrigger asChild>
                    <TaskbarButton
                      icon={<Save size={16} />}
                      label="Save Layout"
                      isActive={false}
                      onClick={() => {}}
                    />
                  </PopoverTrigger>
                  <PopoverContent 
                    className="w-64 p-4 bg-black/80 backdrop-blur-md border border-primary/20"
                    side={getPopoverSide()}
                  >
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="quickSaveName" className="text-sm text-white/90 block mb-1">
                          Save current layout
                        </Label>
                        <div className="text-xs text-white/60 mb-2">
                          Save the current window arrangement
                        </div>
                        <div className="flex space-x-2">
                          <Input
                            id="quickSaveName"
                            placeholder="Layout name"
                            value={customLayoutName}
                            onChange={(e) => setCustomLayoutName(e.target.value)}
                            className="flex-1 bg-black/40 border-primary/20"
                          />
                          <button
                            onClick={handleCustomSave}
                            disabled={!customLayoutName.trim()}
                            className="bg-primary hover:bg-primary/80 transition-colors text-white px-3 py-1 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                      
                      <div>
                        <button
                          onClick={handleQuickSave}
                          className="w-full bg-primary/20 hover:bg-primary/30 transition-colors text-white py-2 px-3 rounded text-sm flex items-center justify-center space-x-2"
                        >
                          <Save size={14} />
                          <span>Quick Save (Auto-named)</span>
                        </button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
              
              {/* Clock Widget */}
              {visibleWidgets.includes('clock') && (
                <div className="text-white/80">
                  <div className="flex items-center space-x-1">
                    <Clock size={14} />
                    {showLabels && <span className="text-xs font-medium">{formattedTime}</span>}
                  </div>
                </div>
              )}
              
              {/* Version number - horizontal */}
              {visibleWidgets.includes('versionNumber') && !isVertical && (
                <div className="text-xs px-2.5 py-1 rounded-full text-primary-foreground/70 bg-primary/10 transition-colors duration-200 border border-primary/20">
                  v1.0
                </div>
              )}
              
              {/* Version number - vertical */}
              {visibleWidgets.includes('versionNumber') && isVertical && (
                <div className="text-xs p-1.5 rounded-full text-primary-foreground/70 bg-primary/10 transition-colors duration-200 border border-primary/20">
                  v1.0
                </div>
              )}
            </div>
          </div>
        </ContextMenuTrigger>
        
        {/* Taskbar context menu */}
        <ContextMenuContent className="min-w-[180px] bg-black/80 backdrop-blur-md border border-primary/20">
          <ContextMenuItem onClick={handleClearAllPins} className="flex items-center cursor-pointer text-destructive hover:text-destructive">
            <X size={15} className="mr-2" />
            Clear All Pinned Agents
          </ContextMenuItem>
          
          <ContextMenuSeparator />
          
          <ContextMenuItem onClick={() => {
            const { applyMinimalPreset } = useTaskbarStore.getState();
            applyMinimalPreset();
            toast({
              title: "Minimal Preset Applied",
              description: "Taskbar set to minimal configuration",
            });
          }} className="flex items-center cursor-pointer">
            <span className="mr-2">🔍</span>
            Minimal Preset
          </ContextMenuItem>
          
          <ContextMenuItem onClick={() => {
            const { applyFullPreset } = useTaskbarStore.getState();
            applyFullPreset();
            toast({
              title: "Full Preset Applied",
              description: "Taskbar set to full configuration",
            });
          }} className="flex items-center cursor-pointer">
            <span className="mr-2">🎛️</span>
            Full Preset
          </ContextMenuItem>
          
          <ContextMenuItem onClick={() => {
            const { applyDockPreset } = useTaskbarStore.getState();
            applyDockPreset();
            toast({
              title: "macOS Dock Preset Applied",
              description: "Taskbar set to macOS dock style",
            });
          }} className="flex items-center cursor-pointer">
            <span className="mr-2">💻</span>
            macOS Dock Style
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      
      {/* System Log Component */}
      {isSystemLogVisible && (
        <div className="fixed right-4 bottom-16 w-96 h-80 bg-black/80 backdrop-blur-md border border-primary/20 rounded-md overflow-hidden shadow-xl z-50">
          <div className="p-3 border-b border-primary/20 flex justify-between items-center">
            <h3 className="text-sm font-medium text-white flex items-center">
              <Terminal size={14} className="mr-2 text-primary" />
              System Console
            </h3>
            <button 
              onClick={toggleSystemLog}
              className="text-white/60 hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          </div>
          <div className="p-2 h-[calc(100%-44px)] overflow-y-auto font-mono text-xs">
            {useSystemLogStore.getState().logs.map((log) => (
              <div 
                key={log.id} 
                className={`mb-1 p-1 rounded ${
                  log.type === 'error' ? 'bg-red-900/20 text-red-300' :
                  log.type === 'warn' ? 'bg-yellow-900/20 text-yellow-300' :
                  log.type === 'thinking' ? 'bg-blue-900/20 text-blue-300' :
                  log.type === 'action' ? 'bg-purple-900/20 text-primary' :
                  log.type === 'memory' ? 'bg-green-900/20 text-green-300' :
                  'bg-gray-900/20 text-gray-300'
                }`}
              >
                <span className="opacity-60">[{log.timestamp.toLocaleTimeString()}]</span>{' '}
                <span className="font-semibold">{log.type.toUpperCase()}:</span>{' '}
                {log.message}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default Taskbar;