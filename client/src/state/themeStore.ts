import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { log } from './systemLogStore';

// Theme types - we're only using dark mode now
export type ThemeMode = 'dark';
export type ThemeAccent = 'purple' | 'blue' | 'green' | 'orange' | 'pink';

interface ThemeState {
  mode: ThemeMode; // Always dark
  accent: ThemeAccent;
  
  // Actions
  setAccent: (accent: ThemeAccent) => void;
  
  // Computed
  getCurrentTheme: () => 'dark';
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'dark', // Fixed to dark mode
      accent: 'purple', // Default purple accent
      
      setAccent: (accent) => {
        log.info(`Theme accent changed to: ${accent}`);
        set({ accent });
      },
      
      getCurrentTheme: () => {
        return 'dark'; // Always return dark
      }
    }),
    {
      name: 'panion-theme-store'
    }
  )
);