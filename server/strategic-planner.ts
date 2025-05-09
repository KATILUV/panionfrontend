import OpenAI from 'openai';
import { log } from './vite';

// Initialize OpenAI client
// the newest OpenAI model is "gpt-4o" which was released May 13, 2024
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || "" 
});

/**
 * Interface for a plan step
 */
export interface PlanStep {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  order: number;
  results?: any;
}

/**
 * Interface for the strategic plan structure
 */
export interface StrategicPlan {
  id: string;
  planDescription: string;
  goal: string;
  steps: PlanStep[];
  capabilities: string[];
  complexity: number;
  estimatedTime: string;
  priority: 'low' | 'medium' | 'high';
  shouldDelegateToAgent: boolean;
  status: 'created' | 'in_progress' | 'paused' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
  context?: Record<string, any>;
}

/**
 * Interface for a message in the conversation history
 */
interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Generate a strategic plan for accomplishing a complex goal
 */
// Storage for plans
const plans: Record<string, StrategicPlan> = {};

/**
 * Create a strategic plan with proper step structure
 */
export function createPlan(goal: string, context: Record<string, any> = {}): StrategicPlan {
  // Generate a unique ID for the plan
  const planId = `plan_${Date.now().toString(36)}`;
  
  // Create plan with empty steps
  const plan: StrategicPlan = {
    id: planId,
    goal,
    planDescription: `Strategic plan for: ${goal}`,
    steps: [],
    capabilities: context.capabilities || [],
    complexity: 0.5,
    estimatedTime: "To be determined",
    priority: context.priority || 'medium',
    shouldDelegateToAgent: context.shouldDelegateToAgent || false,
    status: 'created',
    createdAt: new Date().toISOString(),
    context
  };
  
  // Add default steps if none are provided
  if (!plan.steps || plan.steps.length === 0) {
    plan.steps = [
      {
        id: `step_${Date.now().toString(36)}_1`,
        description: "Analyze the request and identify requirements",
        status: 'pending',
        order: 1
      },
      {
        id: `step_${Date.now().toString(36)}_2`,
        description: "Gather relevant information",
        status: 'pending',
        order: 2
      },
      {
        id: `step_${Date.now().toString(36)}_3`,
        description: "Execute the core task",
        status: 'pending',
        order: 3
      },
      {
        id: `step_${Date.now().toString(36)}_4`,
        description: "Validate results and prepare output",
        status: 'pending',
        order: 4
      }
    ];
  }
  
  // Store the plan
  plans[planId] = plan;
  
  return plan;
}

/**
 * Get a specific plan by ID
 */
export function getPlan(planId: string): StrategicPlan | null {
  return plans[planId] || null;
}

/**
 * List all available plans
 */
export function listPlans(): StrategicPlan[] {
  return Object.values(plans);
}

/**
 * Execute a strategic plan
 */
export async function executePlan(planId: string): Promise<void> {
  const plan = plans[planId];
  
  if (!plan) {
    throw new Error(`Plan not found: ${planId}`);
  }
  
  // Update plan status
  plan.status = 'in_progress';
  log(`Executing strategic plan: ${planId}`, 'strategic-planner');
  
  // Process steps in sequence
  try {
    for (const step of plan.steps) {
      // Skip steps that are already completed
      if (step.status === 'completed') {
        continue;
      }
      
      // Mark current step as in progress
      step.status = 'in_progress';
      log(`Executing step ${step.order}: ${step.description}`, 'strategic-planner');
      
      // Execute the step
      const result = await executeStep(plan, step);
      
      // Update step with result
      step.status = 'completed';
      step.results = result;
      log(`Completed step ${step.order}`, 'strategic-planner');
    }
    
    // All steps completed successfully
    plan.status = 'completed';
    plan.completedAt = new Date().toISOString();
    log(`Completed strategic plan: ${planId}`, 'strategic-planner');
  } catch (error) {
    log(`Error executing strategic plan: ${error}`, 'strategic-planner');
    plan.status = 'failed';
  }
}

/**
 * Execute a single step of a strategic plan
 */
