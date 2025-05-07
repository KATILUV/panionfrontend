import React, { useState, useRef, useEffect } from 'react';
import { Settings, Moon, Sun, Search, Plus, Save, CheckCircle, Clock, Terminal, Layout } from 'lucide-react';
import { useAgentStore } from '@/state/agentStore';
import { useTaskbarStore } from '@/state/taskbarStore';
import { useSystemLogStore } from '@/state/systemLogStore';
import { AgentId } from '@/state/agentStore';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import useLayoutManager from '@/hooks/use-layout-manager';
import { useThemeStore } from '@/state/themeStore';
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
        relative group flex ${isVertical ? 'flex-col' : 'items-center'} 
        ${isVertical ? 'py-2 px-1' : 'py-1 px-2'} rounded-md 
        ${isActive ? 'bg-primary/20 text-white' : 'text-white/80 hover:text-white hover:bg-white/10'} 
        transition-colors duration-200 ${className}
      `}
      title={label}
    >
      {typeof icon === 'string' ? (
        <span className="text-xl">{icon}</span>
      ) : (
        <span className={`${isVertical ? 'mb-1' : 'mr-1.5'}`}>{icon}</span>
      )}
      
      {showLabels && <span className="text-xs font-medium whitespace-nowrap">{label}</span>}
      
      {hasIndicator && (
        <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full"></div>
      )}
    </button>
  );
};

// Agent icon component for taskbar
interface AgentIconButtonProps {
  id: AgentId;
  icon: string;
  title: string;
  isActive: boolean;
  onClick: (id: AgentId) => void;
}

const AgentIconButton: React.FC<AgentIconButtonProps> = ({ id, icon, title, isActive, onClick }) => {
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
      onClick={() => onClick(id)}
      className={`
        group flex ${isVertical ? 'flex-col items-center' : 'items-center'} 
        ${isVertical ? 'py-2 px-1' : 'py-1 px-2'} rounded-md
        ${isActive ? 'bg-primary/20 text-white' : 'text-white/80 hover:text-white hover:bg-white/10'} 
        transition-colors duration-200
      `}
      title={title}
    >
      <span className={`text-xl ${showLabels && isVertical ? 'mb-1' : (showLabels && !isVertical ? 'mr-1.5' : '')}`}>{icon}</span>
      {showLabels && <span className="text-xs font-medium whitespace-nowrap">{title}</span>}
      {isActive && <div className="absolute -left-1 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full"></div>}
    </button>
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
  const isSystemLogVisible = useSystemLogStore(state => state.visibility);
  const toggleSystemLog = () => useSystemLogStore.setState(state => ({ visibility: !state.visibility }));
  
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

  return (
    <>
      <div 
        ref={taskbarRef}
        style={getTaskbarStyles()}
        className={`taskbar ${className} ${autohide ? 'opacity-30 hover:opacity-100 transition-opacity duration-300' : ''}`}
      >
        {/* Agent icons section */}
        <div className={`
          flex-1 ${isVertical ? 'flex flex-col space-y-1 py-2' : 'flex flex-row items-center space-x-1'}
        `}>
          {registry.map(agent => {
            const isOpen = windows[agent.id]?.isOpen;
            const isMinimized = windows[agent.id]?.isMinimized;
            const isActive = isOpen && !isMinimized;
            
            return (
              <AgentIconButton
                key={agent.id}
                id={agent.id}
                icon={agent.icon}
                title={agent.title}
                isActive={isActive}
                onClick={handleIconClick}
              />
            );
          })}
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
          
          {/* AI Status Widget - horizontal version */}
          {visibleWidgets.includes('aiStatus') && !isVertical && (
            <div className="px-2.5 py-1 rounded-lg bg-black/20 text-white/80 flex items-center space-x-2">
              <div className="relative">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div className="w-2 h-2 bg-green-500 rounded-full absolute inset-0 animate-ping opacity-75"></div>
              </div>
              <span className="text-xs font-medium">AI Active</span>
            </div>
          )}
          
          {/* AI Status Widget - vertical version */}
          {visibleWidgets.includes('aiStatus') && isVertical && (
            <div className="p-2 rounded-lg bg-black/20 text-white/80">
              <div className="flex flex-col items-center space-y-1">
                <div className="relative">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div className="w-2 h-2 bg-green-500 rounded-full absolute inset-0 animate-ping opacity-75"></div>
                </div>
                {showLabels && <span className="text-xs font-medium">AI</span>}
              </div>
            </div>
          )}

          {/* Quick Save Button */}
          {visibleWidgets.includes('quickSave') && (
            <div className="relative">
              <Popover open={isQuickSaveOpen} onOpenChange={handlePopoverOpenChange}>
                <PopoverTrigger asChild>
                  <TaskbarButton
                    icon={<Plus size={16} />}
                    label="Save Layout"
                    isActive={false}
                    onClick={() => {}}
                    className="bg-gradient-to-r from-primary/20 to-primary/10 hover:from-primary/30 hover:to-primary/20"
                  />
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4 bg-black/60 backdrop-blur-md border border-primary/20 rounded-md" side={getPopoverSide()}>
                  <div className="space-y-4">
                    <h3 className="text-base font-medium text-white">Save Current Layout</h3>
                    
                    <div className="space-y-2">
                      <Label htmlFor="layout-name" className="text-white">Layout Name</Label>
                      <Input 
                        id="layout-name"
                        ref={inputRef}
                        placeholder="e.g., My Workspace Layout"
                        value={customLayoutName}
                        onChange={(e) => setCustomLayoutName(e.target.value)}
                        className="w-full bg-black/40 border-primary/20 text-white"
                        onKeyDown={(e) => e.key === 'Enter' && handleCustomSave()}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between gap-2">
                      <button
                        className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded bg-primary/10
                                  hover:bg-primary/20 text-sm text-white transition-colors"
                        onClick={handleQuickSave}
                      >
                        <Save size={14} /> Quick Save
                      </button>
                      
                      <button
                        className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded bg-primary/80
                                  hover:bg-primary text-sm text-white transition-colors disabled:opacity-50 
                                  disabled:pointer-events-none"
                        onClick={handleCustomSave}
                        disabled={!customLayoutName.trim()}
                      >
                        <CheckCircle size={14} /> Save with Name
                      </button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          )}
          
          {/* System Console Button */}
          {visibleWidgets.includes('systemConsole') && (
            <TaskbarButton
              icon={<Terminal size={16} />}
              label="System Console"
              isActive={isSystemLogVisible}
              onClick={toggleSystemLog}
            />
          )}
          
          {/* Layout Manager Button */}
          {visibleWidgets.includes('layoutManager') && (
            <useLayoutManager.LayoutManager>
              <TaskbarButton
                icon={<Layout size={16} />}
                label={getActiveLayoutName() ? `Layout: ${getActiveLayoutName()}` : 'Layouts'}
                isActive={!!activeLayoutId}
                onClick={() => {}}
              />
            </useLayoutManager.LayoutManager>
          )}
          
          {/* Clock Widget - horizontal version */}
          {visibleWidgets.includes('clock') && !isVertical && (
            <div className="px-2.5 py-1 rounded-lg bg-black/20 text-white/80">
              <div className="flex items-center space-x-1">
                <Clock size={14} />
                <span className="text-xs font-medium">{formattedTime}</span>
              </div>
            </div>
          )}
          
          {/* Clock Widget - vertical version */}
          {visibleWidgets.includes('clock') && isVertical && (
            <div className="p-2 rounded-lg bg-black/20 text-white/80">
              <div className="flex flex-col items-center space-y-1">
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
      
      {/* System Log Component */}
      <ClaraSystemLog />
    </>
  );
};

export default Taskbar;