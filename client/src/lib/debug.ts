// Debug utility functions
import { useAgentStore } from '../state/agentStore';

/**
 * Opens the specified agent or agents after a delay
 * @param agentId String ID or array of agent IDs to open
 * @param delayMs Delay before opening (default: 500ms)
 */
export function openAgentDelayed(agentId: string | string[], delayMs = 500): void {
  setTimeout(() => {
    const { openAgent } = useAgentStore.getState();
    
    if (Array.isArray(agentId)) {
      agentId.forEach(id => {
        console.log(`Debug: Opening agent ${id}`);
        openAgent(id);
      });
    } else {
      console.log(`Debug: Opening agent ${agentId}`);
      openAgent(agentId);
    }
  }, delayMs);
}

// Force the Panion agent to open
export function debugOpenPanion(): void {
  try {
    const { openAgent } = useAgentStore.getState();
    console.log('Debug: Force opening Panion agent');
    openAgent('panion');
  } catch (err) {
    console.error('Debug: Error opening Panion agent', err);
  }
}