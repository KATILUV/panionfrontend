import { Router, Request, Response } from 'express';
import { 
  createPlan, 
  executePlan, 
  getPlan, 
  listPlans,
  type StrategicPlan 
} from '../strategic-planner';
import { log } from '../vite';

const router = Router();

// Create a new strategic plan
router.post('/api/strategic/plans', async (req: Request, res: Response) => {
  try {
    const { goal, context = {} } = req.body;
    
    if (!goal || typeof goal !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid goal',
        message: 'Goal is required and must be a string'
      });
    }
    
    // Create the strategic plan
    const plan = createPlan(goal, context);
    
    log(`Created new strategic plan: ${plan.id} for goal: ${goal}`, 'strategic-planner');
    
    res.status(201).json({
      success: true,
      message: 'Strategic plan created successfully',
      plan
    });
  } catch (error: any) {
    log(`Error creating strategic plan: ${error.message}`, 'strategic-planner');
    res.status(500).json({
      success: false,
      error: 'Plan creation error',
      message: `Error creating strategic plan: ${error.message}`
    });
  }
});

// Get a specific strategic plan
router.get('/api/strategic/plans/:planId', async (req: Request, res: Response) => {
  try {
    const { planId } = req.params;
    
    // Get the plan
    const plan = getPlan(planId);
    
    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Plan not found',
        message: `No strategic plan found with ID: ${planId}`
      });
    }
    
    res.json({
      success: true,
      plan
    });
  } catch (error: any) {
    log(`Error getting strategic plan: ${error.message}`, 'strategic-planner');
    res.status(500).json({
      success: false,
      error: 'Plan retrieval error',
      message: `Error getting strategic plan: ${error.message}`
    });
  }
});

// List all strategic plans
router.get('/api/strategic/plans', async (_req: Request, res: Response) => {
  try {
    // Get all plans
    const plans = listPlans();
    
    res.json({
      success: true,
      count: plans.length,
      plans
    });
  } catch (error: any) {
    log(`Error listing strategic plans: ${error.message}`, 'strategic-planner');
    res.status(500).json({
      success: false,
      error: 'Plan listing error',
      message: `Error listing strategic plans: ${error.message}`
    });
  }
});

// Execute a strategic plan
router.post('/api/strategic/plans/:planId/execute', async (req: Request, res: Response) => {
  try {
    const { planId } = req.params;
    
    // Check if plan exists
    const plan = getPlan(planId);
    
    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Plan not found',
        message: `No strategic plan found with ID: ${planId}`
      });
    }
    
    // Prevent executing already completed or failed plans
    if (plan.status === 'completed' || plan.status === 'failed') {
      return res.status(400).json({
        success: false,
        error: 'Invalid plan state',
        message: `Plan is already in ${plan.status} state and cannot be executed`
      });
    }
    
    // Start execution (non-blocking)
    executePlan(planId)
      .then(() => {
        log(`Strategic plan ${planId} execution started successfully`, 'strategic-planner');
      })
      .catch((err) => {
        log(`Error during strategic plan ${planId} execution: ${err.message}`, 'strategic-planner');
      });
    
    // Respond immediately with the updated plan
    res.json({
      success: true,
      message: 'Strategic plan execution started',
      plan: getPlan(planId)
    });
  } catch (error: any) {
    log(`Error executing strategic plan: ${error.message}`, 'strategic-planner');
    res.status(500).json({
      success: false,
      error: 'Plan execution error',
      message: `Error executing strategic plan: ${error.message}`
    });
  }
});

// Execute a step in a strategic plan (future implementation)
router.post('/api/strategic/plans/:planId/steps/:stepId/execute', async (req: Request, res: Response) => {
  try {
    const { planId, stepId } = req.params;
    
    // Check if plan exists
    const plan = getPlan(planId);
    
    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Plan not found',
        message: `No strategic plan found with ID: ${planId}`
      });
    }
    
    // Check if step exists
    const step = plan.steps.find(s => s.id === stepId);
    
    if (!step) {
      return res.status(404).json({
        success: false,
        error: 'Step not found',
        message: `No step found with ID: ${stepId} in plan: ${planId}`
      });
    }
    
    // TODO: Implement step execution in future
    res.status(501).json({
      success: false,
      error: 'Not implemented',
      message: 'Individual step execution is not yet implemented'
    });
  } catch (error: any) {
    log(`Error executing step: ${error.message}`, 'strategic-planner');
    res.status(500).json({
      success: false,
      error: 'Step execution error',
      message: `Error executing step: ${error.message}`
    });
  }
});

// Create a new strategic plan for smoke shop research with integrations
router.post('/api/strategic/smoke-shop-research', async (req: Request, res: Response) => {
  try {
    const { location, includeOwnerInfo = false, deepSearch = false } = req.body;
    
    if (!location) {
      return res.status(400).json({
        success: false,
        error: 'Missing location',
        message: 'Location is required for smoke shop research'
      });
    }
    
    // Create a specialized plan for smoke shop research
    const goal = includeOwnerInfo 
      ? `Find smoke shop owner contact information in ${location}` 
      : `Research smoke shops in ${location}`;
    
    // Build specialized context
    const context = {
      location,
      includeOwnerInfo,
      deepSearch,
      capabilities: includeOwnerInfo 
        ? ['business_directory', 'contact_finder', 'business_research'] 
        : ['business_directory', 'business_research'],
      specializedTask: 'smoke_shop_research'
    };
    
    // Create the plan
    const plan = createPlan(goal, context);
    
    log(`Created smoke shop research plan: ${plan.id} for ${location}${includeOwnerInfo ? ' (with owner info)' : ''}`, 'strategic-planner');
    
    // Start execution automatically (non-blocking)
    executePlan(plan.id)
      .then(() => {
        log(`Smoke shop research plan ${plan.id} execution started successfully`, 'strategic-planner');
      })
      .catch((err) => {
        log(`Error during smoke shop research plan ${plan.id} execution: ${err.message}`, 'strategic-planner');
      });
    
    res.status(201).json({
      success: true,
      message: 'Smoke shop research strategic plan created and execution started',
      planId: plan.id,
      goal,
      plan
    });
  } catch (error: any) {
    log(`Error creating smoke shop research plan: ${error.message}`, 'strategic-planner');
    res.status(500).json({
      success: false,
      error: 'Plan creation error',
      message: `Error creating smoke shop research plan: ${error.message}`
    });
  }
});

export default router;