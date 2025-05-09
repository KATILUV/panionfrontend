/**
 * Utility to completely reset the application state
 * This is a nuclear option that clears all localStorage and resets everything
 */

import { useAgentStore } from '../state/agentStore';
import { useTaskbarStore } from '../state/taskbarStore';
import { log } from '../state/systemLogStore';
import { useSystemLogStore } from '../state/systemLogStore';

/**
 * Clear all localStorage items related to the application
 */
export function clearAllStorage() {
  console.log("--NUCLEAR RESET-- Clearing all application storage");
  
  // List all known localStorage keys
  const knownKeys = [
    'panion-taskbar-store',
    'panion-notes',
    'recentCommands',
    'favoriteCommands',
    'browserHistory',
    'browserBookmarks',
    'browserSessionState',
    'userPreferences',
    'panion_auth'
  ];
  
  // Clear specific known keys
  knownKeys.forEach(key => {
    try {
      localStorage.removeItem(key);
      console.log(`Cleared localStorage key: ${key}`);
    } catch (err) {
      console.error(`Failed to clear localStorage key: ${key}`, err);
    }
  });
  
  // For the taskbar store, also try to write a clean state to overcome persistence
  try {
    const cleanTaskbarState = {
      state: {
        position: { location: 'bottom', alignment: 'center' },
        enableBlur: true,
        showLabels: false,
        autohide: false,
        visibleWidgets: ['quickSave', 'systemConsole', 'layoutManager', 'versionNumber', 'searchBar'],
        pinnedAgents: ['panion', 'clara', 'notes', 'browser', 'marketplace'],
      },
      version: 0
    };
    
    localStorage.setItem('panion-taskbar-store', JSON.stringify(cleanTaskbarState));
    console.log("Manually wrote clean taskbar state to localStorage");
  } catch (err) {
    console.error("Failed to write clean taskbar state", err);
  }
  
  // Also do a general localStorage.clear() to catch any we missed
  try {
    localStorage.clear();
    console.log("Cleared all localStorage");
  } catch (err) {
    console.error("Failed to clear all localStorage", err);
  }
  
  log.info("Performed complete application reset");
}

/**
 * Reset all application stores to their default state
 */
export function resetAllStores() {
  console.log("--NUCLEAR RESET-- Resetting all application stores");
  
  try {
    // Reset taskbar
    const taskbarStore = useTaskbarStore.getState();
    taskbarStore.resetTaskbar();
    console.log("Reset taskbar store");
    
    // Reset windows - close all agents
    const agentStore = useAgentStore.getState();
    console.log("Closing all agents using direct approach");
    
    // Use direct approach to close windows - closeAllAgents doesn't exist in the type
    const agents = agentStore.registry || {};
    Object.keys(agents).forEach(id => {
      try {
        agentStore.closeAgent(id);
        console.log(`Closed agent ${id}`);
      } catch (e) {
        console.error(`Failed to close agent ${id}`, e);
      }
    });
    
    // Reset system log
    const systemLogStore = useSystemLogStore.getState();
    systemLogStore.clearLogs();
    console.log("Cleared system logs");
    
    log.info("Reset all application state to defaults");
  } catch (err) {
    console.error("Error during store reset", err);
  }
}

/**
 * Perform a complete application reset and reload 
 */
export function nuclearReset() {
  try {
    // First clear all storage
    clearAllStorage();
    
    // Then reset all stores
    resetAllStores();
    
    // Log for user
    log.info("Complete application reset performed");
    
    // Finally, trigger a full page reload
    console.log("Reloading page to apply all resets");
    window.location.reload();
  } catch (err) {
    console.error("Nuclear reset failed", err);
    alert("Failed to reset application. Please try reloading the page manually.");
  }
}