// Utility to unpin specific agents from the taskbar
import { useTaskbarStore } from '@/state/taskbarStore';
import { AgentId } from '@/state/agentStore';

// Function to unpin smokeshop and daddy-data agents
export function unpinSmokeshopAgent(): { previousAgents: string[], currentAgents: string[] } {
  // Access store via getState
  const state = useTaskbarStore.getState();
  const unpinAgent = state.unpinAgent;
  
  console.log('Attempting to unpin smokeshop agent...');
  
  // Log current pinned agents
  const currentPinned = [...state.pinnedAgents];
  console.log('Current pinned agents:', currentPinned);
  
  // Unpin the specific agents
  if (currentPinned.includes('smokeshop')) {
    unpinAgent('smokeshop');
    console.log('Unpinned smokeshop agent');
  }
  
  if (currentPinned.includes('daddy-data')) {
    unpinAgent('daddy-data');
    console.log('Unpinned daddy-data agent');
  }
  
  // Verify changes
  const updatedPinned = useTaskbarStore.getState().pinnedAgents;
  console.log('Updated pinned agents:', updatedPinned);
  
  return {
    previousAgents: currentPinned,
    currentAgents: updatedPinned
  };
}

// Alternative implementation using direct localStorage modification
export function unpinAgentDirectly(agentId: string): boolean {
  try {
    // Get current taskbar store data
    const taskbarData = localStorage.getItem('panion-taskbar-store');
    
    if (!taskbarData) {
      console.log('No taskbar data found in localStorage');
      return false;
    }
    
    // Parse the JSON data
    const taskbarState = JSON.parse(taskbarData);
    
    // Find the pinnedAgents property in the state
    if (taskbarState.state && taskbarState.state.pinnedAgents) {
      const currentPinned = taskbarState.state.pinnedAgents;
      console.log('Current pinned agents:', currentPinned);
      
      // Skip if agent is already not in the list
      if (!currentPinned.includes(agentId)) {
        console.log(`Agent ${agentId} is not pinned`);
        return true;
      }
      
      // Filter out the specified agent
      const updatedPinned = currentPinned.filter((agent: string) => agent !== agentId);
      
      console.log('Updated pinned agents:', updatedPinned);
      
      // Update the state
      taskbarState.state.pinnedAgents = updatedPinned;
      
      // Save back to localStorage
      localStorage.setItem('panion-taskbar-store', JSON.stringify(taskbarState));
      
      console.log(`Successfully unpinned ${agentId} from taskbar`);
      return true;
    } else {
      console.log('Could not find pinnedAgents in taskbar state');
      return false;
    }
  } catch (error) {
    console.error('Error updating taskbar state:', error);
    return false;
  }
}