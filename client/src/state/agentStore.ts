import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AgentId = string;

export interface Agent {
  id: AgentId;
  title: string;
  icon: string;
  component: () => React.ReactNode;
  defaultPosition?: { x: number, y: number };
  defaultSize?: { width: number, height: number };
}

export interface AgentWindow extends Agent {
  isOpen: boolean;
  isMinimized: boolean;
  position: { x: number, y: number };
  size: { width: number, height: number };
  zIndex: number;
}

interface AgentState {
  registry: Agent[];
  windows: Record<AgentId, AgentWindow>;
  focusedAgentId: AgentId | null;
  highestZIndex: number;
  layouts: WindowLayout[];
  activeLayoutId: string | null;

  // Window Actions
  registerAgent: (agent: Agent) => void;
  openAgent: (id: AgentId) => void;
  closeAgent: (id: AgentId) => void;
  minimizeAgent: (id: AgentId) => void;
  restoreAgent: (id: AgentId) => void;
  focusAgent: (id: AgentId) => void;
  updateAgentPosition: (id: AgentId, position: { x: number, y: number }) => void;
  updateAgentSize: (id: AgentId, size: { width: number, height: number }) => void;
  
  // Layout Actions
  saveLayout: (name: string) => void;
  loadLayout: (id: string) => void;
  deleteLayout: (id: string) => void;
}

// Window layout profiles for quick switching
export interface WindowLayout {
  id: string;
  name: string;
  windowStates: Record<AgentId, {
    position: { x: number, y: number };
    size: { width: number, height: number };
    isOpen: boolean;
    isMinimized: boolean;
  }>;
}

export const useAgentStore = create<AgentState>()(
  persist(
    (set) => ({
      registry: [],
      windows: {},
      focusedAgentId: null,
      highestZIndex: 0,
      layouts: [], // Stored window layouts
      activeLayoutId: null, // Currently active layout

      registerAgent: (agent) => set((state) => {
        // Only register if not already in registry
        if (state.registry.some(a => a.id === agent.id)) {
          return state;
        }

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
  
          const newZIndex = state.highestZIndex + 1;
  
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
            highestZIndex: newZIndex
          };
        });
      },

      closeAgent: (id) => {
        // Play close sound
        import('../lib/audioEffects').then(({ playCloseSound }) => playCloseSound());
        
        set((state) => {
          const agent = state.windows[id];
          if (!agent) return state;
  
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

      minimizeAgent: (id) => set((state) => {
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
      }),

      restoreAgent: (id) => set((state) => {
        const agent = state.windows[id];
        if (!agent) return state;

        const newZIndex = state.highestZIndex + 1;

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
          highestZIndex: newZIndex
        };
      }),

      focusAgent: (id) => set((state) => {
        const agent = state.windows[id];
        if (!agent || !agent.isOpen || agent.isMinimized) return state;

        const newZIndex = state.highestZIndex + 1;

        return {
          windows: {
            ...state.windows,
            [id]: {
              ...agent,
              zIndex: newZIndex
            }
          },
          focusedAgentId: id,
          highestZIndex: newZIndex
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
      saveLayout: (name) => set((state) => {
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
        
        // Create a new layout object with unique ID
        const newLayout: WindowLayout = {
          id: Date.now().toString(), // Simple unique ID
          name,
          windowStates
        };
        
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
        return {
          layouts: state.layouts.filter(layout => layout.id !== id),
          activeLayoutId: state.activeLayoutId === id ? null : state.activeLayoutId
        };
      })
    }),
    {
      name: 'panion-agent-store'
    }
  )
);

// This is a no-op function now since we're registering agents in App.tsx
export const initializeAgentRegistry = () => {};