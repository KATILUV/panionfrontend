import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { log } from './systemLogStore';
import { AgentId } from './agentStore';

// Define widget types that can be shown in the taskbar
export type TaskbarWidgetType = 
  | 'quickSave'      // Quick Save button
  | 'systemConsole'  // System console button
  | 'layoutManager'  // Layout manager button
  | 'versionNumber'  // Version number display
  | 'clock'          // Clock widget
  | 'searchBar'      // Search bar
  | 'notifications'  // Notifications center
  | 'aiStatus';      // AI status indicator

export interface TaskbarPosition {
  location: 'top' | 'bottom' | 'left' | 'right';
  alignment: 'start' | 'end' | 'center' | 'space-between';
}

interface TaskbarState {
  // Position and appearance
  position: TaskbarPosition;
  enableBlur: boolean;
  showLabels: boolean;
  autohide: boolean;
  
  // Widget visibility
  visibleWidgets: TaskbarWidgetType[];
  
  // Pinned agents (macOS dock style)
  pinnedAgents: AgentId[];
  
  // Actions
  toggleWidget: (widget: TaskbarWidgetType) => void;
  setPosition: (position: TaskbarPosition) => void;
  setEnableBlur: (enable: boolean) => void;
  setShowLabels: (show: boolean) => void;
  setAutohide: (autohide: boolean) => void;
  
  // Pin/unpin management
  pinAgent: (agentId: AgentId) => void;
  unpinAgent: (agentId: AgentId) => void;
  isPinned: (agentId: AgentId) => boolean;
  reorderPinnedAgents: (orderedIds: AgentId[]) => void;
  clearPinnedAgents: () => void;
  
  // Presets
  applyMinimalPreset: () => void;
  applyFullPreset: () => void;
  applyClassicPreset: () => void;
  applyDockPreset: () => void;
  
  // Helpers
  isWidgetVisible: (widget: TaskbarWidgetType) => boolean;
}

// Default widgets shown in the taskbar
const DEFAULT_WIDGETS: TaskbarWidgetType[] = [
  'systemConsole', // Keep system console for debugging
  'notifications'  // Add notifications for system alerts
];

// Minimal set of widgets (even more minimal now)
const MINIMAL_WIDGETS: TaskbarWidgetType[] = [
  'systemConsole',
  'aiStatus'
];

// Full set of widgets
const FULL_WIDGETS: TaskbarWidgetType[] = [
  'quickSave',
  'systemConsole',
  'layoutManager',
  'versionNumber',
  'clock',
  'searchBar',
  'notifications',
  'aiStatus'
];

// Classic Windows-like taskbar
const CLASSIC_WIDGETS: TaskbarWidgetType[] = [
  'searchBar',
  'quickSave',
  'layoutManager',
  'systemConsole',
  'clock'
];

// Default pinned agents
const DEFAULT_PINNED_AGENTS: AgentId[] = ['panion', 'clara', 'notes', 'database', 'brain-circuit'];

// Mac OS style dock preset
const DOCK_WIDGETS: TaskbarWidgetType[] = [
  'notifications', // Only show notifications widget
];

