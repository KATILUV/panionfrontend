/**
 * User Preferences Panel
 * Allows users to customize their Panion experience
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Brain, User, Sliders, MessageSquare, BellRing, Settings, Sparkles, 
  RefreshCw, Save, Database, ScreenShare, Layout
} from 'lucide-react';

import { useUserPreferencesStore, getPersonalityTraitOptions } from '@/state/userPreferencesStore';
import { useToast } from '@/hooks/use-toast';

const UserPreferences: React.FC = () => {
  const { toast } = useToast();
  const preferences = useUserPreferencesStore();
  
  const traitOptions = getPersonalityTraitOptions();
  
  const handleSave = async () => {
    try {
      await preferences.syncWithServer();
      toast({
        title: "Preferences saved",
        description: "Your preferences have been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Failed to save preferences",
        description: "Your preferences could not be saved to the server.",
        variant: "destructive",
      });
    }
  };
  
  const handleReset = () => {
    preferences.resetToDefaults();
    toast({
      title: "Preferences reset",
      description: "Your preferences have been reset to default values.",
    });
  };
  
  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings size={20} />
          Panion Preferences
        </CardTitle>
        <CardDescription>
          Customize how Panion appears and responds to you
        </CardDescription>
      </CardHeader>
      
      <Tabs defaultValue="personality">
        <div className="px-6">
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="personality" className="flex items-center gap-2">
              <Brain size={16} />
              <span className="hidden sm:inline">Personality</span>
            </TabsTrigger>
            <TabsTrigger value="interface" className="flex items-center gap-2">
              <Layout size={16} />
              <span className="hidden sm:inline">Interface</span>
            </TabsTrigger>
            <TabsTrigger value="responses" className="flex items-center gap-2">
              <MessageSquare size={16} />
              <span className="hidden sm:inline">Responses</span>
            </TabsTrigger>
            <TabsTrigger value="advanced" className="flex items-center gap-2">
              <Sliders size={16} />
              <span className="hidden sm:inline">Advanced</span>
            </TabsTrigger>
          </TabsList>
        </div>
        
        <Separator />
        
        <CardContent className="pt-6">
          {/* Personality Settings */}
          <TabsContent value="personality" className="space-y-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Conversation Style</h3>
                <Select 
                  value={preferences.preferredMode}
                  onValueChange={(value) => preferences.setPreferredMode(value as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select conversation style" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="casual">Casual - Friendly and relaxed</SelectItem>
                    <SelectItem value="deep">Deep - Thoughtful and profound</SelectItem>
                    <SelectItem value="strategic">Strategic - Goal-oriented and methodical</SelectItem>
                    <SelectItem value="logical">Logical - Precise and analytical</SelectItem>
                    <SelectItem value="creative">Creative - Imaginative and innovative</SelectItem>
                    <SelectItem value="technical">Technical - Detailed and specific</SelectItem>
                    <SelectItem value="educational">Educational - Informative and clear</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <h3 className="text-sm font-medium mb-2">Personality Traits</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Select up to 5 traits that you'd like Panion to exhibit in conversations.
                </p>
                
                <div className="flex flex-wrap gap-2">
                  {traitOptions.map(trait => {
                    const isSelected = preferences.personalityTraits.includes(trait.value);
                    const canSelect = isSelected || preferences.personalityTraits.length < 5;
                    
                    return (
                      <Badge 
                        key={trait.value}
                        variant={isSelected ? "default" : "outline"}
                        className={`cursor-pointer ${!canSelect && !isSelected ? 'opacity-50' : ''}`}
                        onClick={() => {
                          if (isSelected) {
                            // Remove trait
                            preferences.setPersonalityTraits(
                              preferences.personalityTraits.filter(t => t !== trait.value)
                            );
                          } else if (canSelect) {
                            // Add trait
                            preferences.setPersonalityTraits([
                              ...preferences.personalityTraits,
                              trait.value
                            ]);
                          }
                        }}
                      >
                        {trait.label}
                      </Badge>
                    );
                  })}
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium mb-2">Agent Reactiveness</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Adjust how reactive or measured Panion should be in responses.
                </p>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-3 text-xs text-muted-foreground">
                    <div>Calm</div>
                    <div className="text-center">Balanced</div>
                    <div className="text-right">Reactive</div>
                  </div>
                  
                  <Select 
                    value={preferences.agentReactiveness}
                    onValueChange={(value) => preferences.setAgentReactiveness(value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select reactiveness level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="calm">Calm - Measured and steady</SelectItem>
                      <SelectItem value="balanced">Balanced - Appropriately responsive</SelectItem>
                      <SelectItem value="reactive">Reactive - Quick and expressive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </TabsContent>
          
          {/* Interface Settings */}
          <TabsContent value="interface" className="space-y-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Theme</h3>
                <Select 
                  value={preferences.theme}
                  onValueChange={(value) => preferences.setTheme(value as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select theme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <h3 className="text-sm font-medium mb-2">Font Size</h3>
                <Select 
                  value={preferences.fontSize}
                  onValueChange={(value) => preferences.setFontSize(value as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select font size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="show-thinking" className="text-sm font-medium">
                    Show Thinking Process
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Display Panion's reasoning behind responses
                  </p>
                </div>
                <Switch 
                  id="show-thinking"
                  checked={preferences.showThinkingProcess}
                  onCheckedChange={preferences.toggleThinkingProcess}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enable-notifications" className="text-sm font-medium">
                    Enable Notifications
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Show notifications for important events
                  </p>
                </div>
                <Switch 
                  id="enable-notifications"
                  checked={preferences.enableNotifications}
                  onCheckedChange={preferences.toggleNotifications}
                />
              </div>
            </div>
          </TabsContent>
          
          {/* Response Settings */}
          <TabsContent value="responses" className="space-y-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Response Length</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Choose how concise or detailed you'd like Panion's responses to be.
                </p>
                
                <Select 
                  value={preferences.responseLength}
                  onValueChange={(value) => preferences.setResponseLength(value as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select response length" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="concise">Concise - Brief and to the point</SelectItem>
                    <SelectItem value="balanced">Balanced - Moderate length</SelectItem>
                    <SelectItem value="detailed">Detailed - Comprehensive responses</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <h3 className="text-sm font-medium mb-2">Detail Level</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Set the level of detail Panion should include in responses.
                </p>
                
                <Select 
                  value={preferences.detailLevel}
                  onValueChange={(value) => preferences.setDetailLevel(value as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select detail level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simple">Simple - Straightforward explanations</SelectItem>
                    <SelectItem value="balanced">Balanced - Appropriate level of detail</SelectItem>
                    <SelectItem value="comprehensive">Comprehensive - In-depth information</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="multi-agent" className="text-sm font-medium">
                    Multi-Agent Analysis
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Use specialized agents for image analysis
                  </p>
                </div>
                <Switch 
                  id="multi-agent"
                  checked={preferences.multiAgentAnalysisEnabled}
                  onCheckedChange={preferences.toggleMultiAgentAnalysis}
                />
              </div>
            </div>
          </TabsContent>
          
          {/* Advanced Settings */}
          <TabsContent value="advanced" className="space-y-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Memory Utilization</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Control how extensively Panion uses conversation history memory.
                </p>
                
                <Select 
                  value={preferences.memoryUtilizationLevel}
                  onValueChange={(value) => preferences.setMemoryUtilizationLevel(value as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select memory utilization level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minimal">Minimal - Focus on current context</SelectItem>
                    <SelectItem value="medium">Medium - Balanced use of memory</SelectItem>
                    <SelectItem value="extensive">Extensive - Draw heavily from past conversations</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <h3 className="text-sm font-medium mb-2">Last Updated</h3>
                <p className="text-xs text-muted-foreground">
                  {new Date(preferences.lastUpdated).toLocaleString()}
                </p>
              </div>
            </div>
          </TabsContent>
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            className="gap-2"
            onClick={handleReset}
          >
            <RefreshCw size={16} />
            Reset to Defaults
          </Button>
          
          <Button
            className="gap-2"
            onClick={handleSave}
          >
            <Save size={16} />
            Save Preferences
          </Button>
        </CardFooter>
      </Tabs>
    </Card>
  );
};

export default UserPreferences;