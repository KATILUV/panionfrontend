import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { log } from './systemLogStore';
import React from 'react';

export type AgentId = string;

export interface AgentCapability {
  id: string;
  name: string;
  description: string;
  icon?: string;
}

export interface Agent {
  id: AgentId;
  title: string;
  icon: string;
  component: () => React.ReactNode;
  defaultPosition?: { x: number, y: number };
  defaultSize?: { width: number, height: number };
  capabilities?: string[]; // List of capabilities this agent provides
  isDynamic?: boolean;     // Whether this agent was dynamically generated
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
  
  // Dynamic agent capabilities
  capabilities: Record<string, AgentCapability>;
  dynamicAgentCreationInProgress: boolean;
  
  // Dynamic agent functions
  registerCapability: (capability: AgentCapability) => void;
  hasCapability: (capabilityId: string) => boolean;
  createDynamicAgent: (params: {
    name: string;
    description: string;
    capabilities: string[];
    icon?: string;
  }) => Promise<AgentId | null>;

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
  
  // No template actions - using our simplified direct layout system from layoutUtils.ts
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
      
      // Agent capabilities & dynamic creation
      capabilities: {}, // Registry of all available capabilities
      dynamicAgentCreationInProgress: false, // Flag to indicate if a new agent is being created
      
      // Auto-save settings
      autoSaveEnabled: true, // Enable auto-save by default
      autoSaveInterval: 60000, // Auto-save every 60 seconds by default
      lastAutoSave: null, // Timestamp of last auto-save,

      // Dynamic agent capability management
      registerCapability: (capability) => set((state) => {
        if (state.capabilities[capability.id]) {
          // Capability already registered
          return state;
        }
        
        log.info(`Registered new capability: ${capability.name} (${capability.id})`);
        
        return {
          capabilities: {
            ...state.capabilities,
            [capability.id]: capability
          }
        };
      }),
      
      hasCapability: (capabilityId) => {
        const state = get();
        
        // First check if the capability exists in the registry
        if (state.capabilities[capabilityId]) return true;
        
        // Otherwise check if any agent provides this capability
        return state.registry.some(agent => 
          agent.capabilities && agent.capabilities.includes(capabilityId)
        );
      },
      
