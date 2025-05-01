import React, { useEffect } from 'react';
import Window from './common/Window';
import Taskbar from './common/Taskbar';
import { useAgentStore, AgentId } from '../state/agentStore';
import { initializeAgentRegistry } from '../state/agentStore';

const Desktop: React.FC = () => {
  const windows = useAgentStore(state => state.windows);
  const focusedAgentId = useAgentStore(state => state.focusedAgentId);
  const closeAgent = useAgentStore(state => state.closeAgent);
  const minimizeAgent = useAgentStore(state => state.minimizeAgent);
  const focusAgent = useAgentStore(state => state.focusAgent);
  
  // Initialize agent registry when component mounts
  useEffect(() => {
    initializeAgentRegistry();
  }, []);
  
  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col relative bg-gradient-to-br from-indigo-950 via-purple-900 to-fuchsia-950">
      {/* Desktop Area */}
      <div className="flex-1 relative">
        {/* Render Windows */}
        {Object.values(windows)
          .filter(window => window.isOpen && !window.isMinimized)
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
            >
              <window.component />
            </Window>
          ))}
      </div>
      
      {/* Taskbar */}
      <Taskbar className="h-14" />
    </div>
  );
};

export default Desktop;