import express, { Request, Response, Router } from 'express';
import { 
  createPlan, 
  getPlan, 
  listPlans, 
  executePlan, 
  getStrategicPlan 
} from '../strategic-planner';
import { log } from '../vite';

const router = express.Router();

/**
 * Generate a strategic plan based on a goal description
 */
export const generatePlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const { goal, conversationHistory = [], capabilities = [] } = req.body;
    
    if (!goal || typeof goal !== 'string') {
      res.status(400).json({ 
        error: 'Invalid request',
        message: 'Goal description is required'
      });
      return;
    }
    
    // Generate strategic plan
    const plan = await getStrategicPlan(goal, conversationHistory, capabilities);
    
    res.json({ 
      success: true,
      plan
    });
  } catch (error) {
    log(`Error generating strategic plan: ${error}`, 'strategic-planner');
    res.status(500).json({
      error: 'Failed to generate strategic plan',
      message: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * Create a new plan with specified parameters
 */
export const createNewPlan = (req: Request, res: Response): void => {
  try {
    const { goal, context = {} } = req.body;
    
    if (!goal || typeof goal !== 'string') {
      res.status(400).json({ 
        error: 'Invalid request',
        message: 'Goal description is required'
      });
      return;
    }
    
    // Create a new plan
    const plan = createPlan(goal, context);
    
    res.json({
      success: true,
      plan
    });
  } catch (error) {
    log(`Error creating plan: ${error}`, 'strategic-planner');
    res.status(500).json({
      error: 'Failed to create plan',
      message: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * Get a specific plan by ID
 */
export const getPlanById = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    
    if (!id) {
      res.status(400).json({ 
        error: 'Invalid request',
        message: 'Plan ID is required'
      });
      return;
    }
    
    const plan = getPlan(id);
    
    if (!plan) {
      res.status(404).json({
        error: 'Plan not found',
        message: `No plan found with ID: ${id}`
      });
      return;
    }
    
    res.json({
      success: true,
      plan
    });
  } catch (error) {
    log(`Error getting plan: ${error}`, 'strategic-planner');
    res.status(500).json({
      error: 'Failed to get plan',
      message: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * Get all available plans
 */
export const getAllPlans = (req: Request, res: Response): void => {
  try {
    const plans = listPlans();
    
    res.json({
      success: true,
      count: plans.length,
      plans
    });
  } catch (error) {
    log(`Error listing plans: ${error}`, 'strategic-planner');
    res.status(500).json({
      error: 'Failed to list plans',
      message: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * Execute a plan by ID
 */
export const executePlanById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    if (!id) {
      res.status(400).json({ 
        error: 'Invalid request',
        message: 'Plan ID is required'
      });
      return;
    }
    
    // Check if plan exists
    const plan = getPlan(id);
    
    if (!plan) {
      res.status(404).json({
        error: 'Plan not found',
        message: `No plan found with ID: ${id}`
      });
      return;
    }
    
    // Execute the plan (this is asynchronous)
    await executePlan(id);
    
    res.json({
      success: true,
      message: `Plan ${id} execution started`,
      status: 'in_progress'
    });
  } catch (error) {
    log(`Error executing plan: ${error}`, 'strategic-planner');
    res.status(500).json({
      error: 'Failed to execute plan',
      message: error instanceof Error ? error.message : String(error)
    });
  }
};

// Register all routes
router.post('/api/strategic-plan/generate', generatePlan);
router.post('/api/strategic-plan/create', createNewPlan);
router.get('/api/strategic-plan/:id', getPlanById);
router.get('/api/strategic-plans', getAllPlans);
router.post('/api/strategic-plan/:id/execute', executePlanById);

// Export the router as default export
export default router;