import { Router, Request, Response } from 'express';
import { z } from 'zod';

// Define schemas for validation
const spawnAgentSchema = z.object({
  type: z.string(),
  name: z.string(),
  config: z.record(z.unknown()).optional()
});

const killAgentSchema = z.object({
  agentId: z.string()
});

const addGoalSchema = z.object({
  description: z.string(),
  priority: z.number().optional(),
  assignTo: z.string().optional(),
  dependencies: z.array(z.string()).optional()
});

// Mock data for demo purposes
const agents = [
  {
    id: 'agent-1',
    name: 'Panion',
    status: 'idle',
    type: 'assistant',
    createdAt: new Date().toISOString(),
    lastActivity: new Date().toISOString()
  }
];

const goalQueue = [
  {
    id: 'goal-1',
    description: 'Find information about renewable energy',
    priority: 1,
    status: 'pending',
    createdAt: new Date().toISOString()
  }
];

const router = Router();

// Health check endpoint
router.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Get agent status
router.get('/agent_status', (req: Request, res: Response) => {
  res.json(agents);
});

// Get goal queue
router.get('/goal_queue', (req: Request, res: Response) => {
  res.json(goalQueue);
});

// Spawn a new agent
router.post('/spawn_agent', (req: Request, res: Response) => {
  try {
    const data = spawnAgentSchema.parse(req.body);
    
    // Create new agent
    const newAgent = {
      id: `agent-${Date.now()}`,
      name: data.name,
      status: 'idle',
      type: data.type,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };
    
    agents.push(newAgent);
    res.status(201).json(newAgent);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Kill an agent
router.post('/kill_agent', (req: Request, res: Response) => {
  try {
    const { agentId } = killAgentSchema.parse(req.body);
    
    const agentIndex = agents.findIndex(a => a.id === agentId);
    
    if (agentIndex === -1) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    // Remove agent
    agents.splice(agentIndex, 1);
    
    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Add a goal
router.post('/add_goal', (req: Request, res: Response) => {
  try {
    const goalData = addGoalSchema.parse(req.body);
    
    const newGoal = {
      id: `goal-${Date.now()}`,
      description: goalData.description,
      priority: goalData.priority || 3,
      status: 'pending',
      assignedTo: goalData.assignTo,
      createdAt: new Date().toISOString()
    };
    
    goalQueue.push(newGoal);
    
    res.status(201).json(newGoal);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

export default router;