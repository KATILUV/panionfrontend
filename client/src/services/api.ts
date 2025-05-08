/**
 * API Service - Central location for all API endpoints
 * Handles communication with the backend services
 */

// Type definitions for API responses and requests
export interface AgentStatus {
  id: string;
  name: string;
  status: 'idle' | 'working' | 'error';
  type: string;
  createdAt: string;
  lastActivity: string;
}

export interface GoalQueueItem {
  id: string;
  description: string;
  priority: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  assignedTo?: string;
  createdAt: string;
}

export interface SpawnAgentParams {
  type: string;
  name: string;
  config?: Record<string, unknown>;
}

export interface AgentResponse {
  id: string;
  name: string;
  type: string;
  status: 'idle' | 'working' | 'error';
}

export interface GoalData {
  description: string;
  priority?: number;
  assignTo?: string;
  dependencies?: string[];
}

// Health check endpoint to verify if the API is responsive
export const getHealth = (): Promise<{ status: string }> => 
  fetch('/health').then(res => res.json());

// Get the current status of all agents in the system
export const getAgentStatus = (): Promise<AgentStatus[]> => 
  fetch('/agent_status').then(res => res.json());

// Get the current goal queue for agents
export const getGoalQueue = (): Promise<GoalQueueItem[]> => 
  fetch('/goal_queue').then(res => res.json());

/**
 * Spawn a new agent with the given configuration
 * @param data - Configuration data for the new agent
 * @returns Promise resolving to the created agent data
 */
export const postSpawnAgent = (data: SpawnAgentParams): Promise<AgentResponse> =>
  fetch('/spawn_agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(res => res.json());

/**
 * Kill/terminate an existing agent
 * @param agentId - ID of the agent to terminate
 * @returns Promise resolving to the operation result
 */
export const postKillAgent = (agentId: string): Promise<{ success: boolean }> =>
  fetch('/kill_agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId }),
  }).then(res => res.json());

/**
 * Add a new goal to the agent system
 * @param goalData - Goal configuration
 * @returns Promise resolving to the created goal
 */
export const postAddGoal = (goalData: GoalData): Promise<GoalQueueItem> =>
  fetch('/add_goal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(goalData),
  }).then(res => res.json());

// Default export for importing all API functions at once
const API = {
  getHealth,
  getAgentStatus,
  getGoalQueue,
  postSpawnAgent,
  postKillAgent,
  postAddGoal
};

export default API;