/**
 * Utility to forcefully reset the taskbar state
 * This helps fix issues with ghost windows and outdated taskbar state
 * 
 * IMPORTANT: This is the authoritative reset function for the taskbar
 * All code needing to reset the taskbar should call this function
 * rather than implementing its own reset logic
 */

import { useTaskbarStore, TaskbarWidgetType } from '../state/taskbarStore';
import { log } from '../state/systemLogStore';

export const DEFAULT_WIDGETS: TaskbarWidgetType[] = ['notifications', 'aiStatus', 'clock'];
export const DEFAULT_PINNED_AGENTS = ['panion', 'notes'];

/**
 * Completely resets the taskbar state by directly manipulating localStorage
 * This is a nuclear option when normal reset doesn't work
 */
export const forceResetTaskbar = () => {
  log.warn("Performing FORCE RESET of taskbar state");
  
  try {
    // First, remove all taskbar-related data from localStorage
    localStorage.removeItem('panion-taskbar-store');
    localStorage.removeItem('taskbar-position');
    localStorage.removeItem('taskbar-widgets');
    localStorage.removeItem('taskbar-pinned');
    
    // Also clean up any window-related storage that might cause issues
    localStorage.removeItem('panion-window-positions');
    localStorage.removeItem('panion-last-layout');
    
    log.info("Cleared all taskbar data from localStorage");
    
    // Create a fresh, clean taskbar state
    const cleanState = {
      version: 1,
      state: {
        position: { location: 'bottom', alignment: 'center' },
        enableBlur: true,
        showLabels: false,
        autohide: false,
        visibleWidgets: [...DEFAULT_WIDGETS],
        pinnedAgents: [...DEFAULT_PINNED_AGENTS],
      }
    };
    
    // Write the clean state to localStorage
    localStorage.setItem('panion-taskbar-store', JSON.stringify(cleanState));
    log.info("Added clean taskbar state to localStorage");
    
    // Update the Zustand store directly
    const taskbarStore = useTaskbarStore.getState();
    
    // Reset each property individually to ensure the store is updated
    taskbarStore.setPosition({ location: 'bottom', alignment: 'center' });
    taskbarStore.setEnableBlur(true);
    taskbarStore.setShowLabels(false);
    taskbarStore.setAutohide(false);
    
    // Clear visible widgets by using a for-loop approach
    // (Since we can't directly set the array, we'll use the toggle method which exists)
    const currentWidgets = [...taskbarStore.visibleWidgets];
    // First remove all current widgets
    currentWidgets.forEach(widget => {
      if (taskbarStore.isWidgetVisible(widget)) {
        taskbarStore.toggleWidget(widget);
      }
    });
    
    // Then add all default widgets
    DEFAULT_WIDGETS.forEach(widget => {
      if (!taskbarStore.isWidgetVisible(widget)) {
        taskbarStore.toggleWidget(widget);
      }
    });
    
    // Clear and reset pinned agents
    taskbarStore.clearPinnedAgents();
    DEFAULT_PINNED_AGENTS.forEach(agent => taskbarStore.pinAgent(agent));
    
    log.success("Taskbar has been force reset to defaults");
    
    // Force a page reload to ensure everything is fresh
    window.location.reload();
    
    return true;
  } catch (err) {
    log.error(`Failed to force reset taskbar: ${err}`);
    return false;
  }
};