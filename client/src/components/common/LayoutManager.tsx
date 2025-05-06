import React, { useState, useEffect } from 'react';
import { useAgentStore, WindowLayout } from '../../state/agentStore';
import { useThemeStore } from '../../state/themeStore';
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
  Trash2, 
  Download, 
  Plus, 
  Tag, 
  Star, 
  LayoutGrid,
  Folder,
  Filter,
  SlidersHorizontal
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface LayoutManagerProps {
  children: React.ReactNode;
}

const LayoutManager: React.FC<LayoutManagerProps> = ({ children }) => {
  const { layouts, activeLayoutId, saveLayout, loadLayout, deleteLayout, setDefaultLayout } = useAgentStore();
  const getCurrentTheme = useThemeStore(state => state.getCurrentTheme);
  const [newLayoutName, setNewLayoutName] = useState('');
  const [newLayoutCategory, setNewLayoutCategory] = useState('General');
  const [newLayoutTags, setNewLayoutTags] = useState<string[]>([]);
  const [isNewLayoutDefault, setIsNewLayoutDefault] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [filteredLayouts, setFilteredLayouts] = useState<WindowLayout[]>([]);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const { toast } = useToast();

  // Available categories
  const categories = [
    'General',
    'Work',
    'Development',
    'Communication',
    'Personal'
  ];

  // Suggested tags
  const suggestedTags = [
    'Focused',
    'Spacious',
    'Compact',
    'Presentation',
    'Coding',
    'Research',
    'Writing',
    'Meeting'
  ];

  // Prepare filtered layouts whenever filters change
  useEffect(() => {
    let filtered = [...layouts];
    
    // Apply category filter if set
    if (filterCategory) {
      filtered = filtered.filter(layout => layout.category === filterCategory);
    }
    
    // Sort layouts - default first, then by most recently updated
    filtered.sort((a, b) => {
      // First sort by default status
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      
      // Then by updated timestamp (newest first)
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });
    
    setFilteredLayouts(filtered);
  }, [layouts, filterCategory]);

  // Add a tag to the new layout
  const addTag = (tag: string) => {
    const cleanTag = tag.trim();
    if (cleanTag && !newLayoutTags.includes(cleanTag)) {
      setNewLayoutTags([...newLayoutTags, cleanTag]);
      setTagInput('');
    }
  };

  // Remove a tag
  const removeTag = (tag: string) => {
    setNewLayoutTags(newLayoutTags.filter(t => t !== tag));
  };

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

    saveLayout(newLayoutName, newLayoutCategory, newLayoutTags, isNewLayoutDefault);
    
    // Reset form
    setNewLayoutName('');
    setNewLayoutCategory('General');
    setNewLayoutTags([]);
    setIsNewLayoutDefault(false);
    setShowAdvancedOptions(false);
    
    toast({
      title: 'Layout saved',
      description: `Layout "${newLayoutName}" has been saved`,
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

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent 
        className={`sm:max-w-[550px] backdrop-blur-xl ${
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
        aria-describedby="layout-manager-description"
      >
        <DialogHeader>
          <DialogTitle className="text-xl">Window Layouts</DialogTitle>
          <p className={`mt-2 ${
            getCurrentTheme() === 'dark' ? 'text-white/80' : 'text-gray-600'
          }`} id="layout-manager-description">
            Save and manage your window arrangements.
          </p>
        </DialogHeader>
        
        {/* Layout creation */}
        <div className="space-y-4 my-2">
          <div className={`p-4 rounded-lg ${
            getCurrentTheme() === 'dark' ? 'bg-black/20' : 'bg-purple-50/50'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-medium">Save Current Layout</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                className="text-xs flex items-center gap-1 px-2"
              >
                <SlidersHorizontal className="h-3 w-3" />
                {showAdvancedOptions ? 'Hide' : 'Show'} Options
              </Button>
            </div>
            
            <div className="space-y-3">
              {/* Basic layout info */}
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
                  className="bg-purple-700 hover:bg-purple-600"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </Button>
              </div>
              
              {/* Advanced options */}
              {showAdvancedOptions && (
                <div className="space-y-3 pt-2 border-t border-purple-500/20">
                  {/* Category selection */}
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select 
                      value={newLayoutCategory} 
                      onValueChange={setNewLayoutCategory}
                    >
                      <SelectTrigger className="w-full mt-1">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(category => (
                          <SelectItem key={category} value={category}>{category}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Tags */}
                  <div>
                    <Label htmlFor="tags">Tags</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        id="tags"
                        placeholder="Add a tag"
                        value={tagInput}
                        onChange={e => setTagInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addTag(tagInput);
                          }
                        }}
                        className={`${
                          getCurrentTheme() === 'dark' 
                            ? 'bg-white/10 border-white/20 text-white placeholder:text-white/50' 
                            : 'bg-white border-purple-200 text-gray-900 placeholder:text-gray-500'
                        }`}
                      />
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => addTag(tagInput)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {/* Tag chips */}
                    {newLayoutTags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {newLayoutTags.map(tag => (
                          <Badge key={tag} variant="secondary" className="flex items-center gap-1 cursor-pointer hover:bg-purple-400/20" onClick={() => removeTag(tag)}>
                            {tag}
                            <span className="text-xs">×</span>
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    {/* Suggested tags */}
                    <div className="mt-2">
                      <p className="text-xs text-slate-400 mb-1">Suggested tags:</p>
                      <div className="flex flex-wrap gap-1">
                        {suggestedTags.map(tag => (
                          <Badge 
                            key={tag} 
                            variant="outline" 
                            className="text-xs cursor-pointer hover:bg-purple-400/20"
                            onClick={() => addTag(tag)}
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Default layout option */}
                  <div className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      id="defaultLayout"
                      checked={isNewLayoutDefault}
                      onChange={e => setIsNewLayoutDefault(e.target.checked)}
                      className="rounded text-purple-600 focus:ring-purple-500 h-4 w-4"
                    />
                    <Label htmlFor="defaultLayout" className="text-sm">Set as default layout</Label>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Saved layouts list */}
          <div className={`p-4 rounded-lg ${
            getCurrentTheme() === 'dark' ? 'bg-black/20' : 'bg-purple-50/50'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium">Saved Layouts</h3>
              
              {/* Category filter */}
              <Select 
                value={filterCategory || ''} 
                onValueChange={val => setFilterCategory(val === '' ? null : val)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {layouts.length === 0 ? (
              <div className={`text-center py-4 ${
                getCurrentTheme() === 'dark' ? 'text-white/50' : 'text-gray-500'
              }`}>
                No saved layouts yet
              </div>
            ) : (
              <ul className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {filteredLayouts.map(layout => (
                  <li 
                    key={layout.id}
                    className={`rounded-lg transition-colors overflow-hidden ${
                      activeLayoutId === layout.id 
                        ? getCurrentTheme() === 'dark'
                          ? 'bg-purple-800/50 border border-purple-500/50' 
                          : 'bg-purple-100 border border-purple-300'
                        : getCurrentTheme() === 'dark'
                          ? 'bg-black/20 hover:bg-black/30 border border-purple-500/20'
                          : 'bg-white/80 hover:bg-purple-50 border border-purple-100/50'
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
                            className="h-7 w-7 p-0"
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
                      <div className="flex flex-wrap items-center gap-1 text-xs">
                        {layout.category && (
                          <Badge variant="outline" className="flex items-center gap-1 border-purple-500/30">
                            <Folder className="h-3 w-3" />
                            {layout.category}
                          </Badge>
                        )}
                        
                        {layout.tags && layout.tags.length > 0 && layout.tags.map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs border-purple-500/20">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        
        <DialogFooter>
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

export default LayoutManager;