import React from 'react';
import { useAgentStore, AgentId } from '../../state/agentStore';
import { useThemeStore } from '../../state/themeStore';
import { useSystemLogStore } from '../../state/systemLogStore';
import LayoutManager from './LayoutManager';
import ClaraSystemLog from '../system/ClaraSystemLog';
import { Button } from '@/components/ui/button';
import { LucideIcon, Layout, Moon, Settings, Terminal, Store } from 'lucide-react';

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
  const registry = useAgentStore(state => state.registry);
  const windows = useAgentStore(state => state.windows);
  const openAgent = useAgentStore(state => state.openAgent);
  const focusAgent = useAgentStore(state => state.focusAgent);
  const restoreAgent = useAgentStore(state => state.restoreAgent);
  const activeLayoutId = useAgentStore(state => state.activeLayoutId);
  const layouts = useAgentStore(state => state.layouts);
  
  const handleIconClick = (id: AgentId) => {
    const window = windows[id];
    
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
  
  // Determine background style based on theme - updated to match window design
  const getTaskbarBgClass = () => {
    return getCurrentTheme() === 'dark'
      ? 'bg-black/20 border-white/10'
      : 'bg-white/60 border-gray-100 shadow-sm text-gray-800';
  };
  
  return (
    <div className={`flex items-center ${getTaskbarBgClass()} backdrop-blur-sm border-t px-4 py-1.5 ${className}`}>
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
        {/* System Log Button */}
        <TaskbarButton
          icon={<Terminal size={16} />}
          label="System Console"
          isActive={isSystemLogVisible}
          onClick={toggleSystemLog}
        />

        {/* Marketplace Button */}
        <TaskbarButton
          icon={<Store size={16} />}
          label="Marketplace"
          isActive={windows['marketplace']?.isOpen && !windows['marketplace']?.isMinimized}
          onClick={() => handleIconClick('marketplace')}
        />
        
        {/* Settings Button */}
        <TaskbarButton
          icon={<Settings size={16} />}
          label="Settings"
          isActive={windows['settings']?.isOpen && !windows['settings']?.isMinimized}
          onClick={() => handleIconClick('settings')}
        />
        
        {/* Layout Manager Button */}
        <LayoutManager>
          <TaskbarButton
            icon={<Layout size={16} />}
            label={getActiveLayoutName() ? `Layout: ${getActiveLayoutName()}` : 'Layouts'}
            isActive={!!activeLayoutId}
            onClick={() => {}}
          />
        </LayoutManager>
        
        <div className="text-xs px-2.5 py-1 rounded-full text-primary-foreground/70 bg-primary/10 transition-colors duration-200 border border-primary/20">
          v1.0
        </div>
      </div>
      
      {/* System Log Component */}
      <ClaraSystemLog />
    </div>
  );
};

export default Taskbar;