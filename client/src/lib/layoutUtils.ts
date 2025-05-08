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
   * Apply a grid layout with windows in a grid
   * @param agentIds Array of agent IDs to place in grid
   * @param gridSize Number of windows per row/column (defaults to 2 for 2x2 grid)
   */
  gridLayout: (agentIds: AgentId[], gridSize: 2 | 4 = 2) => {
    const { openAgent } = useAgentStore.getState();
    
    // Calculate positions based on grid size
    let positions: {x: number, y: number}[];
    let windowSize: {width: number, height: number};
    
    if (gridSize === 4) {
      // 4x4 grid (16 positions)
      const grid = [0, 1, 2, 3];
      positions = [];
      
      // Calculate positions for a 4x4 grid
      grid.forEach(row => {
        grid.forEach(col => {
          positions.push({
            x: 50 + (col * 310),
            y: 50 + (row * 230)
          });
        });
      });
      
      // Smaller windows for 4x4 grid
      windowSize = { width: 290, height: 210 };
    } else {
      // Default 2x2 grid (4 positions)
      positions = [
        { x: 50, y: 50 },      // Top left
        { x: 550, y: 50 },     // Top right
        { x: 50, y: 450 },     // Bottom left
        { x: 550, y: 450 }     // Bottom right
      ];
      
      // Standard size for 2x2 grid
      windowSize = { width: 480, height: 380 };
    }
    
    // Limit to available positions
    const maxWindows = positions.length;
    const agentsToUse = agentIds.slice(0, maxWindows);
    
    // First open all windows to ensure they exist
    agentsToUse.forEach(id => openAgent(id));
    
    // Then position them all at once to avoid z-index issues
    useAgentStore.setState(state => {
      const windows = {...state.windows};
      
      agentsToUse.forEach((id, index) => {
        if (windows[id]) {
          windows[id] = {
            ...windows[id],
            position: positions[index],
            size: windowSize
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