export const useTaskbarStore = create<TaskbarState>()(
  persist(
    (set, get) => ({
      // Default values
      position: { location: 'bottom', alignment: 'center' },
      enableBlur: true,
      showLabels: false,
      autohide: false,
      visibleWidgets: [...DEFAULT_WIDGETS],
      pinnedAgents: [...DEFAULT_PINNED_AGENTS],
      
      // Toggle visibility of a widget
      toggleWidget: (widget) => {
        const current = get().visibleWidgets;
        const isVisible = current.includes(widget);
        
        if (isVisible) {
          log.info(`Removed ${widget} widget from taskbar`);
          set({ visibleWidgets: current.filter(w => w !== widget) });
        } else {
          log.info(`Added ${widget} widget to taskbar`);
          set({ visibleWidgets: [...current, widget] });
        }
      },
      
      // Set taskbar position
      setPosition: (position) => {
        log.info(`Taskbar position changed to: ${position.location}, alignment: ${position.alignment}`);
        set({ position });
      },
      
      // Set whether to enable blur effect
      setEnableBlur: (enable) => {
        log.info(`Taskbar blur effect ${enable ? 'enabled' : 'disabled'}`);
        set({ enableBlur: enable });
      },
      
      // Set whether to show text labels
      setShowLabels: (show) => {
        log.info(`Taskbar labels ${show ? 'shown' : 'hidden'}`);
        set({ showLabels: show });
      },
      
      // Set whether taskbar should auto-hide
      setAutohide: (autohide) => {
        log.info(`Taskbar auto-hide ${autohide ? 'enabled' : 'disabled'}`);
        set({ autohide });
      },
      
      // Pin an agent to the taskbar
      pinAgent: (agentId) => {
        const current = get().pinnedAgents;
        if (!current.includes(agentId)) {
          log.info(`Pinned agent ${agentId} to taskbar`);
          set({ pinnedAgents: [...current, agentId] });
        }
      },
      
      // Unpin an agent from the taskbar
      unpinAgent: (agentId) => {
        const current = get().pinnedAgents;
        if (current.includes(agentId)) {
          log.info(`Unpinned agent ${agentId} from taskbar`);
          set({ pinnedAgents: current.filter(id => id !== agentId) });
        }
      },
      
      // Check if an agent is pinned
      isPinned: (agentId) => {
        return get().pinnedAgents.includes(agentId);
      },
      
      // Reorder pinned agents
      reorderPinnedAgents: (orderedIds) => {
        // Validate that all IDs exist in the current pinnedAgents
        const current = get().pinnedAgents;
        const allExist = orderedIds.every(id => current.includes(id));
        const sameLength = orderedIds.length === current.length;
        
        if (allExist && sameLength) {
          log.info(`Reordered pinned agents in taskbar`);
          set({ pinnedAgents: orderedIds });
        } else {
          log.error(`Failed to reorder pinned agents: invalid agent list`);
        }
      },
      
      // Apply minimal preset
      applyMinimalPreset: () => {
        log.info("Applied minimal taskbar preset");
        set({ 
          visibleWidgets: [...MINIMAL_WIDGETS],
          showLabels: false,
          position: { location: 'bottom', alignment: 'center' },
          pinnedAgents: ['panion', 'clara', 'database', 'brain-circuit']
        });
      },
      
      // Apply full preset
      applyFullPreset: () => {
        log.info("Applied full taskbar preset");
        set({ 
          visibleWidgets: [...FULL_WIDGETS],
          showLabels: true,
          position: { location: 'bottom', alignment: 'space-between' },
          pinnedAgents: [...DEFAULT_PINNED_AGENTS, 'marketplace', 'daddy-data']
        });
      },
      
      // Apply classic preset
      applyClassicPreset: () => {
        log.info("Applied classic taskbar preset");
        set({ 
          visibleWidgets: [...CLASSIC_WIDGETS],
          showLabels: true,
          position: { location: 'bottom', alignment: 'space-between' },
          autohide: false,
          pinnedAgents: [...DEFAULT_PINNED_AGENTS]
        });
      },
      
      // Apply macOS dock style preset
      applyDockPreset: () => {
        log.info("Applied macOS dock style preset");
        set({ 
          visibleWidgets: [...DOCK_WIDGETS],
          showLabels: false,
          position: { location: 'bottom', alignment: 'center' },
          enableBlur: true,
          autohide: true,
          pinnedAgents: ['panion', 'clara', 'notes', 'marketplace', 'database', 'brain-circuit']
        });
      },
      
      // Clear all pinned agents (empty the taskbar)
      clearPinnedAgents: () => {
        log.info("Cleared all pinned agents from taskbar");
        set({ pinnedAgents: [] });
      },
      
      // Check if a widget is visible
      isWidgetVisible: (widget) => {
        return get().visibleWidgets.includes(widget);
      }
    }),
    {
      name: 'panion-taskbar-store'
    }
  )
);