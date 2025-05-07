import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useThemeStore } from '../../state/themeStore';
import { useAgentStore } from '../../state/agentStore';
import { 
  Minimize2, 
  X, 
  Maximize2, 
  Copy, 
  ArrowUpToLine,
  Layout, 
  PanelTop,
  RotateCcw,
  Grid,
  GridIcon,
  MoveHorizontal,
  Layers,
  SplitSquareVertical,
  FolderOpen,
  Link,
  Unlink
} from 'lucide-react';

interface WindowContextMenuProps {
  windowId: string;
  isVisible: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  onMoveToFront: () => void;
  onCenter: () => void;
  onSnapToSide: (position: 'left' | 'right' | 'top' | 'bottom') => void;
  onRestoreDefault: () => void;
  onCloseMenu: () => void;
  onToggleGrid?: () => void;
  onToggleSnapToGrid?: () => void;
  isMaximized: boolean;
  showGrid?: boolean;
  snapToGridEnabled?: boolean;
  isInGroup?: boolean;
}

const WindowContextMenu: React.FC<WindowContextMenuProps> = ({
  windowId,
  isVisible,
  position,
  onClose,
  onMinimize,
  onMaximize,
  onMoveToFront,
  onCenter,
  onSnapToSide,
  onRestoreDefault,
  onCloseMenu,
  onToggleGrid,
  onToggleSnapToGrid,
  isMaximized,
  showGrid = false,
  snapToGridEnabled = false,
  isInGroup = false
}) => {
  const getCurrentTheme = useThemeStore(state => state.getCurrentTheme);
  
  // Access agent store functions for window grouping
  const { 
    windows, 
    registry, 
    createWindowGroup, 
    ungroupWindow 
  } = useAgentStore();

  // Animation variants - simplified for stability
  const menuVariants = {
    hidden: { 
      opacity: 0, 
      scale: 0.95,
      transition: { 
        type: "tween",
        duration: 0.1,
        ease: "easeIn"
      }
    },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { 
        type: "tween",
        duration: 0.15,
        ease: "easeOut"
      }
    }
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCloseMenu();
  };

  // Menu item style
  const getMenuItemClass = (isDestructive = false, isDisabled = false) => {
    return `
      flex items-center px-3 py-2 space-x-2 text-sm transition-colors rounded-md
      ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      ${getCurrentTheme() === 'dark'
        ? isDestructive
          ? 'hover:bg-red-900/30 hover:text-red-300 text-white/80'
          : 'hover:bg-white/10 hover:text-white text-white/80'
        : isDestructive
          ? 'hover:bg-red-100 hover:text-red-700 text-red-600'
          : 'hover:bg-gray-100 hover:text-gray-900 text-gray-700'
      }
    `;
  };

  // Separator style
  const getSeparatorClass = () => {
    return `my-1 ${getCurrentTheme() === 'dark' ? 'border-white/10' : 'border-gray-200'}`;
  };
  
  // Get all open windows that could be grouped with this one
  const getGroupableWindows = () => {
    return Object.values(windows).filter(window => 
      window.id !== windowId && 
      window.isOpen && 
      !window.isMinimized &&
      !window.groupId // Not already in a group
    );
  };
  
  // Handle creating a window group
  const handleCreateGroup = (targetWindowId: string) => {
    createWindowGroup([windowId, targetWindowId], 'Window Group');
    onCloseMenu();
  };
  
  // Handle removing from group
  const handleRemoveFromGroup = () => {
    ungroupWindow(windowId);
    onCloseMenu();
  };
  
  const groupableWindows = getGroupableWindows();

  if (!isVisible) return null;

  return (
    <div 
      className="fixed inset-0 z-50"
      onClick={handleBackdropClick}
    >
      <AnimatePresence>
        {isVisible && (
          <motion.div
            className={`absolute rounded-lg shadow-lg overflow-hidden ${
              getCurrentTheme() === 'dark'
                ? 'bg-black/70 backdrop-blur-md border border-white/10'
                : 'bg-white/90 backdrop-blur-md border border-gray-200'
            }`}
            style={{ 
              left: position.x, 
              top: position.y,
              width: 220 
            }}
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={menuVariants}
          >
            <div className="p-1">
              {/* Window Controls */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveToFront();
                  onCloseMenu();
                }}
                className={getMenuItemClass()}
              >
                <ArrowUpToLine size={16} />
                <span>Bring to Front</span>
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCenter();
                  onCloseMenu();
                }}
                className={getMenuItemClass()}
              >
                <Copy size={16} />
                <span>Center Window</span>
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRestoreDefault();
                  onCloseMenu();
                }}
                className={getMenuItemClass()}
              >
                <RotateCcw size={16} />
                <span>Restore Default</span>
              </button>

              <hr className={getSeparatorClass()} />

              {/* Group Controls */}
              <div className="px-2 py-1 text-xs text-gray-500">Window Grouping</div>
              
              {isInGroup ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFromGroup();
                  }}
                  className={getMenuItemClass()}
                >
                  <Unlink size={16} />
                  <span>Remove from Group</span>
                </button>
              ) : (
                <>
                  {groupableWindows.length > 0 ? (
                    <>
                      <div className="max-h-32 overflow-y-auto py-1">
                        {groupableWindows.map((window) => (
                          <button
                            key={window.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCreateGroup(window.id);
                            }}
                            className={getMenuItemClass()}
                          >
                            <Link size={16} />
                            <span className="truncate">Group with {window.title}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <button
                      disabled
                      className={getMenuItemClass(false, true)}
                    >
                      <Layers size={16} />
                      <span>No windows to group with</span>
                    </button>
                  )}
                </>
              )}

              <hr className={getSeparatorClass()} />

              {/* Snap Controls */}
              <div className="px-2 py-1 text-xs text-gray-500">Snap Position</div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSnapToSide('left');
                  onCloseMenu();
                }}
                className={getMenuItemClass()}
              >
                <PanelTop size={16} className="rotate-90" />
                <span>Snap Left</span>
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSnapToSide('right');
                  onCloseMenu();
                }}
                className={getMenuItemClass()}
              >
                <PanelTop size={16} className="-rotate-90" />
                <span>Snap Right</span>
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSnapToSide('top');
                  onCloseMenu();
                }}
                className={getMenuItemClass()}
              >
                <PanelTop size={16} />
                <span>Snap Top</span>
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSnapToSide('bottom');
                  onCloseMenu();
                }}
                className={getMenuItemClass()}
              >
                <PanelTop size={16} className="rotate-180" />
                <span>Snap Bottom</span>
              </button>

              <hr className={getSeparatorClass()} />
              
              {/* Grid Controls */}
              {onToggleGrid && (
                <>
                  <div className="px-2 py-1 text-xs text-gray-500">Grid Options</div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleGrid();
                      // Don't close menu to allow toggling multiple grid options
                    }}
                    className={`${getMenuItemClass()} ${showGrid ? 'bg-indigo-500/20' : ''}`}
                  >
                    <Grid size={16} />
                    <span>Show Grid</span>
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSnapToGrid && onToggleSnapToGrid();
                      // Don't close menu to allow toggling multiple grid options
                    }}
                    className={`${getMenuItemClass()} ${snapToGridEnabled ? 'bg-indigo-500/20' : ''}`}
                  >
                    <MoveHorizontal size={16} />
                    <span>Snap to Grid</span>
                  </button>
                  
                  <hr className={getSeparatorClass()} />
                </>
              )}

              {/* Window Actions */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMinimize();
                  onCloseMenu();
                }}
                className={getMenuItemClass()}
              >
                <Minimize2 size={16} />
                <span>Minimize</span>
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMaximize();
                  onCloseMenu();
                }}
                className={getMenuItemClass()}
              >
                <Maximize2 size={16} />
                <span>{isMaximized ? 'Restore' : 'Maximize'}</span>
              </button>

              <hr className={getSeparatorClass()} />
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                  onCloseMenu();
                }}
                className={getMenuItemClass(true)}
              >
                <X size={16} />
                <span>Close</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WindowContextMenu;