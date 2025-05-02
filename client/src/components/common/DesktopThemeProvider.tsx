import React, { useEffect, useState } from 'react';
import { useThemeStore, ThemeMode, ThemeAccent } from '../../state/themeStore';
import { useToast } from '@/hooks/use-toast';

interface DesktopThemeProviderProps {
  children: React.ReactNode;
}

/**
 * A special theme provider specifically for the Desktop environment
 * that doesn't affect global document styles (only applies within its children)
 */
const DesktopThemeProvider: React.FC<DesktopThemeProviderProps> = ({ children }) => {
  const mode = useThemeStore(state => state.mode);
  const accent = useThemeStore(state => state.accent);
  const setSystemPreference = useThemeStore(state => state.setSystemPreference);
  const getCurrentTheme = useThemeStore(state => state.getCurrentTheme);
  const systemPrefersDark = useThemeStore(state => state.systemPrefersDark);
  const [initialSystemPreference, setInitialSystemPreference] = useState<boolean | null>(null);
  const { toast } = useToast();
  
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
  
  // We'll pass down the current theme mode and accent via data attributes that only affect this subtree
  const currentTheme = getCurrentTheme();
  
  return (
    <div 
      data-theme-mode={currentTheme} 
      data-accent={accent}
      className={`${currentTheme === 'dark' ? 'dark' : ''}`}
    >
      {children}
    </div>
  );
};

export default DesktopThemeProvider;