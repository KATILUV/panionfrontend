import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { log } from './systemLogStore';

// Available theme presets
export type ThemePreset = 'system' | 'dark' | 'light' | 'twilight' | 'ocean' | 'forest' | 'sunset';

// Each theme preset contains these settings internally
interface ThemeSettingsInternal {
  mode: 'light' | 'dark' | 'system';
  accent: 'purple' | 'blue' | 'green' | 'orange' | 'pink';
  backgroundPattern: 'grid' | 'dots' | 'waves' | 'none';
  displayName: string;
}

// Simplified theme state
interface ThemeState {
  // The currently active theme preset
  activePreset: ThemePreset;
  
  // System preference detection
  systemPrefersDark: boolean;
  
  // Actions
  setThemePreset: (preset: ThemePreset) => void;
  setSystemPreference: (prefersDark: boolean) => void;
  
  // Computed
  getCurrentTheme: () => 'light' | 'dark';
  getThemePresets: () => Record<ThemePreset, ThemeSettingsInternal>;
  
  // For internal use
  getActiveSettings: () => ThemeSettingsInternal;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      // Default values
      activePreset: 'system',
      systemPrefersDark: false,
      
      setSystemPreference: (prefersDark) => {
        log.info(`System theme preference detected: ${prefersDark ? 'dark' : 'light'}`);
        set({ systemPrefersDark: prefersDark });
      },
      
      setThemePreset: (preset) => {
        const presets = get().getThemePresets();
        const settings = presets[preset];
        
        log.info(`Applying theme preset: ${settings.displayName}`);
        
        set({ activePreset: preset });
      },
      
      // This returns the final light/dark mode based on all settings
      getCurrentTheme: () => {
        const { activePreset, systemPrefersDark } = get();
        const activeSettings = get().getActiveSettings();
        
        if (activeSettings.mode === 'system') {
          return systemPrefersDark ? 'dark' : 'light';
        }
        return activeSettings.mode;
      },
      
      // Get the currently active settings based on the active preset
      getActiveSettings: () => {
        const { activePreset } = get();
        return get().getThemePresets()[activePreset];
      },
      
      // Define all available theme presets
      getThemePresets: () => {
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
            displayName: 'Dark Mode'
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
          }
        };
      }
    }),
    {
      name: 'panion-theme-store'
    }
  )
);