import React, { useEffect } from 'react';
import { useThemeStore, ThemeMode, ThemeAccent } from '../../state/themeStore';
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
  Palette,
  CheckCircle2,
  Info
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface ThemeSelectorProps {
  children: React.ReactNode;
}

const ThemeSelector: React.FC<ThemeSelectorProps> = ({ children }) => {
  const mode = useThemeStore(state => state.mode);
  const accent = useThemeStore(state => state.accent);
  const setMode = useThemeStore(state => state.setMode);
  const setAccent = useThemeStore(state => state.setAccent);
  const getCurrentTheme = useThemeStore(state => state.getCurrentTheme);
  const systemPrefersDark = useThemeStore(state => state.systemPrefersDark);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const { toast } = useToast();

  // Define available accent colors
  const accentColors: Array<{ id: ThemeAccent, name: string, color: string }> = [
    { id: 'purple', name: 'Purple', color: 'bg-purple-500' },
    { id: 'blue', name: 'Blue', color: 'bg-blue-500' },
    { id: 'green', name: 'Green', color: 'bg-green-500' },
    { id: 'orange', name: 'Orange', color: 'bg-orange-500' },
    { id: 'pink', name: 'Pink', color: 'bg-pink-500' }
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
    // Only show notifications when dialog is closed to avoid duplication
    if (!dialogOpen && mode === 'system') {
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
  }, [dialogOpen, mode, toast]);

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent 
        className={`sm:max-w-[425px] backdrop-blur-xl ${
          getCurrentTheme() === 'dark' 
            ? 'bg-[#1a1538]/90 border-purple-500/30 text-white' 
            : 'bg-white border-purple-300/50 text-gray-900'
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
          <DialogTitle className="text-xl">Appearance Settings</DialogTitle>
          <p className={`mt-2 ${
            getCurrentTheme() === 'dark' ? 'text-white/80' : 'text-gray-600'
          }`} id="theme-settings-description">
            Customize the look and feel of your Panion desktop environment.
          </p>
        </DialogHeader>
        
        {/* Theme mode selector */}
        <div className="space-y-6 my-2">
          <div className={`p-4 rounded-lg ${
            getCurrentTheme() === 'dark' ? 'bg-black/20' : 'bg-purple-50/50'
          }`}>
            <h3 className="text-lg font-medium mb-3">Theme Mode</h3>
            <div className="flex flex-wrap gap-3">
              <Button
                variant={mode === 'light' ? 'default' : 'outline'}
                className={`flex-1 ${
                  mode === 'light' 
                    ? 'bg-purple-700' 
                    : 'bg-transparent ' + (getCurrentTheme() === 'dark' ? 'hover:bg-white/10' : 'hover:bg-purple-50')
                }`}
                onClick={() => handleModeChange('light')}
              >
                <Sun className="mr-2 h-4 w-4" />
                Light
              </Button>
              <Button
                variant={mode === 'dark' ? 'default' : 'outline'}
                className={`flex-1 ${
                  mode === 'dark' 
                    ? 'bg-purple-700' 
                    : 'bg-transparent ' + (getCurrentTheme() === 'dark' ? 'hover:bg-white/10' : 'hover:bg-purple-50')
                }`}
                onClick={() => handleModeChange('dark')}
              >
                <Moon className="mr-2 h-4 w-4" />
                Dark
              </Button>
              <Button
                variant={mode === 'system' ? 'default' : 'outline'}
                className={`flex-1 ${
                  mode === 'system' 
                    ? 'bg-purple-700' 
                    : 'bg-transparent ' + (getCurrentTheme() === 'dark' ? 'hover:bg-white/10' : 'hover:bg-purple-50')
                }`}
                onClick={() => handleModeChange('system')}
              >
                <Monitor className="mr-2 h-4 w-4" />
                System
              </Button>
            </div>
            
            {/* System preference indicator */}
            {mode === 'system' && (
              <div className={`mt-3 p-3 rounded-md flex items-center gap-2 text-sm ${
                getCurrentTheme() === 'dark' ? 'bg-white/5 border border-white/10' : 'bg-white/80 border border-purple-100'
              }`}>
                <Info size={16} className={`flex-shrink-0 ${
                  getCurrentTheme() === 'dark' ? 'text-purple-300' : 'text-purple-600'
                }`} />
                <div>
                  <span>Your system is currently set to </span>
                  <Badge 
                    variant="outline" 
                    className={`ml-1 font-medium ${
                      systemPrefersDark 
                        ? getCurrentTheme() === 'dark' ? 'bg-purple-950/50 text-white' : 'bg-purple-900/20 text-purple-900' 
                        : getCurrentTheme() === 'dark' ? 'bg-purple-100/20 text-white' : 'bg-purple-100 text-purple-900'
                    }`}
                  >
                    {systemPrefersDark ? 'Dark Mode' : 'Light Mode'}
                  </Badge>
                </div>
              </div>
            )}
          </div>
          
          {/* Accent color selector */}
          <div className={`p-4 rounded-lg ${
            getCurrentTheme() === 'dark' ? 'bg-black/20' : 'bg-purple-50/50'
          }`}>
            <h3 className="text-lg font-medium mb-3">Accent Color</h3>
            <div className="grid grid-cols-5 gap-3">
              {accentColors.map((color) => (
                <button
                  key={color.id}
                  className={`flex flex-col items-center justify-center p-2 rounded-md ${
                    accent === color.id 
                      ? getCurrentTheme() === 'dark' ? 'bg-white/20' : 'bg-purple-100' 
                      : getCurrentTheme() === 'dark' ? 'hover:bg-white/10' : 'hover:bg-purple-50'
                  } transition-colors`}
                  onClick={() => handleAccentChange(color.id)}
                >
                  <div className={`w-8 h-8 rounded-full ${color.color} mb-1 relative`}>
                    {accent === color.id && (
                      <CheckCircle2 className="absolute -top-1 -right-1 text-white text-sm h-4 w-4" />
                    )}
                  </div>
                  <span className="text-xs">{color.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <DialogClose asChild>
            <Button 
              variant="outline" 
              className={`${
                getCurrentTheme() === 'dark' 
                  ? 'border-white/20 hover:bg-white/10 text-white' 
                  : 'border-purple-200 hover:bg-purple-50 text-gray-800'
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