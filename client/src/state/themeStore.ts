import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { log } from './systemLogStore';

// Theme types - we're only using dark mode now
export type ThemeMode = 'dark';
export type ThemeAccent = 'purple' | 'blue' | 'green' | 'orange' | 'pink' | 'dark' | 'light';

// UI Density settings
export type UIDensity = 'compact' | 'normal' | 'spacious';

interface ThemeState {
  mode: ThemeMode; // Always dark
  accent: ThemeAccent;
  density: UIDensity;
  
  // Actions
  setAccent: (accent: ThemeAccent) => void;
  setDensity: (density: UIDensity) => void;
  
  // Computed
  getCurrentTheme: () => 'dark';
  getSpacingForDensity: (baseSize: number) => number;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'dark', // Fixed to dark mode
      accent: 'purple', // Default purple accent
      density: 'normal', // Default normal density
      
      setAccent: (accent) => {
        log.info(`Theme accent changed to: ${accent}`);
        set({ accent });
      },
      
      setDensity: (density) => {
        log.info(`UI density changed to: ${density}`);
        set({ density });
      },
      
      getCurrentTheme: () => {
        return 'dark'; // Always return dark
      },
      
      // Helper function to calculate spacing based on density
      getSpacingForDensity: (baseSize) => {
        const density = get().density;
        switch (density) {
          case 'compact':
            return baseSize * 0.75; // 25% less space
          case 'spacious':
            return baseSize * 1.25; // 25% more space
          case 'normal':
          default:
            return baseSize; // default size
        }
      }
    }),
    {
      name: 'panion-theme-store'
    }
  )
);