import React, { useEffect } from 'react';
import { useTaskbarStore, TaskbarWidgetType } from '../../state/taskbarStore';
import { Check, ChevronDown, ChevronUp, LayoutGrid, Minus, Plus, Settings, Pin, PinOff, X, Clock, Move, MessageCircle, Database, Brain, FlaskConical } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useAgentStore, AgentId } from '@/state/agentStore';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { DraggableTaskbarEditor } from './DraggableTaskbarEditor';

// Readable names for the widgets
const widgetNames: Record<TaskbarWidgetType, string> = {
  quickSave: 'Quick Save',
  systemConsole: 'System Console',
  layoutManager: 'Layout Manager',
  versionNumber: 'Version Number',
  clock: 'Clock',
  searchBar: 'Search Bar',
  notifications: 'Notifications',
  aiStatus: 'AI Status'
};

// Widget descriptions
const widgetDescriptions: Record<TaskbarWidgetType, string> = {
  quickSave: 'Save your current window layout for later use',
  systemConsole: 'View system logs and debug information',
  layoutManager: 'Manage and switch between saved layouts',
  versionNumber: 'Display the current application version',
  clock: 'Show the current time',
  searchBar: 'Quick search for commands and content',
  notifications: 'Display system notifications and alerts',
  aiStatus: 'Show the status of AI agents'
};

