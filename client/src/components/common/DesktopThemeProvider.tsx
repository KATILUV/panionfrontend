import React from 'react';
import { useThemeStore } from '../../state/themeStore';

interface DesktopThemeProviderProps {
  children: React.ReactNode;
}

/**
 * A special theme provider specifically for the Desktop environment
 * that doesn't affect global document styles (only applies within its children)
 * Now simplified to always use dark mode
 */
const DesktopThemeProvider: React.FC<DesktopThemeProviderProps> = ({ children }) => {
  const accent = useThemeStore(state => state.accent);
  
  // Always use dark mode with the selected accent color
  return (
    <div 
      data-theme-mode="dark" 
      data-accent={accent}
      className="dark"
    >
      {children}
    </div>
  );
};

export default DesktopThemeProvider;