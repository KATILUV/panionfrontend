import React, { useRef, useEffect } from 'react';
import { Rnd } from 'react-rnd';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAgentStore, WindowGroup, AgentId } from '../../state/agentStore';
import { useThemeStore } from '../../state/themeStore';
import { X, Minus, Maximize2, Minimize2, Layers, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import './Window.css';
import { playSnapSound } from '../../lib/audioEffects';

interface GroupedWindowProps {
  groupId: string;
  group: WindowGroup;
}

const GroupedWindow: React.FC<GroupedWindowProps> = ({ groupId, group }) => {
  const isDark = useThemeStore(state => state.getCurrentTheme() === 'dark');
  const rndRef = useRef<Rnd>(null);
  
  const {
    windows,
    updateGroupPosition,
    updateGroupSize,
    closeWindowGroup,
    minimizeWindowGroup,
    focusWindowGroup,
    setActiveGroupWindow,
    ungroupWindow
  } = useAgentStore();

  // Focus this group when clicked
  const handleGroupClick = () => {
    focusWindowGroup(groupId);
  };

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveGroupWindow(groupId, value as AgentId);
    focusWindowGroup(groupId);
  };

  // Get windows in this group
  const groupWindows = group.windows.map(windowId => windows[windowId]).filter(Boolean);
  const activeWindow = windows[group.activeWindowId || ''];

  // Handle window drag
  const onDragStop = (_e: any, d: { x: number; y: number }) => {
    playSnapSound();
    updateGroupPosition(groupId, { x: d.x, y: d.y });
  };

  // Handle window resize
  const onResizeStop = (_e: any, _direction: any, ref: any, _delta: any, position: { x: number; y: number }) => {
    updateGroupSize(
      groupId,
      { width: parseInt(ref.style.width), height: parseInt(ref.style.height) }
    );
    updateGroupPosition(groupId, position);
  };

  return (
    <Rnd
      ref={rndRef}
      style={{
        zIndex: group.zIndex,
        transition: 'box-shadow 0.2s ease-in-out',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)'
      }}
      className={cn(
        "window-container rounded-lg overflow-hidden border",
        isDark 
          ? "bg-black/30 border-slate-700/50" 
          : "bg-white/70 border-slate-200/70",
        "shadow-lg hover:shadow-xl"
      )}
      size={{ width: group.size.width, height: group.size.height }}
      position={{ x: group.position.x, y: group.position.y }}
      onDragStop={onDragStop}
      onResizeStop={onResizeStop}
      onClick={handleGroupClick}
      dragHandleClassName="window-drag-handle"
      bounds="parent"
      minWidth={350}
      minHeight={300}
    >
      <div className="h-full flex flex-col">
        {/* Window Header with Tabs */}
        <div className={cn(
          "window-drag-handle flex flex-col",
          isDark ? "bg-gray-800/70" : "bg-gray-100/80"
        )}>
          {/* Top row with controls */}
          <div className="flex items-center justify-between p-1 h-7">
            <div className="flex items-center space-x-1 ml-1">
              <Layers className="h-3.5 w-3.5 text-purple-500" />
              <span className="text-xs font-medium truncate max-w-[150px]">
                {group.title}
              </span>
            </div>
            
            <div className="flex">
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 rounded-full p-0 text-gray-500 hover:bg-gray-200/70 hover:text-gray-700"
                onClick={() => minimizeWindowGroup(groupId)}
              >
                <Minus className="h-3 w-3" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 rounded-full p-0 text-gray-500 hover:bg-red-100 hover:text-red-600"
                onClick={() => closeWindowGroup(groupId)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          {/* Tabs for windows */}
          <Tabs
            defaultValue={group.activeWindowId}
            value={group.activeWindowId}
            onValueChange={handleTabChange}
            className="w-full"
          >
            <TabsList className="w-full bg-transparent h-8 flex overflow-x-auto px-1">
              {groupWindows.map(window => (
                <TabsTrigger
                  key={window.id}
                  value={window.id}
                  className="h-7 rounded flex items-center justify-between group"
                >
                  <span className="text-xs truncate max-w-[100px]">{window.title}</span>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 rounded-full p-0 ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      ungroupWindow(window.id);
                    }}
                  >
                    <X className="h-2.5 w-2.5" />
                  </Button>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Window Content */}
        <div className="flex-1 overflow-hidden">
          {activeWindow && (
            <div className="w-full h-full">
              {activeWindow.component ? activeWindow.component() : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm opacity-70">No content available</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Rnd>
  );
};

export default GroupedWindow;