import React, { useEffect } from 'react';
import { useThemeStore } from '../../state/themeStore';
import { useLocation } from 'wouter';

interface ThemeProviderProps {
  children: React.ReactNode;
}

const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const accent = useThemeStore(state => state.accent);
  const [location] = useLocation();
  const isDesktop = location === '/desktop';
  
  // Apply the theme classes to the document root only when not in desktop
  useEffect(() => {
    // Skip global theme application when in desktop route
    if (isDesktop) return;
    
    // Always set dark mode
    document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = 'dark';
    
    // Set accent color
    document.documentElement.setAttribute('data-accent', accent);
    
    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', '#1a1245');
    }
    
  }, [accent, isDesktop]);
  
  // For desktop pages, wrap children in special data attributes for theming
  if (isDesktop) {
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
  
  // For non-desktop pages, just pass through children
  return <>{children}</>;
};

export default ThemeProvider;