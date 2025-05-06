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
  saveLayout: (name: string, category?: string, tags?: string[], isDefault?: boolean) => void;
  loadLayout: (id: string) => void;
  deleteLayout: (id: string) => void;
  setDefaultLayout: (id: string) => void;
  
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
  
          // For the design agent, keep z-index lower to prevent glitching
          const newZIndex = id === 'design'
            ? Math.min(state.highestZIndex, 5) // Keep it lower than other windows
            : state.highestZIndex + 1;
  
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
            highestZIndex: id === 'design' ? state.highestZIndex : newZIndex
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
  
          // Consistent handling of z-index for design agent
          const newZIndex = id === 'design'
            ? Math.min(state.highestZIndex, 5) // Keep it lower than other windows
            : state.highestZIndex + 1;
  
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
            highestZIndex: id === 'design' ? state.highestZIndex : newZIndex
          };
        });
      },

      focusAgent: (id) => set((state) => {
        const agent = state.windows[id];
        if (!agent || !agent.isOpen || agent.isMinimized) return state;
        
        // If this is the 'design' agent, keep its z-index lower to prevent it from appearing on top of everything
        // This prevents it from becoming glitchy when interacting with animations
        const newZIndex = id === 'design' 
          ? Math.min(state.highestZIndex, 10) // Cap at 10 to keep it from rising too high
          : state.highestZIndex + 1;
        
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
          highestZIndex: id === 'design' ? state.highestZIndex : newZIndex
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
      }
    }),
    {
      name: 'panion-agent-store'
    }
  )
);

// This is a no-op function now since we're registering agents in App.tsx
export const initializeAgentRegistry = () => {};