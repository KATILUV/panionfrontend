import { useState, useEffect } from 'react';
import { Settings, Palette, Monitor, Bell, Shield, Info, Lock, CheckCircle2, Layout, User } from 'lucide-react';
import { useThemeStore, ThemeAccent } from '@/state/themeStore';
import { useSettingsTabStore } from '@/state/settingsTabStore';
import { useUserPrefsStore } from '@/state/userPrefsStore';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { AgentStatusType } from '@/components/ui/agent-status';
import { WindowPanel, WindowContent, WindowSection } from '@/components/ui/window-components';
import { DensitySelector } from '@/components/ui/density-selector';
import TaskbarSettings from '../settings/TaskbarSettings';

const SettingsAgent = () => {
  // Use the settings tab store to manage the active tab
  const activeTab = useSettingsTabStore(state => state.activeTab);
  const setActiveTab = useSettingsTabStore(state => state.setActiveTab);
  const accent = useThemeStore(state => state.accent);
  const setAccent = useThemeStore(state => state.setAccent);
  const { toast } = useToast();
  
  // Track agent status
  const [status, setStatus] = useState<AgentStatusType>("active");
  
  // Define available accent colors with semantic CSS classes
  const accentColors: Array<{ id: ThemeAccent, name: string, color: string }> = [
    { id: 'purple', name: 'Purple', color: 'bg-primary data-[accent=purple]:bg-purple-500' },
    { id: 'blue', name: 'Blue', color: 'bg-primary data-[accent=blue]:bg-blue-500' },
    { id: 'green', name: 'Green', color: 'bg-primary data-[accent=green]:bg-green-500' },
    { id: 'orange', name: 'Black', color: 'bg-primary data-[accent=orange]:bg-black' },
    { id: 'pink', name: 'Pink', color: 'bg-primary data-[accent=pink]:bg-fuchsia-400' }
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
  
  const renderAppearanceTab = () => (
    <div>
      <h3 className="h3 mb-6">Appearance Settings</h3>
      <WindowSection 
        title="Accent Color"
        description="Choose your preferred accent color for highlights and interactive elements."
        className="mb-6"
      >
        <div className="flex flex-wrap gap-2">
          {accentColors.map((color) => (
            <Button
              key={color.id}
              variant={accent === color.id ? 'secondary' : 'outline'}
              size="sm"
              className="flex items-center gap-2"
              onClick={() => handleAccentChange(color.id)}
            >
              <div className={`h-4 w-4 rounded-full ${color.color}`} data-accent={color.id} />
              <span>{color.name}</span>
              {accent === color.id && <CheckCircle2 className="h-4 w-4 ml-1 text-green-500" />}
            </Button>
          ))}
        </div>
      </WindowSection>
      
      <WindowSection
        title="User Interface Density"
        description="Adjust how compact or spacious the user interface appears."
      >
        <DensitySelector />
      </WindowSection>
    </div>
  );
  
  // Add User Profile section
  const renderUserProfileTab = () => {
    const userName = useUserPrefsStore(state => state.name);
    const setUserName = useUserPrefsStore(state => state.setName);
    const email = useUserPrefsStore(state => state.email) || '';
    const setEmail = useUserPrefsStore(state => state.setEmail);
    
    const [nameInput, setNameInput] = useState(userName);
    const [emailInput, setEmailInput] = useState(email);
    
    const handleSaveProfile = () => {
      setUserName(nameInput);
      if (emailInput) setEmail(emailInput);
      
      toast({
        title: "Profile Updated",
        description: "Your profile information has been saved",
      });
    };
    
    return (
      <div>
        <h3 className="h3 mb-6">User Profile</h3>
        <WindowSection
          title="Personal Information"
          description="Update your profile information used across Panion"
          className="mb-6"
        >
          <div className="space-y-4">
            <div>
              <label htmlFor="userName" className="block text-sm font-medium mb-1">
                Display Name
              </label>
              <Input
                id="userName"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="max-w-md"
                placeholder="Enter your name"
              />
            </div>
            
            <div>
              <label htmlFor="userEmail" className="block text-sm font-medium mb-1">
                Email Address (optional)
              </label>
              <Input
                id="userEmail"
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="max-w-md"
                placeholder="your@email.com"
              />
            </div>
            
            <Button 
              onClick={handleSaveProfile} 
              className="mt-2"
            >
              Save Profile
            </Button>
          </div>
        </WindowSection>
      </div>
    );
  };

  const renderSystemTab = () => (
    <div>
      <h3 className="h3 mb-6">System Settings</h3>
      <WindowSection
        title="Startup Behavior"
        description="Configure how Panion behaves when you start your session."
      >
        <div className="space-y-2">
          <div className="flex items-center">
            <input type="checkbox" id="startMaximized" className="mr-2" defaultChecked />
            <label htmlFor="startMaximized">Start maximized</label>
          </div>
          <div className="flex items-center">
            <input type="checkbox" id="rememberWindows" className="mr-2" defaultChecked />
            <label htmlFor="rememberWindows">Remember open windows</label>
          </div>
          <div className="flex items-center">
            <input type="checkbox" id="showStartupTips" className="mr-2" />
            <label htmlFor="showStartupTips">Show startup tips</label>
          </div>
        </div>
      </WindowSection>
    </div>
  );
  
  const renderNotificationsTab = () => (
    <div>
      <h3 className="h3 mb-6">Notification Settings</h3>
      <WindowSection
        title="General"
        description="Control how and when notifications appear."
      >
        <div className="space-y-3">
          <div className="flex items-center">
            <input type="checkbox" id="enableNotifs" className="mr-3" defaultChecked />
            <label htmlFor="enableNotifs" className="text-content">Enable notifications</label>
          </div>
          <div className="flex items-center">
            <input type="checkbox" id="soundNotifs" className="mr-3" defaultChecked />
            <label htmlFor="soundNotifs" className="text-content">Play sound for notifications</label>
          </div>
        </div>
      </WindowSection>
    </div>
  );
  
  const renderPrivacyTab = () => (
    <div>
      <h3 className="h3 mb-6">Privacy Settings</h3>
      <WindowSection
        title="Memory & Data"
        description="Control how Panion stores and manages your data."
      >
        <div className="space-y-4">
          <div className="flex items-center">
            <input type="checkbox" id="storeConversations" className="mr-3" defaultChecked />
            <label htmlFor="storeConversations" className="text-content">Store conversation history</label>
          </div>
          
          <Button variant="destructive" className="flex items-center">
            <Lock className="h-4 w-4 mr-2" />
            Clear All Stored Data
          </Button>
        </div>
      </WindowSection>
    </div>
  );
  
  const renderAboutTab = () => (
    <div>
      <h3 className="h3 mb-6">About Panion</h3>
      <WindowSection className="mb-6">
        <div className="flex items-center mb-4">
          <div className="h-16 w-16 rounded-full bg-primary/60 flex items-center justify-center">
            <Settings className="h-10 w-10 text-white" />
          </div>
          <div className="ml-4">
            <h4 className="h4">Panion OS</h4>
            <p className="text-caption">Version 1.0.0</p>
          </div>
        </div>
        
        <p className="text-content mb-4">
          Panion is a modular OS-like environment for AI companions. 
          It provides a flexible, multi-agent interaction platform with sophisticated 
          user experience design and adaptive interfaces.
        </p>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm">Changelog</Button>
          <Button variant="outline" size="sm">License</Button>
        </div>
      </WindowSection>
      
      <WindowSection
        title="Credits"
        description="Built with love by the Panion team."
      />
    </div>
  );
  
  return (
    <WindowPanel 
      title="Settings" 
      status={status} 
      fullHeight 
      className="flex flex-col overflow-hidden"
    >
      {/* For mobile - Top tabs */}
      <div className="md:hidden overflow-x-auto pb-2 pt-1 px-2 border-b border-white/10">
        <div className="flex space-x-1 min-w-max">
          <Button 
            variant={activeTab === 'appearance' ? 'secondary' : 'ghost'} 
            className="px-2 py-1 h-auto text-xs"
            onClick={() => setActiveTab('appearance')}
          >
            <Palette className="h-3 w-3 mr-1" />
            Appearance
          </Button>
          
          <Button 
            variant={activeTab === 'system' ? 'secondary' : 'ghost'} 
            className="px-2 py-1 h-auto text-xs"
            onClick={() => setActiveTab('system')}
          >
            <Monitor className="h-3 w-3 mr-1" />
            System
          </Button>
          
          <Button 
            variant={activeTab === 'taskbar' ? 'secondary' : 'ghost'} 
            className="px-2 py-1 h-auto text-xs"
            onClick={() => setActiveTab('taskbar')}
          >
            <Layout className="h-3 w-3 mr-1" />
            Taskbar
          </Button>

          <Button 
            variant={activeTab === 'notifications' ? 'secondary' : 'ghost'} 
            className="px-2 py-1 h-auto text-xs"
            onClick={() => setActiveTab('notifications')}
          >
            <Bell className="h-3 w-3 mr-1" />
            Notifications
          </Button>
          
          <Button 
            variant={activeTab === 'privacy' ? 'secondary' : 'ghost'} 
            className="px-2 py-1 h-auto text-xs"
            onClick={() => setActiveTab('privacy')}
          >
            <Shield className="h-3 w-3 mr-1" />
            Privacy
          </Button>
          
          <Button 
            variant={activeTab === 'about' ? 'secondary' : 'ghost'} 
            className="px-2 py-1 h-auto text-xs"
            onClick={() => setActiveTab('about')}
          >
            <Info className="h-3 w-3 mr-1" />
            About
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Hidden on mobile */}
        <div className="hidden md:block w-48 shrink-0 bg-black/10 backdrop-blur-sm border-r border-white/10">
          <div className="p-3">
            <div className="flex flex-col space-y-1.5">
              <Button 
                variant={activeTab === 'user-profile' ? 'secondary' : 'ghost'} 
                className="justify-start px-2 py-1.5 h-auto text-sm"
                onClick={() => setActiveTab('user-profile')}
              >
                <User className="h-4 w-4 mr-2" />
                User Profile
              </Button>
              
              <Button 
                variant={activeTab === 'appearance' ? 'secondary' : 'ghost'} 
                className="justify-start px-2 py-1.5 h-auto text-sm"
                onClick={() => setActiveTab('appearance')}
              >
                <Palette className="h-4 w-4 mr-2" />
                Appearance
              </Button>
              
              <Button 
                variant={activeTab === 'system' ? 'secondary' : 'ghost'} 
                className="justify-start px-2 py-1.5 h-auto text-sm"
                onClick={() => setActiveTab('system')}
              >
                <Monitor className="h-4 w-4 mr-2" />
                System
              </Button>
              
              <Button 
                variant={activeTab === 'taskbar' ? 'secondary' : 'ghost'} 
                className="justify-start px-2 py-1.5 h-auto text-sm"
                onClick={() => setActiveTab('taskbar')}
              >
                <Layout className="h-4 w-4 mr-2" />
                Taskbar
              </Button>

              <Button 
                variant={activeTab === 'notifications' ? 'secondary' : 'ghost'} 
                className="justify-start px-2 py-1.5 h-auto text-sm"
                onClick={() => setActiveTab('notifications')}
              >
                <Bell className="h-4 w-4 mr-2" />
                Notifications
              </Button>
              
              <Button 
                variant={activeTab === 'privacy' ? 'secondary' : 'ghost'} 
                className="justify-start px-2 py-1.5 h-auto text-sm"
                onClick={() => setActiveTab('privacy')}
              >
                <Shield className="h-4 w-4 mr-2" />
                Privacy
              </Button>
              
              <Separator className="my-2 bg-white/10" />
              
              <Button 
                variant={activeTab === 'about' ? 'secondary' : 'ghost'} 
                className="justify-start px-2 py-1.5 h-auto text-sm"
                onClick={() => setActiveTab('about')}
              >
                <Info className="h-4 w-4 mr-2" />
                About Panion
              </Button>
            </div>
          </div>
        </div>
        
        {/* Main Content - Adjusted padding for mobile */}
        <div className="flex-1 overflow-auto p-3 md:p-6 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
          {activeTab === 'appearance' && renderAppearanceTab()}
          {activeTab === 'system' && renderSystemTab()}
          {activeTab === 'taskbar' && (
            <div>
              <h3 className="h3 mb-6">Taskbar Settings</h3>
              <TaskbarSettings />
            </div>
          )}
          {activeTab === 'notifications' && renderNotificationsTab()}
          {activeTab === 'privacy' && renderPrivacyTab()}
          {activeTab === 'about' && renderAboutTab()}
        </div>
      </div>
    </WindowPanel>
  );
};

export default SettingsAgent;