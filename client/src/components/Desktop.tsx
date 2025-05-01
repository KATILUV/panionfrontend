import React, { useEffect } from 'react';
import Window from './common/Window';
import Taskbar from './common/Taskbar';
import { useAgentStore, AgentId } from '../state/agentStore';
import { initializeAgentRegistry } from '../state/agentStore';
import ClaraAgent from './agents/ClaraAgent';
import NotesAgent from './agents/NotesAgent';

// Component rendering helper
const renderAgentContent = (agentId: string) => {
  switch (agentId) {
    case 'clara':
      return <ClaraAgent />;
    case 'notes':
      return <NotesAgent />;
    default:
      return <div>Unknown agent type</div>;
  }
};

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
    <div className="panion-desktop">
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
              {renderAgentContent(window.id)}
            </Window>
          ))}
      </div>
      
      {/* Taskbar */}
      <Taskbar className="h-14" />
    </div>
  );
};

export default Desktop;