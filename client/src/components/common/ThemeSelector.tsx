import React from 'react';
import { useThemeStore, ThemeAccent } from '../../state/themeStore';
import { Button } from '@/components/ui/button';
import { 
  Settings,
  Moon
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAgentStore } from '@/state/agentStore';

interface ThemeSelectorProps {
  children?: React.ReactNode;
}

const ThemeSelector: React.FC<ThemeSelectorProps> = ({ children }) => {
  const accent = useThemeStore(state => state.accent);
  const setAccent = useThemeStore(state => state.setAccent);
  const { toast } = useToast();
  const openSettingsAgent = useAgentStore(state => state.openAgent);

  // Define available accent colors
  const accentColors: Array<{ id: ThemeAccent, name: string, color: string }> = [
    { id: 'purple', name: 'Purple', color: 'bg-purple-500' },
    { id: 'blue', name: 'Blue', color: 'bg-blue-500' },
    { id: 'green', name: 'Green', color: 'bg-green-500' },
    { id: 'orange', name: 'Black', color: 'bg-black' }, // Keeping 'orange' ID for compatibility
    { id: 'pink', name: 'Pink', color: 'bg-fuchsia-400' }    // Prettier pink (fuchsia) shade
  ];

  const handleAccentChange = (newAccent: ThemeAccent) => {
    setAccent(newAccent);
    // Display "Black" instead of "orange" in the toast notification
    const displayName = newAccent === 'orange' ? 'Black' : newAccent;
    toast({
      title: 'Accent Color Updated',
      description: `Accent color set to ${displayName}`,
    });
  };

  // Open the settings panel
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
          className="flex items-center gap-2 hover:bg-white/10 text-white"
          onClick={handleOpenSettings}
        >
          <div className="relative">
            <Moon size={18} />
            <div className="absolute -top-1 -right-1 bg-green-500 rounded-full h-1.5 w-1.5"></div>
          </div>
          <span className="text-xs">Settings</span>
        </Button>
      )}
    </>
  );
};

export default ThemeSelector;