      createDynamicAgent: async (params) => {
        const { name, description, capabilities, icon = 'Cpu' } = params;
        
        set({ dynamicAgentCreationInProgress: true });
        log.info(`Creating dynamic agent "${name}" with capabilities: ${capabilities.join(', ')}`);
        
        try {
          // Call the server API to generate the agent code
          const response = await fetch('/api/panion/create-agent', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              name,
              description,
              capabilities
            })
          });
          
          if (!response.ok) {
            throw new Error(`Failed to create agent: ${response.statusText}`);
          }
          
          const data = await response.json();
          
          if (!data.success) {
            throw new Error(data.error || 'Unknown error creating agent');
          }
          
          // Generate a unique ID for the new agent
          const agentId = `dynamic_${generateId()}`;
          
          // Create dynamic component for the agent
          const DynamicAgentComponent = React.lazy(() => import('../components/agents/DynamicAgent'));
          
          // Register the new agent
          const agent: Agent = {
            id: agentId,
            title: name,
            icon,
            capabilities,
            isDynamic: true,
            component: () => React.createElement(
              React.Suspense, 
              { fallback: React.createElement('div', {}, 'Loading agent...') },
              React.createElement(DynamicAgentComponent, {
                agentId,
                name,
                description,
                capabilities,
                codeInfo: data.codeInfo
              })
            )
          };
          
          get().registerAgent(agent);
          
          // Automatically open the newly created agent
          setTimeout(() => {
            get().openAgent(agentId);
          }, 500);
          
          log.info(`Successfully created dynamic agent "${name}" with ID ${agentId}`);
          return agentId;
        } catch (error: any) {
          const errorMessage = error?.message || 'Unknown error';
          log.error(`Failed to create dynamic agent: ${errorMessage}`);
          return null;
        } finally {
          set({ dynamicAgentCreationInProgress: false });
        }
      },

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
        
        // Get highest z-index from both windows and window groups
        const windowsMaxZ = Object.values(state.windows).reduce((max, window) => {
          return window.isOpen && !window.isMinimized ? Math.max(max, window.zIndex) : max;
        }, 0);
        
        const groupsMaxZ = Object.values(state.windowGroups).reduce((max, group) => {
          return !group.isMinimized ? Math.max(max, group.zIndex) : max;
        }, 0);
        
        // Find the true highest z-index in the system
        const currentMaxZIndex = Math.max(windowsMaxZ, groupsMaxZ);
        
        // Ensure focused windows always appear on top with a higher z-index
        const effectiveHighestZIndex = Math.max(currentMaxZIndex, state.highestZIndex) + 1;
        
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
      
      // Deprecated - Use layoutUtils.ts instead
      createLayoutFromTemplate: (templateId: string) => {
        log.warn('The template system is deprecated. Use layoutUtils.ts instead.');
        // Import and use the new layout utility instead
        import('../lib/layoutUtils').then(({ ApplyLayout }) => {
          // Default to focus mode as fallback
          ApplyLayout.focusMode('clara');
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
      },
      
      // Window Group Actions
      createWindowGroup: (windowIds, title) => {
        const defaultTitle = windowIds.length > 0 
          ? `Group: ${get().windows[windowIds[0]]?.title || 'Windows'}` 
          : 'Window Group';
        
        const groupId = `group-${generateId()}`;
        const initialPosition = windowIds.length > 0 
          ? get().windows[windowIds[0]]?.position 
          : { x: 100, y: 100 };
        const initialSize = windowIds.length > 0 
          ? get().windows[windowIds[0]]?.size 
          : { width: 700, height: 500 };
          
        const currentMaxZIndex = Object.values(get().windows).reduce(
          (max, window) => window.isOpen && !window.isMinimized ? Math.max(max, window.zIndex) : max, 
          0
        );
        
        set(state => {
          const updatedWindows = { ...state.windows };
          
          // Update all windows to be part of this group
          windowIds.forEach((windowId, index) => {
            if (updatedWindows[windowId]) {
              updatedWindows[windowId] = {
                ...updatedWindows[windowId],
                groupId,
                isActiveInGroup: index === 0 // First window is active by default
              };
            }
          });
          
          // Create the window group
          const newGroup: WindowGroup = {
            id: groupId,
            title: title || defaultTitle,
            windows: [...windowIds],
            activeWindowId: windowIds.length > 0 ? windowIds[0] : undefined,
            position: initialPosition,
            size: initialSize,
            zIndex: currentMaxZIndex + 1,
            isMinimized: false,
            createdAt: Date.now()
          };
          
          log.action(`Created window group: "${newGroup.title}" with ${windowIds.length} windows`);
          
          return {
            windows: updatedWindows,
            windowGroups: {
              ...state.windowGroups,
              [groupId]: newGroup
            },
            highestZIndex: currentMaxZIndex + 1
          };
        });
        
        return groupId;
      },
      
      addToWindowGroup: (groupId, windowId) => set(state => {
        const group = state.windowGroups[groupId];
        const window = state.windows[windowId];
        
        if (!group || !window) return state;
        
        // Don't add if already in this group
        if (window.groupId === groupId) return state;
        
        // If window is in another group, remove it first
        if (window.groupId) {
          const oldGroup = state.windowGroups[window.groupId];
          if (oldGroup) {
            state.windowGroups[window.groupId] = {
              ...oldGroup,
              windows: oldGroup.windows.filter(id => id !== windowId)
            };
          }
        }
        
        log.action(`Added window "${window.title}" to group "${group.title}"`);
        
        return {
          windows: {
            ...state.windows,
            [windowId]: {
              ...window,
              groupId,
              isActiveInGroup: false
            }
          },
          windowGroups: {
            ...state.windowGroups,
            [groupId]: {
              ...group,
              windows: [...group.windows, windowId]
            }
          }
        };
      }),
      
      removeFromWindowGroup: (groupId, windowId) => set(state => {
        const group = state.windowGroups[groupId];
        const window = state.windows[windowId];
        
        if (!group || !window || window.groupId !== groupId) return state;
        
        const updatedWindows = group.windows.filter(id => id !== windowId);
        
        log.action(`Removed window "${window.title}" from group "${group.title}"`);
        
        // If this was the active window, set a new active window
        let activeWindowId = group.activeWindowId;
        if (activeWindowId === windowId && updatedWindows.length > 0) {
          activeWindowId = updatedWindows[0];
        }
        
        // Update the group
        const updatedGroup = {
          ...group,
          windows: updatedWindows,
          activeWindowId: updatedWindows.length > 0 ? activeWindowId : undefined
        };
        
        // Update all windows
        const updatedWindowsState = { ...state.windows };
        
        // Remove window from group
        updatedWindowsState[windowId] = {
          ...window,
          groupId: undefined,
          isActiveInGroup: false
        };
        
        // If this was active, make another window active
        if (window.isActiveInGroup && activeWindowId) {
          updatedWindowsState[activeWindowId] = {
            ...updatedWindowsState[activeWindowId],
            isActiveInGroup: true
          };
        }
        
        // If the group is now empty, remove it
        if (updatedWindows.length === 0) {
          const { [groupId]: _, ...remainingGroups } = state.windowGroups;
          
          log.action(`Removed empty group "${group.title}"`);
          
          return {
            windows: updatedWindowsState,
            windowGroups: remainingGroups
          };
        }
        
        return {
          windows: updatedWindowsState,
          windowGroups: {
            ...state.windowGroups,
            [groupId]: updatedGroup
          }
        };
      }),
      
      setActiveGroupWindow: (groupId, windowId) => set(state => {
        const group = state.windowGroups[groupId];
        if (!group || !group.windows.includes(windowId)) return state;
        
        const updatedWindows = { ...state.windows };
        
        // Clear active state from all windows in the group
        group.windows.forEach(id => {
          if (updatedWindows[id]) {
            updatedWindows[id] = {
              ...updatedWindows[id],
              isActiveInGroup: id === windowId
            };
          }
        });
        
        log.action(`Set window "${updatedWindows[windowId]?.title}" as active in group "${group.title}"`);
        
        return {
          windows: updatedWindows,
          windowGroups: {
            ...state.windowGroups,
            [groupId]: {
              ...group,
              activeWindowId: windowId
            }
          }
        };
      }),
      
      minimizeWindowGroup: (groupId) => set(state => {
        const group = state.windowGroups[groupId];
        if (!group) return state;
        
        log.action(`Minimized window group: "${group.title}"`);
        
        return {
          windowGroups: {
            ...state.windowGroups,
            [groupId]: {
              ...group,
              isMinimized: true
            }
          }
        };
      }),
      
      restoreWindowGroup: (groupId) => set(state => {
        const group = state.windowGroups[groupId];
        if (!group) return state;
        
        log.action(`Restored window group: "${group.title}"`);
        
        // Find the highest z-index among all open windows and groups
        const windowsMaxZIndex = Object.values(state.windows).reduce(
          (max, window) => window.isOpen && !window.isMinimized ? Math.max(max, window.zIndex) : max, 
          0
        );
        
        const groupsMaxZIndex = Object.values(state.windowGroups).reduce(
          (max, group) => !group.isMinimized ? Math.max(max, group.zIndex) : max, 
          0
        );
        
        const currentMaxZIndex = Math.max(windowsMaxZIndex, groupsMaxZIndex, state.highestZIndex);
        const newZIndex = currentMaxZIndex + 1;
        
        return {
          windowGroups: {
            ...state.windowGroups,
            [groupId]: {
              ...group,
              isMinimized: false,
              zIndex: newZIndex
            }
          },
          highestZIndex: newZIndex
        };
      }),
      
      closeWindowGroup: (groupId) => set(state => {
        const group = state.windowGroups[groupId];
        if (!group) return state;
        
        // Remove group reference from all windows
        const updatedWindows = { ...state.windows };
        group.windows.forEach(windowId => {
          if (updatedWindows[windowId]) {
            updatedWindows[windowId] = {
              ...updatedWindows[windowId],
              groupId: undefined,
              isActiveInGroup: false
            };
          }
        });
        
        log.action(`Closed window group: "${group.title}"`);
        
        // Remove the group
        const { [groupId]: _, ...remainingGroups } = state.windowGroups;
        
        return {
          windows: updatedWindows,
          windowGroups: remainingGroups
        };
      }),
      
      focusWindowGroup: (groupId) => set(state => {
        const group = state.windowGroups[groupId];
        if (!group || group.isMinimized) return state;
        
        // Find the highest z-index
        const windowsMaxZIndex = Object.values(state.windows).reduce(
          (max, window) => window.isOpen && !window.isMinimized ? Math.max(max, window.zIndex) : max, 
          0
        );
        
        const groupsMaxZIndex = Object.values(state.windowGroups).reduce(
          (max, g) => !g.isMinimized ? Math.max(max, g.zIndex) : max, 
          0
        );
        
        const currentMaxZIndex = Math.max(windowsMaxZIndex, groupsMaxZIndex, state.highestZIndex);
        const newZIndex = currentMaxZIndex + 1;
        
        log.action(`Focused window group: "${group.title}"`);
        
        return {
          windowGroups: {
            ...state.windowGroups,
            [groupId]: {
              ...group,
              zIndex: newZIndex
            }
          },
          highestZIndex: newZIndex
        };
      }),
      
      updateGroupPosition: (groupId, position) => set(state => {
        const group = state.windowGroups[groupId];
        if (!group) return state;
        
        return {
          windowGroups: {
            ...state.windowGroups,
            [groupId]: {
              ...group,
              position
            }
          }
        };
      }),
      
      updateGroupSize: (groupId, size) => set(state => {
        const group = state.windowGroups[groupId];
        if (!group) return state;
        
        return {
          windowGroups: {
            ...state.windowGroups,
            [groupId]: {
              ...group,
              size
            }
          }
        };
      }),
      
      updateGroupTitle: (groupId, title) => set(state => {
        const group = state.windowGroups[groupId];
        if (!group) return state;
        
        log.action(`Renamed window group from "${group.title}" to "${title}"`);
        
        return {
          windowGroups: {
            ...state.windowGroups,
            [groupId]: {
              ...group,
              title
            }
          }
        };
      }),
      
      ungroupWindow: (windowId) => set(state => {
        const window = state.windows[windowId];
        if (!window || !window.groupId) return state;
        
        const groupId = window.groupId;
        const group = state.windowGroups[groupId];
        
        if (!group) {
          // If group doesn't exist, just remove the reference from the window
          return {
            windows: {
              ...state.windows,
              [windowId]: {
                ...window,
                groupId: undefined,
                isActiveInGroup: false
              }
            }
          };
        }
        
        // Remove window from group
        const updatedWindows = { ...state.windows };
        updatedWindows[windowId] = {
          ...window,
          groupId: undefined,
          isActiveInGroup: false
        };
        
        // Update group
        const updatedGroupWindows = group.windows.filter(id => id !== windowId);
        
        log.action(`Removed window "${window.title}" from group "${group.title}"`);
        
        // If this was the active window, update the active window
        let activeWindowId = group.activeWindowId;
        if (activeWindowId === windowId && updatedGroupWindows.length > 0) {
          activeWindowId = updatedGroupWindows[0];
          updatedWindows[activeWindowId] = {
            ...updatedWindows[activeWindowId],
            isActiveInGroup: true
          };
        }
        
        // If the group is now empty, remove it
        if (updatedGroupWindows.length === 0) {
          const { [groupId]: _, ...remainingGroups } = state.windowGroups;
          
          log.action(`Removed empty group "${group.title}"`);
          
          return {
            windows: updatedWindows,
            windowGroups: remainingGroups
          };
        }
        
        // Otherwise update the group
        return {
          windows: updatedWindows,
          windowGroups: {
            ...state.windowGroups,
            [groupId]: {
              ...group,
              windows: updatedGroupWindows,
              activeWindowId: activeWindowId !== windowId ? activeWindowId : updatedGroupWindows[0]
            }
          }
        };
      })
    }),
    {
      name: 'panion-agent-store'
    }
  )
);

