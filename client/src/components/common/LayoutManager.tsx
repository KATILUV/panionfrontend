import React, { useState, useEffect, useRef } from 'react';
import { useAgentStore, WindowLayout, AgentId } from '../../state/agentStore';
import { useThemeStore } from '../../state/themeStore';
import { useTemplateStore, LayoutTemplate } from '../../state/layoutTemplatesStore';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { 
  Save, 
  LayoutGrid,
  Plus,
  Download,
  Trash2,
  Star,
  SquareLibrary,
  Tag,
  Folder,
  Layout,
  Grid3x3,
  Copy,
  CheckCircle,
  ArrowLeftRight,
  Layers,
  Palette,
  Move,
  Maximize2,
  Minimize2,
  X,
  Paintbrush,
  Info,
  Eye
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface LayoutManagerProps {
  children: React.ReactNode;
}

// Custom component for the visual layout builder
const LayoutBuilderCanvas = ({ 
  agents, 
  selectedAgents, 
  onSelectAgent, 
  onUpdatePosition,
  onPreview
}) => {
  const isDark = useThemeStore(state => state.getCurrentTheme()) === 'dark';
  const canvasRef = useRef(null);
  
  // Helper function to render a window preview
  const renderWindow = (agent, index) => {
    const isSelected = selectedAgents.includes(agent.id);
    
    return (
      <div
        key={agent.id}
        className={`absolute cursor-grab rounded-lg border transition-all duration-200 ${
          isSelected ? 
            isDark ? 'border-purple-400 bg-purple-900/60 shadow-lg shadow-purple-500/20' : 
                     'border-purple-400 bg-purple-100/80 shadow-lg shadow-purple-300/20'
            : 
            isDark ? 'border-gray-700 bg-gray-800/60' : 
                     'border-gray-300 bg-gray-100/80'
        }`}
        style={{
          left: `${agent.position.x}%`,
          top: `${agent.position.y}%`,
          width: `${agent.size.width}%`,
          height: `${agent.size.height}%`,
          zIndex: isSelected ? 10 : 1
        }}
        onClick={() => onSelectAgent(agent.id)}
      >
        <div className={`h-6 flex items-center px-2 text-xs font-medium rounded-t-lg ${
          isSelected ? 
            isDark ? 'bg-purple-700 text-white' : 
                    'bg-purple-400 text-white'
            : 
            isDark ? 'bg-gray-700 text-white' : 
                    'bg-gray-300 text-gray-700'
        }`}>
          {agent.title}
        </div>
        <div className="p-2 text-xs opacity-50">
          {agent.id}
        </div>
      </div>
    );
  };
  
  return (
    <div className="mt-4 relative">
      <div className="flex justify-between mb-2">
        <div className="text-sm font-medium">Visual Layout Builder</div>
        <Button 
          size="sm" 
          variant="outline" 
          className="h-7 text-xs flex items-center gap-1"
          onClick={onPreview}
        >
          <Eye className="h-3 w-3" /> Preview
        </Button>
      </div>
      
      <div 
        ref={canvasRef}
        className={`relative border-2 border-dashed rounded-lg overflow-hidden ${
          isDark ? 'border-gray-700/60 bg-black/30' : 'border-gray-300 bg-gray-100/50'
        }`}
        style={{ height: '220px' }}
      >
        {agents.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm opacity-50">
            Add agents from the sidebar to build your layout
          </div>
        ) : (
          agents.map((agent, index) => renderWindow(agent, index))
        )}
      </div>
      
      <div className="flex justify-between mt-1 text-xs opacity-70">
        <div>Click to select • Drag to move</div>
        <div>Resize controls coming soon</div>
      </div>
    </div>
  );
};

