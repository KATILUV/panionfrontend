/**
 * Utility to completely reset the application state
 * This is a nuclear option that clears all localStorage and resets everything
 */

import { useAgentStore } from '../state/agentStore';
import { useTaskbarStore } from '../state/taskbarStore';
import { useWindowStore } from '../state/windowStore';
import { useSystemLogStore } from '../state/systemLogStore';
import { log } from '../state/systemLogStore';

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
    
    // Reset windows
    const windowStore = useWindowStore.getState();
    windowStore.closeAllWindows();
    console.log("Closed all windows");
    
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