import React from 'react';
import { useAgentStore, AgentId } from '../../state/agentStore';
import { useThemeStore } from '../../state/themeStore';
import { useSystemLogStore } from '../../state/systemLogStore';
import LayoutManager from './LayoutManager';
import ThemeSelector from './ThemeSelector';
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
  
  return (
    <div className={`flex items-center bg-black/30 backdrop-blur-md border-t border-white/10 px-4 py-2 ${className}`}>
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
                ${isOpen && !isMinimized ? 'bg-white/20' : 'bg-transparent hover:bg-white/10'}
                ${isOpen ? 'after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-1/3 after:h-0.5 after:bg-white after:rounded-full' : ''}
              `}
              title={agent.title}
            >
              <div className="flex items-center justify-center w-8 h-8 text-white">
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
          className={`h-10 px-3 hover:text-white hover:bg-white/10 flex items-center space-x-2 ${
            isSystemLogVisible ? 'text-primary bg-white/10' : 'text-white/70'
          }`}
        >
          <Terminal size={18} />
          <span className="hidden sm:inline">Console</span>
        </Button>

        {/* Settings Button */}
        <Button 
          variant="ghost" 
          size="sm"
          className="h-10 px-3 text-white/70 hover:text-white hover:bg-white/10 flex items-center space-x-2"
          onClick={() => handleIconClick('settings')}
        >
          <Settings size={18} />
          <span className="hidden sm:inline">Settings</span>
        </Button>
        
        {/* Layout Manager Button */}
        <LayoutManager>
          <Button 
            variant="ghost" 
            size="sm"
            className="h-10 px-3 text-white/70 hover:text-white hover:bg-white/10 flex items-center space-x-2"
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
        
        <div className="text-white/50 text-sm">
          Panion OS v0.1
        </div>
      </div>
      
      {/* System Log Component */}
      <ClaraSystemLog />
    </div>
  );
};

export default Taskbar;