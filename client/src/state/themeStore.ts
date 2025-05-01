import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Theme types
export type ThemeMode = 'light' | 'dark' | 'system';
export type ThemeAccent = 'purple' | 'blue' | 'green' | 'orange' | 'pink';

interface ThemeState {
  mode: ThemeMode;
  accent: ThemeAccent;
  systemPrefersDark: boolean;
  
  // Actions
  setMode: (mode: ThemeMode) => void;
  setAccent: (accent: ThemeAccent) => void;
  setSystemPreference: (prefersDark: boolean) => void;
  
  // Computed
  getCurrentTheme: () => 'light' | 'dark';
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'system',
      accent: 'purple',
      systemPrefersDark: false,
      
      setMode: (mode) => set({ mode }),
      
      setAccent: (accent) => set({ accent }),
      
      setSystemPreference: (prefersDark) => set({ systemPrefersDark: prefersDark }),
      
      getCurrentTheme: () => {
        const { mode, systemPrefersDark } = get();
        if (mode === 'system') {
          return systemPrefersDark ? 'dark' : 'light';
        }
        return mode;
      }
    }),
    {
      name: 'panion-theme-store'
    }
  )
);