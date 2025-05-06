import React, { useState, useRef } from 'react';
import { useAgentStore, AgentId } from '../../state/agentStore';
import { useThemeStore } from '../../state/themeStore';
import { useSystemLogStore } from '../../state/systemLogStore';
import { useTaskbarStore } from '../../state/taskbarStore';
import { useSettingsTabStore } from '../../state/settingsTabStore';
import LayoutManager from './LayoutManager';
import ClaraSystemLog from '../system/ClaraSystemLog';
import { Button } from '@/components/ui/button';
import { 
  LucideIcon, 
  Layout, 
  Moon, 
  Settings, 
  Terminal, 
  Store, 
  Save,
  Plus,
  PlusCircle,
  FileText,
  CheckCircle,
  Clock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Reusable TaskbarButton component to reduce repetition
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
  hasIndicator = true
}) => {
  const isHtmlIcon = typeof icon === 'string';
  
  return (
    <button
      onClick={onClick}
      className={`
        h-8 px-2.5 flex items-center space-x-2 rounded-lg transition-all duration-200 overflow-hidden relative
        group
        ${isActive 
          ? 'bg-primary/20 text-primary shadow-[0_0_10px_rgba(0,0,0,0.1)]' 
          : 'text-white/70 hover:text-white hover:bg-white/10 hover:shadow-[0_0_10px_rgba(0,0,0,0.1)]'
        }
        ${hasIndicator && isActive 
          ? 'after:absolute after:bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:h-0.5 after:bg-primary after:opacity-90 after:rounded-full after:w-5 after:transition-all' 
          : ''
        }
        before:absolute before:inset-0 before:opacity-0 before:bg-primary/10 before:transition-opacity before:duration-300 
        hover:before:opacity-100 hover:scale-105
        ${className}
      `}
      title={label}
    >
      {isHtmlIcon ? (
        <div 
          dangerouslySetInnerHTML={{ __html: icon as string }} 
          className={`transition-all duration-200 ${isActive ? 'text-primary' : 'group-hover:text-white'}`} 
        />
      ) : (
        <span className={`transition-all duration-200 ${isActive ? 'text-primary' : 'group-hover:text-white'}`}>
          {icon}
        </span>
      )}
      <span className="hidden sm:inline text-sm">{label}</span>
    </button>
  );
};

// Agent icon button with slightly different styling
interface AgentIconButtonProps {
  id: AgentId;
  icon: string;
  title: string;
  isActive: boolean;
  onClick: (id: AgentId) => void;
}

const AgentIconButton: React.FC<AgentIconButtonProps> = ({
  id,
  icon,
  title,
  isActive,
  onClick
}) => {
  return (
    <button
      onClick={() => onClick(id)}
      className={`
        p-2 rounded-lg transition-all duration-200 relative overflow-hidden
        ${isActive 
          ? 'bg-primary/20 text-primary-foreground shadow-[0_0_10px_rgba(0,0,0,0.1)]' 
          : 'bg-transparent hover:bg-white/10 text-white/70 hover:text-white hover:shadow-[0_0_10px_rgba(0,0,0,0.1)]'
        }
        group
        ${isActive 
          ? 'after:absolute after:bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:h-0.5 after:bg-primary after:opacity-90 after:rounded-full after:transition-all taskbar-active-indicator' 
          : ''
        }
        before:absolute before:inset-0 before:opacity-0 before:bg-primary/10 before:transition-opacity before:duration-300 
        hover:before:opacity-100 hover:scale-105
      `}
      title={title}
    >
      <div className={`flex items-center justify-center w-7 h-7 transform transition-transform duration-200
        ${isActive ? 'scale-110' : 'group-hover:scale-110'}
      `}>
        <div dangerouslySetInnerHTML={{ __html: icon }} 
          className={`transition-all duration-200 ${isActive ? 'text-primary' : 'group-hover:text-white'}`} />
      </div>
    </button>
  );
};

interface TaskbarProps {
  className?: string;
}

