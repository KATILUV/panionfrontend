/**
 * API Service - Central location for all API endpoints
 * Handles communication with the backend services
 */

// Health check endpoint to verify if the API is responsive
export const getHealth = () => fetch('/health').then(res => res.json());

// Get the current status of all agents in the system
export const getAgentStatus = () => fetch('/agent_status').then(res => res.json());

// Get the current goal queue for agents
export const getGoalQueue = () => fetch('/goal_queue').then(res => res.json());

/**
 * Spawn a new agent with the given configuration
 * @param {Object} data - Configuration data for the new agent
 * @param {string} data.type - Type of agent to spawn
 * @param {string} data.name - Name of the agent
 * @param {Object} data.config - Additional configuration options
 * @returns {Promise} Promise resolving to the created agent data
 */
export const postSpawnAgent = (data) =>
  fetch('/spawn_agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(res => res.json());

/**
 * Kill/terminate an existing agent
 * @param {string} agentId - ID of the agent to terminate
 * @returns {Promise} Promise resolving to the operation result
 */
export const postKillAgent = (agentId) =>
  fetch('/kill_agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId }),
  }).then(res => res.json());

/**
 * Add a new goal to the agent system
 * @param {Object} goalData - Goal configuration
 * @returns {Promise} Promise resolving to the created goal
 */
export const postAddGoal = (goalData) =>
  fetch('/add_goal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(goalData),
  }).then(res => res.json());

// Default export for importing all API functions at once
export default {
  getHealth,
  getAgentStatus,
  getGoalQueue,
  postSpawnAgent,
  postKillAgent,
  postAddGoal
};