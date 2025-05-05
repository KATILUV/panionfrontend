/**
 * This component has been removed as it was creating a duplicate Settings button.
 * The main Settings functionality is now managed through the Taskbar settings button.
 * Please use the official settings in the Taskbar instead.
 */
import React from 'react';
import { useThemeStore, ThemeAccent } from '../../state/themeStore';
import { useToast } from '@/hooks/use-toast';

interface ThemeSelectorProps {
  children?: React.ReactNode;
}

/**
 * This component has been DISABLED as it was causing duplicate settings buttons
 * Settings functionality is now centralized in the Taskbar
 */
const ThemeSelector: React.FC<ThemeSelectorProps> = ({ children }) => {
  // Keep core functionality for compatibility but don't render any UI
  return null;
};

export default ThemeSelector;