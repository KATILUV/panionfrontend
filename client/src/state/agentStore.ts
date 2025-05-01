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

  // Actions
  registerAgent: (agent: Agent) => void;
  openAgent: (id: AgentId) => void;
  closeAgent: (id: AgentId) => void;
  minimizeAgent: (id: AgentId) => void;
  restoreAgent: (id: AgentId) => void;
  focusAgent: (id: AgentId) => void;
  updateAgentPosition: (id: AgentId, position: { x: number, y: number }) => void;
  updateAgentSize: (id: AgentId, size: { width: number, height: number }) => void;
}

export const useAgentStore = create<AgentState>()(
  persist(
    (set) => ({
      registry: [],
      windows: {},
      focusedAgentId: null,
      highestZIndex: 0,

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

      openAgent: (id) => set((state) => {
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
      }),

      closeAgent: (id) => set((state) => {
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
      }),

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
      })
    }),
    {
      name: 'panion-agent-store'
    }
  )
);

// This is a no-op function now since we're registering agents in App.tsx
export const initializeAgentRegistry = () => {};