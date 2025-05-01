import { create } from 'zustand';

export type LogType = 'thinking' | 'memory' | 'action' | 'error' | 'info';

export interface LogEntry {
  id: string;
  type: LogType;
  message: string;
  timestamp: Date;
}

interface SystemLogState {
  logs: LogEntry[];
  isVisible: boolean;
  
  // Actions
  addLog: (type: LogType, message: string) => void;
  clearLogs: () => void;
  toggleVisibility: () => void;
  setVisibility: (visible: boolean) => void;
}

export const useSystemLogStore = create<SystemLogState>()((set) => ({
  logs: [],
  isVisible: false,
  
  addLog: (type, message) => set((state) => ({
    logs: [
      {
        id: crypto.randomUUID(),
        type,
        message,
        timestamp: new Date()
      },
      ...state.logs
    ].slice(0, 100) // Limit to last 100 logs
  })),
  
  clearLogs: () => set({ logs: [] }),
  
  toggleVisibility: () => set((state) => ({ 
    isVisible: !state.isVisible 
  })),
  
  setVisibility: (visible) => set({ 
    isVisible: visible 
  })
}));

// Helper functions to make logs with specific types
export const log = {
  thinking: (message: string) => useSystemLogStore.getState().addLog('thinking', message),
  memory: (message: string) => useSystemLogStore.getState().addLog('memory', message),
  action: (message: string) => useSystemLogStore.getState().addLog('action', message),
  error: (message: string) => useSystemLogStore.getState().addLog('error', message),
  info: (message: string) => useSystemLogStore.getState().addLog('info', message)
};