export function TaskbarSettings() {
  // Force update mechanism for consistent render on state changes
  const [forceUpdate, setForceUpdate] = React.useState(0);

  // Subscribe to taskbar store changes
  React.useEffect(() => {
    const handleStoreChange = () => {
      console.log("TaskbarSettings - Store changed, forcing update");
      setForceUpdate(prev => prev + 1);
    };
    
    // Set up subscription
    const unsubscribe = useTaskbarStore.subscribe(handleStoreChange);
    
    // Log current state
    console.log("TaskbarSettings - Initial state:", {
      pinnedAgents: useTaskbarStore.getState().pinnedAgents,
      position: useTaskbarStore.getState().position
    });
    
    // Cleanup
    return () => unsubscribe();
  }, []);

  // Get store state with selector
  const { 
    visibleWidgets,
    position,
    enableBlur,
    showLabels,
    autohide,
    pinnedAgents,
    toggleWidget,
    setPosition,
    setEnableBlur,
    setShowLabels,
    setAutohide,
    applyMinimalPreset,
    applyFullPreset,
    applyClassicPreset,
    pinAgent,
    unpinAgent,
    clearPinnedAgents,
    resetTaskbar
  } = useTaskbarStore();
  
  // Log when pinnedAgents change
  React.useEffect(() => {
    console.log("TaskbarSettings - Current pinned agents:", pinnedAgents, "Force update count:", forceUpdate);
  }, [pinnedAgents, forceUpdate]);
  
  // Get agent registry from agent store
  const registry = useAgentStore(state => state.registry);
  const { toast } = useToast();

  // List of available widgets
  const allWidgets: TaskbarWidgetType[] = [
    'quickSave',
    'systemConsole',
    'layoutManager',
    'versionNumber',
    'clock',
    'searchBar',
    'notifications',
    'aiStatus'
  ];

  // Handle position changes
  const handleLocationChange = (location: string) => {
    const newLocation = location as 'top' | 'bottom' | 'left' | 'right';
    console.log("Updating taskbar location to:", newLocation);
    setPosition({ 
      ...position, 
      location: newLocation
    });
  };

  const handleAlignmentChange = (alignment: string) => {
    const newAlignment = alignment as 'start' | 'end' | 'center' | 'space-between';
    console.log("Updating taskbar alignment to:", newAlignment);
    setPosition({ 
      ...position, 
      alignment: newAlignment
    });
  };

  return (
    <div className="max-w-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2 ml-auto">
          <Button variant="outline" size="sm" onClick={applyMinimalPreset} title="Minimal Preset">
            <Minus className="h-4 w-4 mr-1" />
            Minimal
          </Button>
          <Button variant="outline" size="sm" onClick={applyClassicPreset} title="Classic Preset">
            <LayoutGrid className="h-4 w-4 mr-1" />
            Classic
          </Button>
          <Button variant="outline" size="sm" onClick={applyFullPreset} title="Full Preset">
            <Plus className="h-4 w-4 mr-1" />
            Full
          </Button>
        </div>
      </div>

      <Tabs defaultValue="pinned" className="w-full">
        <TabsList className="w-full mb-4">
          <TabsTrigger value="pinned" className="flex-1">Pinned Agents</TabsTrigger>
          <TabsTrigger value="editor" className="flex-1 flex items-center">
            <Move className="h-4 w-4 mr-1" />
            Visual Editor
          </TabsTrigger>
          <TabsTrigger value="widgets" className="flex-1">Widgets</TabsTrigger>
          <TabsTrigger value="appearance" className="flex-1">Appearance</TabsTrigger>
          <TabsTrigger value="behavior" className="flex-1">Behavior</TabsTrigger>
        </TabsList>
        
        {/* Pinned Agents Tab */}
        <TabsContent value="pinned">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-4">
              Select which agents should appear in your taskbar for quick access.
              For visual drag-and-drop editing, use the <span className="font-medium">Visual Editor</span> tab.
            </p>
            
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium">Currently Pinned Agents</h3>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    console.log("Resetting taskbar configuration to defaults");
                    // Get fresh function from store to avoid stale closures
                    const { resetTaskbar } = useTaskbarStore.getState();
                    resetTaskbar();
                    // Force a re-render of this component immediately
                    setForceUpdate(prev => prev + 2); // +2 to make it different
                    // Verify changes were applied
                    setTimeout(() => {
                      const currentPinned = useTaskbarStore.getState().pinnedAgents;
                      console.log("After resetting taskbar:", currentPinned);
                    }, 0);
                    toast({
                      title: "Taskbar reset",
                      description: "Taskbar configuration has been reset to defaults",
                    });
                  }}
                  className="text-primary hover:bg-primary/10"
                >
                  <Settings className="h-4 w-4 mr-1" />
                  Reset Defaults
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    console.log("Before clearing pinned agents:", pinnedAgents);
                    // Get fresh function directly from store to avoid stale closures
                    const { clearPinnedAgents } = useTaskbarStore.getState();
                    clearPinnedAgents();
                    // Force a re-render of this component immediately
                    setForceUpdate(prev => prev + 1);
                    // Also force a direct state update for all components
                    useTaskbarStore.setState({ pinnedAgents: [] });
                    // Verify changes were applied
                    setTimeout(() => {
                      const currentPinned = useTaskbarStore.getState().pinnedAgents;
                      console.log("After clearing pinned agents:", currentPinned);
                    }, 0);
                    toast({
                      title: "Taskbar cleared",
                      description: "All agents have been removed from the taskbar",
                    });
                  }}
                  className="text-destructive hover:bg-destructive/10"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
              </div>
            </div>
            
            <div className="space-y-2 mb-6">
              {pinnedAgents.length > 0 ? (
                pinnedAgents.map((agentId) => {
                  const agent = registry.find(a => a.id === agentId);
                  if (!agent) return null;
                  
                  let AgentIcon;
                  switch (agentId) {
                    case 'panion':
                      AgentIcon = MessageCircle;
                      break;
                    case 'database':
                      AgentIcon = Database;
                      break;
                    case 'brain-circuit':
                      AgentIcon = Brain;
                      break;
                    case 'scientist':
                      AgentIcon = FlaskConical;
                      break;
                    case 'scheduler':
                      AgentIcon = Clock;
                      break;
                    default:
                      AgentIcon = MessageCircle;
                  }
                  
                  return (
                    <div 
                      key={agentId}
                      className="flex items-center justify-between p-2 bg-background/30 rounded-md border"
                    >
                      <div className="flex items-center">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                          <AgentIcon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">{agent.title}</div>
                          <div className="text-xs text-muted-foreground">AI Agent</div>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => {
                          console.log("Before unpinning agent:", agentId, pinnedAgents);
                          // Get fresh function from store to avoid stale closures
                          const { unpinAgent } = useTaskbarStore.getState();
                          // Execute with current agentId
                          unpinAgent(agentId);
                          // Force update to immediately reflect changes
                          setForceUpdate(prev => prev + 1);
                          // Verify changes were applied
                          setTimeout(() => {
                            console.log("After unpinning agent:", agentId, useTaskbarStore.getState().pinnedAgents);
                          }, 0);
                          toast({
                            title: "Agent unpinned",
                            description: `${agent.title || 'Agent'} has been removed from the taskbar`,
                          });
                        }}
                        className="text-destructive hover:bg-destructive/10 h-8 w-8"
                      >
                        <PinOff className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  No agents pinned to the taskbar yet.
                </div>
              )}
            </div>
            
            <h3 className="text-sm font-medium mt-8 mb-2">Available Agents</h3>
            <div className="space-y-2">
              {registry
                .filter(agent => !pinnedAgents.includes(agent.id))
                .map((agent) => {
                  let AgentIcon;
                  switch (agent.id) {
                    case 'panion':
                      AgentIcon = MessageCircle;
                      break;
                    case 'database':
                      AgentIcon = Database;
                      break;
                    case 'brain-circuit':
                      AgentIcon = Brain;
                      break;
                    case 'scientist':
                      AgentIcon = FlaskConical;
                      break;
                    case 'scheduler':
                      AgentIcon = Clock;
                      break;
                    default:
                      AgentIcon = MessageCircle;
                  }
                  
                  return (
                    <div 
                      key={agent.id}
                      className="flex items-center justify-between p-2 bg-background/30 rounded-md border"
                    >
                      <div className="flex items-center">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                          <AgentIcon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">{agent.title}</div>
                          <div className="text-xs text-muted-foreground">AI Agent</div>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => {
                          console.log("Before pinning agent:", agent.id, pinnedAgents);
                          // Get fresh function from store to avoid stale closures
                          const { pinAgent } = useTaskbarStore.getState();
                          // Execute with current agent id
                          pinAgent(agent.id);
                          // Force update to immediately reflect changes
                          setForceUpdate(prev => prev + 1);
                          // Verify changes were applied
                          setTimeout(() => {
                            console.log("After pinning agent:", agent.id, useTaskbarStore.getState().pinnedAgents);
                          }, 0);
                          toast({
                            title: "Agent pinned",
                            description: `${agent.title || 'Agent'} has been added to the taskbar`,
                          });
                        }}
                        className="text-primary hover:bg-primary/10 h-8 w-8"
                      >
                        <Pin className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
            </div>
          </div>
        </TabsContent>
        
        {/* Visual Editor Tab */}
        <TabsContent value="editor">
          <DraggableTaskbarEditor />
        </TabsContent>
        
        {/* Widgets Tab */}
        <TabsContent value="widgets">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-4">
              Choose which widgets appear in your taskbar.
            </p>
            
            <div className="space-y-2">
              {allWidgets.map((widget) => (
                <div 
                  key={widget}
                  className="flex items-center justify-between p-2 bg-background/30 rounded-md border"
                >
                  <div>
                    <div className="font-medium">{widgetNames[widget]}</div>
                    <div className="text-xs text-muted-foreground">{widgetDescriptions[widget]}</div>
                  </div>
                  <Switch 
                    checked={visibleWidgets.includes(widget)} 
                    onCheckedChange={() => toggleWidget(widget)}
                  />
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance">
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="position-location">Taskbar Position</Label>
              <Select 
                defaultValue={position.location}
                value={position.location} 
                onValueChange={(value) => {
                  console.log("Setting taskbar position to:", value);
                  handleLocationChange(value);
                }}
              >
                <SelectTrigger id="position-location" className="w-full">
                  <SelectValue placeholder="Taskbar Position" />
                </SelectTrigger>
                <SelectContent 
                  position="popper" 
                  align="center" 
                  sideOffset={4}
                  className="z-[9999]"
                >
                  <SelectItem value="top">Top</SelectItem>
                  <SelectItem value="bottom">Bottom</SelectItem>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="position-alignment">Icon Alignment</Label>
              <Select 
                defaultValue={position.alignment}
                value={position.alignment} 
                onValueChange={(value) => {
                  console.log("Setting alignment to:", value);
                  handleAlignmentChange(value);
                }}
              >
                <SelectTrigger id="position-alignment" className="w-full">
                  <SelectValue placeholder="Icon Alignment" />
                </SelectTrigger>
                <SelectContent 
                  position="popper" 
                  align="center" 
                  sideOffset={4}
                  className="z-[9999]"
                >
                  <SelectItem value="start">Start</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="end">End</SelectItem>
                  <SelectItem value="space-between">Space Between</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="blur-effect">Background Blur</Label>
                <div className="text-xs text-muted-foreground">Adds a glassmorphic effect to the taskbar</div>
              </div>
              <Switch 
                id="blur-effect"
                checked={enableBlur} 
                onCheckedChange={setEnableBlur}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="show-labels">Show Labels</Label>
                <div className="text-xs text-muted-foreground">Display text labels alongside icons</div>
              </div>
              <Switch 
                id="show-labels"
                checked={showLabels} 
                onCheckedChange={setShowLabels}
              />
            </div>
          </div>
        </TabsContent>

        {/* Behavior Tab */}
        <TabsContent value="behavior">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="autohide">Auto-hide Taskbar</Label>
                <div className="text-xs text-muted-foreground">Hide taskbar when not in use</div>
              </div>
              <Switch 
                id="autohide"
                checked={autohide} 
                onCheckedChange={setAutohide}
              />
            </div>

            <Accordion type="single" collapsible>
              <AccordionItem value="advanced">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    <span>Advanced Settings</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="text-sm text-muted-foreground p-2">
                    Advanced settings will be added in future updates.
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default TaskbarSettings;