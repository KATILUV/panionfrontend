import React, { useState, useRef } from 'react';
import { useAgentStore, AgentId, WindowGroupId } from '../../state/agentStore';
import { useThemeStore } from '../../state/themeStore';
import { useSystemLogStore } from '../../state/systemLogStore';
import { useTaskbarStore } from '../../state/taskbarStore';
import { useSettingsTabStore } from '../../state/settingsTabStore';
//No longer using LayoutManager component
import ClaraSystemLog from '../system/ClaraSystemLog';
import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icon, IconButton } from '@/components/ui/icon-provider';
import { ICONS } from '@/lib/icon-map';
import { playOpenSound, playCloseSound } from '@/lib/audioEffects';
import { useScreenSize } from '@/hooks/use-mobile';

// Reusable TaskbarButton component to reduce repetition
interface TaskbarButtonProps {
  icon: React.ReactNode | string;
  label: string;
  isActive: boolean;
  onClick: () => void;
  className?: string;
  hasIndicator?: boolean;
}

const TaskbarButton = React.forwardRef<
  HTMLButtonElement,
  TaskbarButtonProps
>(({
  icon,
  label,
  isActive,
  onClick,
  className = '',
  hasIndicator = true
}, ref) => {
  const isHtmlIcon = typeof icon === 'string';
  const showLabels = useTaskbarStore(state => state.showLabels);
  const { position } = useTaskbarStore();
  const isVertical = position.location === 'left' || position.location === 'right';
  
  // Get screen size for responsive styling
  const { size: btnScreenSize } = useScreenSize();
  const isExtraSmall = btnScreenSize === 'xs';
  const isSmall = btnScreenSize === 'sm';
  
  return (
    <button
      ref={ref}
      onClick={onClick}
      className={`
        ${isVertical 
          ? 'w-auto px-2 py-1.5' 
          : isExtraSmall 
            ? 'h-7 px-2' 
            : isSmall 
              ? 'h-7 px-2.5' 
              : 'h-8 px-2.5'
        } 
        ${isVertical 
          ? 'flex flex-col items-center gap-1' 
          : isExtraSmall 
            ? 'flex items-center space-x-1.5' 
            : 'flex items-center space-x-2'
        }
        rounded-lg transition-all duration-200 overflow-hidden relative
        group touch-manipulation
        ${isActive 
          ? 'bg-primary/20 text-primary shadow-[0_0_10px_rgba(0,0,0,0.1)]' 
          : 'text-white/70 hover:text-white hover:bg-white/10 hover:shadow-[0_0_10px_rgba(0,0,0,0.1)]'
        }
        ${hasIndicator && isActive && !isVertical
          ? 'after:absolute after:bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:h-0.5 after:bg-primary after:opacity-90 after:rounded-full after:w-5 after:transition-all' 
          : ''
        }
        ${hasIndicator && isActive && isVertical && position.location === 'left'
          ? 'after:absolute after:left-0.5 after:top-1/2 after:-translate-y-1/2 after:w-0.5 after:h-5 after:bg-primary after:opacity-90 after:rounded-full after:transition-all' 
          : ''
        }
        ${hasIndicator && isActive && isVertical && position.location === 'right'
          ? 'after:absolute after:right-0.5 after:top-1/2 after:-translate-y-1/2 after:w-0.5 after:h-5 after:bg-primary after:opacity-90 after:rounded-full after:transition-all' 
          : ''
        }
        before:absolute before:inset-0 before:opacity-0 before:bg-primary/10 before:transition-opacity before:duration-300 
        hover:before:opacity-100 hover:scale-105
        active:scale-95 active:bg-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/30
        ${className}
      `}
      title={label}
    >
      {isHtmlIcon ? (
        <div 
          dangerouslySetInnerHTML={{ __html: icon as string }} 
          className={`transition-all duration-200 ${isExtraSmall ? 'scale-90' : ''} ${isActive ? 'text-primary' : 'group-hover:text-white'}`} 
        />
      ) : (
        <span className={`transition-all duration-200 ${isExtraSmall ? 'scale-90' : ''} ${isActive ? 'text-primary' : 'group-hover:text-white'}`}>
          {icon}
        </span>
      )}
      {showLabels ? (
        <span className={`${isVertical ? 'text-xs' : isExtraSmall ? 'text-xs' : 'text-sm'}`}>{label}</span>
      ) : (
        <span className="hidden sm:inline text-sm">{label}</span>
      )}
    </button>
  );
});
TaskbarButton.displayName = "TaskbarButton";

