import React from 'react';
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
  CheckCircle2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ThemeSelectorProps {
  children: React.ReactNode;
}

const ThemeSelector: React.FC<ThemeSelectorProps> = ({ children }) => {
  const mode = useThemeStore(state => state.mode);
  const accent = useThemeStore(state => state.accent);
  const setMode = useThemeStore(state => state.setMode);
  const setAccent = useThemeStore(state => state.setAccent);
  const getCurrentTheme = useThemeStore(state => state.getCurrentTheme);
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
    toast({
      title: 'Theme Updated',
      description: `Theme mode set to ${newMode}`,
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

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent 
        className="sm:max-w-[425px] bg-[#1a1538]/90 backdrop-blur-xl border-purple-500/30 text-white"
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
          <p className="text-white/80 mt-2">
            Customize the look and feel of your Panion desktop environment.
          </p>
        </DialogHeader>
        
        {/* Theme mode selector */}
        <div className="space-y-4 my-2">
          <div>
            <h3 className="text-lg font-medium mb-3">Theme Mode</h3>
            <div className="flex flex-wrap gap-3">
              <Button
                variant={mode === 'light' ? 'default' : 'outline'}
                className={`flex-1 ${mode === 'light' ? 'bg-purple-700' : 'bg-transparent hover:bg-white/10'}`}
                onClick={() => handleModeChange('light')}
              >
                <Sun className="mr-2 h-4 w-4" />
                Light
              </Button>
              <Button
                variant={mode === 'dark' ? 'default' : 'outline'}
                className={`flex-1 ${mode === 'dark' ? 'bg-purple-700' : 'bg-transparent hover:bg-white/10'}`}
                onClick={() => handleModeChange('dark')}
              >
                <Moon className="mr-2 h-4 w-4" />
                Dark
              </Button>
              <Button
                variant={mode === 'system' ? 'default' : 'outline'}
                className={`flex-1 ${mode === 'system' ? 'bg-purple-700' : 'bg-transparent hover:bg-white/10'}`}
                onClick={() => handleModeChange('system')}
              >
                <Monitor className="mr-2 h-4 w-4" />
                System
              </Button>
            </div>
          </div>
          
          {/* Accent color selector */}
          <div>
            <h3 className="text-lg font-medium mb-3">Accent Color</h3>
            <div className="grid grid-cols-5 gap-3">
              {accentColors.map((color) => (
                <button
                  key={color.id}
                  className={`flex flex-col items-center justify-center p-2 rounded-md ${
                    accent === color.id ? 'bg-white/20' : 'hover:bg-white/10'
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
            <Button variant="outline" className="border-white/20 hover:bg-white/10">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ThemeSelector;