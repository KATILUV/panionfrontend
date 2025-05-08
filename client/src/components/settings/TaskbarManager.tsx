import React from 'react';
import { useTaskbarStore } from '../../state/taskbarStore';
import { Button } from '@/components/ui/button';
import { Trash2, Pin, Clock, Database, BrainCircuit } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const TaskbarManager: React.FC = () => {
  const { 
    pinnedAgents, 
    unpinAgent, 
    clearPinnedAgents, 
    resetTaskbar 
  } = useTaskbarStore();

  // Function to unpin specific agents
  const unpinSpecificAgents = (agentIds: string[]) => {
    agentIds.forEach(id => {
      if (pinnedAgents.includes(id)) {
        unpinAgent(id);
        toast({
          title: "Agent unpinned",
          description: `${id} has been removed from the taskbar`,
        });
      }
    });
  };

  return (
    <div className="p-4 bg-black/20 backdrop-blur-lg rounded-lg">
      <h2 className="text-lg font-medium mb-4 text-white">Taskbar Manager</h2>
      
      <div className="mb-4">
        <h3 className="text-sm font-medium mb-2 text-white/90">Pinned Agents</h3>
        <div className="flex flex-wrap gap-2">
          {pinnedAgents.map(agent => (
            <div 
              key={agent}
              className="flex items-center bg-black/30 rounded-lg px-3 py-2"
            >
              <span className="text-white/90 text-sm mr-2">{agent}</span>
              <button 
                onClick={() => unpinAgent(agent)}
                className="text-white/70 hover:text-white transition-colors"
                title="Unpin agent"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          
          {pinnedAgents.length === 0 && (
            <p className="text-white/60 text-sm">No agents pinned to taskbar</p>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Button
          variant="outline"
          className="bg-black/40 text-white border-white/10 hover:bg-black/60 hover:text-white"
          onClick={() => unpinSpecificAgents(['database', 'brain-circuit', 'daddy-data'])}
        >
          <Database className="w-4 h-4 mr-2" />
          Unpin Database
        </Button>
        
        <Button
          variant="outline"
          className="bg-black/40 text-white border-white/10 hover:bg-black/60 hover:text-white"
          onClick={() => unpinSpecificAgents(['brain-circuit'])}
        >
          <BrainCircuit className="w-4 h-4 mr-2" />
          Unpin Brain Circuit
        </Button>
        
        <Button
          variant="outline"
          className="bg-black/40 text-white border-white/10 hover:bg-black/60 hover:text-white"
          onClick={clearPinnedAgents}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Clear All Pinned
        </Button>
        
        <Button
          variant="outline"
          className="bg-black/40 text-white border-white/10 hover:bg-black/60 hover:text-white"
          onClick={resetTaskbar}
        >
          <Clock className="w-4 h-4 mr-2" />
          Reset to Default
        </Button>
      </div>
    </div>
  );
};

export default TaskbarManager;