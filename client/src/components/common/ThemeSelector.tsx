import React, { useEffect } from 'react';
import { useThemeStore, ThemeMode, ThemeAccent } from '../../state/themeStore';
import { Button } from '@/components/ui/button';
import { 
  Sun, 
  Moon, 
  Monitor, 
  Palette,
  CheckCircle2,
  Info
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useAgentStore } from '@/state/agentStore';

interface ThemeSelectorProps {
  children?: React.ReactNode;
}

const ThemeSelector: React.FC<ThemeSelectorProps> = ({ children }) => {
  const mode = useThemeStore(state => state.mode);
  const accent = useThemeStore(state => state.accent);
  const setMode = useThemeStore(state => state.setMode);
  const setAccent = useThemeStore(state => state.setAccent);
  const getCurrentTheme = useThemeStore(state => state.getCurrentTheme);
  const systemPrefersDark = useThemeStore(state => state.systemPrefersDark);
  const { toast } = useToast();
  const openSettingsAgent = useAgentStore(state => state.openAgent);

  // Define available accent colors
  const accentColors: Array<{ id: ThemeAccent, name: string, color: string }> = [
    { id: 'purple', name: 'Purple', color: 'bg-purple-500' },
    { id: 'blue', name: 'Blue', color: 'bg-blue-500' },
    { id: 'green', name: 'Green', color: 'bg-green-500' },
    { id: 'orange', name: 'Orange', color: 'bg-amber-500' }, // Prettier orange (amber) shade
    { id: 'pink', name: 'Pink', color: 'bg-fuchsia-400' }    // Prettier pink (fuchsia) shade
  ];

  const handleModeChange = (newMode: ThemeMode) => {
    setMode(newMode);
    
    let description;
    if (newMode === 'system') {
      const currentSystemTheme = systemPrefersDark ? 'dark' : 'light';
      description = `Theme will follow your system preference (currently ${currentSystemTheme})`;
    } else {
      description = `Theme mode set to ${newMode}`;
    }
    
    toast({
      title: 'Theme Updated',
      description,
    });
  };

  const handleAccentChange = (newAccent: ThemeAccent) => {
    setAccent(newAccent);
    toast({
      title: 'Accent Color Updated',
      description: `Accent color set to ${newAccent}`,
    });
  };

  // Get icon based on current theme
  const getThemeIcon = () => {
    const currentTheme = getCurrentTheme();
    if (mode === 'system') return <Monitor size={18} />;
    return currentTheme === 'dark' ? <Moon size={18} /> : <Sun size={18} />;
  };

  // Display automatic theme change notifications
  useEffect(() => {
    // Only show notifications for system theme changes
    if (mode === 'system') {
      const metaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleSystemChange = (e: MediaQueryListEvent) => {
        const newMode = e.matches ? 'dark' : 'light';
        toast({
          title: `System Theme Changed`,
          description: `Your device switched to ${newMode} mode`,
          duration: 3000,
        });
      };
      
      metaQuery.addEventListener('change', handleSystemChange);
      return () => metaQuery.removeEventListener('change', handleSystemChange);
    }
  }, [mode, toast]);

  // Removed the Dialog component and replaced with a button to open the settings panel
  const handleOpenSettings = () => {
    openSettingsAgent('settings');
  };

  return (
    <>
      {children ? (
        // If children are provided, use them as the trigger
        <div onClick={handleOpenSettings}>
          {children}
        </div>
      ) : (
        // Otherwise, use default button
        <Button 
          variant="ghost" 
          size="sm" 
          className={`flex items-center gap-2 ${
            getCurrentTheme() === 'dark' 
              ? 'hover:bg-white/10 text-white' 
              : 'hover:bg-gray-100 text-gray-700'
          }`}
          onClick={handleOpenSettings}
        >
          <div className="relative">
            {getThemeIcon()}
            <div className="absolute -top-1 -right-1 bg-green-500 rounded-full h-1.5 w-1.5"></div>
          </div>
          <span className="text-xs">Settings</span>
        </Button>
      )}
    </>
  );
};

export default ThemeSelector;