import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { log } from './systemLogStore';
import { generateWindowStates, useTemplateStore } from './layoutTemplatesStore';

export type AgentId = string;

export interface Agent {
  id: AgentId;
  title: string;
  icon: string;
  component: () => React.ReactNode;
  defaultPosition?: { x: number, y: number };
  defaultSize?: { width: number, height: number };
}

export type WindowGroupId = string;

export interface AgentWindow extends Agent {
  isOpen: boolean;
  isMinimized: boolean;
  position: { x: number, y: number };
  size: { width: number, height: number };
  zIndex: number;
  groupId?: WindowGroupId; // Optional group ID if window is part of a group
  isActiveInGroup?: boolean; // Whether this window is active in its group
}

export interface WindowGroup {
  id: WindowGroupId;
  title: string;
  windows: AgentId[];
  activeWindowId?: AgentId;
  position: { x: number, y: number };
  size: { width: number, height: number };
  zIndex: number;
  isMinimized: boolean;
  createdAt: number;
}

interface AgentState {
  registry: Agent[];
  windows: Record<AgentId, AgentWindow>;
  focusedAgentId: AgentId | null;
  highestZIndex: number;
  layouts: WindowLayout[];
  activeLayoutId: string | null;
  
  // Window Groups
  windowGroups: Record<WindowGroupId, WindowGroup>;
  
  // Auto-save settings
  autoSaveEnabled: boolean; 
  autoSaveInterval: number;
  lastAutoSave: number | null;

  // Window Actions
  registerAgent: (agent: Agent) => void;
  openAgent: (id: AgentId) => void;
  closeAgent: (id: AgentId) => void;
  minimizeAgent: (id: AgentId) => void;
  restoreAgent: (id: AgentId) => void;
  focusAgent: (id: AgentId) => void;
  updateAgentPosition: (id: AgentId, position: { x: number, y: number }) => void;
  updateAgentSize: (id: AgentId, size: { width: number, height: number }) => void;
  
  // Window Group Actions
  createWindowGroup: (windowIds: AgentId[], title?: string) => WindowGroupId;
  addToWindowGroup: (groupId: WindowGroupId, windowId: AgentId) => void;
  removeFromWindowGroup: (groupId: WindowGroupId, windowId: AgentId) => void;
  setActiveGroupWindow: (groupId: WindowGroupId, windowId: AgentId) => void;
  minimizeWindowGroup: (groupId: WindowGroupId) => void;
  restoreWindowGroup: (groupId: WindowGroupId) => void;
  closeWindowGroup: (groupId: WindowGroupId) => void;
  focusWindowGroup: (groupId: WindowGroupId) => void;
  updateGroupPosition: (groupId: WindowGroupId, position: { x: number, y: number }) => void;
  updateGroupSize: (groupId: WindowGroupId, size: { width: number, height: number }) => void;
  updateGroupTitle: (groupId: WindowGroupId, title: string) => void;
  ungroupWindow: (windowId: AgentId) => void;
  
  // Layout Actions
  saveLayout: (name: string, category?: string, tags?: string[], isDefault?: boolean) => void;
  loadLayout: (id: string) => void;
  deleteLayout: (id: string) => void;
  setDefaultLayout: (id: string) => void;
  
  // Auto-save Actions
  autoSaveCurrentLayout: () => void;
  setAutoSaveEnabled: (enabled: boolean) => void;
  setAutoSaveInterval: (interval: number) => void;
  restoreDefaultLayout: () => void;
  
  // Template Actions
  createLayoutFromTemplate: (templateId: string) => void;
}

// Window layout profiles for quick switching
export interface WindowLayout {
  id: string;
  name: string;
  category?: string; // Optional category like 'Work', 'Personal', 'Development'
  tags?: string[]; // Optional tags for filtering
  isDefault?: boolean; // Whether this layout should be used as default on startup
  createdAt: number; // Timestamp when the layout was created
  updatedAt: number; // Timestamp when the layout was last updated
  windowStates: Record<AgentId, {
    position: { x: number, y: number };
    size: { width: number, height: number };
    isOpen: boolean;
    isMinimized: boolean;
  }>;
}

