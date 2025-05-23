import React, { useEffect } from 'react';
import { useTaskbarStore } from '../../state/taskbarStore';
import { useAgentStore } from '../../state/agentStore';
import { forceResetTaskbar } from '../../utils/taskbarReset';
import { log } from '../../state/systemLogStore';

/**
 * This component runs on mount to fix taskbar issues
 * It cleans up ghost windows and resets the taskbar if needed
 * 
 * NOTE: This is the authoritative component for taskbar fixing logic.
 * It centralizes ghost window detection, taskbar reset, and state cleanup
 * to avoid scattered duplicate logic throughout the application.
 * 
 * If you need to clean up the taskbar or fix ghost windows, modify this component
 * instead of adding cleanup code elsewhere.
 */
const TaskbarFixer: React.FC = () => {
  useEffect(() => {
    log.info("TaskbarFixer: Starting cleanup");
    
    // First attempt to detect ghost windows
    const registry = useAgentStore.getState().registry;
    const windows = useAgentStore.getState().windows;
    const registeredIds = registry.map(agent => agent.id);
    let ghostWindowsDetected = false;
    
    // Check for windows that don't have a corresponding agent
    Object.keys(windows).forEach(windowId => {
      if (!registeredIds.includes(windowId)) {
        log.warn(`TaskbarFixer: Ghost window detected with ID ${windowId}`);
        ghostWindowsDetected = true;
        
        // Remove the ghost window
        useAgentStore.setState(state => {
          const updatedWindows = {...state.windows};
          delete updatedWindows[windowId];
          return { windows: updatedWindows };
        });
      }
    });
    
    // Check if stored pinned agents includes any non-existent agents
    const taskbarStore = useTaskbarStore.getState();
    let invalidPinnedAgentsDetected = false;
    
    if (taskbarStore.pinnedAgents) {
      // Check each pinned agent against registered agents
      taskbarStore.pinnedAgents.forEach(pinnedId => {
        if (!registeredIds.includes(pinnedId)) {
          log.warn(`TaskbarFixer: Invalid pinned agent detected with ID ${pinnedId}`);
          invalidPinnedAgentsDetected = true;
        }
      });
      
      // Clean up invalid pinned agents if found
      if (invalidPinnedAgentsDetected) {
        log.warn("TaskbarFixer: Cleaning up invalid pinned agents");
        const validPinnedAgents = taskbarStore.pinnedAgents.filter(id => registeredIds.includes(id));
        
        // Reset pinned agents to only include valid ones
        if (validPinnedAgents.length > 0) {
          useTaskbarStore.setState({ pinnedAgents: validPinnedAgents });
        } else {
          // If no valid pinned agents, reset to defaults
          useTaskbarStore.setState({ pinnedAgents: ['panion', 'notes'] });
        }
      }
    }
    
    // Now check if the taskbar is using the old store format
    try {
      const storedTaskbar = localStorage.getItem('panion-taskbar-store');
      if (storedTaskbar) {
        const parsedTaskbar = JSON.parse(storedTaskbar);
        
        // Check if the stored data has issues
        const hasIssues = 
          !parsedTaskbar.state || 
          !parsedTaskbar.state.position ||
          !parsedTaskbar.state.pinnedAgents ||
          parsedTaskbar.state.pinnedAgents.length === 0;
        
        if (hasIssues || ghostWindowsDetected || invalidPinnedAgentsDetected) {
          log.warn("TaskbarFixer: Taskbar format issues detected, performing force reset");
          forceResetTaskbar();
        } else {
          log.info("TaskbarFixer: Taskbar format appears valid, ensuring pinned agents");
          
          // Make sure at least the essential agents are pinned and no duplicate entries
          const currentPinned = [...new Set(taskbarStore.pinnedAgents)]; // Remove duplicates
          
          // Reset the pinnedAgents with the deduplicated list
          if (currentPinned.length !== taskbarStore.pinnedAgents.length) {
            log.warn("TaskbarFixer: Duplicate pinned agents detected, fixing");
            useTaskbarStore.setState({ pinnedAgents: currentPinned });
          }
          
          // Make sure essential agents are pinned
          let updated = false;
          if (!currentPinned.includes('panion')) {
            taskbarStore.pinAgent('panion');
            updated = true;
          }
          
          if (!currentPinned.includes('notes')) {
            taskbarStore.pinAgent('notes');
            updated = true;
          }
          
          // If we had to update the pinned agents, log a success message
          if (updated) {
            log.success("TaskbarFixer: Updated pinned agents to include required items");
          }
        }
      } else {
        // No taskbar data found, initialize with defaults
        log.warn("TaskbarFixer: No taskbar data found, performing force reset");
        forceResetTaskbar();
      }
    } catch (error) {
      log.error(`TaskbarFixer: Error checking taskbar data: ${error}`);
      // If there was an error parsing, force reset
      forceResetTaskbar();
    }
    
    log.success("TaskbarFixer: Cleanup complete");
  }, []);
  
  // This component doesn't render anything
  return null;
};

export default TaskbarFixer;