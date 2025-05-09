import React, { useEffect } from 'react';
import { useThemeStore } from '../../state/themeStore';
import { useLocation } from 'wouter';

interface ThemeProviderProps {
  children: React.ReactNode;
  forceMode?: 'global' | 'local';
}

/**
 * UnifiedThemeProvider combines functionality from both ThemeProvider and DesktopThemeProvider
 * - Automatically detects if we're in the desktop route 
 * - Applies theme globally or locally as appropriate
 * - Can be forced into a specific mode with the forceMode prop
 */
const UnifiedThemeProvider: React.FC<ThemeProviderProps> = ({ 
  children,
  forceMode
}) => {
  const accent = useThemeStore(state => state.accent);
  const [location] = useLocation();
  const isDesktop = location === '/desktop';
  
  // Determine if we should apply theme globally or locally
  const useLocalTheme = forceMode === 'local' || (forceMode !== 'global' && isDesktop);
  
  // Apply theme classes to document root when using global theme mode
  useEffect(() => {
    if (useLocalTheme) return;
    
    // Always use dark mode
    document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = 'dark';
    
    // Apply transition class before changing theme
    document.documentElement.classList.add('theme-transition');
    
    // Set accent color
    document.documentElement.setAttribute('data-accent', accent);
    
    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      switch (accent) {
        case 'purple':
          metaThemeColor.setAttribute('content', '#1a1245');
          break;
        case 'blue':
          metaThemeColor.setAttribute('content', '#0a1a2f');
          break;
        case 'green':
          metaThemeColor.setAttribute('content', '#0f2922');
          break;
        case 'orange': // black
          metaThemeColor.setAttribute('content', '#0a0a0a');
          break;
        case 'pink':
          metaThemeColor.setAttribute('content', '#5a2641');
          break;
        default:
          metaThemeColor.setAttribute('content', '#1a1245');
      }
    }
    
    // Remove transition class after a delay to prevent transition on initial load
    const timer = setTimeout(() => {
      document.documentElement.classList.remove('theme-transition');
    }, 400);
    
    return () => clearTimeout(timer);
  }, [accent, useLocalTheme]);
  
  // For local theme mode, wrap children with theme attributes
  if (useLocalTheme) {
    return (
      <div 
        data-theme-mode="dark" 
        data-accent={accent}
        className="dark"
      >
        {children}
      </div>
    );
  }
  
  // For global theme mode, just pass children through
  return <>{children}</>;
};

export default UnifiedThemeProvider;