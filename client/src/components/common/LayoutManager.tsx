import React, { useState, useEffect } from 'react';
import { useAgentStore, WindowLayout } from '../../state/agentStore';
import { useThemeStore } from '../../state/themeStore';
import { useTemplateStore } from '../../state/layoutTemplatesStore';
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
import { Input } from '@/components/ui/input';
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
  Layout
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';

interface LayoutManagerProps {
  children: React.ReactNode;
}

const LayoutManager = ({ children }: LayoutManagerProps) => {
  const { layouts, activeLayoutId, saveLayout, loadLayout, deleteLayout, setDefaultLayout, createLayoutFromTemplate } = useAgentStore();
  const getCurrentTheme = useThemeStore(state => state.getCurrentTheme);
  const [newLayoutName, setNewLayoutName] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState('layouts');
  const [filteredLayouts, setFilteredLayouts] = useState<WindowLayout[]>([]);
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

  // Create a new layout
  const handleSaveLayout = () => {
    if (!newLayoutName.trim()) {
      toast({
        title: 'Layout name required',
        description: 'Please enter a name for your layout',
        variant: 'destructive'
      });
      return;
    }

    // Save with default category and no tags
    saveLayout(newLayoutName);
    
    // Reset form
    setNewLayoutName('');
    
    toast({
      title: 'Layout saved',
      description: `Layout "${newLayoutName}" has been saved`,
    });
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
  
  // Apply a template
  const handleApplyTemplate = (templateId: string, templateName: string) => {
    createLayoutFromTemplate(templateId);
    setDialogOpen(false);
    
    toast({
      title: 'Template Applied',
      description: `Layout template "${templateName}" has been applied`,
    });
  };
  
  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent 
        className={`sm:max-w-[650px] backdrop-blur-xl shadow-lg shadow-black/20 ${
          getCurrentTheme() === 'dark' 
            ? 'bg-gray-900/90 border border-purple-600/50 text-white' 
            : 'bg-white/95 border border-purple-300 text-gray-900'
        }`}
        aria-describedby="layout-manager-description"
      >
        <DialogHeader>
          <DialogTitle className="text-xl">Window Layouts</DialogTitle>
          <p className={`mt-2 ${
            getCurrentTheme() === 'dark' ? 'text-white/80' : 'text-gray-600'
          }`}>
            Save, manage and apply window layouts.
          </p>
        </DialogHeader>
        
        <Tabs defaultValue="layouts" className="mt-4" value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="w-full grid grid-cols-3 p-1 gap-1 bg-gray-900/30 dark:bg-black/30 rounded-lg">
            <TabsTrigger 
              value="layouts" 
              className="flex items-center gap-1.5 data-[state=active]:bg-purple-700/90 data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              <LayoutGrid className="h-4 w-4" /> My Layouts
            </TabsTrigger>
            <TabsTrigger 
              value="templates" 
              className="flex items-center gap-1.5 data-[state=active]:bg-purple-700/90 data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              <SquareLibrary className="h-4 w-4" /> Templates
            </TabsTrigger>
            <TabsTrigger 
              value="create" 
              className="flex items-center gap-1.5 data-[state=active]:bg-purple-700/90 data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              <Plus className="h-4 w-4" /> Create New
            </TabsTrigger>
          </TabsList>
          
          {/* My Layouts Tab Content */}
          <TabsContent value="layouts" className="py-4">
            {layouts.length === 0 ? (
              <div className={`text-center py-6 ${
                getCurrentTheme() === 'dark' ? 'text-white/50' : 'text-gray-500'
              }`}>
                No saved layouts yet. Create a new layout to get started.
              </div>
            ) : (
              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                {filteredLayouts.map(layout => (
                  <div 
                    key={layout.id}
                    className={`rounded-lg transition-all duration-200 overflow-hidden shadow-sm hover:shadow-md ${
                      activeLayoutId === layout.id 
                        ? getCurrentTheme() === 'dark'
                          ? 'bg-purple-900/60 border-2 border-purple-500/70 shadow-purple-500/20' 
                          : 'bg-purple-100 border-2 border-purple-400 shadow-purple-300/20'
                        : getCurrentTheme() === 'dark'
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
                      
                      {/* Category & tags */}
                      {(layout.category || (layout.tags && layout.tags.length > 0)) && (
                        <div className="flex flex-wrap gap-1 mt-1 text-xs">
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
                      
                      {/* Timestamp */}
                      <div className={`text-xs mt-2 ${
                        getCurrentTheme() === 'dark' ? 'text-white/50' : 'text-gray-500'
                      }`}>
                        Updated: {new Date(layout.updatedAt || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
          
          {/* Templates Tab Content */}
          <TabsContent value="templates" className="py-4">
            {templates.length === 0 ? (
              <div className={`text-center py-6 ${
                getCurrentTheme() === 'dark' ? 'text-white/50' : 'text-gray-500'
              }`}>
                No templates available.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                {templates.map(template => (
                  <div 
                    key={template.id}
                    className={`rounded-lg transition-all duration-200 overflow-hidden shadow-sm hover:shadow-md ${
                      getCurrentTheme() === 'dark'
                        ? 'bg-gray-900/50 hover:bg-gray-900/70 border border-purple-600/30 hover:border-purple-500/50'
                        : 'bg-white/90 hover:bg-purple-50/90 border border-purple-200 hover:border-purple-300/70'
                    }`}
                  >
                    <div className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium">{template.name}</div>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleApplyTemplate(template.id, template.name)}
                          className="bg-purple-700 hover:bg-purple-600 shadow-sm hover:shadow-md text-xs h-7 px-3 transition-all hover:scale-105"
                        >
                          <Layout className="h-3 w-3 mr-1.5" />
                          Apply
                        </Button>
                      </div>
                      
                      <p className={`text-sm mb-2 ${
                        getCurrentTheme() === 'dark' ? 'text-white/80' : 'text-gray-600'
                      }`}>
                        {template.description}
                      </p>
                      
                      {/* Template tags */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        <Badge variant="outline" className="text-xs">
                          <Folder className="h-3 w-3 mr-1" />
                          {template.category}
                        </Badge>
                        
                        {template.tags && template.tags.map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            <Tag className="h-3 w-3 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
          
          {/* Create Layout Tab Content */}
          <TabsContent value="create" className="py-4">
            <div className={`p-4 rounded-lg ${
              getCurrentTheme() === 'dark' ? 'bg-gray-900/50' : 'bg-purple-50/50'
            } shadow-inner border border-purple-500/20`}>
              <h3 className="text-lg font-medium mb-4">Save Current Layout</h3>
              
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Layout name"
                    value={newLayoutName}
                    onChange={e => setNewLayoutName(e.target.value)}
                    className={`${
                      getCurrentTheme() === 'dark' 
                        ? 'bg-white/10 border-white/20 text-white placeholder:text-white/50' 
                        : 'bg-white border-purple-200 text-gray-900 placeholder:text-gray-500'
                    }`}
                  />
                  <Button 
                    onClick={handleSaveLayout}
                    className="bg-purple-700 hover:bg-purple-600 shadow transition-all hover:shadow-md hover:scale-105"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Save
                  </Button>
                </div>
                
                <div className={`bg-opacity-20 rounded-lg p-3 mt-3 ${
                  getCurrentTheme() === 'dark' ? 'bg-purple-900/20 text-white/70' : 'bg-purple-100/50 text-gray-600'
                }`}>
                  <p className="text-sm">
                    This will save your current window arrangement as a layout that you can apply later.
                  </p>
                  <ul className="text-sm mt-2 space-y-1 list-disc ml-4">
                    <li>All open windows and their positions will be saved</li>
                    <li>You can access your saved layouts from the Taskbar</li>
                    <li>Apply different layouts for different tasks</li>
                  </ul>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          <DialogClose asChild>
            <Button 
              variant="outline"
              className="mt-2"
            >
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LayoutManager;