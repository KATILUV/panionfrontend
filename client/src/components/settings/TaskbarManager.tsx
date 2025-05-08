import { useState, useEffect } from 'react';
import { useTaskbarStore } from '@/state/taskbarStore';
import { useAgentStore } from '@/state/agentStore';

// Use string type for agent IDs since we don't have the type file
type AgentId = string;
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function TaskbarManager() {
  const [pinnedAgents, setPinnedAgents] = useState<AgentId[]>([]);
  const taskbarStore = useTaskbarStore();
  const agents = useAgentStore((state) => state.agents);
  
  // Get current pinned agents from store
  useEffect(() => {
    setPinnedAgents(taskbarStore.pinnedAgents);
    
    // Log current pinned agents for debugging
    console.log("TaskbarManager - Current pinned agents:", taskbarStore.pinnedAgents);
  }, [taskbarStore.pinnedAgents]);
  
  // Function to unpin an agent
  const handleUnpinAgent = (agentId: AgentId) => {
    console.log(`Attempting to unpin agent: ${agentId}`);
    try {
      // Remove from store
      taskbarStore.unpinAgent(agentId);
      
      // Show success message
      toast({
        title: "Agent unpinned",
        description: `${agentId} has been removed from the taskbar`,
      });
      
      // Force refresh local state
      setPinnedAgents(taskbarStore.pinnedAgents.filter(id => id !== agentId));
      
      console.log(`Unpinned agent ${agentId} from taskbar`);
    } catch (error) {
      console.error(`Failed to unpin agent ${agentId}:`, error);
      toast({
        title: "Failed to unpin agent",
        description: `Could not remove ${agentId} from the taskbar. Try again.`,
        variant: "destructive"
      });
    }
  };

  // Function to pin an agent
  const handlePinAgent = (agentId: AgentId) => {
    console.log(`Attempting to pin agent: ${agentId}`);
    try {
      // Add to store
      taskbarStore.pinAgent(agentId);
      
      // Show success message
      toast({
        title: "Agent pinned",
        description: `${agentId} has been added to the taskbar`,
      });
      
      // Force refresh local state
      setPinnedAgents([...taskbarStore.pinnedAgents]);
      
      console.log(`Pinned agent ${agentId} to taskbar`);
    } catch (error) {
      console.error(`Failed to pin agent ${agentId}:`, error);
      toast({
        title: "Failed to pin agent",
        description: `Could not add ${agentId} to the taskbar. Try again.`,
        variant: "destructive"
      });
    }
  };
  
  // Function to handle direct removal of special agents
  const handleDirectRemoval = (agentId: AgentId) => {
    console.log(`Direct removal of ${agentId} requested`);
    
    // For critical agents that might be stuck, use multiple approaches
    try {
      // 1. Use the store method
      taskbarStore.unpinAgent(agentId);
      
      // 2. Directly modify localStorage as a fallback
      try {
        const storageKey = 'panion-taskbar-store';
        const storedData = localStorage.getItem(storageKey);
        
        if (storedData) {
          const data = JSON.parse(storedData);
          if (data.state && Array.isArray(data.state.pinnedAgents)) {
            // Filter out the agent
            data.state.pinnedAgents = data.state.pinnedAgents.filter((id: string) => id !== agentId);
            // Save back to localStorage
            localStorage.setItem(storageKey, JSON.stringify(data));
            console.log(`Directly removed ${agentId} from localStorage`);
          }
        }
      } catch (storageError) {
        console.error("Failed to modify localStorage:", storageError);
      }
      
      // 3. Force a taskbar reset as last resort
      if (taskbarStore.isPinned(agentId)) {
        console.log(`${agentId} still pinned after removal attempts, forcing reset`);
        taskbarStore.resetTaskbar();
        taskbarStore.applyMinimalPreset();
      }
      
      // Show success toast
      toast({
        title: "Agent forcefully removed",
        description: `${agentId} has been removed from the taskbar using direct intervention`,
      });
      
      // Update our local state
      setPinnedAgents(taskbarStore.pinnedAgents);
      
    } catch (error) {
      console.error(`Critical failure removing ${agentId}:`, error);
      toast({
        title: "Critical Failure",
        description: "Could not remove agent. Try reloading the page.",
        variant: "destructive"
      });
    }
  };
  
  // Function to reset the taskbar
  const handleResetTaskbar = () => {
    try {
      // First clear localStorage
      localStorage.removeItem('panion-taskbar-store');
      console.log("Cleared taskbar store from localStorage");
      
      // Now reset the taskbar
      taskbarStore.resetTaskbar();
      
      toast({
        title: "Taskbar reset",
        description: "Taskbar has been reset to default settings",
      });
      
      console.log("Reset taskbar to factory defaults");
    } catch (error) {
      console.error("Failed to reset taskbar:", error);
      toast({
        title: "Failed to reset taskbar",
        description: "Could not reset the taskbar. Try reloading the page.",
        variant: "destructive"
      });
    }
  };
  
  return (
    <div className="space-y-4">
      {/* Specific Agent Controls - Special direct removal buttons */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold mb-2">Quick Remove Problem Agents</h4>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="destructive" 
            size="sm"
            onClick={() => handleDirectRemoval('database')}
          >
            Unpin Database
          </Button>
          
          <Button 
            variant="destructive" 
            size="sm"
            onClick={() => handleDirectRemoval('brain-circuit')}
          >
            Unpin Brain Circuit
          </Button>
          
          <Button 
            variant="destructive" 
            size="sm"
            onClick={() => handleDirectRemoval('daddy-data')}
          >
            Unpin Daddy Data
          </Button>
        </div>
      </div>
      
      <Separator />
      
      {/* Currently Pinned Agents */}
      <div>
        <h4 className="text-sm font-semibold mb-2">Currently Pinned</h4>
        <ScrollArea className="h-[120px] rounded-md border p-2">
          {pinnedAgents.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {pinnedAgents.map((agentId) => (
                <Badge 
                  key={agentId}
                  variant="outline" 
                  className="flex items-center gap-1 py-1"
                >
                  <span>{agentId}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 rounded-full ml-1"
                    onClick={() => handleUnpinAgent(agentId)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                    <span className="sr-only">Remove {agentId}</span>
                  </Button>
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">No agents pinned to taskbar</p>
          )}
        </ScrollArea>
      </div>
      
      {/* Available Agents to Pin */}
      <div>
        <h4 className="text-sm font-semibold mb-2">Available Agents</h4>
        <ScrollArea className="h-[120px] rounded-md border p-2">
          <div className="flex flex-wrap gap-2">
            {Object.keys(agents).map((agentId) => {
              const isPinned = pinnedAgents.includes(agentId as AgentId);
              return (
                <Badge 
                  key={agentId}
                  variant={isPinned ? "secondary" : "outline"} 
                  className={cn(
                    "flex items-center gap-1 py-1 cursor-pointer transition-colors",
                    isPinned && "opacity-50"
                  )}
                  onClick={() => !isPinned && handlePinAgent(agentId as AgentId)}
                >
                  <span>{agentId}</span>
                  {isPinned && (
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  )}
                </Badge>
              );
            })}
          </div>
        </ScrollArea>
      </div>
      
      {/* Taskbar Management Controls */}
      <div className="pt-2 flex justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => taskbarStore.clearPinnedAgents()}
        >
          Clear All Pins
        </Button>
        
        <Button
          variant="destructive"
          size="sm"
          onClick={handleResetTaskbar}
        >
          Reset Taskbar
        </Button>
      </div>
    </div>
  );
}