// This is a no-op function now since we're registering agents in App.tsx
export const initializeAgentRegistry = () => {
  const store = useAgentStore.getState();
  
  // Register the core agents
  store.registerAgent({
    id: 'clara',
    title: 'Clara',
    icon: 'brain',
    component: () => null,
    defaultPosition: { x: 50, y: 50 },
    defaultSize: { width: 500, height: 600 }
  });
  
  store.registerAgent({
    id: 'notes',
    title: 'Notes',
    icon: 'file-text',
    component: () => null,
    defaultPosition: { x: 600, y: 50 },
    defaultSize: { width: 450, height: 550 }
  });
  
  store.registerAgent({
    id: 'settings',
    title: 'Settings',
    icon: 'settings',
    component: () => null,
    defaultPosition: { x: 250, y: 150 },
    defaultSize: { width: 600, height: 500 }
  });
  
  store.registerAgent({
    id: 'marketplace',
    title: 'Marketplace',
    icon: 'shopping-cart',
    component: () => null,
    defaultPosition: { x: 100, y: 100 },
    defaultSize: { width: 700, height: 600 }
  });
  
  store.registerAgent({
    id: 'panion',
    title: 'Panion Chat',
    icon: 'message-square',
    component: () => null,
    defaultPosition: { x: 200, y: 200 },
    defaultSize: { width: 550, height: 650 }
  });
  
  // Register the Daddy Data agent
  store.registerAgent({
    id: 'daddy-data',
    title: 'Daddy Data',
    icon: 'database',
    component: () => null,
    defaultPosition: { x: 150, y: 150 },
    defaultSize: { width: 800, height: 700 }
  });
};