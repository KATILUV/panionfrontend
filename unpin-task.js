// Script to unpin database and brain-circuit from the taskbar
// This directly modifies the localStorage where the taskbar state is stored

try {
  // Get current taskbar store data
  const taskbarData = localStorage.getItem('panion-taskbar-store');
  
  if (!taskbarData) {
    console.log('No taskbar data found in localStorage');
    return;
  }
  
  // Parse the JSON data
  const taskbarState = JSON.parse(taskbarData);
  
  // Find the pinnedAgents property in the state
  if (taskbarState.state && taskbarState.state.pinnedAgents) {
    const currentPinned = taskbarState.state.pinnedAgents;
    console.log('Current pinned agents:', currentPinned);
    
    // Filter out 'database' and 'brain-circuit'
    const updatedPinned = currentPinned.filter(agent => 
      agent !== 'database' && agent !== 'brain-circuit' && agent !== 'daddy-data'
    );
    
    console.log('Updated pinned agents:', updatedPinned);
    
    // Update the state
    taskbarState.state.pinnedAgents = updatedPinned;
    
    // Save back to localStorage
    localStorage.setItem('panion-taskbar-store', JSON.stringify(taskbarState));
    
    console.log('Successfully unpinned database and brain-circuit from taskbar');
  } else {
    console.log('Could not find pinnedAgents in taskbar state');
  }
} catch (error) {
  console.error('Error updating taskbar state:', error);
}