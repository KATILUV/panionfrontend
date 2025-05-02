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
  Terminal
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
    if (mode === 'system') return <Monitor size={18} />;
    return currentTheme === 'dark' ? <Moon size={18} /> : <Sun size={18} />;
  };
  
  // Determine background style based on theme
  const getTaskbarBgClass = () => {
    return getCurrentTheme() === 'dark'
      ? 'bg-black/30 border-white/10'
      : 'bg-white/60 border-gray-100 shadow-sm text-gray-800';
  };
  
  return (
    <div className={`flex items-center ${getTaskbarBgClass()} backdrop-blur-md border-t px-4 py-2 ${className}`}>
      <div className="flex-1 flex items-center space-x-1">
        {registry.map(agent => {
          const isOpen = windows[agent.id]?.isOpen;
          const isMinimized = windows[agent.id]?.isMinimized;
          
          return (
            <button
              key={agent.id}
              onClick={() => handleIconClick(agent.id)}
              className={`
                p-2 rounded-md transition-all duration-200 relative
                ${isOpen && !isMinimized 
                  ? getCurrentTheme() === 'dark' 
                    ? 'bg-white/20' 
                    : 'bg-black/5 shadow-sm' 
                  : getCurrentTheme() === 'dark'
                    ? 'bg-transparent hover:bg-white/10'
                    : 'bg-transparent hover:bg-black/5 hover:shadow-sm'
                }
                ${isOpen 
                  ? 'after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-1/3 after:h-0.5 ' + 
                    (getCurrentTheme() === 'dark' 
                      ? 'after:bg-white' 
                      : (accent === 'light' ? 'after:bg-gray-400' : 'after:bg-primary')
                    ) + 
                    ' after:rounded-full' 
                  : ''
                }
              `}
              title={agent.title}
            >
              <div className={`flex items-center justify-center w-8 h-8 ${
                getCurrentTheme() === 'dark' ? 'text-white' : 'text-gray-800'
              }`}>
                <div dangerouslySetInnerHTML={{ __html: agent.icon }} />
              </div>
            </button>
          );
        })}
      </div>
      
      <div className="flex items-center space-x-3">
        {/* System Log Button */}
        <Button 
          variant="ghost" 
          size="sm"
          onClick={toggleSystemLog}
          className={`h-9 px-3 flex items-center space-x-2 rounded-md ${
            isSystemLogVisible 
              ? getCurrentTheme() === 'dark'
                ? 'text-primary bg-white/10'
                : accent === 'light'
                  ? 'text-gray-700 bg-gray-100 shadow-sm'
                  : 'text-primary bg-primary/10 shadow-sm'
              : getCurrentTheme() === 'dark' 
                ? 'text-white/70 hover:text-white hover:bg-white/10' 
                : 'text-gray-700 hover:text-gray-900 hover:bg-black/5 hover:shadow-sm'
          }`}
        >
          <Terminal size={18} />
          <span className="hidden sm:inline">Console</span>
        </Button>

        {/* Settings Button */}
        <Button 
          variant="ghost" 
          size="sm"
          className={`h-9 px-3 flex items-center space-x-2 rounded-md ${
            getCurrentTheme() === 'dark' 
              ? 'text-white/70 hover:text-white hover:bg-white/10' 
              : 'text-gray-700 hover:text-gray-900 hover:bg-black/5 hover:shadow-sm'
          }`}
          onClick={() => {
            console.log('Opening settings agent');
            handleIconClick('settings');
          }}
        >
          <Settings size={18} />
          <span className="hidden sm:inline">Settings</span>
        </Button>
        
        {/* Layout Manager Button */}
        <LayoutManager>
          <Button 
            variant="ghost" 
            size="sm"
            className={`h-9 px-3 flex items-center space-x-2 rounded-md ${
              getCurrentTheme() === 'dark' 
                ? 'text-white/70 hover:text-white hover:bg-white/10' 
                : 'text-gray-700 hover:text-gray-900 hover:bg-black/5 hover:shadow-sm'
            }`}
          >
            <Layout size={18} />
            <span className="hidden sm:inline">
              {getActiveLayoutName() ? 
                `Layout: ${getActiveLayoutName()}` : 
                'Layouts'
              }
            </span>
          </Button>
        </LayoutManager>
        
        <div className={`text-xs px-2 py-1 rounded-full ${
            getCurrentTheme() === 'dark' 
              ? 'text-white/50 bg-white/5' 
              : 'text-gray-600 bg-black/5'
          }`}>
          Panion OS v0.1
        </div>
      </div>
      
      {/* System Log Component */}
      <ClaraSystemLog />
    </div>
  );
};

export default Taskbar;