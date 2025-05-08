/**
 * Collaboration System Routes
 * Endpoints for agent collaboration and team management functionality
 */

import express, { Router, Request, Response } from 'express';
import axios from 'axios';

// Logger utility 
function log(message: string, category: string = 'collaboration') {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${timestamp} [${category}] ${message}`);
}

// Create router
const router = Router();

// Common Panion API middleware
const PANION_API_URL = 'http://localhost:8000';

// Middleware to ensure Panion API is available
function checkPanionAPIMiddleware(req: Request, res: Response, next: Function) {
  axios.get(`${PANION_API_URL}/health`)
    .then(() => next())
    .catch(error => {
      log(`Panion API not available: ${error}`, 'panion');
      res.status(503).json({ 
        error: 'Service unavailable',
        message: 'Panion API service is not available' 
      });
    });
}

// Agent Collaboration API endpoints

// Register agent
router.post('/agents/register', checkPanionAPIMiddleware, async (req: Request, res: Response) => {
  try {
    const { agentId, agentName, capabilities = [] } = req.body;
    
    if (!agentName) {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'Agent name is required' 
      });
    }
    
    // Forward the request to the Panion API
    const response = await axios.post(`${PANION_API_URL}/agents/register`, {
      agent_id: agentId,
      agent_name: agentName,
      capabilities
    });
    
    res.json(response.data);
  } catch (error) {
    log(`Error registering agent: ${error}`);
    res.status(500).json({ 
      error: 'Collaboration API error',
      message: 'Error communicating with Collaboration API' 
    });
  }
});

// Unregister agent
router.post('/agents/unregister', checkPanionAPIMiddleware, async (req: Request, res: Response) => {
  try {
    const { agentId } = req.body;
    
    if (!agentId) {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'Agent ID is required' 
      });
    }
    
    // Forward the request to the Panion API
    const response = await axios.post(`${PANION_API_URL}/agents/unregister`, {
      agent_id: agentId
    });
    
    res.json(response.data);
  } catch (error) {
    log(`Error unregistering agent: ${error}`);
    res.status(500).json({ 
      error: 'Collaboration API error',
      message: 'Error communicating with Collaboration API' 
    });
  }
});

// Get agent list
router.get('/agents', checkPanionAPIMiddleware, async (_req: Request, res: Response) => {
  try {
    // Forward the request to the Panion API
    const response = await axios.get(`${PANION_API_URL}/collaboration/agents`);
    res.json(response.data);
  } catch (error) {
    log(`Error getting agents: ${error}`);
    res.status(500).json({ 
      error: 'Collaboration API error',
      message: 'Error communicating with Collaboration API' 
    });
  }
});

// Get agents with capability
router.get('/agents/capabilities/:capability', checkPanionAPIMiddleware, async (req: Request, res: Response) => {
  try {
    const { capability } = req.params;
    
    if (!capability) {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'Capability is required' 
      });
    }
    
    // Forward the request to the Panion API
    const response = await axios.get(`${PANION_API_URL}/collaboration/agents/capabilities/${capability}`);
    res.json(response.data);
  } catch (error) {
    log(`Error getting agents with capability: ${error}`);
    res.status(500).json({ 
      error: 'Collaboration API error',
      message: 'Error communicating with Collaboration API' 
    });
  }
});

// Send message
router.post('/messages/send', checkPanionAPIMiddleware, async (req: Request, res: Response) => {
  try {
    const { senderId, receiverId, messageType, content, priority, referenceId, expiresInHours } = req.body;
    
    if (!senderId || !receiverId || !messageType) {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'Sender ID, receiver ID, and message type are required' 
      });
    }
    
    // Forward the request to the Panion API
    const response = await axios.post(`${PANION_API_URL}/collaboration/messages/send`, {
      sender_id: senderId,
      receiver_id: receiverId,
      message_type: messageType,
      content,
      priority,
      reference_id: referenceId,
      expires_in_hours: expiresInHours
    });
    
    res.json(response.data);
  } catch (error) {
    log(`Error sending message: ${error}`);
    res.status(500).json({ 
      error: 'Collaboration API error',
      message: 'Error communicating with Collaboration API' 
    });
  }
});

// Get agent messages
router.get('/messages/agent/:agentId', checkPanionAPIMiddleware, async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    
    if (!agentId) {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'Agent ID is required' 
      });
    }
    
    // Forward the request to the Panion API
    const response = await axios.get(`${PANION_API_URL}/collaboration/messages/agent/${agentId}`);
    res.json(response.data);
  } catch (error) {
    log(`Error getting agent messages: ${error}`);
    res.status(500).json({ 
      error: 'Collaboration API error',
      message: 'Error communicating with Collaboration API' 
    });
  }
});

// Process message
router.post('/messages/process', checkPanionAPIMiddleware, async (req: Request, res: Response) => {
  try {
    const { messageId, responseContent } = req.body;
    
    if (!messageId) {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'Message ID is required' 
      });
    }
    
    // Forward the request to the Panion API
    const response = await axios.post(`${PANION_API_URL}/collaboration/messages/process`, {
      message_id: messageId,
      response_content: responseContent
    });
    
    res.json(response.data);
  } catch (error) {
    log(`Error processing message: ${error}`);
    res.status(500).json({ 
      error: 'Collaboration API error',
      message: 'Error communicating with Collaboration API' 
    });
  }
});

// Knowledge endpoints 

// Add knowledge
router.post('/knowledge/add', checkPanionAPIMiddleware, async (req: Request, res: Response) => {
  try {
    const { agentId, content, category, confidence, tags, expiresInHours } = req.body;
    
    if (!agentId || !category) {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'Agent ID and category are required' 
      });
    }
    
    // Forward the request to the Panion API
    const response = await axios.post(`${PANION_API_URL}/collaboration/knowledge/add`, {
      agent_id: agentId,
      content,
      category,
      confidence,
      tags,
      expires_in_hours: expiresInHours
    });
    
    res.json(response.data);
  } catch (error) {
    log(`Error adding knowledge: ${error}`);
    res.status(500).json({ 
      error: 'Collaboration API error',
      message: 'Error communicating with Collaboration API' 
    });
  }
});

// Search knowledge
router.post('/knowledge/search', checkPanionAPIMiddleware, async (req: Request, res: Response) => {
  try {
    const { query, category, tags, minConfidence } = req.body;
    
    // Forward the request to the Panion API
    const response = await axios.post(`${PANION_API_URL}/collaboration/knowledge/search`, {
      query,
      category,
      tags,
      min_confidence: minConfidence
    });
    
    res.json(response.data);
  } catch (error) {
    log(`Error searching knowledge: ${error}`);
    res.status(500).json({ 
      error: 'Collaboration API error',
      message: 'Error communicating with Collaboration API' 
    });
  }
});

// Team endpoints

// Create team
router.post('/teams/create', checkPanionAPIMiddleware, async (req: Request, res: Response) => {
  try {
    const { teamId, name, description, coordinatorId } = req.body;
    
    if (!name) {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'Team name is required' 
      });
    }
    
    // Forward the request to the Panion API
    const response = await axios.post(`${PANION_API_URL}/collaboration/teams/create`, {
      team_id: teamId,
      name,
      description,
      coordinator_id: coordinatorId
    });
    
    res.json(response.data);
  } catch (error) {
    log(`Error creating team: ${error}`);
    res.status(500).json({ 
      error: 'Collaboration API error',
      message: 'Error communicating with Collaboration API' 
    });
  }
});

// Add team member
router.post('/teams/members/add', checkPanionAPIMiddleware, async (req: Request, res: Response) => {
  try {
    const { teamId, agentId, role } = req.body;
    
    if (!teamId || !agentId) {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'Team ID and agent ID are required' 
      });
    }
    
    // Forward the request to the Panion API
    const response = await axios.post(`${PANION_API_URL}/collaboration/teams/members/add`, {
      team_id: teamId,
      agent_id: agentId,
      role
    });
    
    res.json(response.data);
  } catch (error) {
    log(`Error adding team member: ${error}`);
    res.status(500).json({ 
      error: 'Collaboration API error',
      message: 'Error communicating with Collaboration API' 
    });
  }
});

// Remove team member
router.post('/teams/members/remove', checkPanionAPIMiddleware, async (req: Request, res: Response) => {
  try {
    const { teamId, agentId } = req.body;
    
    if (!teamId || !agentId) {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'Team ID and agent ID are required' 
      });
    }
    
    // Forward the request to the Panion API
    const response = await axios.post(`${PANION_API_URL}/collaboration/teams/members/remove`, {
      team_id: teamId,
      agent_id: agentId
    });
    
    res.json(response.data);
  } catch (error) {
    log(`Error removing team member: ${error}`);
    res.status(500).json({ 
      error: 'Collaboration API error',
      message: 'Error communicating with Collaboration API' 
    });
  }
});

// Get agent teams
router.get('/teams/agent/:agentId', checkPanionAPIMiddleware, async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    
    if (!agentId) {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'Agent ID is required' 
      });
    }
    
    // Forward the request to the Panion API
    const response = await axios.get(`${PANION_API_URL}/collaboration/teams/agent/${agentId}`);
    res.json(response.data);
  } catch (error) {
    log(`Error getting agent teams: ${error}`);
    res.status(500).json({ 
      error: 'Collaboration API error',
      message: 'Error communicating with Collaboration API' 
    });
  }
});

// Broadcast to team
router.post('/teams/broadcast', checkPanionAPIMiddleware, async (req: Request, res: Response) => {
  try {
    const { teamId, senderId, messageType, content, priority, excludeAgents } = req.body;
    
    if (!teamId || !senderId || !messageType) {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'Team ID, sender ID, and message type are required' 
      });
    }
    
    // Forward the request to the Panion API
    const response = await axios.post(`${PANION_API_URL}/collaboration/teams/broadcast`, {
      team_id: teamId,
      sender_id: senderId,
      message_type: messageType,
      content,
      priority,
      exclude_agents: excludeAgents
    });
    
    res.json(response.data);
  } catch (error) {
    log(`Error broadcasting to team: ${error}`);
    res.status(500).json({ 
      error: 'Collaboration API error',
      message: 'Error communicating with Collaboration API' 
    });
  }
});

// Assign team task
router.post('/teams/assign-task', checkPanionAPIMiddleware, async (req: Request, res: Response) => {
  try {
    const { teamId, coordinatorId, taskType, taskData, assignments, priority, deadlineHours } = req.body;
    
    if (!teamId || !coordinatorId || !taskType || !assignments) {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'Team ID, coordinator ID, task type, and assignments are required' 
      });
    }
    
    // Forward the request to the Panion API
    const response = await axios.post(`${PANION_API_URL}/collaboration/teams/assign-task`, {
      team_id: teamId,
      coordinator_id: coordinatorId,
      task_type: taskType,
      task_data: taskData,
      assignments,
      priority,
      deadline_hours: deadlineHours
    });
    
    res.json(response.data);
  } catch (error) {
    log(`Error assigning team task: ${error}`);
    res.status(500).json({ 
      error: 'Collaboration API error',
      message: 'Error communicating with Collaboration API' 
    });
  }
});

// Update task status
router.post('/teams/update-task-status', checkPanionAPIMiddleware, async (req: Request, res: Response) => {
  try {
    const { teamId, taskId, status } = req.body;
    
    if (!teamId || !taskId || !status) {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'Team ID, task ID, and status are required' 
      });
    }
    
    // Forward the request to the Panion API
    const response = await axios.post(`${PANION_API_URL}/collaboration/teams/update-task-status`, {
      team_id: teamId,
      task_id: taskId,
      status
    });
    
    res.json(response.data);
  } catch (error) {
    log(`Error updating task status: ${error}`);
    res.status(500).json({ 
      error: 'Collaboration API error',
      message: 'Error communicating with Collaboration API' 
    });
  }
});

// Disband team
router.post('/teams/disband', checkPanionAPIMiddleware, async (req: Request, res: Response) => {
  try {
    const { teamId, notifyMembers } = req.body;
    
    if (!teamId) {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'Team ID is required' 
      });
    }
    
    // Forward the request to the Panion API
    const response = await axios.post(`${PANION_API_URL}/collaboration/teams/disband`, {
      team_id: teamId,
      notify_members: notifyMembers
    });
    
    res.json(response.data);
  } catch (error) {
    log(`Error disbanding team: ${error}`);
    res.status(500).json({ 
      error: 'Collaboration API error',
      message: 'Error communicating with Collaboration API' 
    });
  }
});

export default router;