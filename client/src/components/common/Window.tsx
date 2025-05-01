import React, { useState, useEffect } from 'react';
import { Rnd } from 'react-rnd';
import { useAgentStore, AgentId } from '../../state/agentStore';
import { Minimize2, X, Maximize2 } from 'lucide-react';

interface WindowProps {
  id: AgentId;
  title: string;
  children: React.ReactNode;
  isActive: boolean;
  position: { x: number, y: number };
  size: { width: number, height: number };
  zIndex: number;
  onClose: () => void;
  onMinimize: () => void;
  onFocus: () => void;
}

const Window: React.FC<WindowProps> = ({
  id,
  title,
  children,
  isActive,
  position,
  size,
  zIndex,
  onClose,
  onMinimize,
  onFocus,
}) => {
  const updateAgentPosition = useAgentStore(state => state.updateAgentPosition);
  const updateAgentSize = useAgentStore(state => state.updateAgentSize);
  const [isMaximized, setIsMaximized] = useState(false);
  const [preMaximizeState, setPreMaximizeState] = useState({ position, size });
  
  // Update stored position and size when maximized status changes
  useEffect(() => {
    if (isMaximized) {
      // Save the current position/size before maximizing
      setPreMaximizeState({ position, size });
    }
  }, [isMaximized]);

  const toggleMaximize = () => {
    setIsMaximized(!isMaximized);
  };

  // Prevent windows from being dragged completely off-screen
  const handleDragStop = (_e: any, d: { x: number, y: number }) => {
    // Ensure at least 20% of the window remains within the viewport
    const minVisibleX = -size.width * 0.8;
    const minVisibleY = 0; // Don't allow dragging above the viewport
    const maxVisibleX = window.innerWidth - size.width * 0.2;
    const maxVisibleY = window.innerHeight - 40; // Keep title bar visible

    const boundedX = Math.max(minVisibleX, Math.min(d.x, maxVisibleX));
    const boundedY = Math.max(minVisibleY, Math.min(d.y, maxVisibleY));

    const newPosition = { x: boundedX, y: boundedY };
    updateAgentPosition(id, newPosition);
  };

  // Handle resize
  const handleResizeStop = (_e: any, _direction: any, ref: any, _delta: any, position: { x: number, y: number }) => {
    const newSize = {
      width: parseInt(ref.style.width),
      height: parseInt(ref.style.height),
    };
    updateAgentSize(id, newSize);
    updateAgentPosition(id, position);
  };

  // Calculate content height (window height minus title bar)
  const contentHeight = size.height - 40;

  return (
    <Rnd
      style={{
        zIndex,
      }}
      default={{
        ...position,
        ...size,
      }}
      position={isMaximized ? { x: 0, y: 0 } : position}
      size={isMaximized ? { width: window.innerWidth, height: window.innerHeight } : size}
      onDragStop={handleDragStop}
      onResizeStop={handleResizeStop}
      onMouseDown={onFocus}
      disableDragging={isMaximized}
      enableResizing={!isMaximized}
      dragHandleClassName="window-drag-handle"
      bounds="parent"
      minWidth={300}
      minHeight={200}
    >
      <div 
        className={`flex flex-col rounded-lg backdrop-blur-lg shadow-xl h-full border border-white/20 ${
          isActive ? 'bg-white/10' : 'bg-white/5'
        } overflow-hidden`}
      >
        <div 
          className="window-drag-handle flex items-center justify-between px-4 h-10 cursor-move bg-black/20"
          onDoubleClick={toggleMaximize}
        >
          <div className="font-medium text-white truncate">{title}</div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={onMinimize}
              className="p-1 text-white/70 hover:text-white hover:bg-white/20 rounded"
            >
              <Minimize2 size={16} />
            </button>
            <button 
              onClick={toggleMaximize}
              className="p-1 text-white/70 hover:text-white hover:bg-white/20 rounded"
            >
              <Maximize2 size={16} />
            </button>
            <button 
              onClick={onClose}
              className="p-1 text-white/70 hover:text-white hover:bg-red-500/50 rounded"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        <div 
          className="flex-1 overflow-auto"
          style={{ height: contentHeight }}
        >
          {children}
        </div>
      </div>
    </Rnd>
  );
};

export default Window;