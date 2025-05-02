import React, { useEffect, useState } from 'react';
import { useThemeStore, ThemeMode, ThemeAccent, ThemePreset } from '../../state/themeStore';
import { useToast } from '@/hooks/use-toast';

interface ThemeProviderProps {
  children: React.ReactNode;
}

const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const mode = useThemeStore(state => state.mode);
  const accent = useThemeStore(state => state.accent);
  const activePreset = useThemeStore(state => state.activePreset);
  const setSystemPreference = useThemeStore(state => state.setSystemPreference);
  const getCurrentTheme = useThemeStore(state => state.getCurrentTheme);
  const systemPrefersDark = useThemeStore(state => state.systemPrefersDark);
  const [initialSystemPreference, setInitialSystemPreference] = useState<boolean | null>(null);
  const { toast } = useToast();
  
  // Apply the theme classes to the document root
  useEffect(() => {
    const currentTheme = getCurrentTheme();
    
    // Set dark/light mode
    if (currentTheme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    }
    
    // Set accent color
    document.documentElement.setAttribute('data-accent', accent);
    
    // Set theme preset for custom styling
    document.documentElement.setAttribute('data-theme', activePreset);
    
    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      // Custom theme colors
      let themeColor = currentTheme === 'dark' ? '#000000' : '#ffffff';
      
      // Specialty theme colors
      if (activePreset === 'twilight') themeColor = '#211042';
      if (activePreset === 'ocean') themeColor = '#0c2237';
      if (activePreset === 'forest') themeColor = '#0c2714';
      if (activePreset === 'sunset') themeColor = '#fff5eb';
      if (activePreset === 'candy') themeColor = '#fff0f7';
      
      metaThemeColor.setAttribute('content', themeColor);
    }
    
  }, [mode, accent, activePreset, getCurrentTheme, systemPrefersDark]);
  
  // Listen for system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Set initial value
    const isDarkMode = mediaQuery.matches;
    setSystemPreference(isDarkMode);
    setInitialSystemPreference(isDarkMode);
    
    // Listen for changes
    const handleChange = (event: MediaQueryListEvent) => {
      const newIsDarkMode = event.matches;
      setSystemPreference(newIsDarkMode);
      
      // Only show the notification if it's not the first detection and we're in system mode
      if (initialSystemPreference !== null && mode === 'system') {
        toast({
          title: `System theme changed to ${newIsDarkMode ? 'Dark' : 'Light'} mode`,
          description: "Your theme has been updated to match your system preferences",
          duration: 3000,
        });
      }
    };
    
    // Use the standard event listener API where available
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    
    // Legacy support for older browsers
    if (typeof mediaQuery.addListener === 'function') {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
    
    return undefined;
  }, [setSystemPreference, toast, mode, initialSystemPreference]);
  
  return <>{children}</>;
};

export default ThemeProvider;