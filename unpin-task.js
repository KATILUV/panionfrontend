// Script to inject code into the browser to unpin smokeshop agent from the taskbar
// This is meant to be imported and run in the client-side code, not directly through Node.js

console.log('Creating unpin agent utility script...');

const unpinSmokeshopAgent = `
// Function to unpin specific agents from taskbar
function unpinAgentsFromTaskbar() {
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
      
      // Filter out smokeshop agent
      const updatedPinned = currentPinned.filter(agent => 
        agent !== 'smokeshop' && agent !== 'daddy-data'
      );
      
      console.log('Updated pinned agents:', updatedPinned);
      
      // Update the state
      taskbarState.state.pinnedAgents = updatedPinned;
      
      // Save back to localStorage
      localStorage.setItem('panion-taskbar-store', JSON.stringify(taskbarState));
      
      console.log('Successfully unpinned smokeshop agent from taskbar');
    } else {
      console.log('Could not find pinnedAgents in taskbar state');
    }
  } catch (error) {
    console.error('Error updating taskbar state:', error);
  }
}

// Execute the function
unpinAgentsFromTaskbar();
`;

// Export the script content so it can be included and executed on the client side
module.exports = {
  unpinSmokeshopAgent,
  description: 'Utility to unpin the smokeshop agent from the taskbar'
};