// Agent icon button with slightly different styling
interface AgentIconButtonProps {
  id: AgentId;
  icon: string;
  title: string;
  isActive: boolean;
  onClick: (id: AgentId) => void;
}

// Window group button for taskbar
interface GroupIconButtonProps {
  groupId: string;
  group: {
    id: string;
    title: string;
    windows: AgentId[];
    isMinimized: boolean;
  };
  onClick: (groupId: string) => void;
}

const AgentIconButton = React.forwardRef<
  HTMLButtonElement,
  AgentIconButtonProps
>(({
  id,
  icon,
  title,
  isActive,
  onClick
}, ref) => {
  const showLabels = useTaskbarStore(state => state.showLabels);
  const { position } = useTaskbarStore();
  const isVertical = position.location === 'left' || position.location === 'right';
  
  // Get screen size for responsive styling
  const { size: btnScreenSize } = useScreenSize();
  const isExtraSmall = btnScreenSize === 'xs';
  
  return (
    <button
      ref={ref}
      onClick={() => onClick(id)}
      className={`
        ${isExtraSmall ? 'p-1.5' : 'p-2'} 
        rounded-lg transition-all duration-200 relative overflow-hidden
        ${isActive 
          ? 'bg-primary/20 text-primary-foreground shadow-[0_0_10px_rgba(0,0,0,0.1)]' 
          : 'bg-transparent hover:bg-white/10 text-white/70 hover:text-white hover:shadow-[0_0_10px_rgba(0,0,0,0.1)]'
        }
        group
        ${isActive && !isVertical
          ? 'after:absolute after:bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:h-0.5 after:w-5 after:bg-primary after:opacity-90 after:rounded-full after:transition-all' 
          : ''
        }
        ${isActive && isVertical && position.location === 'left'
          ? 'after:absolute after:left-0.5 after:top-1/2 after:-translate-y-1/2 after:w-0.5 after:h-5 after:bg-primary after:opacity-90 after:rounded-full after:transition-all' 
          : ''
        }
        ${isActive && isVertical && position.location === 'right'
          ? 'after:absolute after:right-0.5 after:top-1/2 after:-translate-y-1/2 after:w-0.5 after:h-5 after:bg-primary after:opacity-90 after:rounded-full after:transition-all' 
          : ''
        }
        before:absolute before:inset-0 before:opacity-0 before:bg-primary/10 before:transition-opacity before:duration-300 
        hover:before:opacity-100 hover:scale-105
        active:scale-95 active:bg-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/30
      `}
      title={title}
    >
      <div className={`
        ${isVertical && showLabels ? 'flex flex-col items-center gap-1' : 'flex items-center space-x-2'}
      `}>
        <div className={`flex items-center justify-center ${isExtraSmall ? 'w-6 h-6' : 'w-7 h-7'} transform transition-transform duration-200
          ${isActive ? 'scale-110' : 'group-hover:scale-110'}
        `}>
          <div dangerouslySetInnerHTML={{ __html: icon }} 
            className={`transition-all duration-200 ${isExtraSmall ? 'scale-90' : ''} ${isActive ? 'text-primary' : 'group-hover:text-white'}`} />
        </div>
        
        {showLabels && (
          <span className={`${isVertical ? 'text-xs' : isExtraSmall ? 'text-xs' : 'text-sm'}`}>{title}</span>
        )}
      </div>
    </button>
  );
});
AgentIconButton.displayName = "AgentIconButton";

const GroupIconButton = React.forwardRef<
  HTMLButtonElement,
  GroupIconButtonProps
