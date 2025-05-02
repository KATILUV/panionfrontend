import React, { useEffect, useState } from 'react';
import { useThemeStore } from '../../state/themeStore';
import { useToast } from '@/hooks/use-toast';

interface ThemeProviderProps {
  children: React.ReactNode;
}

const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const activePreset = useThemeStore(state => state.activePreset);
  const getActiveSettings = useThemeStore(state => state.getActiveSettings);
  const setSystemPreference = useThemeStore(state => state.setSystemPreference);
  const getCurrentTheme = useThemeStore(state => state.getCurrentTheme);
  const systemPrefersDark = useThemeStore(state => state.systemPrefersDark);
  const [initialSystemPreference, setInitialSystemPreference] = useState<boolean | null>(null);
  const { toast } = useToast();
  
  // Apply the theme classes to the document root
  useEffect(() => {
    const currentTheme = getCurrentTheme();
    const activeSettings = getActiveSettings();
    
    // Set dark/light mode
    if (currentTheme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    }
    
    // Set accent color
    document.documentElement.setAttribute('data-accent', activeSettings.accent);
    
    // Set background pattern
    document.documentElement.setAttribute('data-pattern', activeSettings.backgroundPattern);
    
    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        'content', 
        currentTheme === 'dark' ? '#1a1245' : '#ffffff'
      );
    }
    
  }, [activePreset, getCurrentTheme, getActiveSettings, systemPrefersDark]);
  
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
      
      // Only show the notification if it's not the first detection and we're using system preset
      if (initialSystemPreference !== null && activePreset === 'system') {
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
  }, [setSystemPreference, toast, activePreset, initialSystemPreference]);
  
  return <>{children}</>;
};

export default ThemeProvider;