async function executeStep(plan: StrategicPlan, step: PlanStep): Promise<any> {
  try {
    // Use OpenAI to determine the best way to execute this step
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a strategic execution assistant. You are tasked with executing a step in a strategic plan. 
          
          Plan goal: "${plan.goal}"
          Plan description: "${plan.planDescription}"
          Current step: "${step.description}" (step ${step.order} of ${plan.steps.length})
          
          Your task is to:
          1. Break down this step into specific actions
          2. Determine the best way to accomplish this step
          3. Identify any required information or resources
          4. If this step requires specific capabilities, explain how to use them
          5. Provide a detailed execution plan for this step
          
          Required capabilities: ${plan.capabilities.join(', ')}`
        }
      ],
      temperature: 0.5,
      max_tokens: 800
    });
    
    const stepExecution = response.choices[0].message.content || 'No execution plan generated.';
    
    // In a production system, we would actually execute the step based on the execution plan
    // For now, we'll just return the execution plan as the result
    
    // Wait a bit to simulate execution time (1-3 seconds)
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    return {
      executionPlan: stepExecution,
      timestamp: new Date().toISOString(),
      success: true
    };
  } catch (error) {
    log(`Error executing step ${step.order}: ${error}`, 'strategic-planner');
    throw error;
  }
}

/**
 * Generate a strategic plan for accomplishing a complex goal
 */
export async function getStrategicPlan(
  goal: string,
  conversationHistory: Message[] = [],
  capabilities: string[] = []
): Promise<StrategicPlan> {
  try {
    // Prepare conversation history for context
    const recentHistory = conversationHistory.slice(-5);
    
    // Construct the system prompt
    const systemPrompt = `You are an expert strategic planner for the Panion AI system. Your job is to analyze user requests and break them down into logical steps. Consider:

1. Goal complexity and necessary steps
2. Required capabilities for each step
3. The appropriate sequence of operations
4. Whether the goal should be delegated to an autonomous agent
5. Task priority and time estimation

Create a comprehensive plan that answers the user's request efficiently.`;
    
    // Generate response using the OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: systemPrompt 
        },
        ...recentHistory,
        { 
          role: "user", 
          content: `Generate a strategic plan for this goal: "${goal}"
          
          Required output format as JSON:
          {
            "planDescription": "A brief description of the overall plan",
            "steps": ["Step 1 description", "Step 2 description", ...],
            "capabilities": ["capability1", "capability2", ...],
            "complexity": 0.7, // A value between 0 and 1
            "estimatedTime": "2 hours", // Estimated execution time
            "priority": "high", // low, medium, or high
            "shouldDelegateToAgent": true // Whether this should be delegated to an autonomous agent
          }
          
          The capabilities field should be based on these available capabilities: web_scraping, data_analysis, knowledge_retrieval, planning, strategic_thinking, creative_writing, coding, visual_processing, document_processing, research, memory_recall, coordination, self_reflection, clarification, summarization, personalization, classification, content_transformation, search, verification.
          
          If the request mentions specific capabilities (${capabilities.join(', ')}), include them in the plan.
          
          Output must be a valid JSON object. Format your response as JSON.` 
        }
      ],
      temperature: 0.5,
      response_format: { type: "json_object" }
    });
    
    // Parse the response
    const planText = response.choices[0].message.content;
    
    if (!planText) {
      throw new Error("Failed to generate strategic plan - empty response");
    }
    
    try {
      const planData = JSON.parse(planText);
      
      // Generate a unique ID for the plan
      const planId = `plan_${Date.now().toString(36)}`;
      
      // Convert steps from strings to PlanStep objects
      const planSteps: PlanStep[] = (planData.steps || []).map((step: string, index: number) => ({
        id: `step_${Date.now().toString(36)}_${index+1}`,
        description: step,
        status: 'pending',
        order: index + 1
      }));
      
      // Construct the complete plan
      const plan: StrategicPlan = {
        id: planId,
        goal,
        planDescription: planData.planDescription || "No description provided",
        steps: planSteps,
        capabilities: planData.capabilities || capabilities || [],
        complexity: typeof planData.complexity === 'number' ? planData.complexity : 0.5,
        estimatedTime: planData.estimatedTime || "unknown",
        priority: planData.priority as 'low' | 'medium' | 'high' || 'medium',
        shouldDelegateToAgent: !!planData.shouldDelegateToAgent,
        status: 'created',
        createdAt: new Date().toISOString()
      };
      
      log(`Generated strategic plan for goal: ${goal}`, 'strategic-planner');
      return plan;
    } catch (parseError) {
      log(`Error parsing strategic plan: ${parseError}`, 'strategic-planner');
      
      // Create fallback plan if parsing fails
      const fallbackPlanId = `plan_${Date.now().toString(36)}`;
      
      // Define steps 
      const defaultSteps: PlanStep[] = [
        {
          id: `step_${Date.now().toString(36)}_1`,
          description: "Analyze the request and identify requirements",
          status: 'pending',
          order: 1
        },
        {
          id: `step_${Date.now().toString(36)}_2`,
          description: "Gather necessary information",
          status: 'pending',
          order: 2
        },
        {
          id: `step_${Date.now().toString(36)}_3`,
          description: "Execute the task",
          status: 'pending',
          order: 3
        },
        {
          id: `step_${Date.now().toString(36)}_4`,
          description: "Validate results",
          status: 'pending',
          order: 4
        }
      ];
      
      return {
        id: fallbackPlanId,
        goal,
        planDescription: `Plan for: ${goal}`,
        steps: defaultSteps,
        capabilities: capabilities,
        complexity: 0.5,
        estimatedTime: "unknown",
        priority: 'medium',
        shouldDelegateToAgent: false,
        status: 'created',
        createdAt: new Date().toISOString()
      };
    }
  } catch (error) {
    log(`Error generating strategic plan: ${error}`, 'strategic-planner');
    
    // Create minimal fallback plan
    const emergencyPlanId = `plan_${Date.now().toString(36)}`;
    
    // Define a single emergency step
    const emergencyStep: PlanStep = {
      id: `step_${Date.now().toString(36)}_1`,
      description: "Process the request with available resources",
      status: 'pending',
      order: 1
    };
    
    // Return emergency fallback plan
    return {
      id: emergencyPlanId,
      goal,
      planDescription: `Emergency plan for: ${goal}`,
      steps: [emergencyStep],
      capabilities: capabilities,
      complexity: 0.3,
      estimatedTime: "unknown",
      priority: 'medium',
      shouldDelegateToAgent: false,
      status: 'created',
      createdAt: new Date().toISOString()
    };
  }
}