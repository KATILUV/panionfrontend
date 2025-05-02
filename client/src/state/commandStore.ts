import { create } from 'zustand';
import { useAgentStore, AgentId } from './agentStore';
import { useThemeStore, ThemeMode, ThemeAccent } from './themeStore';
import { useSystemLogStore } from './systemLogStore';

// Command types 
export type CommandType = 'window' | 'agent' | 'system' | 'theme' | 'suggestion';

// Command interface
export interface Command {
  id: string;
  type: CommandType;
  title: string;
  description?: string;
  icon?: string;
  keywords?: string[];
  action: () => void;
}

interface CommandState {
  isOpen: boolean;
  commands: Command[];
  suggestions: Command[];
  
  // Actions
  setIsOpen: (isOpen: boolean) => void;
  togglePalette: () => void;
  addSuggestion: (command: Command) => void;
  removeSuggestion: (id: string) => void;
  clearSuggestions: () => void;
  
  // Helpers
  getAvailableCommands: () => Command[];
}

export const useCommandStore = create<CommandState>((set, get) => ({
  isOpen: false,
  commands: [],
  suggestions: [],
  
  setIsOpen: (isOpen) => set({ isOpen }),
  
  togglePalette: () => set((state) => ({ isOpen: !state.isOpen })),
  
  addSuggestion: (command) => set((state) => ({
    suggestions: [...state.suggestions.filter(s => s.id !== command.id), command]
  })),
  
  removeSuggestion: (id) => set((state) => ({
    suggestions: state.suggestions.filter(suggestion => suggestion.id !== id)
  })),
  
  clearSuggestions: () => set({ suggestions: [] }),
  
  getAvailableCommands: () => {
    const commands: Command[] = [];
      
      // Get agent-related commands from agentStore
      const agentStore = useAgentStore.getState();
      const agents = agentStore.registry;
      
      // Window control commands
      agents.forEach(agent => {
        const isOpen = agentStore.windows[agent.id]?.isOpen;
        const isMinimized = agentStore.windows[agent.id]?.isMinimized;
      
      if (!isOpen) {
        commands.push({
          id: `open-${agent.id}`,
          type: 'window',
          title: `Open ${agent.title}`,
          description: `Open the ${agent.title} window`,
          icon: agent.icon,
          keywords: ['open', 'launch', 'start', agent.title.toLowerCase()],
          action: () => {
            agentStore.openAgent(agent.id);
            get().setIsOpen(false);
          }
        });
      } else if (isMinimized) {
        commands.push({
          id: `restore-${agent.id}`,
          type: 'window',
          title: `Restore ${agent.title}`,
          description: `Restore the minimized ${agent.title} window`,
          icon: agent.icon,
          keywords: ['restore', 'show', agent.title.toLowerCase()],
          action: () => {
            agentStore.restoreAgent(agent.id);
            get().setIsOpen(false);
          }
        });
      } else {
        commands.push({
          id: `focus-${agent.id}`,
          type: 'window',
          title: `Focus ${agent.title}`,
          description: `Bring ${agent.title} window to front`,
          icon: agent.icon,
          keywords: ['focus', 'front', agent.title.toLowerCase()],
          action: () => {
            agentStore.focusAgent(agent.id);
            get().setIsOpen(false);
          }
        });
        
        commands.push({
          id: `minimize-${agent.id}`,
          type: 'window',
          title: `Minimize ${agent.title}`,
          description: `Minimize the ${agent.title} window`,
          icon: agent.icon,
          keywords: ['minimize', 'hide', agent.title.toLowerCase()],
          action: () => {
            agentStore.minimizeAgent(agent.id);
            get().setIsOpen(false);
          }
        });
        
        commands.push({
          id: `close-${agent.id}`,
          type: 'window',
          title: `Close ${agent.title}`,
          description: `Close the ${agent.title} window`,
          icon: agent.icon,
          keywords: ['close', 'exit', agent.title.toLowerCase()],
          action: () => {
            agentStore.closeAgent(agent.id);
            get().setIsOpen(false);
          }
        });
      }
    });
    
    // Layout-related commands
    agentStore.layouts.forEach(layout => {
      commands.push({
        id: `layout-${layout.id}`,
        type: 'window',
        title: `Load Layout: ${layout.name}`,
        description: `Apply the ${layout.name} window layout`,
        keywords: ['layout', 'window', 'arrange', layout.name.toLowerCase()],
        action: () => {
          agentStore.loadLayout(layout.id);
          get().setIsOpen(false);
        }
      });
    });
    
    // Theme-related commands
    const themeStore = useThemeStore.getState();
    
    const themeModes: ThemeMode[] = ['light', 'dark', 'system'];
    themeModes.forEach(mode => {
      commands.push({
        id: `theme-${mode}`,
        type: 'theme',
        title: `${mode.charAt(0).toUpperCase() + mode.slice(1)} Theme`,
        description: `Switch to ${mode} theme mode`,
        keywords: ['theme', 'mode', 'appearance', mode],
        action: () => {
          themeStore.setMode(mode);
          get().setIsOpen(false);
        }
      });
    });
    
    const themeAccents: ThemeAccent[] = ['purple', 'blue', 'green', 'orange', 'pink'];
    themeAccents.forEach(accent => {
      commands.push({
        id: `accent-${accent}`,
        type: 'theme',
        title: `${accent.charAt(0).toUpperCase() + accent.slice(1)} Accent`,
        description: `Switch to ${accent} accent color`,
        keywords: ['accent', 'color', 'theme', accent],
        action: () => {
          themeStore.setAccent(accent);
          get().setIsOpen(false);
        }
      });
    });
    
    // System commands
    const systemLogStore = useSystemLogStore.getState();
    const systemLogVisible = systemLogStore.isVisible;
    
    commands.push({
      id: 'toggle-logs',
      type: 'system',
      title: systemLogVisible ? 'Hide System Logs' : 'Show System Logs',
      description: systemLogVisible ? 'Hide the system log panel' : 'Show the system log panel',
      keywords: ['logs', 'console', 'system', systemLogVisible ? 'hide' : 'show'],
      action: () => {
        systemLogStore.toggleVisibility();
        get().setIsOpen(false);
      }
    });
    
    commands.push({
      id: 'clear-logs',
      type: 'system',
      title: 'Clear System Logs',
      description: 'Clear all system log entries',
      keywords: ['logs', 'console', 'system', 'clear'],
      action: () => {
        systemLogStore.clearLogs();
        get().setIsOpen(false);
      }
    });
    
    return [...commands, ...get().suggestions];
  }
}));

// Setup keyboard shortcut for command palette
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (event) => {
    // Command/Ctrl + K to open command palette
    if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
      event.preventDefault();
      useCommandStore.getState().togglePalette();
    }
    
    // Escape to close command palette if open
    if (event.key === 'Escape' && useCommandStore.getState().isOpen) {
      useCommandStore.getState().setIsOpen(false);
    }
  });
}