const Taskbar: React.FC<TaskbarProps> = ({ className = '' }) => {
  const { toast } = useToast();
  const [isQuickSaveOpen, setIsQuickSaveOpen] = useState(false);
  const [customLayoutName, setCustomLayoutName] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const inputRef = useRef<HTMLInputElement>(null);
  
  const registry = useAgentStore(state => state.registry);
  const windows = useAgentStore(state => state.windows);
  const openAgent = useAgentStore(state => state.openAgent);
  const focusAgent = useAgentStore(state => state.focusAgent);
  const restoreAgent = useAgentStore(state => state.restoreAgent);
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
    } 
    // If window is minimized, restore it
    else if (window.isMinimized) {
      restoreAgent(id);
    } 
    // Otherwise, just focus it
    else {
      focusAgent(id);
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
    return <Moon size={18} />;
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
    const themeClass = getCurrentTheme() === 'dark'
      ? 'bg-black/20 border-white/10'
      : 'bg-white/60 border-gray-100 shadow-sm text-gray-800';
    
    const blurClass = enableBlur ? 'backdrop-blur-sm' : '';
    return `${themeClass} ${blurClass}`;
  };
  
  // Determine positioning/alignment classes
  const getPositionClasses = () => {
    let positionClass = '';
    
    // Position (top, bottom, left, right)
    switch (position.location) {
      case 'top':
        positionClass += 'border-b ';
        break;
      case 'bottom':
        positionClass += 'border-t ';
        break;
      case 'left':
        positionClass += 'border-r flex-col h-full ';
        break;
      case 'right':
        positionClass += 'border-l flex-col h-full ';
        break;
    }
    
    // Alignment (start, center, end, space-between)
    switch (position.alignment) {
      case 'start':
        positionClass += 'justify-start ';
        break;
      case 'center':
        positionClass += 'justify-center ';
        break;
      case 'end':
        positionClass += 'justify-end ';
        break;
      case 'space-between':
        positionClass += 'justify-between ';
        break;
    }
    
    return positionClass;
  };
  
  return (
    <>
      <div 
        className={`
          flex items-center ${getTaskbarBgClass()} ${getPositionClasses()} px-4 py-1.5 
          ${className} ${autohide ? 'hover:opacity-100 opacity-30 transition-opacity duration-300' : ''}
        `}
      >
        <div className="flex-1 flex items-center space-x-1">
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
        
        <div className="flex items-center space-x-2">
          {/* Quick Save Button - just the plus icon */}
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
                <PopoverContent className="w-80 p-4" side="top">
                  <div className="space-y-4">
                    <h3 className="text-base font-medium">Save Current Layout</h3>
                    
                    <div className="space-y-2">
                      <Label htmlFor="layout-name">Layout Name</Label>
                      <Input 
                        id="layout-name"
                        ref={inputRef}
                        placeholder="e.g., My Workspace Layout"
                        value={customLayoutName}
                        onChange={(e) => setCustomLayoutName(e.target.value)}
                        className="w-full"
                        onKeyDown={(e) => e.key === 'Enter' && handleCustomSave()}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between gap-2">
                      <button
                        className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded bg-primary/10
                                  hover:bg-primary/20 text-sm text-primary-foreground transition-colors"
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
          
          {/* System Console Button - conditionally rendered */}
          {visibleWidgets.includes('systemConsole') && (
            <TaskbarButton
              icon={<Terminal size={16} />}
              label="System Console"
              isActive={isSystemLogVisible}
              onClick={toggleSystemLog}
            />
          )}
          
          {/* Layout Manager Button - conditionally rendered */}
          {visibleWidgets.includes('layoutManager') && (
            <LayoutManager>
              <TaskbarButton
                icon={<Layout size={16} />}
                label={getActiveLayoutName() ? `Layout: ${getActiveLayoutName()}` : 'Layouts'}
                isActive={!!activeLayoutId}
                onClick={() => {}}
              />
            </LayoutManager>
          )}
          
          {/* Clock Widget - conditionally rendered */}
          {visibleWidgets.includes('clock') && (
            <div className="px-2.5 py-1 rounded-lg bg-black/20 text-white/80">
              <div className="flex items-center space-x-1">
                <Clock size={14} />
                <span className="text-xs font-medium">{formattedTime}</span>
              </div>
            </div>
          )}
          
          {/* Version number - conditionally rendered */}
          {visibleWidgets.includes('versionNumber') && (
            <div className="text-xs px-2.5 py-1 rounded-full text-primary-foreground/70 bg-primary/10 transition-colors duration-200 border border-primary/20">
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