import React, { useEffect } from 'react';
import { useThemeStore, ThemePreset } from '../../state/themeStore';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  Sun, 
  Moon, 
  Monitor, 
  CheckCircle2,
  Sparkles,
  Droplets,
  Leaf,
  Sunset
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ThemeSelectorProps {
  children: React.ReactNode;
}

const ThemeSelector: React.FC<ThemeSelectorProps> = ({ children }) => {
  const activePreset = useThemeStore(state => state.activePreset);
  const setThemePreset = useThemeStore(state => state.setThemePreset);
  const getThemePresets = useThemeStore(state => state.getThemePresets);
  const getCurrentTheme = useThemeStore(state => state.getCurrentTheme);
  const systemPrefersDark = useThemeStore(state => state.systemPrefersDark);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const { toast } = useToast();

  // Handle theme preset change
  const handleThemePresetChange = (preset: ThemePreset) => {
    setThemePreset(preset);
    const presetName = getThemePresets()[preset].displayName;
    toast({
      title: 'Theme Applied',
      description: `"${presetName}" theme has been applied`,
    });
  };

  // Get theme preset icon
  const getPresetIcon = (preset: ThemePreset) => {
    switch (preset) {
      case 'system':
        return <Monitor size={20} />;
      case 'dark':
        return <Moon size={20} />;
      case 'light':
        return <Sun size={20} />;
      case 'twilight':
        return <Sparkles size={20} />;
      case 'ocean':
        return <Droplets size={20} />;
      case 'forest':
        return <Leaf size={20} />;
      case 'sunset':
        return <Sunset size={20} />;
      default:
        return <Monitor size={20} />;
    }
  };

  // Display automatic theme change notifications
  useEffect(() => {
    // Only show notifications when dialog is closed
    if (!dialogOpen && activePreset === 'system') {
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
  }, [dialogOpen, activePreset, toast]);

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent 
        className={`sm:max-w-[425px] backdrop-blur-xl ${
          getCurrentTheme() === 'dark' 
            ? 'bg-black/70 border border-purple-500/30 text-white' 
            : 'bg-white/95 border border-purple-200 text-gray-900'
        }`}
        style={{ 
          position: 'fixed', 
          top: '50%', 
          left: '50%', 
          transform: 'translate(-50%, -50%)',
          zIndex: 9999 
        }}
        aria-describedby="theme-settings-description"
      >
        <DialogHeader>
          <DialogTitle className="text-xl">Choose a Theme</DialogTitle>
          <p className={`mt-2 ${
            getCurrentTheme() === 'dark' ? 'text-white/80' : 'text-gray-600'
          }`} id="theme-settings-description">
            Select a theme preset for your Panion desktop environment.
          </p>
        </DialogHeader>
        
        {/* Theme preset selector */}
        <div className="space-y-2 my-4">
          {Object.entries(getThemePresets()).map(([key, preset]) => (
            <button
              key={key}
              className={`w-full flex items-center justify-between p-4 rounded-md border transition-colors ${
                activePreset === key 
                  ? getCurrentTheme() === 'dark'
                    ? 'bg-purple-800/50 border-purple-500/50 text-white' 
                    : 'bg-purple-100 border-purple-300 text-purple-900'
                  : getCurrentTheme() === 'dark'
                    ? 'bg-black/20 hover:bg-black/30 border-gray-700/30 text-white/80' 
                    : 'bg-white/80 hover:bg-purple-50 border-purple-100/50 text-gray-700'
              }`}
              onClick={() => handleThemePresetChange(key as ThemePreset)}
            >
              <div className="flex items-center">
                <div className="mr-3">
                  {getPresetIcon(key as ThemePreset)}
                </div>
                <div className="text-left">
                  <p className="font-medium">{preset.displayName}</p>
                  {key === 'system' && (
                    <p className="text-xs mt-1 opacity-70">
                      Follows your device settings (currently {systemPrefersDark ? 'dark' : 'light'})
                    </p>
                  )}
                </div>
              </div>
              {activePreset === key && (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              )}
            </button>
          ))}
        </div>
        
        <DialogFooter>
          <DialogClose asChild>
            <Button 
              className={`${
                getCurrentTheme() === 'dark' 
                  ? 'bg-purple-700 hover:bg-purple-600 text-white' 
                  : 'bg-purple-500 hover:bg-purple-400 text-white'
              }`}
            >
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ThemeSelector;