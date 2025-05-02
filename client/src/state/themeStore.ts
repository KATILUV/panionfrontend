import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { log } from './systemLogStore';

// Theme types
export type ThemeMode = 'light' | 'dark' | 'system';
export type ThemeAccent = 'purple' | 'blue' | 'green' | 'orange' | 'pink';
export type BackgroundPattern = 'grid' | 'dots' | 'waves' | 'none';
export type ThemePreset = 'system' | 'dark' | 'light' | 'twilight' | 'ocean' | 'forest' | 'sunset' | 'candy';

export interface ThemeSettings {
  mode: ThemeMode;
  accent: ThemeAccent;
  backgroundPattern: BackgroundPattern;
  displayName: string;
}

interface ThemeState {
  activePreset: ThemePreset;
  mode: ThemeMode;
  accent: ThemeAccent;
  backgroundPattern: BackgroundPattern;
  systemPrefersDark: boolean;
  
  // Actions
  setMode: (mode: ThemeMode) => void;
  setAccent: (accent: ThemeAccent) => void;
  setBackgroundPattern: (pattern: BackgroundPattern) => void;
  setSystemPreference: (prefersDark: boolean) => void;
  setThemePreset: (preset: ThemePreset) => void;
  
  // Computed
  getCurrentTheme: () => 'light' | 'dark';
  getThemePresets: () => Record<ThemePreset, ThemeSettings>;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      // Default values
      activePreset: 'system',
      mode: 'system',
      accent: 'purple',
      backgroundPattern: 'grid',
      systemPrefersDark: false,
      
      setMode: (mode) => {
        log.info(`Theme mode changed to: ${mode}`);
        set({ 
          mode,
          activePreset: 'system' // Reset to system when changing individual settings
        });
      },
      
      setAccent: (accent) => {
        log.info(`Theme accent changed to: ${accent}`);
        set({ 
          accent,
          activePreset: 'system' // Reset to system when changing individual settings
        });
      },
      
      setBackgroundPattern: (backgroundPattern) => {
        log.info(`Background pattern changed to: ${backgroundPattern}`);
        set({ 
          backgroundPattern,
          activePreset: 'system' // Reset to system when changing individual settings
        });
      },
      
      setSystemPreference: (prefersDark) => {
        log.info(`System theme preference detected: ${prefersDark ? 'dark' : 'light'}`);
        set({ systemPrefersDark: prefersDark });
      },
      
      setThemePreset: (preset) => {
        const presets = get().getThemePresets();
        const settings = presets[preset];
        
        log.info(`Applying theme preset: ${settings.displayName}`);
        
        set({
          activePreset: preset,
          mode: settings.mode,
          accent: settings.accent,
          backgroundPattern: settings.backgroundPattern
        });
      },
      
      getCurrentTheme: () => {
        const { mode, systemPrefersDark } = get();
        if (mode === 'system') {
          return systemPrefersDark ? 'dark' : 'light';
        }
        return mode;
      },
      
      getThemePresets: () => {
        // Define all available theme presets
        return {
          system: {
            mode: 'system',
            accent: 'purple',
            backgroundPattern: 'grid',
            displayName: 'System Default'
          },
          dark: {
            mode: 'dark',
            accent: 'purple',
            backgroundPattern: 'grid',
            displayName: 'Pure Black'
          },
          light: {
            mode: 'light',
            accent: 'purple',
            backgroundPattern: 'grid',
            displayName: 'Light Mode'
          },
          twilight: {
            mode: 'dark',
            accent: 'purple',
            backgroundPattern: 'dots',
            displayName: 'Twilight'
          },
          ocean: {
            mode: 'dark',
            accent: 'blue',
            backgroundPattern: 'waves',
            displayName: 'Ocean Deep'
          },
          forest: {
            mode: 'dark',
            accent: 'green',
            backgroundPattern: 'grid',
            displayName: 'Forest'
          },
          sunset: {
            mode: 'light',
            accent: 'orange',
            backgroundPattern: 'dots',
            displayName: 'Sunset'
          },
          candy: {
            mode: 'light',
            accent: 'pink',
            backgroundPattern: 'waves',
            displayName: 'Candy'
          }
        };
      }
    }),
    {
      name: 'panion-theme-store'
    }
  )
);