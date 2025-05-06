import React from 'react';
import { useTaskbarStore, TaskbarWidgetType } from '../../state/taskbarStore';
import { Check, ChevronDown, ChevronUp, LayoutGrid, Minus, Plus, Settings } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
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
  const { 
    visibleWidgets,
    position,
    enableBlur,
    showLabels,
    autohide,
    toggleWidget,
    setPosition,
    setEnableBlur,
    setShowLabels,
    setAutohide,
    applyMinimalPreset,
    applyFullPreset,
    applyClassicPreset
  } = useTaskbarStore();

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
    setPosition({ ...position, location: location as 'top' | 'bottom' | 'left' | 'right' });
  };

  const handleAlignmentChange = (alignment: string) => {
    setPosition({ ...position, alignment: alignment as 'start' | 'end' | 'center' | 'space-between' });
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

      <Tabs defaultValue="widgets" className="w-full">
        <TabsList className="w-full mb-4">
          <TabsTrigger value="widgets" className="flex-1">Widgets</TabsTrigger>
          <TabsTrigger value="appearance" className="flex-1">Appearance</TabsTrigger>
          <TabsTrigger value="behavior" className="flex-1">Behavior</TabsTrigger>
        </TabsList>

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
                value={position.location} 
                onValueChange={handleLocationChange}
              >
                <SelectTrigger id="position-location">
                  <SelectValue placeholder="Taskbar Position" />
                </SelectTrigger>
                <SelectContent position="popper" sideOffset={4}>
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
                value={position.alignment} 
                onValueChange={handleAlignmentChange}
              >
                <SelectTrigger id="position-alignment">
                  <SelectValue placeholder="Icon Alignment" />
                </SelectTrigger>
                <SelectContent position="popper" sideOffset={4}>
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