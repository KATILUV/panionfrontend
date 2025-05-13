/**
 * Agent Components Index
 * 
 * This file centralizes agent component loading to avoid circular dependencies
 * and provide a consistent way to load components.
 */

// Import agent components 
import IntelligentAgent from './IntelligentAgent';
import MemoryExplorerAgent from './MemoryExplorerAgent';
// Import other agent components as needed

// Export components
export {
  IntelligentAgent,
  MemoryExplorerAgent
};

// Map of agent IDs to their components
export const agentComponents = {
  'intelligent-agent': IntelligentAgent,
  'memory-explorer': MemoryExplorerAgent,
  // Add other mappings as needed
};