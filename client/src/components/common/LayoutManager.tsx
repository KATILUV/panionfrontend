import React, { useState } from 'react';
import { useAgentStore } from '../../state/agentStore';
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
  LayoutGrid,
  Plus
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface LayoutManagerProps {
  children: React.ReactNode;
}

const LayoutManager = ({ children }: LayoutManagerProps) => {
  const { saveLayout } = useAgentStore();
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

    // Save with default category and no tags
    saveLayout(newLayoutName);
    
    // Reset form
    setNewLayoutName('');
    
    toast({
      title: 'Layout saved',
      description: `Layout "${newLayoutName}" has been saved`,
    });
  };
  
  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent 
        className={`sm:max-w-[500px] backdrop-blur-xl ${
          getCurrentTheme() === 'dark' 
            ? 'bg-black/70 border border-purple-500/30 text-white' 
            : 'bg-white/95 border border-purple-200 text-gray-900'
        }`}
      >
        <DialogHeader>
          <DialogTitle className="text-xl">Save Window Layout</DialogTitle>
        </DialogHeader>
        
        <div className="my-4">
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