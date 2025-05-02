import { useState } from 'react';
import { Settings, Palette, Monitor, Bell, Shield, Info, Lock } from 'lucide-react';
import ThemeSelector from '../common/ThemeSelector';
import { useThemeStore } from '@/state/themeStore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';

const SettingsAgent = () => {
  const [activeTab, setActiveTab] = useState('appearance');
  const getCurrentTheme = useThemeStore(state => state.getCurrentTheme);
  
  return (
    <div className={`w-full h-full flex flex-col overflow-hidden ${
      getCurrentTheme() === 'dark' ? 'text-white' : 'text-gray-800'
    }`}>
      <div className={`p-4 flex items-center ${
        getCurrentTheme() === 'dark' ? 'bg-black/30' : 'bg-white/90'
      }`}>
        <Settings className="h-5 w-5 mr-2" />
        <h2 className="text-lg font-semibold">Settings</h2>
      </div>
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className={`w-48 shrink-0 ${
          getCurrentTheme() === 'dark' ? 'bg-black/20' : 'bg-gray-50/90'
        }`}>
          <div className="p-4">
            <div className={`flex flex-col space-y-2`}>
              <Button 
                variant="ghost" 
                className={`justify-start ${
                  activeTab === 'appearance' 
                    ? getCurrentTheme() === 'dark'
                      ? 'bg-purple-800/20 text-white'
                      : 'bg-purple-100/80 text-purple-800'
                    : ''
                } px-2`}
                onClick={() => setActiveTab('appearance')}
              >
                <Palette className="h-4 w-4 mr-2" />
                Appearance
              </Button>
              
              <Button 
                variant="ghost" 
                className={`justify-start ${
                  activeTab === 'system' 
                    ? getCurrentTheme() === 'dark'
                      ? 'bg-purple-800/20 text-white'
                      : 'bg-purple-100/80 text-purple-800'
                    : ''
                } px-2`}
                onClick={() => setActiveTab('system')}
              >
                <Monitor className="h-4 w-4 mr-2" />
                System
              </Button>
              
              <Button 
                variant="ghost" 
                className={`justify-start ${
                  activeTab === 'notifications' 
                    ? getCurrentTheme() === 'dark'
                      ? 'bg-purple-800/20 text-white'
                      : 'bg-purple-100/80 text-purple-800'
                    : ''
                } px-2`}
                onClick={() => setActiveTab('notifications')}
              >
                <Bell className="h-4 w-4 mr-2" />
                Notifications
              </Button>
              
              <Button 
                variant="ghost" 
                className={`justify-start ${
                  activeTab === 'privacy' 
                    ? getCurrentTheme() === 'dark'
                      ? 'bg-purple-800/20 text-white'
                      : 'bg-purple-100/80 text-purple-800'
                    : ''
                } px-2`}
                onClick={() => setActiveTab('privacy')}
              >
                <Shield className="h-4 w-4 mr-2" />
                Privacy
              </Button>
              
              <Separator className={`my-2 ${
                getCurrentTheme() === 'dark' ? 'bg-white/10' : 'bg-gray-200'
              }`} />
              
              <Button 
                variant="ghost" 
                className={`justify-start ${
                  activeTab === 'about' 
                    ? getCurrentTheme() === 'dark'
                      ? 'bg-purple-800/20 text-white'
                      : 'bg-purple-100/80 text-purple-800'
                    : ''
                } px-2`}
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
              <div className={`p-4 rounded-lg ${
                getCurrentTheme() === 'dark' ? 'bg-black/30 border border-white/10' : 'bg-white/80 border border-gray-200'
              }`}>
                <h4 className="text-lg font-medium mb-4">Theme and Colors</h4>
                <p className="text-sm mb-4 opacity-80">
                  Choose your preferred theme mode and accent color to personalize the appearance of your Panion desktop.
                </p>
                
                <ThemeSelector>
                  <Button variant="outline" className="w-full flex items-center justify-between">
                    <span>Customize Theme</span>
                    <Palette className="h-4 w-4 ml-2" />
                  </Button>
                </ThemeSelector>
              </div>
              
              <div className={`mt-6 p-4 rounded-lg ${
                getCurrentTheme() === 'dark' ? 'bg-black/30 border border-white/10' : 'bg-white/80 border border-gray-200'
              }`}>
                <h4 className="text-lg font-medium mb-4">User Interface Density</h4>
                <p className="text-sm mb-4 opacity-80">
                  Adjust how compact or spacious the user interface appears.
                </p>
                
                <div className="flex gap-4">
                  <Button variant="outline" className="flex-1">Compact</Button>
                  <Button 
                    variant="outline" 
                    className={`flex-1 ${
                      getCurrentTheme() === 'dark' 
                        ? 'bg-purple-800/20 border-purple-500/50' 
                        : 'bg-purple-100 border-purple-300'
                    }`}
                  >Standard</Button>
                  <Button variant="outline" className="flex-1">Comfortable</Button>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'system' && (
            <div>
              <h3 className="text-xl font-medium mb-6">System Settings</h3>
              <div className={`p-4 rounded-lg ${
                getCurrentTheme() === 'dark' ? 'bg-black/30 border border-white/10' : 'bg-white/80 border border-gray-200'
              }`}>
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
              <div className={`p-4 rounded-lg ${
                getCurrentTheme() === 'dark' ? 'bg-black/30 border border-white/10' : 'bg-white/80 border border-gray-200'
              }`}>
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
              <div className={`p-4 rounded-lg ${
                getCurrentTheme() === 'dark' ? 'bg-black/30 border border-white/10' : 'bg-white/80 border border-gray-200'
              }`}>
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
              <div className={`p-4 rounded-lg ${
                getCurrentTheme() === 'dark' ? 'bg-black/30 border border-white/10' : 'bg-white/80 border border-gray-200'
              }`}>
                <div className="flex items-center mb-4">
                  <div className={`h-16 w-16 rounded-full ${
                    getCurrentTheme() === 'dark' ? 'bg-purple-700' : 'bg-purple-500'
                  } flex items-center justify-center mr-4`}>
                    <span className="text-white text-2xl font-bold">P</span>
                  </div>
                  
                  <div>
                    <h4 className="text-lg font-medium">Panion</h4>
                    <p className="text-sm opacity-80">Version 1.0.0</p>
                  </div>
                </div>
                
                <p className="text-sm mb-4">
                  Panion is a modular agent-based desktop environment where multiple AI assistants collaborate in a unified interface.
                </p>
                
                <div className="grid grid-cols-2 gap-4 mt-6">
                  <Button variant="outline">Release Notes</Button>
                  <Button variant="outline">Documentation</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsAgent;