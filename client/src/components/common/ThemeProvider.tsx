import React, { useEffect, useState } from 'react';
import { useThemeStore, ThemeMode, ThemeAccent } from '../../state/themeStore';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

interface ThemeProviderProps {
  children: React.ReactNode;
}

const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const mode = useThemeStore(state => state.mode);
  const accent = useThemeStore(state => state.accent);
  const setSystemPreference = useThemeStore(state => state.setSystemPreference);
  const getCurrentTheme = useThemeStore(state => state.getCurrentTheme);
  const systemPrefersDark = useThemeStore(state => state.systemPrefersDark);
  const [initialSystemPreference, setInitialSystemPreference] = useState<boolean | null>(null);
  const { toast } = useToast();
  const [location] = useLocation();
  const isDesktop = location === '/desktop';
  
  // Apply the theme classes to the document root only when not in desktop
  useEffect(() => {
    // Skip global theme application when in desktop route
    if (isDesktop) return;
    
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
    
    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        'content', 
        currentTheme === 'dark' ? '#1a1245' : '#ffffff'
      );
    }
    
    // Make sure to clean up when component is unmounted
    return () => {
      // We don't clean up because other pages still need the theme
    };
    
  }, [mode, accent, getCurrentTheme, systemPrefersDark, isDesktop]);
  
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
      // And we're in desktop mode where theme changes are more relevant
      if (initialSystemPreference !== null && mode === 'system' && isDesktop) {
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
  }, [setSystemPreference, toast, mode, initialSystemPreference, isDesktop]);
  
  // For desktop pages, wrap children in special data attributes for theming
  if (isDesktop) {
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
  }
  
  // For non-desktop pages, just pass through children
  return <>{children}</>;
};

export default ThemeProvider;