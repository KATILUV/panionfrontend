import React, { useEffect } from 'react';
import { 
  useThemeStore, 
  ThemeMode, 
  ThemeAccent, 
  BackgroundPattern, 
  ThemePreset, 
  ThemeSettings 
} from '../../state/themeStore';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Sun, 
  Moon, 
  Monitor, 
  Palette,
  CheckCircle2,
  Info,
  Grid,
  CircleDashed,
  Waves,
  XCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface ThemeSelectorProps {
  children: React.ReactNode;
}

const ThemeSelector: React.FC<ThemeSelectorProps> = ({ children }) => {
  const mode = useThemeStore(state => state.mode);
  const accent = useThemeStore(state => state.accent);
  const backgroundPattern = useThemeStore(state => state.backgroundPattern);
  const activePreset = useThemeStore(state => state.activePreset);
  const setMode = useThemeStore(state => state.setMode);
  const setAccent = useThemeStore(state => state.setAccent);
  const setBackgroundPattern = useThemeStore(state => state.setBackgroundPattern);
  const setThemePreset = useThemeStore(state => state.setThemePreset);
  const getThemePresets = useThemeStore(state => state.getThemePresets);
  const getCurrentTheme = useThemeStore(state => state.getCurrentTheme);
  const systemPrefersDark = useThemeStore(state => state.systemPrefersDark);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [currentTab, setCurrentTab] = React.useState('presets');
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
  
  const handleBackgroundPatternChange = (newPattern: BackgroundPattern) => {
    setBackgroundPattern(newPattern);
    toast({
      title: 'Background Pattern Updated',
      description: `Pattern set to ${newPattern}`,
    });
  };
  
  const handleThemePresetChange = (preset: ThemePreset) => {
    setThemePreset(preset);
    const presetName = getThemePresets()[preset].displayName;
    toast({
      title: 'Theme Applied',
      description: `"${presetName}" theme has been applied`,
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
        className={`sm:max-w-[500px] backdrop-blur-xl ${
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
        
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="mt-2">
          <TabsList className={`grid w-full grid-cols-2 ${
            getCurrentTheme() === 'dark' ? 'bg-black/30' : 'bg-purple-100/50'
          }`}>
            <TabsTrigger 
              value="presets" 
              className={`${
                getCurrentTheme() === 'dark' 
                  ? 'data-[state=active]:bg-purple-900/50 data-[state=active]:text-white' 
                  : 'data-[state=active]:bg-purple-100 data-[state=active]:text-purple-900'
              }`}
            >
              Theme Presets
            </TabsTrigger>
            <TabsTrigger 
              value="custom" 
              className={`${
                getCurrentTheme() === 'dark' 
                  ? 'data-[state=active]:bg-purple-900/50 data-[state=active]:text-white' 
                  : 'data-[state=active]:bg-purple-100 data-[state=active]:text-purple-900'
              }`}
            >
              Custom Theme
            </TabsTrigger>
          </TabsList>
          
          {/* Theme Presets Tab */}
          <TabsContent value="presets" className="space-y-4 mt-4">
            <div className={`p-4 rounded-lg ${
              getCurrentTheme() === 'dark' ? 'bg-black/20' : 'bg-purple-50/50'
            }`}>
              <h3 className="text-lg font-medium mb-3">Select a Theme</h3>
              <p className="mb-4 text-sm opacity-80">Choose from these curated themes to instantly change the look and feel.</p>
              
              <div className="grid grid-cols-1 gap-3">
                {Object.entries(getThemePresets()).map(([id, preset]) => (
                  <button
                    key={id}
                    className={`flex items-center gap-3 p-3 rounded-md border transition-colors text-left ${
                      activePreset === id 
                        ? getCurrentTheme() === 'dark'
                          ? 'bg-purple-800/50 border-purple-500/50' 
                          : 'bg-purple-100 border-purple-300'
                        : getCurrentTheme() === 'dark'
                          ? 'bg-black/20 hover:bg-black/30 border-gray-700/30 hover:border-gray-600/40' 
                          : 'bg-white/80 hover:bg-purple-50 border-purple-100/50 hover:border-purple-200'
                    }`}
                    onClick={() => handleThemePresetChange(id as ThemePreset)}
                  >
                    <div className={`w-10 h-10 rounded-md flex items-center justify-center relative border ${
                      preset.mode === 'dark'
                        ? 'bg-slate-900 border-slate-700'
                        : preset.mode === 'light'
                          ? 'bg-white border-slate-200'
                          : systemPrefersDark 
                            ? 'bg-slate-900 border-slate-700'
                            : 'bg-white border-slate-200'
                    }`}>
                      {preset.accent === 'purple' && <div className="w-4 h-4 rounded-full bg-purple-500" />}
                      {preset.accent === 'blue' && <div className="w-4 h-4 rounded-full bg-blue-500" />}
                      {preset.accent === 'green' && <div className="w-4 h-4 rounded-full bg-green-500" />}
                      {preset.accent === 'orange' && <div className="w-4 h-4 rounded-full bg-orange-500" />}
                      {preset.accent === 'pink' && <div className="w-4 h-4 rounded-full bg-pink-500" />}
                      
                      {activePreset === id && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                          <CheckCircle2 className="text-white w-3 h-3" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="font-medium">{preset.displayName}</div>
                      <div className="text-xs opacity-70">
                        {preset.mode === 'system' 
                          ? `System (${systemPrefersDark ? 'Dark' : 'Light'})` 
                          : preset.mode.charAt(0).toUpperCase() + preset.mode.slice(1)
                        } • {preset.accent.charAt(0).toUpperCase() + preset.accent.slice(1)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </TabsContent>
          
          {/* Custom Theme Tab */}
          <TabsContent value="custom" className="space-y-4 mt-4">
            {/* Theme mode selector */}
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
            
            {/* Background pattern selector */}
            <div className={`p-4 rounded-lg ${
              getCurrentTheme() === 'dark' ? 'bg-black/20' : 'bg-purple-50/50'
            }`}>
              <h3 className="text-lg font-medium mb-3">Background Pattern</h3>
              <div className="grid grid-cols-4 gap-3">
                <button
                  className={`flex flex-col items-center justify-center p-2 rounded-md border transition-colors ${
                    backgroundPattern === 'grid' 
                      ? getCurrentTheme() === 'dark'
                        ? 'bg-purple-800/50 border-purple-500/50' 
                        : 'bg-purple-100 border-purple-300'
                      : getCurrentTheme() === 'dark'
                        ? 'bg-black/20 hover:bg-black/30 border-gray-700/30' 
                        : 'bg-white/80 hover:bg-purple-50 border-purple-100/50'
                  }`}
                  onClick={() => handleBackgroundPatternChange('grid')}
                >
                  <div className="relative mb-1">
                    <Grid className="h-6 w-6" />
                    {backgroundPattern === 'grid' && (
                      <div className="absolute -top-1 -right-1 bg-green-500 rounded-full h-2 w-2"></div>
                    )}
                  </div>
                  <span className="text-xs">Grid</span>
                </button>
                <button
                  className={`flex flex-col items-center justify-center p-2 rounded-md border transition-colors ${
                    backgroundPattern === 'dots' 
                      ? getCurrentTheme() === 'dark'
                        ? 'bg-purple-800/50 border-purple-500/50' 
                        : 'bg-purple-100 border-purple-300'
                      : getCurrentTheme() === 'dark'
                        ? 'bg-black/20 hover:bg-black/30 border-gray-700/30' 
                        : 'bg-white/80 hover:bg-purple-50 border-purple-100/50'
                  }`}
                  onClick={() => handleBackgroundPatternChange('dots')}
                >
                  <div className="relative mb-1">
                    <CircleDashed className="h-6 w-6" />
                    {backgroundPattern === 'dots' && (
                      <div className="absolute -top-1 -right-1 bg-green-500 rounded-full h-2 w-2"></div>
                    )}
                  </div>
                  <span className="text-xs">Dots</span>
                </button>
                <button
                  className={`flex flex-col items-center justify-center p-2 rounded-md border transition-colors ${
                    backgroundPattern === 'waves' 
                      ? getCurrentTheme() === 'dark'
                        ? 'bg-purple-800/50 border-purple-500/50' 
                        : 'bg-purple-100 border-purple-300'
                      : getCurrentTheme() === 'dark'
                        ? 'bg-black/20 hover:bg-black/30 border-gray-700/30' 
                        : 'bg-white/80 hover:bg-purple-50 border-purple-100/50'
                  }`}
                  onClick={() => handleBackgroundPatternChange('waves')}
                >
                  <div className="relative mb-1">
                    <Waves className="h-6 w-6" />
                    {backgroundPattern === 'waves' && (
                      <div className="absolute -top-1 -right-1 bg-green-500 rounded-full h-2 w-2"></div>
                    )}
                  </div>
                  <span className="text-xs">Waves</span>
                </button>
                <button
                  className={`flex flex-col items-center justify-center p-2 rounded-md border transition-colors ${
                    backgroundPattern === 'none' 
                      ? getCurrentTheme() === 'dark'
                        ? 'bg-purple-800/50 border-purple-500/50' 
                        : 'bg-purple-100 border-purple-300'
                      : getCurrentTheme() === 'dark'
                        ? 'bg-black/20 hover:bg-black/30 border-gray-700/30' 
                        : 'bg-white/80 hover:bg-purple-50 border-purple-100/50'
                  }`}
                  onClick={() => handleBackgroundPatternChange('none')}
                >
                  <div className="relative mb-1">
                    <XCircle className="h-6 w-6" />
                    {backgroundPattern === 'none' && (
                      <div className="absolute -top-1 -right-1 bg-green-500 rounded-full h-2 w-2"></div>
                    )}
                  </div>
                  <span className="text-xs">None</span>
                </button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="flex items-center gap-2">
          <div className="flex-1 text-sm opacity-70">
            {activePreset !== 'system' && 
              <span>Active theme: {getThemePresets()[activePreset].displayName}</span>
            }
          </div>
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