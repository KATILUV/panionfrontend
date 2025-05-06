import React from 'react';
import { useAgentStore, AgentId } from '../../state/agentStore';
import { useThemeStore } from '../../state/themeStore';
import { useSystemLogStore } from '../../state/systemLogStore';
import LayoutManager from './LayoutManager';
import ClaraSystemLog from '../system/ClaraSystemLog';
import { Button } from '@/components/ui/button';
import { 
  Layout, 
  Moon,
  Sun,
  Paintbrush, 
  Settings, 
  Monitor, 
  SplitSquareVertical,
  Terminal,
  Store,
  ShoppingBag
} from 'lucide-react';

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
          
          return (
            <button
              key={agent.id}
              onClick={() => handleIconClick(agent.id)}
              className={`
                p-2 rounded-lg transition-all duration-200 relative overflow-hidden
                ${isOpen && !isMinimized 
                  ? 'bg-primary/20 text-primary-foreground shadow-[0_0_10px_rgba(0,0,0,0.1)]' 
                  : 'bg-transparent hover:bg-white/10 text-white/70 hover:text-white hover:shadow-[0_0_10px_rgba(0,0,0,0.1)]'
                }
                group
                ${isOpen 
                  ? 'after:absolute after:bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:h-0.5 after:bg-primary after:opacity-90 after:rounded-full after:transition-all taskbar-active-indicator' 
                  : ''
                }
                before:absolute before:inset-0 before:opacity-0 before:bg-primary/10 before:transition-opacity before:duration-300 
                hover:before:opacity-100 hover:scale-105
              `}
              title={agent.title}
            >
              <div className={`flex items-center justify-center w-7 h-7 transform transition-transform duration-200
                ${isOpen ? 'scale-110' : 'group-hover:scale-110'}
              `}>
                <div dangerouslySetInnerHTML={{ __html: agent.icon }} 
                  className={`transition-all duration-200 ${isOpen ? 'text-primary' : 'group-hover:text-white'}`} />
              </div>
            </button>
          );
        })}
      </div>
      
      <div className="flex items-center space-x-2">
        {/* System Log Button */}
        <Button 
          variant="ghost" 
          size="sm"
          onClick={toggleSystemLog}
          className={`h-8 px-2.5 flex items-center space-x-2 rounded-lg transition-all duration-200 overflow-hidden relative
            group
            ${isSystemLogVisible 
              ? 'bg-primary/20 text-primary shadow-[0_0_10px_rgba(0,0,0,0.1)] after:absolute after:bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:h-0.5 after:bg-primary after:opacity-90 after:rounded-full after:w-5 after:transition-all'
              : 'text-white/70 hover:text-white hover:bg-white/10 hover:shadow-[0_0_10px_rgba(0,0,0,0.1)]'
            }
            before:absolute before:inset-0 before:opacity-0 before:bg-primary/10 before:transition-opacity before:duration-300 
            hover:before:opacity-100 hover:scale-105
          `}
        >
          <Terminal size={16} />
          <span className="hidden sm:inline text-sm">System Console</span>
        </Button>

        {/* Marketplace Button */}
        <Button 
          variant="ghost" 
          size="sm"
          className={`h-8 px-2.5 flex items-center space-x-2 rounded-lg transition-all duration-200 overflow-hidden relative
            group
            ${windows['marketplace']?.isOpen && !windows['marketplace']?.isMinimized
              ? 'bg-primary/20 text-primary shadow-[0_0_10px_rgba(0,0,0,0.1)] after:absolute after:bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:h-0.5 after:bg-primary after:opacity-90 after:rounded-full after:w-5 after:transition-all'
              : 'text-white/70 hover:text-white hover:bg-white/10 hover:shadow-[0_0_10px_rgba(0,0,0,0.1)]'
            }
            before:absolute before:inset-0 before:opacity-0 before:bg-primary/10 before:transition-opacity before:duration-300 
            hover:before:opacity-100 hover:scale-105
          `}
          onClick={() => {
            handleIconClick('marketplace');
          }}
        >
          <Store size={16} className={`transition-all duration-200 ${windows['marketplace']?.isOpen ? 'text-primary' : 'group-hover:text-white'}`} />
          <span className="hidden sm:inline text-sm">Marketplace</span>
        </Button>
        
        {/* Settings Button */}
        <Button 
          variant="ghost" 
          size="sm"
          className={`h-8 px-2.5 flex items-center space-x-2 rounded-lg transition-all duration-200 overflow-hidden relative
            group
            ${windows['settings']?.isOpen && !windows['settings']?.isMinimized
              ? 'bg-primary/20 text-primary shadow-[0_0_10px_rgba(0,0,0,0.1)] after:absolute after:bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:h-0.5 after:bg-primary after:opacity-90 after:rounded-full after:w-5 after:transition-all'
              : 'text-white/70 hover:text-white hover:bg-white/10 hover:shadow-[0_0_10px_rgba(0,0,0,0.1)]'
            }
            before:absolute before:inset-0 before:opacity-0 before:bg-primary/10 before:transition-opacity before:duration-300 
            hover:before:opacity-100 hover:scale-105
          `}
          onClick={() => {
            handleIconClick('settings');
          }}
        >
          <Settings size={16} className={`transition-all duration-200 ${windows['settings']?.isOpen ? 'text-primary' : 'group-hover:text-white'}`} />
          <span className="hidden sm:inline text-sm">Settings</span>
        </Button>
        
        {/* Layout Manager Button */}
        <LayoutManager>
          <Button 
            variant="ghost" 
            size="sm"
            className={`h-8 px-2.5 flex items-center space-x-2 rounded-lg transition-all duration-200 overflow-hidden relative
              group
              ${activeLayoutId
                ? 'bg-primary/20 text-primary shadow-[0_0_10px_rgba(0,0,0,0.1)] after:absolute after:bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:h-0.5 after:bg-primary after:opacity-90 after:rounded-full after:w-5 after:transition-all'
                : 'text-white/70 hover:text-white hover:bg-white/10 hover:shadow-[0_0_10px_rgba(0,0,0,0.1)]'
              }
              before:absolute before:inset-0 before:opacity-0 before:bg-primary/10 before:transition-opacity before:duration-300 
              hover:before:opacity-100 hover:scale-105
            `}
          >
            <Layout size={16} className={`transition-all duration-200 ${activeLayoutId ? 'text-primary' : 'group-hover:text-white'}`} />
            <span className="hidden sm:inline text-sm">
              {getActiveLayoutName() ? 
                `Layout: ${getActiveLayoutName()}` : 
                'Layouts'
              }
            </span>
          </Button>
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