>(({
  groupId,
  group,
  onClick
}, ref) => {
  const showLabels = useTaskbarStore(state => state.showLabels);
  const { position } = useTaskbarStore();
  const isVertical = position.location === 'left' || position.location === 'right';
  const isActive = !group.isMinimized;
  
  // Get screen size for responsive styling
  const { size: btnScreenSize } = useScreenSize();
  const isExtraSmall = btnScreenSize === 'xs';
  
  return (
    <button
      ref={ref}
      onClick={() => onClick(groupId)}
      className={`
        ${isExtraSmall ? 'p-1.5' : 'p-2'} 
        rounded-lg transition-all duration-200 relative overflow-hidden
        ${isActive 
          ? 'bg-primary/20 text-primary-foreground shadow-[0_0_10px_rgba(0,0,0,0.1)]' 
          : 'bg-transparent hover:bg-white/10 text-white/70 hover:text-white hover:shadow-[0_0_10px_rgba(0,0,0,0.1)]'
        }
        group
        ${isActive && !isVertical
          ? 'after:absolute after:bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:h-0.5 after:w-5 after:bg-primary after:opacity-90 after:rounded-full after:transition-all' 
          : ''
        }
        ${isActive && isVertical && position.location === 'left'
          ? 'after:absolute after:left-0.5 after:top-1/2 after:-translate-y-1/2 after:w-0.5 after:h-5 after:bg-primary after:opacity-90 after:rounded-full after:transition-all' 
          : ''
        }
        ${isActive && isVertical && position.location === 'right'
          ? 'after:absolute after:right-0.5 after:top-1/2 after:-translate-y-1/2 after:w-0.5 after:h-5 after:bg-primary after:opacity-90 after:rounded-full after:transition-all' 
          : ''
        }
        before:absolute before:inset-0 before:opacity-0 before:bg-primary/10 before:transition-opacity before:duration-300 
        hover:before:opacity-100 hover:scale-105
        active:scale-95 active:bg-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/30
      `}
      title={group.title}
    >
      <div className={`
        ${isVertical && showLabels ? 'flex flex-col items-center gap-1' : 'flex items-center space-x-2'}
      `}>
        <div className={`flex items-center justify-center ${isExtraSmall ? 'w-6 h-6' : 'w-7 h-7'} transform transition-transform duration-200
          ${isActive ? 'scale-110' : 'group-hover:scale-110'}
        `}>
          <div className={`relative transition-all duration-200 ${isActive ? 'text-primary' : 'group-hover:text-white'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className={`${isExtraSmall ? 'h-5 w-5' : 'h-6 w-6'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8a1 1 0 011-1h8a1 1 0 011 1v8a1 1 0 01-1 1H8a1 1 0 01-1-1V8z" />
            </svg>
            <span className={`absolute ${isExtraSmall ? '-top-1 -right-1.5' : '-top-1 -right-2'} bg-primary text-white text-xs rounded-full ${isExtraSmall ? 'h-3.5 w-3.5 text-[10px]' : 'h-4 w-4'} flex items-center justify-center`}>
              {group.windows.length}
            </span>
          </div>
        </div>
        
        {showLabels && (
          <span className={`${isVertical ? 'text-xs' : isExtraSmall ? 'text-xs' : 'text-sm'}`}>{group.title}</span>
        )}
      </div>
    </button>
  );
});
GroupIconButton.displayName = "GroupIconButton";

interface TaskbarProps {
  className?: string;
  isMobile?: boolean;
}

const Taskbar: React.FC<TaskbarProps> = ({ className = '', isMobile = false }) => {
  const { toast } = useToast();
  const [isQuickSaveOpen, setIsQuickSaveOpen] = useState(false);
  const [customLayoutName, setCustomLayoutName] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const inputRef = useRef<HTMLInputElement>(null);
  
  const registry = useAgentStore(state => state.registry);
  const windows = useAgentStore(state => state.windows);
  const windowGroups = useAgentStore(state => state.windowGroups);
  const openAgent = useAgentStore(state => state.openAgent);
  const focusAgent = useAgentStore(state => state.focusAgent);
  const restoreAgent = useAgentStore(state => state.restoreAgent);
  const minimizeAgent = useAgentStore(state => state.minimizeAgent);
  const focusWindowGroup = useAgentStore(state => state.focusWindowGroup);
  const restoreWindowGroup = useAgentStore(state => state.restoreWindowGroup);
  const minimizeWindowGroup = useAgentStore(state => state.minimizeWindowGroup);
  const activeLayoutId = useAgentStore(state => state.activeLayoutId);
  const layouts = useAgentStore(state => state.layouts);
  const saveLayout = useAgentStore(state => state.saveLayout);
  
  // Taskbar settings store
  const { 
    visibleWidgets, 
    position, 
    enableBlur, 
    showLabels,
    autohide
  } = useTaskbarStore();
  
  const handleIconClick = (id: AgentId) => {
    const window = windows[id];
    
    // Special handling for Settings agent
    if (id === 'settings') {
      // Set the active tab to taskbar when the settings agent is clicked
      const setActiveTab = useSettingsTabStore.getState().setActiveTab;
      setActiveTab('taskbar');
    }
    
    // If window doesn't exist or isn't open, open it
    if (!window || !window.isOpen) {
      openAgent(id);
      playOpenSound();
    } 
    // If window is minimized, restore it
    else if (window.isMinimized) {
      restoreAgent(id);
      playOpenSound();
    } 
    // If already open and focused, minimize it
    else if (window.zIndex === useAgentStore.getState().highestZIndex) {
      minimizeAgent(id);
      playCloseSound();
    }
    // Otherwise, just focus it
    else {
      focusAgent(id);
      playOpenSound();
    }
  };
  
  // Handle clicks on window group icons
  const handleGroupClick = (groupId: string) => {
    const group = windowGroups[groupId];
    
    if (!group) return;
    
    // If the group is minimized, restore it
    if (group.isMinimized) {
      restoreWindowGroup(groupId);
      focusWindowGroup(groupId);
      playOpenSound();
    } 
    // If already open and focused, minimize it
    else if (group.zIndex === useAgentStore.getState().highestZIndex) {
      minimizeWindowGroup(groupId);
      playCloseSound();
    }
    // Otherwise, just focus it
    else {
      focusWindowGroup(groupId);
      playOpenSound();
    }
  };
  
  // Get the active layout name if one is active
  const getActiveLayoutName = () => {
    if (!activeLayoutId) return null;
    const activeLayout = layouts.find(layout => layout.id === activeLayoutId);
    return activeLayout ? activeLayout.name : null;
  };
  
  // Function to handle quick save of the current layout with auto-generated name
  const handleQuickSave = () => {
    const timestamp = format(new Date(), "MMM d, h:mm a");
    const layoutName = `Quick Layout - ${timestamp}`;
    
    // Use the saveLayout function from the store
    saveLayout(layoutName, 'Quick Saves');
    
    // Show a success toast
    toast({
      title: "Layout Saved",
      description: `Current layout saved as "${layoutName}"`,
      variant: "default",
    });
  };
  
  // Function to save with custom name
  const handleCustomSave = () => {
    if (!customLayoutName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a name for your layout",
        variant: "destructive",
      });
      return;
    }
    
    // Use the saveLayout function from the store with custom name
    saveLayout(customLayoutName, 'Quick Saves');
    
    // Show a success toast
    toast({
      title: "Layout Saved",
      description: `Current layout saved as "${customLayoutName}"`,
      variant: "default",
    });
    
    // Reset form and close popover
    setCustomLayoutName('');
    setIsQuickSaveOpen(false);
  };
  
  // Focus the input when popover opens
  const handlePopoverOpenChange = (open: boolean) => {
    setIsQuickSaveOpen(open);
    
    if (open) {
      // Focus the input after popover animation completes
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      // Clear the input when popover closes
      setCustomLayoutName('');
    }
  };
  
  // Get theme information
  const mode = useThemeStore(state => state.mode);
  const accent = useThemeStore(state => state.accent);
  const getCurrentTheme = useThemeStore(state => state.getCurrentTheme);
  
  // Get system log information and actions
  const isSystemLogVisible = useSystemLogStore(state => state.isVisible);
  const toggleSystemLog = useSystemLogStore(state => state.toggleVisibility);
  
  // Get the appropriate theme icon
  const getThemeIcon = () => {
    const currentTheme = getCurrentTheme();
    // Since we only support dark mode, this is simplified
    return <Icon name="Moon" size="md" />;
  };
  
  // Update clock every minute
  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    
    return () => clearInterval(timer);
  }, []);
  
  // Format time as HH:MM AM/PM
  const formattedTime = currentTime.toLocaleTimeString([], { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
  
  // Determine background style based on theme and settings
  const getTaskbarBgClass = () => {
    // Since we're focusing on dark theme for now
    const themeClass = 'bg-black/20 border-white/10';
    
    // Apply backdrop blur when enableBlur is true
    const blurClass = enableBlur ? 'backdrop-blur-sm' : '';
    
    console.log("Taskbar blur enabled:", enableBlur);
    return `${themeClass} ${blurClass}`;
  };
  
  // Simplified approach: The taskbar's base styles
  // Use enhanced screen size detection for more precise mobile handling
  const { size: screenSizeValue, isMobile: detectedMobile } = useScreenSize();
  const isSmallScreen = isMobile || detectedMobile || screenSizeValue === 'xs' || screenSizeValue === 'sm';
  
  const getTaskbarBaseStyles = () => {
    // Basic styles that apply to all taskbar positions
    const baseStyles = {
      position: 'fixed' as const,
      display: 'flex' as const,
      zIndex: 200,
      backgroundColor: 'rgba(0, 0, 0, 0.2)',
      backdropFilter: enableBlur ? 'blur(4px)' : 'none',
      transition: 'all 0.3s ease-in-out',
    };
    
    // For mobile or small screens, we always use a special bottom position
    if (isSmallScreen) {
      return {
        ...baseStyles,
        bottom: 0,
        left: 0,
        right: 0,
        height: screenSizeValue === 'xs' ? '3rem' : '3.5rem',
        width: '100%',
        flexDirection: 'row' as const,
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        justifyContent: 'space-around', // Better for touch targets on mobile
        padding: screenSizeValue === 'xs' ? '0.25rem 0.5rem' : '0.5rem 0.5rem',
        backgroundColor: 'rgba(0, 0, 0, 0.5)', // More opaque for better visibility on mobile
        boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 -2px 4px -1px rgba(0, 0, 0, 0.06)'
      };
    }
    
    // Desktop position specific styling
    switch (position.location) {
      case 'top':
        return {
          ...baseStyles,
          top: 0,
          left: 0,
          right: 0,
          height: '3.5rem',
          width: '100%',
          flexDirection: 'row' as const,
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          justifyContent: position.alignment === 'center' 
            ? 'center' : position.alignment === 'end' 
            ? 'flex-end' : position.alignment === 'space-between'
            ? 'space-between' : 'flex-start',
          padding: '0.5rem 1rem'
        };
        
      case 'bottom':
        return {
          ...baseStyles,
          bottom: 0,
          left: 0,
          right: 0,
          height: '3.5rem',
          width: '100%',
          flexDirection: 'row' as const,
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          justifyContent: position.alignment === 'center' 
            ? 'center' : position.alignment === 'end' 
            ? 'flex-end' : position.alignment === 'space-between'
            ? 'space-between' : 'flex-start',
          padding: '0.5rem 1rem'
        };
        
      case 'left':
        return {
          ...baseStyles,
          top: 0,
          left: 0,
          bottom: 0,
          width: showLabels ? '5rem' : '3.5rem',
          maxWidth: '80px',
          height: '100%',
          flexDirection: 'column' as const,
          borderRight: '1px solid rgba(255, 255, 255, 0.1)',
          alignItems: position.alignment === 'center' 
            ? 'center' : position.alignment === 'end' 
            ? 'flex-end' : position.alignment === 'space-between'
            ? 'stretch' : 'flex-start',
          justifyContent: position.alignment === 'space-between' ? 'space-between' : 'flex-start',
          padding: '1rem 0.5rem'
        };
        
      case 'right':
        return {
          ...baseStyles,
          top: 0,
          right: 0,
          bottom: 0,
          width: showLabels ? '5rem' : '3.5rem',
          maxWidth: '80px',
          height: '100%',
          flexDirection: 'column' as const,
          borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
          alignItems: 'center', // Always center align items for right taskbar
          justifyContent: position.alignment === 'space-between' ? 'space-between' : 'flex-start',
          padding: '1rem 0.5rem'
        };
        
      default:
        return baseStyles;
    }
  };
  
  // Determine if we're using a vertical layout
  const isVertical = position.location === 'left' || position.location === 'right';
  
  // Get the base styles for the taskbar
  const baseStyles = getTaskbarBaseStyles();
  
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

  // Log position change for debugging
  React.useEffect(() => {
    console.log("Setting taskbar position to:", position.location);
  }, [position.location]);

  return (
    <>
      <div 
        style={getTaskbarBaseStyles()}
        className={`taskbar ${className} ${autohide && !isMobile ? 'opacity-30 hover:opacity-100 transition-opacity duration-300' : ''}`}
      >
        {/* Agent icons - changes flex direction based on position orientation */}
        <div className={`
          flex-1 flex 
          ${isVertical && !isSmallScreen ? 'flex-col space-y-1 py-2' : 'items-center space-x-1'}
          ${isSmallScreen 
            ? 'justify-center space-x-2' 
            : position.location === 'right' 
              ? 'justify-center w-full' 
              : ''}
          ${screenSizeValue === 'xs' ? 'px-0.5' : 'px-1'}
        `}>
          {/* Individual Agent Icons */}
          {registry.map(agent => {
            const window = windows[agent.id];
            const isOpen = window?.isOpen;
            const isMinimized = window?.isMinimized;
            const isActive = isOpen && !isMinimized;
            
            // Skip windows that are part of a group
            if (window?.groupId) return null;
            
            // For mobile or small screens, only show a limited set of agents to avoid clutter
            if (isSmallScreen) {
              // Extremely small screens (xs) - show only essential agents
              if (screenSizeValue === 'xs' && !['clara', 'chat', 'settings'].includes(agent.id)) {
                return null;
              }
              // Small screens (sm) - show a slightly expanded set of agents
              else if (screenSizeValue === 'sm' && !['clara', 'chat', 'notes', 'settings', 'system'].includes(agent.id)) {
                return null;
              }
            }
            
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
          
          {/* Window Group Icons */}
          {Object.entries(windowGroups).map(([groupId, group]) => (
            <GroupIconButton
              key={groupId}
              groupId={groupId}
              group={group}
              onClick={handleGroupClick}
            />
          ))}
        </div>
        
        {/* Widgets container - changes flex direction based on position orientation */}
        <div className={`
          flex ${isVertical && !isSmallScreen ? 'flex-col space-y-2 items-center' : 'items-center space-x-2'}
          ${isSmallScreen ? (screenSizeValue === 'xs' ? 'hidden' : 'hidden sm:flex') : ''}
        `}>
          {/* Search Bar Widget - hide on vertical taskbars */}
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
                <svg 
                  className="w-4 h-4 text-white/50" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
                  />
                </svg>
              </div>
            </div>
          )}
          
          {/* Simplified Search Button for vertical taskbars */}
          {visibleWidgets.includes('searchBar') && isVertical && (
            <TaskbarButton
              icon={<Icon name={ICONS.SEARCH} size="sm" />}
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
              <PopoverContent 
                className="w-80 p-0 z-[999]" 
                side={isVertical ? (position.location === 'left' ? 'right' : 'left') : 'top'}
                sideOffset={16}
                align="center"
              >
                <div className="bg-black/80 backdrop-blur-md rounded-md overflow-hidden border border-primary/20">
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

          {/* Quick Save Button - just the plus icon */}
          {visibleWidgets.includes('quickSave') && (
            <div className="relative">
              <Popover open={isQuickSaveOpen} onOpenChange={handlePopoverOpenChange}>
                <PopoverTrigger asChild>
                  <TaskbarButton
                    icon={<Icon name={ICONS.ADD} size="sm" />}
                    label="Save Layout"
                    isActive={false}
                    onClick={() => {}}
                    className="bg-gradient-to-r from-primary/20 to-primary/10 hover:from-primary/30 hover:to-primary/20"
                  />
                </PopoverTrigger>
                <PopoverContent 
                  className="w-80 p-4 bg-black/80 backdrop-blur-md border border-primary/20 rounded-md z-[999]" 
                  side={isVertical ? (position.location === 'left' ? 'right' : 'left') : 'top'}
                  sideOffset={16}
                  align="center"
                >
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
                        <Icon name={ICONS.SAVE} size="xs" /> Quick Save
                      </button>
                      
                      <button
                        className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded bg-primary/80
                                  hover:bg-primary text-sm text-white transition-colors disabled:opacity-50 
                                  disabled:pointer-events-none"
                        onClick={handleCustomSave}
                        disabled={!customLayoutName.trim()}
                      >
                        <Icon name={ICONS.CHECK_CIRCLE} size="xs" /> Save with Name
                      </button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          )}
          
          {/* System Console Button - conditionally rendered */}
          {visibleWidgets.includes('systemConsole') && (
            <button
              onClick={toggleSystemLog}
              className={`
                ${isVertical ? 'w-auto px-2 py-1.5 flex flex-col items-center gap-1' : 'h-8 px-2.5 flex items-center space-x-2'} 
                rounded-lg transition-all duration-200 overflow-hidden relative touch-manipulation
                group
                ${isSystemLogVisible
                  ? 'bg-primary/20 text-primary shadow-[0_0_10px_rgba(0,0,0,0.1)]' 
                  : 'text-white/70 hover:text-white hover:bg-white/10 hover:shadow-[0_0_10px_rgba(0,0,0,0.1)]'
                }
                ${isSystemLogVisible && !isVertical
                  ? 'after:absolute after:bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:h-0.5 after:bg-primary after:opacity-90 after:rounded-full after:w-5 after:transition-all' 
                  : ''
                }
                ${isSystemLogVisible && isVertical && position.location === 'left'
                  ? 'after:absolute after:left-0.5 after:top-1/2 after:-translate-y-1/2 after:w-0.5 after:h-5 after:bg-primary after:opacity-90 after:rounded-full after:transition-all' 
                  : ''
                }
                ${isSystemLogVisible && isVertical && position.location === 'right'
                  ? 'after:absolute after:right-0.5 after:top-1/2 after:-translate-y-1/2 after:w-0.5 after:h-5 after:bg-primary after:opacity-90 after:rounded-full after:transition-all' 
                  : ''
                }
                before:absolute before:inset-0 before:opacity-0 before:bg-primary/10 before:transition-opacity before:duration-300 
                hover:before:opacity-100 hover:scale-105
              `}
              title="System Console"
            >
              <span className={`transition-all duration-200 ${isSystemLogVisible ? 'text-primary' : 'group-hover:text-white'}`}>
                <Icon name={ICONS.TERMINAL} size="sm" />
              </span>
              {showLabels ? (
                <span className={`text-sm ${isVertical ? 'text-xs' : ''}`}>System</span>
              ) : (
                <span className="hidden sm:inline text-sm">System</span>
              )}
            </button>
          )}
          
          {/* Layout Quick Menu - simplified */}
          {visibleWidgets.includes('layoutManager') && (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className={`
                    ${isVertical ? 'w-auto px-2 py-1.5 flex flex-col items-center gap-1' : 'h-8 px-2.5 flex items-center space-x-2'} 
                    rounded-lg transition-all duration-200 overflow-hidden relative touch-manipulation
                    group text-white/70 hover:text-white hover:bg-white/10 hover:shadow-[0_0_10px_rgba(0,0,0,0.1)]
                    before:absolute before:inset-0 before:opacity-0 before:bg-primary/10 before:transition-opacity before:duration-300 
                    hover:before:opacity-100 hover:scale-105
                  `}
                  title="Quick Layouts"
                >
                  <span className={`transition-all duration-200 group-hover:text-white`}>
                    <Icon name={ICONS.LAYOUTS} size="sm" />
                  </span>
                  {showLabels ? (
                    <span className={`text-sm ${isVertical ? 'text-xs' : ''}`}>
                      Layouts
                    </span>
                  ) : (
                    <span className="hidden sm:inline text-sm">Layouts</span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent side="top" align="end" className="w-60 p-2">
                <div className="flex flex-col gap-2">
                  <h3 className="font-semibold text-sm mb-1">Quick Layouts</h3>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="justify-start"
                    onClick={() => {
                      import('../../lib/layoutUtils').then(({ ApplyLayout }) => {
                        ApplyLayout.splitView('clara', 'notes');
                        toast({ title: "Split View", description: "Applied Split View layout" });
                      });
                    }}
                  >
                    <Icon name={ICONS.LAYOUT_SPLIT} className="mr-2 h-4 w-4" />
                    Split View
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="justify-start"
                    onClick={() => {
                      import('../../lib/layoutUtils').then(({ ApplyLayout }) => {
                        ApplyLayout.focusMode('clara');
                        toast({ title: "Focus Mode", description: "Applied Focus Mode layout" });
                      });
                    }}
                  >
                    <Icon name={ICONS.MAXIMIZE} className="mr-2 h-4 w-4" />
                    Focus Mode
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="justify-start"
                    onClick={() => {
                      import('../../lib/layoutUtils').then(({ ApplyLayout }) => {
                        ApplyLayout.tripleLayout('clara', 'notes', 'settings');
                        toast({ title: "Triple Layout", description: "Applied Triple Layout" });
                      });
                    }}
                  >
                    <Icon name={ICONS.LAYOUT_GRID} className="mr-2 h-4 w-4" />
                    Triple Layout
                  </Button>
                  
                  <div className="mt-1 pt-1 border-t border-border">
                    <h3 className="font-semibold text-sm mb-1">Grid Layouts</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="justify-center"
                        onClick={() => {
                          import('../../lib/layoutUtils').then(({ ApplyLayout }) => {
                            ApplyLayout.gridLayout(['clara', 'notes', 'settings', 'marketplace'], 2);
                            toast({ title: "2×2 Grid", description: "Applied 2×2 grid layout" });
                          });
                        }}
                      >
                        <Icon name={ICONS.GRID} className="mr-2 h-4 w-4" />
                        2×2 Grid
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="justify-center"
                        onClick={() => {
                          import('../../lib/layoutUtils').then(({ ApplyLayout }) => {
                            // Use all available agents for 4×4 grid
                            const registry = useAgentStore.getState().registry;
                            const agentIds = registry.map(agent => agent.id);
                            ApplyLayout.gridLayout(agentIds, 4);
                            toast({ title: "4×4 Grid", description: "Applied 4×4 grid layout" });
                          });
                        }}
                      >
                        <Icon name={ICONS.LAYOUT_GRID} className="mr-2 h-4 w-4" />
                        4×4 Grid
                      </Button>
                    </div>
                  </div>
                  
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    className="justify-start mt-2"
                    onClick={() => {
                      import('../../lib/layoutUtils').then(({ ApplyLayout }) => {
                        ApplyLayout.closeAll();
                        toast({ title: "Desktop Cleared", description: "Closed all windows" });
                      });
                    }}
                  >
                    <Icon name={ICONS.X} className="mr-2 h-4 w-4" />
                    Clear All
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          )}
          
          {/* Clock Widget - horizontal version */}
          {visibleWidgets.includes('clock') && !isVertical && (
            <div className="px-2.5 py-1 rounded-lg bg-black/20 text-white/80">
              <div className="flex items-center space-x-1">
                <Icon name={ICONS.CLOCK} size="xs" />
                <span className="text-xs font-medium">{formattedTime}</span>
              </div>
            </div>
          )}
          
          {/* Clock Widget - vertical version */}
          {visibleWidgets.includes('clock') && isVertical && (
            <div className="p-2 rounded-lg bg-black/20 text-white/80">
              <div className="flex flex-col items-center space-y-1">
                <Icon name={ICONS.CLOCK} size="xs" />
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
        
        {/* System Log Component */}
        <ClaraSystemLog />
      </div>
    </>
  );
};

export default Taskbar;