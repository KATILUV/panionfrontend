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
  resetTaskbar: () => void; // Add reset function
  
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

// Default pinned agents - database, brain-circuit, and daddy-data have been removed as requested
const DEFAULT_PINNED_AGENTS: AgentId[] = ['panion', 'notes'];

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
          log.info(`Pinning agent ${agentId} to taskbar`);
          // Make a deep copy to ensure we're not modifying the original array
          const updatedPinned = [...current, agentId];
          console.log("New pinned agents list:", updatedPinned);
          set({ pinnedAgents: updatedPinned });
        } else {
          log.info(`Agent ${agentId} is already pinned to taskbar`);
        }
      },
      
      // Unpin an agent from the taskbar
      unpinAgent: (agentId) => {
        const current = get().pinnedAgents;
        console.log("Current pinned agents before unpinning:", current);
        if (current.includes(agentId)) {
          log.info(`Unpinning agent ${agentId} from taskbar`);
          // Create a new array with the filtered items
          const updatedPinned = current.filter(id => id !== agentId);
          console.log("New pinned agents list after unpinning:", updatedPinned);
          set({ pinnedAgents: updatedPinned });
        } else {
          log.info(`Cannot unpin agent ${agentId}, not found in pinnedAgents`);
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
          pinnedAgents: ['panion'] // Clara, database and brain-circuit removed
        });
      },
      
      // Apply full preset
      applyFullPreset: () => {
        log.info("Applied full taskbar preset");
        set({ 
          visibleWidgets: [...FULL_WIDGETS],
          showLabels: true,
          position: { location: 'bottom', alignment: 'space-between' },
          pinnedAgents: [...DEFAULT_PINNED_AGENTS, 'marketplace'] // daddy-data removed
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
          pinnedAgents: ['panion', 'notes', 'marketplace'] // Removed clara, database and brain-circuit
        });
      },
      
      // Clear all pinned agents (empty the taskbar)
      clearPinnedAgents: () => {
        const current = get().pinnedAgents;
        console.log("Current pinned agents before clearing:", current);
        log.info("Clearing all pinned agents from taskbar");
        
        // Use multiple approaches to ensure clean state:
        // 1. Set to empty array directly 
        set({ pinnedAgents: [] });
        
        // 2. Log the result for debugging
        const result = get().pinnedAgents;
        console.log("Pinned agents after clearing:", result);
        
        // 3. Verify and force if needed (defensive programming)
        if (result.length > 0) {
          console.warn("Clearing pinned agents failed, forcing direct state update");
          set(state => ({...state, pinnedAgents: []}));
        }
        
        return []; // Return empty array for convenience
      },
      
      // Reset taskbar to default state (with nuclear approach for persistence)
      resetTaskbar: () => {
        log.info("Resetting taskbar to factory defaults");
        
        // 1. First try to directly clear localStorage
        try {
          // Clear the persisted state directly
          localStorage.removeItem('panion-taskbar-store');
          console.log("Phase 1: Cleared taskbar store from localStorage");
        } catch (err) {
          console.error("Failed in Phase 1 to clear localStorage:", err);
        }
        
        // 2. Manually write a clean state to localStorage
        try {
          const cleanState = {
            state: {
              position: { location: 'bottom', alignment: 'center' },
              enableBlur: true,
              showLabels: false,
              autohide: false,
              visibleWidgets: [...DEFAULT_WIDGETS],
              pinnedAgents: [...DEFAULT_PINNED_AGENTS],
            },
            version: 0
          };
          
          localStorage.setItem('panion-taskbar-store', JSON.stringify(cleanState));
          console.log("Phase 2: Manually wrote clean state to localStorage");
        } catch (err) {
          console.error("Failed in Phase 2 to write clean state:", err);
        }
        
        // 3. Set component state directly (this will be persisted by middleware)
        set({ 
          position: { location: 'bottom', alignment: 'center' },
          enableBlur: true,
          showLabels: false,
          autohide: false,
          visibleWidgets: [...DEFAULT_WIDGETS],
          pinnedAgents: [...DEFAULT_PINNED_AGENTS],
        });
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