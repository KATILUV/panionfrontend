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
            <div className="grid grid-cols-3 gap-2">
              <div 
                className={`flex flex-col items-center justify-center p-3 rounded-md cursor-pointer border transition-colors ${
                  mode === 'light' 
                    ? getCurrentTheme() === 'dark'
                      ? 'bg-purple-800/50 border-purple-500/50 text-white' 
                      : 'bg-purple-100 border-purple-300 text-purple-900'
                    : getCurrentTheme() === 'dark'
                      ? 'bg-black/20 hover:bg-black/30 border-gray-700/30 text-white/80'
                      : 'bg-white/80 hover:bg-purple-50 border-purple-100/50 text-gray-700'
                }`}
                onClick={() => handleModeChange('light')}
              >
                <div className="relative">
                  <Sun className="h-5 w-5 mb-1" />
                  {mode === 'light' && (
                    <div className="absolute -top-1 -right-1 bg-green-500 rounded-full h-2 w-2"></div>
                  )}
                </div>
                <span className="text-sm">Light</span>
              </div>
              <div 
                className={`flex flex-col items-center justify-center p-3 rounded-md cursor-pointer border transition-colors ${
                  mode === 'dark' 
                    ? getCurrentTheme() === 'dark'
                      ? 'bg-purple-800/50 border-purple-500/50 text-white' 
                      : 'bg-purple-100 border-purple-300 text-purple-900'
                    : getCurrentTheme() === 'dark'
                      ? 'bg-black/20 hover:bg-black/30 border-gray-700/30 text-white/80'
                      : 'bg-white/80 hover:bg-purple-50 border-purple-100/50 text-gray-700'
                }`}
                onClick={() => handleModeChange('dark')}
              >
                <div className="relative">
                  <Moon className="h-5 w-5 mb-1" />
                  {mode === 'dark' && (
                    <div className="absolute -top-1 -right-1 bg-green-500 rounded-full h-2 w-2"></div>
                  )}
                </div>
                <span className="text-sm">Dark</span>
              </div>
              <div 
                className={`flex flex-col items-center justify-center p-3 rounded-md cursor-pointer border transition-colors ${
                  mode === 'system' 
                    ? getCurrentTheme() === 'dark'
                      ? 'bg-purple-800/50 border-purple-500/50 text-white' 
                      : 'bg-purple-100 border-purple-300 text-purple-900'
                    : getCurrentTheme() === 'dark'
                      ? 'bg-black/20 hover:bg-black/30 border-gray-700/30 text-white/80'
                      : 'bg-white/80 hover:bg-purple-50 border-purple-100/50 text-gray-700'
                }`}
                onClick={() => handleModeChange('system')}
              >
                <div className="relative">
                  <Monitor className="h-5 w-5 mb-1" />
                  {mode === 'system' && (
                    <div className="absolute -top-1 -right-1 bg-green-500 rounded-full h-2 w-2"></div>
                  )}
                </div>
                <span className="text-sm">System</span>
              </div>
            </div>
            
            {/* System preference indicator */}
            {mode === 'system' && (
              <div className={`mt-3 p-3 rounded-md flex items-center gap-2 text-sm ${
                getCurrentTheme() === 'dark' ? 'bg-black/30 border border-purple-500/20' : 'bg-white/80 border border-purple-100'
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
                  className={`flex flex-col items-center justify-center p-2 rounded-md border transition-colors ${
                    accent === color.id 
                      ? getCurrentTheme() === 'dark'
                        ? 'bg-purple-800/50 border-purple-500/50' 
                        : 'bg-purple-100 border-purple-300'
                      : getCurrentTheme() === 'dark'
                        ? 'bg-black/20 hover:bg-black/30 border-gray-700/30' 
                        : 'bg-white/80 hover:bg-purple-50 border-purple-100/50'
                  }`}
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