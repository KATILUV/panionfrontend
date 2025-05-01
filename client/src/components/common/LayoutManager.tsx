import React, { useState } from 'react';
import { useAgentStore, WindowLayout } from '../../state/agentStore';
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
      <DialogContent className="sm:max-w-[550px] bg-[#1a1538]/90 backdrop-blur-xl border-purple-500/30 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl">Window Layouts</DialogTitle>
        </DialogHeader>
        
        {/* Layout creation */}
        <div className="space-y-4 my-2">
          <div className="bg-black/20 p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-2">Save Current Layout</h3>
            <div className="flex gap-2">
              <Input
                placeholder="Layout name"
                value={newLayoutName}
                onChange={e => setNewLayoutName(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
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
          <div className="bg-black/20 p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-2">Saved Layouts</h3>
            {layouts.length === 0 ? (
              <div className="text-white/50 text-center py-4">
                No saved layouts yet
              </div>
            ) : (
              <ul className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                {layouts.map(layout => (
                  <li 
                    key={layout.id}
                    className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                      activeLayoutId === layout.id 
                        ? 'bg-purple-800/50 border border-purple-500/50' 
                        : 'bg-black/20 hover:bg-black/30'
                    }`}
                  >
                    <span className="font-medium">{layout.name}</span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleLoadLayout(layout.id, layout.name)}
                        className="border-white/20 hover:bg-purple-800/50"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteLayout(layout.id, layout.name)}
                        className="border-white/20 hover:bg-red-900/50"
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
            <Button variant="outline" className="border-white/20 hover:bg-white/10">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LayoutManager;