// Window control panel component
const WindowControlPanel = ({ 
  selectedAgents, 
  setSelectedAgents,
  layoutAgents,
  setLayoutAgents,
  availableAgents,
  isDark
}) => {
  // Add agent to layout
  const handleAddAgent = (agentId) => {
    const agent = availableAgents.find(a => a.id === agentId);
    if (!agent) return;
    
    // Generate random position for new agent
    const randomX = Math.floor(Math.random() * 60);
    const randomY = Math.floor(Math.random() * 60);
    
    // Add the agent to the layout
    const newLayoutAgent = {
      id: agent.id,
      title: agent.title,
      position: { x: randomX, y: randomY },
      size: { width: 30, height: 30 },
      isOpen: true,
      isMinimized: false
    };
    
    setLayoutAgents([...layoutAgents, newLayoutAgent]);
    setSelectedAgents([agent.id]);
  };
  
  // Remove selected agents
  const handleRemoveSelected = () => {
    setLayoutAgents(layoutAgents.filter(agent => !selectedAgents.includes(agent.id)));
    setSelectedAgents([]);
  };
  
  // Clear all agents from layout
  const handleClearAll = () => {
    setLayoutAgents([]);
    setSelectedAgents([]);
  };
  
  // Filter available agents that aren't already in the layout
  const remainingAgents = availableAgents.filter(
    agent => !layoutAgents.some(layoutAgent => layoutAgent.id === agent.id)
  );
  
  return (
    <div className={`p-3 rounded-lg border ${
      isDark ? 'bg-gray-900/50 border-gray-700/50' : 'bg-white/90 border-gray-200'
    }`}>
      <div className="font-medium text-sm mb-2">Window Control</div>
      
      {/* Add agent selector */}
      <div className="mb-3">
        <Label htmlFor="add-agent" className="text-xs mb-1 block">Add Agent</Label>
        <div className="flex gap-2">
          <Select 
            onValueChange={handleAddAgent}
            disabled={remainingAgents.length === 0}
          >
            <SelectTrigger className="flex-1 h-8 text-xs">
              <SelectValue placeholder="Select agent to add" />
            </SelectTrigger>
            <SelectContent>
              {remainingAgents.map(agent => (
                <SelectItem key={agent.id} value={agent.id} className="text-xs">
                  {agent.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            size="sm"
            className="h-8 text-xs"
            disabled={selectedAgents.length === 0}
            onClick={handleRemoveSelected}
          >
            <X className="h-3 w-3 mr-1" /> Remove
          </Button>
        </div>
      </div>
      
      {/* Actions */}
      <div className="grid grid-cols-2 gap-2">
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-7 text-xs justify-start"
          disabled={layoutAgents.length < 2}
        >
          <ArrowLeftRight className="h-3 w-3 mr-1" /> Align
        </Button>
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-7 text-xs justify-start"
          disabled={layoutAgents.length < 2}
        >
          <Layers className="h-3 w-3 mr-1" /> Stack
        </Button>
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-7 text-xs justify-start"
          disabled={layoutAgents.length < 2}
        >
          <Grid3x3 className="h-3 w-3 mr-1" /> Grid
        </Button>
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-7 text-xs justify-start text-red-500 hover:text-red-600 hover:bg-red-100/20"
          disabled={layoutAgents.length === 0}
          onClick={handleClearAll}
        >
          <Trash2 className="h-3 w-3 mr-1" /> Clear All
        </Button>
      </div>
    </div>
  );
};

// Template preview component
const TemplatePreview = ({ template, onApply, isDark }) => {
  return (
    <div 
      className={`rounded-lg overflow-hidden shadow-md transition-all hover:shadow-lg ${
        isDark 
          ? 'bg-gray-900/70 border border-purple-600/30 hover:border-purple-500/50' 
          : 'bg-white border border-purple-200 hover:border-purple-300/50'
      }`}
    >
      {/* Template image preview */}
      <div className={`h-32 ${isDark ? 'bg-black/30' : 'bg-gray-100'} relative`}>
        <div className="absolute inset-0 flex items-center justify-center">
          {template.layout.type === 'centered' && (
            <div className="w-16 h-16 rounded-md bg-purple-500/50 shadow-lg"></div>
          )}
          
          {template.layout.type === 'split' && (
            <div className="flex w-full h-full">
              <div className="w-1/2 h-full bg-purple-500/40 flex items-center justify-center">
                <div className="w-10 h-10 rounded-md bg-purple-500/70"></div>
              </div>
              <div className="w-1/2 h-full bg-purple-600/40 flex items-center justify-center">
                <div className="w-10 h-10 rounded-md bg-purple-600/70"></div>
              </div>
            </div>
          )}
          
          {template.layout.type === 'triple' && (
            <div className="grid grid-cols-3 w-full h-full gap-1 p-1">
              <div className="rounded bg-purple-500/40"></div>
              <div className="rounded bg-purple-600/40"></div>
              <div className="rounded bg-purple-700/40"></div>
            </div>
          )}
          
          {template.layout.type === 'grid' && (
            <div className="grid grid-cols-2 grid-rows-2 w-full h-full gap-1 p-1">
              <div className="rounded bg-purple-500/40"></div>
              <div className="rounded bg-purple-600/40"></div>
              <div className="rounded bg-purple-700/40"></div>
              <div className="rounded bg-purple-800/40"></div>
            </div>
          )}
          
          {template.layout.type === 'stack' && (
            <div className="relative w-4/5 h-4/5">
              <div className="absolute inset-0 bg-purple-500/40 rounded transform rotate-3 translate-x-1"></div>
              <div className="absolute inset-0 bg-purple-600/40 rounded transform rotate-1"></div>
              <div className="absolute inset-0 bg-purple-700/40 rounded transform -rotate-1"></div>
              <div className="absolute inset-0 bg-purple-800/40 rounded transform -rotate-3 -translate-x-1"></div>
            </div>
          )}
        </div>
      </div>
      
      {/* Template info */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-1">
          <div className="font-medium">{template.name}</div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onApply(template.id)}
            className="h-7 w-7 p-0 text-purple-500 hover:text-purple-400 hover:bg-purple-500/10"
            title="Use this template"
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
        
        <p className={`text-xs mb-2 line-clamp-2 ${
          isDark ? 'text-white/70' : 'text-gray-600'
        }`}>
          {template.description}
        </p>
        
        <div className="flex flex-wrap gap-1">
          <Badge variant="outline" className={`text-xs ${
            isDark ? 'border-purple-500/30 bg-purple-500/10' : 'border-purple-200 bg-purple-50'
          }`}>
            {template.layout.type}
          </Badge>
        </div>
      </div>
    </div>
  );
};

const LayoutManager = ({ children }: LayoutManagerProps) => {
  const { 
    registry, 
    layouts, 
    activeLayoutId, 
    saveLayout, 
    loadLayout, 
    deleteLayout, 
    setDefaultLayout, 
    createLayoutFromTemplate 
  } = useAgentStore();
  
  const getCurrentTheme = useThemeStore(state => state.getCurrentTheme);
  const isDark = getCurrentTheme() === 'dark';
  
  // State for layout management
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState('templates');
  const [filteredLayouts, setFilteredLayouts] = useState<WindowLayout[]>([]);
  
  // State for layout builder
  const [builderMode, setBuilderMode] = useState<'template' | 'custom'>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<LayoutTemplate | null>(null);
  const [layoutName, setLayoutName] = useState('');
  const [layoutCategory, setLayoutCategory] = useState('');
  const [layoutDescription, setLayoutDescription] = useState('');
  const [makeDefault, setMakeDefault] = useState(false);
  
  // State for visual layout builder
  const [layoutAgents, setLayoutAgents] = useState([]);
  const [selectedAgents, setSelectedAgents] = useState<AgentId[]>([]);
  
  const { toast } = useToast();
  
  // Get templates from template store
  const templates = useTemplateStore(state => state.templates);
  const templateCategories = useTemplateStore(state => state.categories);
  
  // Update filtered layouts when layouts change
  useEffect(() => {
    // Sort layouts - default first, then by most recently updated
    const sorted = [...layouts].sort((a, b) => {
      // First sort by default status
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      
      // Then by updated timestamp (newest first)
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });
    
    setFilteredLayouts(sorted);
  }, [layouts]);
  
  // Reset state when dialog opens
  useEffect(() => {
    if (dialogOpen) {
      setBuilderMode('template');
      setSelectedTemplate(null);
      setLayoutName('');
      setLayoutCategory('');
      setLayoutDescription('');
      setMakeDefault(false);
      setLayoutAgents([]);
      setSelectedAgents([]);
    }
  }, [dialogOpen]);
  
  // Handle selecting a template
  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template);
    setLayoutName(`${template.name} Layout`);
    setLayoutCategory(template.category);
    
    // Generate agent positions based on template type
    const agentsToPlace = [...registry];
    const newLayoutAgents = [];
    
    // Create different layouts based on template type
    switch(template.layout.type) {
      case 'centered':
        // Single centered window
        if (agentsToPlace.length > 0) {
          newLayoutAgents.push({
            id: agentsToPlace[0].id,
            title: agentsToPlace[0].title,
            position: { x: 25, y: 25 },
            size: { width: 50, height: 50 },
            isOpen: true,
            isMinimized: false
          });
        }
        break;
        
      case 'split':
        // Two windows side by side
        if (agentsToPlace.length > 0) {
          newLayoutAgents.push({
            id: agentsToPlace[0].id,
            title: agentsToPlace[0].title,
            position: { x: 0, y: 0 },
            size: { width: 49, height: 100 },
            isOpen: true,
            isMinimized: false
          });
          
          if (agentsToPlace.length > 1) {
            newLayoutAgents.push({
              id: agentsToPlace[1].id,
              title: agentsToPlace[1].title,
              position: { x: 51, y: 0 },
              size: { width: 49, height: 100 },
              isOpen: true,
              isMinimized: false
            });
          }
        }
        break;
        
      case 'triple':
        // Three windows in a row
        for (let i = 0; i < Math.min(3, agentsToPlace.length); i++) {
          newLayoutAgents.push({
            id: agentsToPlace[i].id,
            title: agentsToPlace[i].title,
            position: { x: i * 34, y: 0 },
            size: { width: 32, height: 100 },
            isOpen: true,
            isMinimized: false
          });
        }
        break;
        
      case 'grid':
        // 2x2 grid
        const positions = [
          { x: 0, y: 0 },
          { x: 51, y: 0 },
          { x: 0, y: 51 },
          { x: 51, y: 51 }
        ];
        
        for (let i = 0; i < Math.min(4, agentsToPlace.length); i++) {
          newLayoutAgents.push({
            id: agentsToPlace[i].id,
            title: agentsToPlace[i].title,
            position: positions[i],
            size: { width: 49, height: 49 },
            isOpen: true,
            isMinimized: false
          });
        }
        break;
        
      case 'stack':
        // Stacked windows in the center with slight offset
        for (let i = 0; i < Math.min(4, agentsToPlace.length); i++) {
          newLayoutAgents.push({
            id: agentsToPlace[i].id,
            title: agentsToPlace[i].title,
            position: { x: 15 + i * 2, y: 15 + i * 2 },
            size: { width: 70, height: 70 },
            isOpen: true,
            isMinimized: false
          });
        }
        break;
    }
    
    setLayoutAgents(newLayoutAgents);
  };
  
  // Handle creating a new layout from the builder
  const handleCreateLayout = () => {
    if (!layoutName.trim()) {
      toast({
        title: 'Layout name required',
        description: 'Please enter a name for your layout',
        variant: 'destructive'
      });
      return;
    }
    
    if (layoutAgents.length === 0) {
      toast({
        title: 'Empty layout',
        description: 'Please add at least one window to your layout',
        variant: 'destructive'
      });
      return;
    }
    
    // Create window states object for saving
    const windowStates = {};
    layoutAgents.forEach(agent => {
      windowStates[agent.id] = {
        position: agent.position,
        size: agent.size,
        isOpen: true,
        isMinimized: false
      };
    });
    
    // Create custom layout
    const customLayout = {
      id: Date.now().toString(),
      name: layoutName,
      category: layoutCategory || 'Custom',
      tags: [],
      isDefault: makeDefault,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      windowStates
    };
    
    // In a real implementation, we would save this custom layout
    // For now, just log it and show a success message
    console.log('Created custom layout:', customLayout);
    
    // Close dialog and reset form
    setDialogOpen(false);
    
    // Create success toast
    toast({
      title: 'Layout created',
      description: `Your layout "${layoutName}" has been created`,
    });
  };
  
  // Handle previewing the layout
  const handlePreviewLayout = () => {
    if (layoutAgents.length === 0) {
      toast({
        title: 'Empty layout',
        description: 'Please add at least one window to preview',
        variant: 'destructive'
      });
      return;
    }
    
    toast({
      title: 'Layout Preview',
      description: `Preview mode would show ${layoutAgents.length} windows with your configuration`,
    });
  };
  
  // Handle template selection
  const handleApplyTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      handleSelectTemplate(template);
      setSelectedTab('builder');
    }
  };
  
  // Load a layout
  const handleLoadLayout = (id: string, name: string) => {
    loadLayout(id);
    setDialogOpen(false);
    
    toast({
      title: 'Layout loaded',
      description: `Layout "${name}" has been applied`,
    });
  };
  
  // Delete a layout
  const handleDeleteLayout = (id: string, name: string) => {
    deleteLayout(id);
    
    toast({
      title: 'Layout deleted',
      description: `Layout "${name}" has been removed`,
    });
  };
  
  // Set a layout as default
  const handleSetDefaultLayout = (id: string, name: string) => {
    setDefaultLayout(id);
    
    toast({
      title: 'Default layout set',
      description: `"${name}" will be used as the default layout`,
    });
  };
  
  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent 
        className={`sm:max-w-[800px] backdrop-blur-xl shadow-lg shadow-black/20 overflow-hidden ${
          isDark
            ? 'bg-gray-900/90 border border-purple-600/50 text-white' 
            : 'bg-white/95 border border-purple-300 text-gray-900'
        }`}
      >
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-purple-500" />
            Layout Manager
          </DialogTitle>
          <DialogDescription>
            Create, manage and apply window layouts for your workspace.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="templates" className="mt-2" value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="w-full grid grid-cols-3 p-1 gap-1 bg-gray-900/30 dark:bg-black/30 rounded-lg">
            <TabsTrigger 
              value="templates" 
              className="flex items-center gap-1.5 data-[state=active]:bg-purple-700/90 data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              <SquareLibrary className="h-4 w-4" /> Start from Template
            </TabsTrigger>
            <TabsTrigger 
              value="builder" 
              className="flex items-center gap-1.5 data-[state=active]:bg-purple-700/90 data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              <Paintbrush className="h-4 w-4" /> Layout Builder
            </TabsTrigger>
            <TabsTrigger 
              value="saved" 
              className="flex items-center gap-1.5 data-[state=active]:bg-purple-700/90 data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              <LayoutGrid className="h-4 w-4" /> Saved Layouts
            </TabsTrigger>
          </TabsList>
          
          {/* Templates Tab */}
          <TabsContent value="templates" className="py-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Choose a Starting Point</h3>
              <Button 
                size="sm" 
                variant="outline" 
                className="h-7 flex items-center gap-1 text-xs"
                onClick={() => {
                  setSelectedTab('builder');
                  setBuilderMode('custom');
                  setLayoutAgents([]);
                }}
              >
                <Plus className="h-3 w-3" /> Start from Scratch
              </Button>
            </div>
            
            <div className="grid grid-cols-3 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {templates.map(template => (
                <TemplatePreview 
                  key={template.id}
                  template={template}
                  onApply={handleApplyTemplate}
                  isDark={isDark}
                />
              ))}
            </div>
          </TabsContent>
          
          {/* Layout Builder Tab */}
          <TabsContent value="builder" className="py-2">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-medium">
                    {selectedTemplate ? `Customize: ${selectedTemplate.name}` : 'Custom Layout Builder'}
                  </h3>
                  {selectedTemplate && (
                    <Badge className="bg-purple-600">
                      {selectedTemplate.layout.type} template
                    </Badge>
                  )}
                </div>
                
                {/* Layout details form */}
                <div className={`p-3 rounded-lg border mb-4 ${
                  isDark ? 'bg-gray-900/50 border-gray-700/50' : 'bg-white/90 border-gray-200'
                }`}>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="layout-name">Layout Name</Label>
                      <Input
                        id="layout-name"
                        placeholder="My Workspace Layout"
                        value={layoutName}
                        onChange={e => setLayoutName(e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="layout-category">Category (optional)</Label>
                      <Input
                        id="layout-category"
                        placeholder="e.g., Work, Development"
                        value={layoutCategory}
                        onChange={e => setLayoutCategory(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="mt-3 space-y-2">
                    <Label htmlFor="layout-description">Description (optional)</Label>
                    <Textarea
                      id="layout-description"
                      placeholder="Describe this layout"
                      rows={2}
                      value={layoutDescription}
                      onChange={e => setLayoutDescription(e.target.value)}
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2 mt-3">
                    <Switch 
                      id="make-default" 
                      checked={makeDefault}
                      onCheckedChange={setMakeDefault}
                    />
                    <Label htmlFor="make-default" className="text-sm">Make this my default layout</Label>
                  </div>
                </div>
                
                {/* Visual layout builder */}
                <LayoutBuilderCanvas
                  agents={layoutAgents}
                  selectedAgents={selectedAgents}
                  onSelectAgent={(id) => {
                    if (selectedAgents.includes(id)) {
                      setSelectedAgents(selectedAgents.filter(agentId => agentId !== id));
                    } else {
                      setSelectedAgents([...selectedAgents, id]);
                    }
                  }}
                  onUpdatePosition={(id, position) => {
                    // To be implemented - drag positioning
                  }}
                  onPreview={handlePreviewLayout}
                />
              </div>
              
              <div className="space-y-4">
                {/* Agent control panel */}
                <WindowControlPanel
                  selectedAgents={selectedAgents}
                  setSelectedAgents={setSelectedAgents}
                  layoutAgents={layoutAgents}
                  setLayoutAgents={setLayoutAgents}
                  availableAgents={registry}
                  isDark={isDark}
                />
                
                {/* Information panel */}
                <div className={`p-3 rounded-lg border text-sm ${
                  isDark ? 'bg-blue-900/20 border-blue-500/30 text-blue-200' : 'bg-blue-50 border-blue-200 text-blue-700'
                }`}>
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="mb-2">Layouts you create here are saved and can be applied anytime.</p>
                      <p>You can add, remove and position windows to create your perfect workspace arrangement.</p>
                    </div>
                  </div>
                </div>
                
                {/* Create layout button */}
                <Button 
                  className="w-full flex items-center justify-center gap-2 bg-purple-700 hover:bg-purple-600"
                  onClick={handleCreateLayout}
                >
                  <Save className="h-4 w-4" />
                  Create Layout
                </Button>
              </div>
            </div>
          </TabsContent>
          
          {/* Saved Layouts Tab */}
          <TabsContent value="saved" className="py-3">
            {layouts.length === 0 ? (
              <div className={`text-center p-12 rounded-lg border border-dashed ${
                isDark ? 'border-gray-700 text-white/50' : 'border-gray-300 text-gray-500'
              }`}>
                <Folder className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No saved layouts yet</h3>
                <p className="max-w-md mx-auto mb-4">
                  Create your first layout from the templates or build a custom one from scratch.
                </p>
                <Button 
                  onClick={() => setSelectedTab('templates')}
                  className="bg-purple-700 hover:bg-purple-600"
                >
                  <Plus className="h-4 w-4 mr-2" /> Create Your First Layout
                </Button>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {filteredLayouts.map(layout => (
                  <div 
                    key={layout.id}
                    className={`rounded-lg transition-all duration-200 overflow-hidden shadow-sm hover:shadow-md ${
                      activeLayoutId === layout.id 
                        ? isDark
                          ? 'bg-purple-900/60 border-2 border-purple-500/70 shadow-purple-500/20' 
                          : 'bg-purple-100 border-2 border-purple-400 shadow-purple-300/20'
                        : isDark
                          ? 'bg-gray-900/50 hover:bg-gray-900/70 border border-purple-600/30 hover:border-purple-500/50'
                          : 'bg-white/90 hover:bg-purple-50/90 border border-purple-200 hover:border-purple-300/70'
                    }`}
                  >
                    <div className="p-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{layout.name}</span>
                          {layout.isDefault && (
                            <Badge variant="secondary" className="bg-purple-500/30 text-xs">
                              <Star className="h-3 w-3 mr-1 fill-current" />
                              Default
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex gap-1">
                          {!layout.isDefault && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleSetDefaultLayout(layout.id, layout.name)}
                              title="Set as default"
                              className="h-7 w-7 p-0"
                            >
                              <Star className="h-4 w-4" />
                            </Button>
                          )}
                          
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleLoadLayout(layout.id, layout.name)}
                            title="Load this layout"
                            className="h-7 w-7 p-0 text-purple-600 hover:text-purple-500"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteLayout(layout.id, layout.name)}
                            title="Delete this layout"
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-400"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Stats about the layout */}
                      <div className={`flex gap-3 text-xs mt-2 ${
                        isDark ? 'text-white/70' : 'text-gray-600'
                      }`}>
                        <div>
                          <span className="font-medium">Windows: </span>
                          {Object.keys(layout.windowStates).length}
                        </div>
                        <div>
                          <span className="font-medium">Created: </span>
                          {new Date(layout.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      
                      {/* Category & tags */}
                      {(layout.category || (layout.tags && layout.tags.length > 0)) && (
                        <div className="flex flex-wrap gap-1 mt-2 text-xs">
                          {layout.category && (
                            <Badge variant="outline" className="text-xs">
                              <Folder className="h-3 w-3 mr-1" />
                              {layout.category}
                            </Badge>
                          )}
                          
                          {layout.tags && layout.tags.length > 0 && layout.tags.map(tag => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              <Tag className="h-3 w-3 mr-1" />
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          <Button 
            variant="outline"
            className="mt-2"
            onClick={() => setDialogOpen(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LayoutManager;