// Helper to get current timestamp
const getCurrentTimestamp = () => Date.now();

// Auto-save debounce timeout
let autoSaveTimeout: number | null = null;

// Helper to generate unique IDs
const generateId = () => Math.random().toString(36).substring(2, 9);

export const useAgentStore = create<AgentState>()(
  persist(
    (set, get) => ({
      registry: [],
      windows: {},
      focusedAgentId: null,
      highestZIndex: 0,
      layouts: [], // Stored window layouts
      activeLayoutId: null, // Currently active layout
      windowGroups: {}, // Window groups storage
      
      // Auto-save settings
      autoSaveEnabled: true, // Enable auto-save by default
      autoSaveInterval: 60000, // Auto-save every 60 seconds by default
      lastAutoSave: null, // Timestamp of last auto-save

      registerAgent: (agent) => set((state) => {
        // Only register if not already in registry
        if (state.registry.some(a => a.id === agent.id)) {
          return state;
        }

        // Log the registration
        log.info(`Registered new agent: ${agent.title} (${agent.id})`);

        // Create a window for this agent (initially closed)
        const newWindow: AgentWindow = {
          ...agent,
          isOpen: false,
          isMinimized: false,
          position: agent.defaultPosition || { x: 100, y: 100 },
          size: agent.defaultSize || { width: 600, height: 500 },
          zIndex: 0
        };

        return {
          registry: [...state.registry, agent],
          windows: {
            ...state.windows,
            [agent.id]: newWindow
          }
        };
      }),

      openAgent: (id) => {
        // Play open sound (will be imported with implementation)
        import('../lib/audioEffects').then(({ playOpenSound }) => playOpenSound());
        
        set((state) => {
          const agent = state.windows[id];
          if (!agent) return state;
          
          // Log the action
          log.action(`Opening agent window: ${agent.title}`);
  
          // Find the highest z-index among all open windows
          const currentMaxZIndex = Object.values(state.windows).reduce((max, window) => {
            return window.isOpen && !window.isMinimized ? Math.max(max, window.zIndex) : max;
          }, 0);
          
          // Ensure new windows always appear on top, with a higher z-index than any existing window
          const effectiveHighestZIndex = Math.max(currentMaxZIndex, state.highestZIndex);
          
          // Give layout manager a higher priority to always be on top when opened
          // This ensures proper stacking order for key UI elements
          let newZIndex;
          if (id === 'design') {
            // For the design agent, keep z-index lower to prevent glitching
            newZIndex = Math.min(effectiveHighestZIndex, 5);
          } else if (id === 'layout') {
            // For layout manager, ensure it's always on top when opened
            newZIndex = effectiveHighestZIndex + 50; // Much higher z-index
          } else {
            // Regular z-index increment for other windows
            newZIndex = effectiveHighestZIndex + 1;
          }
  
          return {
            windows: {
              ...state.windows,
              [id]: {
                ...agent,
                isOpen: true,
                isMinimized: false,
                zIndex: newZIndex
              }
            },
            focusedAgentId: id,
            highestZIndex: id === 'design' ? effectiveHighestZIndex : newZIndex
          };
        });
      },

      closeAgent: (id) => {
        // Play close sound
        import('../lib/audioEffects').then(({ playCloseSound }) => playCloseSound());
        
        set((state) => {
          const agent = state.windows[id];
          if (!agent) return state;
          
          // Log the action
          log.action(`Closing agent window: ${agent.title}`);
  
          return {
            windows: {
              ...state.windows,
              [id]: {
                ...agent,
                isOpen: false,
                isMinimized: false
              }
            },
            focusedAgentId: state.focusedAgentId === id ? null : state.focusedAgentId
          };
        });
      },

      minimizeAgent: (id) => {
        // Add a small delay to help animation complete properly
        setTimeout(() => {
          set((state) => {
            const agent = state.windows[id];
            if (!agent) return state;
    
            return {
              windows: {
                ...state.windows,
                [id]: {
                  ...agent,
                  isMinimized: true
                }
              },
              focusedAgentId: state.focusedAgentId === id ? null : state.focusedAgentId
            };
          });
        }, 10); // Small delay to help with animation
      },

      restoreAgent: (id) => {
        set((state) => {
          const agent = state.windows[id];
          if (!agent) return state;
          
          // Find the highest z-index among all open windows
          const currentMaxZIndex = Object.values(state.windows).reduce((max, window) => {
            return window.isOpen && !window.isMinimized ? Math.max(max, window.zIndex) : max;
          }, 0);
          
          // Ensure restored windows always appear on top, with a higher z-index than any existing window
          const effectiveHighestZIndex = Math.max(currentMaxZIndex, state.highestZIndex);
  
          // Different z-index handling for special windows
          let newZIndex;
          if (id === 'design') {
            // Design agent stays lower
            newZIndex = Math.min(effectiveHighestZIndex, 5);
          } else if (id === 'layout') {
            // Layout manager gets priority
            newZIndex = effectiveHighestZIndex + 50;
          } else {
            // Regular z-index increment for other windows
            newZIndex = effectiveHighestZIndex + 1;
          }
  
          return {
            windows: {
              ...state.windows,
              [id]: {
                ...agent,
                isMinimized: false,
                zIndex: newZIndex
              }
            },
            focusedAgentId: id,
            highestZIndex: id === 'design' ? effectiveHighestZIndex : newZIndex
          };
        });
      },

      focusAgent: (id) => set((state) => {
        const agent = state.windows[id];
        if (!agent || !agent.isOpen || agent.isMinimized) return state;
        
        // Find the highest z-index among all open windows
        const currentMaxZIndex = Object.values(state.windows).reduce((max, window) => {
          return window.isOpen && !window.isMinimized ? Math.max(max, window.zIndex) : max;
        }, 0);
        
        // Ensure focused windows always appear on top, with a higher z-index than any existing window
        const effectiveHighestZIndex = Math.max(currentMaxZIndex, state.highestZIndex);
        
        // Different z-index handling for special windows
        let newZIndex;
        if (id === 'design') {
          // Design agent stays lower
          newZIndex = Math.min(effectiveHighestZIndex, 10); // Cap at 10 to keep it from rising too high
        } else if (id === 'layout') {
          // Layout manager gets priority to remain on top when focused
          newZIndex = effectiveHighestZIndex + 50;
        } else {
          // Regular z-index increment for other windows
          newZIndex = effectiveHighestZIndex + 1;
        }
        
        // Log the focus change
        log.info(`Focused window: ${agent.title} with z-index ${newZIndex}`);
        
        return {
          windows: {
            ...state.windows,
            [id]: {
              ...agent,
              zIndex: newZIndex
            }
          },
          focusedAgentId: id,
          highestZIndex: id === 'design' ? effectiveHighestZIndex : newZIndex
        };
      }),

      updateAgentPosition: (id, position) => set((state) => {
        const agent = state.windows[id];
        if (!agent) return state;

        return {
          windows: {
            ...state.windows,
            [id]: {
              ...agent,
              position
            }
          }
        };
      }),

      updateAgentSize: (id, size) => set((state) => {
        const agent = state.windows[id];
        if (!agent) return state;

        return {
          windows: {
            ...state.windows,
            [id]: {
              ...agent,
              size
            }
          }
        };
      }),
      
      // Save the current window layout with a given name
      saveLayout: (name, category?: string, tags?: string[], isDefault?: boolean) => set((state) => {
        // Create a snapshot of current window states
        const windowStates: Record<AgentId, {
          position: { x: number, y: number };
          size: { width: number, height: number };
          isOpen: boolean;
          isMinimized: boolean;
        }> = {};
        
        // Capture current state of all windows
        Object.entries(state.windows).forEach(([id, window]) => {
          windowStates[id as AgentId] = {
            position: window.position,
            size: window.size,
            isOpen: window.isOpen,
            isMinimized: window.isMinimized
          };
        });
        
        const timestamp = Date.now();
        
        // Create a new layout object with unique ID
        const newLayout: WindowLayout = {
          id: timestamp.toString(), // Simple unique ID
          name,
          category: category || 'General',
          tags: tags || [],
          isDefault: isDefault || false,
          createdAt: timestamp,
          updatedAt: timestamp,
          windowStates
        };
        
        // Log the layout save action
        log.action(`Saved window layout: "${name}"`);
        
        // Add to layouts collection
        return {
          layouts: [...state.layouts, newLayout],
          activeLayoutId: newLayout.id
        };
      }),
      
      // Load a saved layout by ID
      loadLayout: (id) => set((state) => {
        const layout = state.layouts.find(l => l.id === id);
        if (!layout) return state;
        
        // Log the layout loading action
        log.action(`Applying window layout: "${layout.name}"`);
        
        // Create a new windows state by merging the saved layout with current window data
        const newWindows = { ...state.windows };
        
        // Apply saved positions, sizes, and states to current windows
        Object.entries(layout.windowStates).forEach(([agentId, windowState]) => {
          const id = agentId as AgentId;
          if (newWindows[id]) {
            newWindows[id] = {
              ...newWindows[id],
              position: windowState.position,
              size: windowState.size,
              isOpen: windowState.isOpen,
              isMinimized: windowState.isMinimized
            };
          }
        });
        
        return {
          windows: newWindows,
          activeLayoutId: id
        };
      }),
      
      // Delete a layout by ID
      deleteLayout: (id) => set((state) => {
        const layout = state.layouts.find(l => l.id === id);
        if (layout) {
          // Log the layout deletion action
          log.action(`Deleted window layout: "${layout.name}"`);
        }
        
        return {
          layouts: state.layouts.filter(layout => layout.id !== id),
          activeLayoutId: state.activeLayoutId === id ? null : state.activeLayoutId
        };
      }),
      
      // Set a layout as the default
      setDefaultLayout: (id) => set((state) => {
        // First, find the layout to set as default
        const targetLayout = state.layouts.find(l => l.id === id);
        if (!targetLayout) return state;
        
        // Update all layouts, removing default flag from others and setting it on the target
        const updatedLayouts = state.layouts.map(layout => {
          if (layout.id === id) {
            // Set this layout as default
            return {
              ...layout,
              isDefault: true,
              updatedAt: Date.now()
            };
          } else {
            // Remove default flag from other layouts if present
            return layout.isDefault 
              ? { ...layout, isDefault: false, updatedAt: Date.now() } 
              : layout;
          }
        });
        
        // Log the action
        log.action(`Set "${targetLayout.name}" as default layout`);
        
        return {
          layouts: updatedLayouts
        };
      }),
      
      // Create a new layout from template
      createLayoutFromTemplate: (templateId) => {
        set((state) => {
          // Get the template from the template store
          const template = useTemplateStore.getState().getTemplateById(templateId);
          
          if (!template) {
            log.error(`Template not found: ${templateId}`);
            return state;
          }
          
          // Get agent IDs from registry
          const agentIds = state.registry.map(agent => agent.id);
          
          // Generate window states based on template layout type
          const windowStates = generateWindowStates(template, agentIds);
          
          // Create timestamp for ID and timestamps
          const timestamp = Date.now();
          
          // Create a new layout
          const newLayout: WindowLayout = {
            id: timestamp.toString(),
            name: template.name,
            category: template.category,
            tags: template.tags,
            createdAt: timestamp,
            updatedAt: timestamp,
            windowStates
          };
          
          // Log the action
          log.action(`Created layout from template: "${template.name}"`);
          
          // Create a new windows state by applying template
          const newWindows = { ...state.windows };
          
          // Apply template positions, sizes, and states to current windows
          Object.entries(windowStates).forEach(([agentId, windowState]) => {
            const id = agentId as AgentId;
            if (newWindows[id]) {
              newWindows[id] = {
                ...newWindows[id],
                position: windowState.position,
                size: windowState.size,
                isOpen: windowState.isOpen,
                isMinimized: windowState.isMinimized
              };
            }
          });
          
          return {
            windows: newWindows,
            layouts: [...state.layouts, newLayout],
            activeLayoutId: newLayout.id
          };
        });
      },
      
      // Auto-save related methods
      autoSaveCurrentLayout: () => {
        // Clear any existing timeout to prevent multiple auto-saves
        if (autoSaveTimeout !== null) {
          clearTimeout(autoSaveTimeout);
          autoSaveTimeout = null;
        }
        
        const state = get();
        if (!state.autoSaveEnabled) return;
        
        // Get the current time
        const now = getCurrentTimestamp();
        
        // Check if we need to auto-save based on the interval
        const shouldSave = state.lastAutoSave === null || 
                          (now - state.lastAutoSave) >= state.autoSaveInterval;
                          
        if (shouldSave) {
          // Create a snapshot of current window states
          const windowStates: Record<AgentId, {
            position: { x: number, y: number };
            size: { width: number, height: number };
            isOpen: boolean;
            isMinimized: boolean;
          }> = {};
          
          // Only save windows that are open
          const hasOpenWindows = Object.values(state.windows).some(w => w.isOpen);
          
          if (!hasOpenWindows) {
            // Don't auto-save if no windows are open
            return;
          }
          
          // Capture current state of all windows
          Object.entries(state.windows).forEach(([id, window]) => {
            windowStates[id as AgentId] = {
              position: window.position,
              size: window.size,
              isOpen: window.isOpen,
              isMinimized: window.isMinimized
            };
          });
          
          // Find existing auto-save layout or create a new ID
          const autoSaveLayoutId = "auto-save-layout";
          const existingAutoSaveIndex = state.layouts.findIndex(l => l.name === 'Auto-saved Layout');
          
          const timestamp = getCurrentTimestamp();
          
          // Create or update auto-save layout
          const autoSaveLayout: WindowLayout = {
            id: autoSaveLayoutId,
            name: 'Auto-saved Layout',
            category: 'System',
            tags: ['auto-save'],
            isDefault: false, // Don't make auto-save the default layout
            createdAt: existingAutoSaveIndex >= 0 
              ? state.layouts[existingAutoSaveIndex].createdAt 
              : timestamp,
            updatedAt: timestamp,
            windowStates
          };
          
          // Update layouts - replace existing or add new
          let newLayouts = [...state.layouts];
          if (existingAutoSaveIndex >= 0) {
            newLayouts[existingAutoSaveIndex] = autoSaveLayout;
          } else {
            newLayouts.push(autoSaveLayout);
          }
          
          // Log quiet auto-save
          log.info(`Auto-saved window layout at ${new Date(timestamp).toLocaleTimeString()}`);
          
          // Set the new state
          set({
            layouts: newLayouts,
            lastAutoSave: timestamp
          });
        }
        
        // Schedule next auto-save
        autoSaveTimeout = window.setTimeout(() => {
          get().autoSaveCurrentLayout();
        }, state.autoSaveInterval);
      },
      
      setAutoSaveEnabled: (enabled) => set({
        autoSaveEnabled: enabled
      }),
      
      setAutoSaveInterval: (interval) => set({
        autoSaveInterval: interval
      }),
      
      restoreDefaultLayout: () => {
        const state = get();
        // Find the default layout
        const defaultLayout = state.layouts.find(l => l.isDefault === true);
        
        if (defaultLayout) {
          // Load the default layout
          get().loadLayout(defaultLayout.id);
          return;
        } 
        
        // If no default is set but layouts exist, use the most recent one
        if (state.layouts.length > 0) {
          const mostRecentLayout = [...state.layouts].sort((a, b) => b.updatedAt - a.updatedAt)[0];
          get().loadLayout(mostRecentLayout.id);
          return;
        }
        
        // If no layouts exist, just log a message
        log.info('No layouts available to restore');
      }
    }),
    {
      name: 'panion-agent-store'
    }
  )
);

// This is a no-op function now since we're registering agents in App.tsx
export const initializeAgentRegistry = () => {};