// Utility to completely reset the taskbar
import { useTaskbarStore } from '../state/taskbarStore';

/**
 * Force reset of the taskbar to default settings
 * This bypasses any cached settings in localStorage
 */
export function forceResetTaskbar(): void {
  try {
    console.log("Force resetting taskbar to latest design...");
    
    // 1. Clear localStorage entry for taskbar 
    localStorage.removeItem('panion-taskbar-store');
    console.log("Removed taskbar data from localStorage");
    
    // 2. Get taskbar store state management
    const taskbarStore = useTaskbarStore.getState();
    
    // 3. Apply default values directly - ensuring all settings are reset
    taskbarStore.setPosition({ location: 'bottom', alignment: 'center' });
    taskbarStore.setEnableBlur(true);
    taskbarStore.setShowLabels(false);
    taskbarStore.setAutohide(false);
    
    // 4. Clear pinned agents and reset to defaults
    taskbarStore.clearPinnedAgents();
    
    // 5. Add default pinned agents
    taskbarStore.pinAgent('panion');
    taskbarStore.pinAgent('clara');
    taskbarStore.pinAgent('notes');
    
    // 6. Reset widgets
    const defaultWidgets = ['systemConsole', 'notifications'];
    defaultWidgets.forEach(widget => {
      // Only add if not already visible
      if (!taskbarStore.isWidgetVisible(widget as any)) {
        taskbarStore.toggleWidget(widget as any);
      }
    });
    
    console.log("Taskbar reset complete");
    console.log("Current pinned agents:", taskbarStore.pinnedAgents);
    console.log("Current visible widgets:", taskbarStore.visibleWidgets);
  } catch (error) {
    console.error("Error during taskbar reset:", error);
  }
}