import React, { useEffect } from 'react';
import { useThemeStore, ThemeMode, ThemeAccent } from '../../state/themeStore';

interface ThemeProviderProps {
  children: React.ReactNode;
}

const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const mode = useThemeStore(state => state.mode);
  const accent = useThemeStore(state => state.accent);
  const setSystemPreference = useThemeStore(state => state.setSystemPreference);
  const getCurrentTheme = useThemeStore(state => state.getCurrentTheme);
  
  // Apply the theme classes to the document root
  useEffect(() => {
    const currentTheme = getCurrentTheme();
    
    // Set dark/light mode
    if (currentTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Set accent color
    document.documentElement.setAttribute('data-accent', accent);
    
  }, [mode, accent, getCurrentTheme]);
  
  // Listen for system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Set initial value
    setSystemPreference(mediaQuery.matches);
    
    // Listen for changes
    const handleChange = (event: MediaQueryListEvent) => {
      setSystemPreference(event.matches);
    };
    
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    
    // Legacy support
    if (typeof mediaQuery.addListener === 'function') {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
    
    return undefined;
  }, [setSystemPreference]);
  
  return <>{children}</>;
};

export default ThemeProvider;