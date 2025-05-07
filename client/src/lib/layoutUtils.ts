import { useAgentStore, AgentId } from '../state/agentStore';

/**
 * Simple utility for applying window layouts directly without complex templates
 */
export const ApplyLayout = {
  /**
   * Apply a split view layout with two windows side by side
   * @param leftAgentId Agent to position on the left
   * @param rightAgentId Agent to position on the right
   */
  splitView: (leftAgentId: AgentId, rightAgentId: AgentId) => {
    const { openAgent } = useAgentStore.getState();
    
    // Open the first agent on the left side
    openAgent(leftAgentId);
    useAgentStore.setState(state => {
      const windows = {...state.windows};
      if (windows[leftAgentId]) {
        windows[leftAgentId] = {
          ...windows[leftAgentId],
          position: { x: 50, y: 100 },
          size: { width: 600, height: 600 }
        };
      }
      return { windows };
    });
    
    // Open the second agent on the right side
    openAgent(rightAgentId);
    useAgentStore.setState(state => {
      const windows = {...state.windows};
      if (windows[rightAgentId]) {
        windows[rightAgentId] = {
          ...windows[rightAgentId],
          position: { x: 670, y: 100 },
          size: { width: 600, height: 600 }
        };
      }
      return { windows };
    });
  },

  /**
   * Apply a focus mode layout with one centered window
   * @param agentId Agent to center
   */
  focusMode: (agentId: AgentId) => {
    const { openAgent } = useAgentStore.getState();
    
    // Open the agent centered
    openAgent(agentId);
    useAgentStore.setState(state => {
      const windows = {...state.windows};
      if (windows[agentId]) {
        windows[agentId] = {
          ...windows[agentId],
          position: { x: 240, y: 120 },
          size: { width: 800, height: 600 }
        };
      }
      return { windows };
    });
  },

  /**
   * Apply a triple layout with three windows in a triangle pattern
   * @param topLeftId Agent for top left
   * @param topRightId Agent for top right
   * @param bottomId Agent for bottom center
   */
  tripleLayout: (topLeftId: AgentId, topRightId: AgentId, bottomId: AgentId) => {
    const { openAgent } = useAgentStore.getState();
    
    // Open all three agents
    openAgent(topLeftId);
    openAgent(topRightId);
    openAgent(bottomId);
    
    useAgentStore.setState(state => {
      const windows = {...state.windows};
      
      if (windows[topLeftId]) {
        windows[topLeftId] = {
          ...windows[topLeftId],
          position: { x: 50, y: 50 },
          size: { width: 500, height: 400 }
        };
      }
      
      if (windows[topRightId]) {
        windows[topRightId] = {
          ...windows[topRightId],
          position: { x: 570, y: 50 },
          size: { width: 500, height: 400 }
        };
      }
      
      if (windows[bottomId]) {
        windows[bottomId] = {
          ...windows[bottomId],
          position: { x: 300, y: 470 },
          size: { width: 500, height: 400 }
        };
      }
      
      return { windows };
    });
  },

  /**
   * Apply a grid layout with four windows in a 2x2 grid
   * @param agentIds Array of 1-4 agent IDs to place in grid
   */
  gridLayout: (agentIds: AgentId[]) => {
    const { openAgent } = useAgentStore.getState();
    const positions = [
      { x: 50, y: 50 },
      { x: 550, y: 50 },
      { x: 50, y: 450 },
      { x: 550, y: 450 }
    ];
    
    // Open all provided agents (up to 4)
    const agentsToUse = agentIds.slice(0, 4);
    agentsToUse.forEach(id => openAgent(id));
    
    useAgentStore.setState(state => {
      const windows = {...state.windows};
      
      agentsToUse.forEach((id, index) => {
        if (windows[id]) {
          windows[id] = {
            ...windows[id],
            position: positions[index],
            size: { width: 480, height: 380 }
          };
        }
      });
      
      return { windows };
    });
  },

  /**
   * Close all open windows
   */
  closeAll: () => {
    const { windows, closeAgent } = useAgentStore.getState();
    
    Object.keys(windows).forEach(id => {
      if (windows[id as AgentId].isOpen) {
        closeAgent(id as AgentId);
      }
    });
  }
};