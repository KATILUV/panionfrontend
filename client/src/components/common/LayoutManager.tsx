import React, { useState } from 'react';
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
import { Save, Trash2, Download, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface LayoutManagerProps {
  children: React.ReactNode;
}

const LayoutManager: React.FC<LayoutManagerProps> = ({ children }) => {
  const { layouts, activeLayoutId, saveLayout, loadLayout, deleteLayout } = useAgentStore();
  const getCurrentTheme = useThemeStore(state => state.getCurrentTheme);
  const [newLayoutName, setNewLayoutName] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

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

    saveLayout(newLayoutName);
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
            <h3 className="text-lg font-medium mb-2">Save Current Layout</h3>
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
          </div>
          
          {/* Saved layouts list */}
          <div className={`p-4 rounded-lg ${
            getCurrentTheme() === 'dark' ? 'bg-black/20' : 'bg-purple-50/50'
          }`}>
            <h3 className="text-lg font-medium mb-2">Saved Layouts</h3>
            {layouts.length === 0 ? (
              <div className={`text-center py-4 ${
                getCurrentTheme() === 'dark' ? 'text-white/50' : 'text-gray-500'
              }`}>
                No saved layouts yet
              </div>
            ) : (
              <ul className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                {layouts.map(layout => (
                  <li 
                    key={layout.id}
                    className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                      activeLayoutId === layout.id 
                        ? getCurrentTheme() === 'dark'
                          ? 'bg-purple-800/50 border border-purple-500/50' 
                          : 'bg-purple-100 border border-purple-300'
                        : getCurrentTheme() === 'dark'
                          ? 'bg-black/20 hover:bg-black/30'
                          : 'bg-white/80 hover:bg-purple-50 border border-purple-100/50'
                    }`}
                  >
                    <span className="font-medium">{layout.name}</span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleLoadLayout(layout.id, layout.name)}
                        className={`${
                          getCurrentTheme() === 'dark' 
                            ? 'border-white/20 hover:bg-purple-800/50' 
                            : 'border-purple-200 hover:bg-purple-100'
                        }`}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteLayout(layout.id, layout.name)}
                        className={`${
                          getCurrentTheme() === 'dark' 
                            ? 'border-white/20 hover:bg-red-900/50' 
                            : 'border-red-200 hover:bg-red-50'
                        }`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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