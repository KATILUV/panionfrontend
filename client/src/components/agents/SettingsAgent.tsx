import { useState } from 'react';
import { Settings, Palette, Monitor, Bell, Shield, Info, Lock, CheckCircle2 } from 'lucide-react';
import { useThemeStore, ThemeAccent } from '@/state/themeStore';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const SettingsAgent = () => {
  const [activeTab, setActiveTab] = useState('appearance');
  const accent = useThemeStore(state => state.accent);
  const setAccent = useThemeStore(state => state.setAccent);
  const { toast } = useToast();
  
  // Define available accent colors
  const accentColors: Array<{ id: ThemeAccent, name: string, color: string }> = [
    { id: 'purple', name: 'Purple', color: 'bg-purple-500' },
    { id: 'blue', name: 'Blue', color: 'bg-blue-500' },
    { id: 'green', name: 'Green', color: 'bg-green-500' },
    { id: 'orange', name: 'Black', color: 'bg-black' },
    { id: 'pink', name: 'Pink', color: 'bg-fuchsia-400' }
  ];

  const handleAccentChange = (newAccent: ThemeAccent) => {
    setAccent(newAccent);
    toast({
      title: 'Accent Color Updated',
      description: `Accent color set to ${newAccent}`,
    });
  };
  
  return (
    <div className="w-full h-full flex flex-col overflow-hidden text-white">
      <div className="p-4 flex items-center bg-black/30">
        <Settings className="h-5 w-5 mr-2" />
        <h2 className="text-lg font-semibold">Settings</h2>
      </div>
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-48 shrink-0 bg-black/20">
          <div className="p-4">
            <div className="flex flex-col space-y-2">
              <Button 
                variant="ghost" 
                className={`justify-start ${activeTab === 'appearance' ? 'bg-purple-800/20 text-white' : ''} px-2`}
                onClick={() => setActiveTab('appearance')}
              >
                <Palette className="h-4 w-4 mr-2" />
                Appearance
              </Button>
              
              <Button 
                variant="ghost" 
                className={`justify-start ${activeTab === 'system' ? 'bg-purple-800/20 text-white' : ''} px-2`}
                onClick={() => setActiveTab('system')}
              >
                <Monitor className="h-4 w-4 mr-2" />
                System
              </Button>
              
              <Button 
                variant="ghost" 
                className={`justify-start ${activeTab === 'notifications' ? 'bg-purple-800/20 text-white' : ''} px-2`}
                onClick={() => setActiveTab('notifications')}
              >
                <Bell className="h-4 w-4 mr-2" />
                Notifications
              </Button>
              
              <Button 
                variant="ghost" 
                className={`justify-start ${activeTab === 'privacy' ? 'bg-purple-800/20 text-white' : ''} px-2`}
                onClick={() => setActiveTab('privacy')}
              >
                <Shield className="h-4 w-4 mr-2" />
                Privacy
              </Button>
              
              <Separator className="my-2 bg-white/10" />
              
              <Button 
                variant="ghost" 
                className={`justify-start ${activeTab === 'about' ? 'bg-purple-800/20 text-white' : ''} px-2`}
                onClick={() => setActiveTab('about')}
              >
                <Info className="h-4 w-4 mr-2" />
                About Panion
              </Button>
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'appearance' && (
            <div>
              <h3 className="text-xl font-medium mb-6">Appearance Settings</h3>
              <div className="p-4 rounded-lg bg-black/30 border border-white/10">
                <h4 className="text-lg font-medium mb-4">Accent Color</h4>
                <p className="text-sm mb-4 opacity-80">
                  Choose your preferred accent color for highlights and interactive elements.
                </p>
                
                <div className="flex flex-wrap gap-2">
                  {accentColors.map((color) => (
                    <Button
                      key={color.id}
                      variant="outline"
                      size="sm"
                      className={`flex items-center gap-2 ${accent === color.id ? 'bg-purple-800/20 border-purple-500/50' : ''}`}
                      onClick={() => handleAccentChange(color.id)}
                    >
                      <div className={`h-4 w-4 rounded-full ${color.color}`} />
                      <span>{color.name}</span>
                      {accent === color.id && <CheckCircle2 className="h-4 w-4 ml-1 text-green-500" />}
                    </Button>
                  ))}
                </div>
              </div>
              
              <div className="mt-6 p-4 rounded-lg bg-black/30 border border-white/10">
                <h4 className="text-lg font-medium mb-4">User Interface Density</h4>
                <p className="text-sm mb-4 opacity-80">
                  Adjust how compact or spacious the user interface appears.
                </p>
                
                <div className="flex gap-4">
                  <Button variant="outline" className="flex-1">Compact</Button>
                  <Button 
                    variant="outline" 
                    className="flex-1 bg-purple-800/20 border-purple-500/50"
                  >Standard</Button>
                  <Button variant="outline" className="flex-1">Comfortable</Button>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'system' && (
            <div>
              <h3 className="text-xl font-medium mb-6">System Settings</h3>
              <div className="p-4 rounded-lg bg-black/30 border border-white/10">
                <h4 className="text-lg font-medium mb-4">Startup Behavior</h4>
                <p className="text-sm mb-4 opacity-80">
                  Configure how Panion behaves when you start your session.
                </p>
                
                {/* Just placeholders for now */}
                <div className="space-y-2">
                  <div className="flex items-center">
                    <input type="checkbox" id="startMaximized" className="mr-2" checked />
                    <label htmlFor="startMaximized">Start maximized</label>
                  </div>
                  <div className="flex items-center">
                    <input type="checkbox" id="rememberWindows" className="mr-2" checked />
                    <label htmlFor="rememberWindows">Remember open windows</label>
                  </div>
                  <div className="flex items-center">
                    <input type="checkbox" id="showStartupTips" className="mr-2" />
                    <label htmlFor="showStartupTips">Show startup tips</label>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'notifications' && (
            <div>
              <h3 className="text-xl font-medium mb-6">Notification Settings</h3>
              <div className="p-4 rounded-lg bg-black/30 border border-white/10">
                <h4 className="text-lg font-medium mb-4">General</h4>
                <p className="text-sm mb-4 opacity-80">
                  Control how and when notifications appear.
                </p>
                
                <div className="space-y-2">
                  <div className="flex items-center">
                    <input type="checkbox" id="enableNotifs" className="mr-2" checked />
                    <label htmlFor="enableNotifs">Enable notifications</label>
                  </div>
                  <div className="flex items-center">
                    <input type="checkbox" id="soundNotifs" className="mr-2" checked />
                    <label htmlFor="soundNotifs">Play sound for notifications</label>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'privacy' && (
            <div>
              <h3 className="text-xl font-medium mb-6">Privacy Settings</h3>
              <div className="p-4 rounded-lg bg-black/30 border border-white/10">
                <h4 className="text-lg font-medium mb-4">Memory & Data</h4>
                <p className="text-sm mb-4 opacity-80">
                  Control how Panion stores and manages your data.
                </p>
                
                <div className="space-y-4">
                  <div className="flex items-center">
                    <input type="checkbox" id="storeConversations" className="mr-2" checked />
                    <label htmlFor="storeConversations">Store conversation history</label>
                  </div>
                  
                  <Button variant="destructive" className="flex items-center">
                    <Lock className="h-4 w-4 mr-2" />
                    Clear All Stored Data
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'about' && (
            <div>
              <h3 className="text-xl font-medium mb-6">About Panion</h3>
              <div className="p-4 rounded-lg bg-black/30 border border-white/10">
                <div className="flex items-center mb-4">
                  <div className="h-16 w-16 rounded-full bg-purple-700 flex items-center justify-center">
                    <Settings className="h-10 w-10 text-white" />
                  </div>
                  <div className="ml-4">
                    <h4 className="text-lg font-medium">Panion OS</h4>
                    <p className="text-sm opacity-80">Version 1.0.0</p>
                  </div>
                </div>
                
                <p className="text-sm opacity-80 mb-4">
                  Panion is a modular OS-like environment for AI companions. 
                  It provides a flexible, multi-agent interaction platform with sophisticated 
                  user experience design and adaptive interfaces.
                </p>
                
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">Changelog</Button>
                  <Button variant="outline" size="sm">License</Button>
                </div>
              </div>
              
              <div className="mt-6 p-4 rounded-lg bg-black/30 border border-white/10">
                <h4 className="text-lg font-medium mb-2">Credits</h4>
                <p className="text-sm opacity-80">
                  Built with love by the Panion team.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsAgent;