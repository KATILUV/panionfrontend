/**
 * Strategic Planner
 * 
 * This module implements advanced task planning and strategic orchestration
 * to make Panion smarter across all capabilities.
 */
import axios from 'axios';
import { log } from './vite';
import { v4 as uuidv4 } from 'uuid';

// Configuration
const PANION_API_PORT = process.env.PANION_API_PORT || 8000;
const PANION_API_URL = `http://localhost:${PANION_API_PORT}`;

// Strategy and Planning Types
export interface PlanStep {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  requires?: string[];
  provides?: string[];
  task?: string;
  agent?: string;
  metrics?: {
    confidence: number;
    estimated_time?: number;
    completion_time?: number;
    quality_score?: number;
  };
  result?: any;
}

export interface StrategicPlan {
  id: string;
  goal: string;
  created: string;
  status: 'planning' | 'executing' | 'completed' | 'failed';
  progress: number;
  steps: PlanStep[];
  context: Record<string, any>;
  results: any;
  thought_process?: string[];
}

export interface PlanTemplate {
  name: string;
  description: string;
  applicableFor: string[];
  steps: Omit<PlanStep, 'id' | 'status'>[];
}

// Store for active plans
const activePlans = new Map<string, StrategicPlan>();

// Plan templates for common tasks
const planTemplates: PlanTemplate[] = [
  {
    name: "business_research",
    description: "Comprehensive business research plan",
    applicableFor: ["business_research", "market_analysis", "competitor_analysis"],
    steps: [
      {
        description: "Define search parameters and objectives",
        requires: [],
        provides: ["search_parameters"],
        task: "define_parameters",
        agent: "panion",
        metrics: { confidence: 0.9 }
      },
      {
        description: "Gather general business information",
        requires: ["search_parameters"],
        provides: ["basic_business_data"],
        task: "business_search",
        agent: "research",
        metrics: { confidence: 0.85 }
      },
      {
        description: "Analyze and verify business information",
        requires: ["basic_business_data"],
        provides: ["verified_business_data"],
        task: "verify_data",
        agent: "data_analysis",
        metrics: { confidence: 0.8 }
      },
      {
        description: "Compile final report with insights",
        requires: ["verified_business_data"],
        provides: ["final_report"],
        task: "compile_report",
        agent: "panion",
        metrics: { confidence: 0.9 }
      }
    ]
  },
  {
    name: "owner_contact_research",
    description: "Find and verify business owner contact information",
    applicableFor: ["contact_finder", "owner_research", "business_outreach"],
    steps: [
      {
        description: "Define target business and location parameters",
        requires: [],
        provides: ["search_parameters"],
        task: "define_parameters",
        agent: "panion",
        metrics: { confidence: 0.9 }
      },
      {
        description: "Find basic business listings and information",
        requires: ["search_parameters"],
        provides: ["business_listings"],
        task: "business_search",
        agent: "research",
        metrics: { confidence: 0.85 }
      },
      {
        description: "Search for owner information from business records",
        requires: ["business_listings"],
        provides: ["owner_candidates"],
        task: "owner_search",
        agent: "research",
        metrics: { confidence: 0.75 }
      },
      {
        description: "Cross-reference and verify contact information",
        requires: ["owner_candidates"],
        provides: ["verified_contacts"],
        task: "verify_contacts",
        agent: "data_analysis",
        metrics: { confidence: 0.7 }
      },
      {
        description: "Compile and format final contact information",
        requires: ["verified_contacts"],
        provides: ["final_results"],
        task: "compile_contacts",
        agent: "panion",
        metrics: { confidence: 0.9 }
      }
    ]
  },
  {
    name: "data_analysis",
    description: "Analyze datasets and extract insights",
    applicableFor: ["data_analysis", "market_trends", "statistical_analysis"],
    steps: [
      {
        description: "Define analysis objectives and metrics",
        requires: [],
        provides: ["analysis_parameters"],
        task: "define_analysis",
        agent: "panion",
        metrics: { confidence: 0.9 }
      },
      {
        description: "Clean and preprocess data",
        requires: ["analysis_parameters"],
        provides: ["processed_data"],
        task: "data_preprocessing",
        agent: "data_analysis",
        metrics: { confidence: 0.85 }
      },
      {
        description: "Perform statistical analysis and modeling",
        requires: ["processed_data"],
        provides: ["analysis_results"],
        task: "statistical_analysis",
        agent: "data_analysis",
        metrics: { confidence: 0.8 }
      },
      {
        description: "Generate data visualizations",
        requires: ["analysis_results"],
        provides: ["visualizations"],
        task: "create_visualizations",
        agent: "creative",
        metrics: { confidence: 0.75 }
      },
      {
        description: "Interpret results and compile insights report",
        requires: ["analysis_results", "visualizations"],
        provides: ["final_report"],
        task: "compile_insights",
        agent: "panion",
        metrics: { confidence: 0.9 }
      }
    ]
  }
];

/**
 * Creates a new strategic plan for a complex task
 */
export function createPlan(goal: string, context: Record<string, any> = {}): StrategicPlan {
  // Generate a unique ID for this plan
  const planId = `plan_${uuidv4().substring(0, 8)}`;
  
  // Determine the appropriate template based on the goal
  const matchingTemplate = findBestTemplateForGoal(goal, context);
  
  // Create plan steps from template or generate dynamically
  const steps = matchingTemplate 
    ? createStepsFromTemplate(matchingTemplate) 
    : generateDynamicPlanSteps(goal, context);
  
  // Create the strategic plan
  const plan: StrategicPlan = {
    id: planId,
    goal,
    created: new Date().toISOString(),
    status: 'planning',
    progress: 0,
    steps,
    context,
    results: null,
    thought_process: [`Plan created for: ${goal}`]
  };
  
  // Store the plan
  activePlans.set(planId, plan);
  
  log(`Created strategic plan ${planId} for goal: ${goal}`, 'strategic-planner');
  
  return plan;
}

/**
 * Find the best matching template for a given goal
 */
function findBestTemplateForGoal(goal: string, context: Record<string, any>): PlanTemplate | null {
  const lowerGoal = goal.toLowerCase();
  
  // Extract capabilities if available in context
  const capabilities = context.capabilities || [];
  
  // Determine topic areas from the goal
  const businessTerms = ['business', 'company', 'firm', 'enterprise', 'shop', 'store', 'owner'];
  const dataTerms = ['data', 'analysis', 'statistics', 'metrics', 'trends', 'insights'];
  const researchTerms = ['research', 'find', 'search', 'gather', 'collect', 'information'];
  const contactTerms = ['contact', 'email', 'phone', 'address', 'owner', 'reach'];
  
  const isBusinessGoal = businessTerms.some(term => lowerGoal.includes(term));
  const isDataGoal = dataTerms.some(term => lowerGoal.includes(term));
  const isResearchGoal = researchTerms.some(term => lowerGoal.includes(term));
  const isContactGoal = contactTerms.some(term => lowerGoal.includes(term));
  
  // Find the best matching template
  if (isContactGoal && isBusinessGoal) {
    return planTemplates.find(t => t.name === "owner_contact_research") || null;
  } else if (isBusinessGoal || isResearchGoal) {
    return planTemplates.find(t => t.name === "business_research") || null;
  } else if (isDataGoal) {
    return planTemplates.find(t => t.name === "data_analysis") || null;
  }
  
  // If no direct match, try to find a template based on capabilities
  if (capabilities.length > 0) {
    for (const template of planTemplates) {
      if (template.applicableFor.some(capability => capabilities.includes(capability))) {
        return template;
      }
    }
  }
  
  return null;
}

/**
 * Create plan steps from a template
 */
function createStepsFromTemplate(template: PlanTemplate): PlanStep[] {
  return template.steps.map(step => ({
    ...step,
    id: `step_${uuidv4().substring(0, 8)}`,
    status: 'pending'
  }));
}

/**
 * Generate a dynamic plan based on goal analysis
 */
function generateDynamicPlanSteps(goal: string, context: Record<string, any>): PlanStep[] {
  // This would ideally use a more sophisticated goal decomposition algorithm
  // For now, we'll use a simplified approach
  
  const steps: PlanStep[] = [
    {
      id: `step_${uuidv4().substring(0, 8)}`,
      description: `Analyze and understand goal: "${goal}"`,
      status: 'pending',
      requires: [],
      provides: ['goal_analysis'],
      task: 'analyze_goal',
      agent: 'panion',
      metrics: { confidence: 0.9 }
    },
    {
      id: `step_${uuidv4().substring(0, 8)}`,
      description: 'Research and gather relevant information',
      status: 'pending',
      requires: ['goal_analysis'],
      provides: ['research_results'],
      task: 'research',
      agent: 'research',
      metrics: { confidence: 0.8 }
    },
    {
      id: `step_${uuidv4().substring(0, 8)}`,
      description: 'Process and analyze gathered information',
      status: 'pending',
      requires: ['research_results'],
      provides: ['processed_results'],
      task: 'process_data',
      agent: 'data_analysis',
      metrics: { confidence: 0.75 }
    },
    {
      id: `step_${uuidv4().substring(0, 8)}`,
      description: 'Generate response and recommendations',
      status: 'pending',
      requires: ['processed_results'],
      provides: ['final_results'],
      task: 'generate_response',
      agent: 'panion',
      metrics: { confidence: 0.85 }
    }
  ];
  
  return steps;
}

/**
 * Execute a strategic plan
 */
export async function executePlan(planId: string): Promise<StrategicPlan> {
  const plan = activePlans.get(planId);
  
  if (!plan) {
    throw new Error(`No plan found with ID: ${planId}`);
  }
  
  // Update plan status to executing
  plan.status = 'executing';
  plan.progress = 5;
  plan.thought_process?.push('Beginning plan execution');
  
  // Find steps that can be executed (all required inputs are available)
  await executeNextSteps(plan);
  
  return plan;
}

/**
 * Execute the next available steps in the plan
 */
async function executeNextSteps(plan: StrategicPlan): Promise<void> {
  // Find all steps that have their requirements fulfilled and are pending
  const executableSteps = findExecutableSteps(plan);
  
  // If no steps can be executed, check if we're done or blocked
  if (executableSteps.length === 0) {
    if (plan.steps.every(step => step.status === 'completed')) {
      // All steps are completed, finish the plan
      finalizePlan(plan);
    } else if (plan.steps.some(step => step.status === 'failed')) {
      // At least one step failed, mark the plan as failed
      plan.status = 'failed';
      plan.thought_process?.push('Plan execution failed due to failed steps');
      log(`Strategic plan ${plan.id} failed: ${plan.thought_process?.slice(-1)[0]}`, 'strategic-planner');
    } else {
      // We're blocked - this should not happen with a properly designed plan
      plan.thought_process?.push('Plan execution is blocked - no executable steps but plan is incomplete');
      log(`Strategic plan ${plan.id} is blocked`, 'strategic-planner');
    }
    
    return;
  }
  
  // Update progress
  const completedSteps = plan.steps.filter(s => s.status === 'completed').length;
  const totalSteps = plan.steps.length;
  plan.progress = Math.round((completedSteps / totalSteps) * 100);
  
  // For each executable step, start execution
  for (const step of executableSteps) {
    // Mark step as in progress
    step.status = 'in_progress';
    plan.thought_process?.push(`Executing step: ${step.description}`);
    
    // Execute the step (async)
    setTimeout(async () => {
      try {
        // This would execute the actual step logic
        // For now, we'll simulate success for most steps
        const result = await simulateStepExecution(step, plan);
        
        // Update the step with the result
        step.status = 'completed';
        step.result = result;
        
        // Update plan progress
        const newCompletedSteps = plan.steps.filter(s => s.status === 'completed').length;
        plan.progress = Math.round((newCompletedSteps / totalSteps) * 100);
        
        plan.thought_process?.push(`Completed step: ${step.description}`);
        log(`Completed step in plan ${plan.id}: ${step.description}`, 'strategic-planner');
        
        // Try to execute next steps
        await executeNextSteps(plan);
      } catch (error) {
        // Step failed
        step.status = 'failed';
        plan.thought_process?.push(`Failed step: ${step.description} - ${error}`);
        log(`Failed step in plan ${plan.id}: ${step.description} - ${error}`, 'strategic-planner');
        
        // Try to execute next steps (some plans can continue with failed steps)
        await executeNextSteps(plan);
      }
    }, 1000);
  }
}

/**
 * Find steps that can be executed based on their requirements
 */
function findExecutableSteps(plan: StrategicPlan): PlanStep[] {
  const availableOutputs = new Set<string>();
  
  // Collect all outputs from completed steps
  for (const step of plan.steps) {
    if (step.status === 'completed' && step.provides) {
      step.provides.forEach(output => availableOutputs.add(output));
    }
  }
  
  // Find pending steps whose requirements are satisfied
  return plan.steps.filter(step => {
    // Step must be pending
    if (step.status !== 'pending') return false;
    
    // Step must have all requirements satisfied
    if (!step.requires || step.requires.length === 0) return true;
    
    return step.requires.every(req => availableOutputs.has(req));
  });
}

/**
 * Finalize a completed plan and process results
 */
function finalizePlan(plan: StrategicPlan): void {
  // Mark the plan as completed
  plan.status = 'completed';
  plan.progress = 100;
  
  // Collect results from the final step(s)
  const finalResults: any = {};
  
  // Find steps that provide final outputs
  const finalSteps = plan.steps.filter(step => 
    step.status === 'completed' && 
    step.provides && 
    step.provides.some(output => output.startsWith('final_'))
  );
  
  // Collect results from final steps
  for (const step of finalSteps) {
    if (step.result) {
      Object.assign(finalResults, step.result);
    }
  }
  
  // Set the plan results
  plan.results = finalResults;
  
  plan.thought_process?.push('Plan execution completed successfully');
  log(`Strategic plan ${plan.id} completed successfully`, 'strategic-planner');
}

/**
 * Simulate the execution of a plan step (for development)
 */
async function simulateStepExecution(step: PlanStep, plan: StrategicPlan): Promise<any> {
  // In a real implementation, this would dispatch to the appropriate agent
  // For now, we'll simulate success with appropriate mock data based on step type
  
  // Add some intentional delay to simulate processing
  await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 2000));
  
  // Return different mock results based on step task
  switch (step.task) {
    case 'define_parameters':
      return {
        location: plan.context.location || 'Chicago',
        keywords: ['smoke shop', 'tobacco store', 'vape shop'],
        include_owner_info: true
      };
      
    case 'business_search':
      return {
        businesses: [
          { name: 'Smoke Shop A', address: '123 Main St', phone: '555-1234' },
          { name: 'Vape Central', address: '456 Elm St', phone: '555-5678' },
          { name: 'Tobacco Express', address: '789 Oak Rd', phone: '555-9012' }
        ]
      };
      
    case 'owner_search':
      return {
        owner_candidates: [
          { business: 'Smoke Shop A', name: 'John Smith', contact: 'john@example.com' },
          { business: 'Vape Central', name: 'Jane Doe', contact: '555-567-8901' }
        ]
      };
      
    case 'verify_contacts':
      return {
        verified_contacts: [
          { 
            business: 'Smoke Shop A', 
            owner: 'John Smith', 
            email: 'john@example.com', 
            phone: '555-123-4567', 
            verified: true 
          }
        ]
      };
      
    case 'compile_contacts':
    case 'compile_report':
    case 'compile_insights':
      // Generate a final report/results
      return {
        title: `Results for "${plan.goal}"`,
        date: new Date().toISOString(),
        summary: `Analysis of ${plan.goal} completed successfully.`,
        data: step.requires?.reduce((acc, req) => {
          // Find the step that provided this requirement
          const providerStep = plan.steps.find(s => 
            s.status === 'completed' && s.provides && s.provides.includes(req)
          );
          
          if (providerStep && providerStep.result) {
            acc[req] = providerStep.result;
          }
          
          return acc;
        }, {} as Record<string, any>)
      };
      
    default:
      // For any other type of task, return a simple success result
      return {
        success: true,
        message: `Completed task: ${step.task}`,
        timestamp: new Date().toISOString()
      };
  }
}

/**
 * Get a plan by ID
 */
export function getPlan(planId: string): StrategicPlan | undefined {
  return activePlans.get(planId);
}

/**
 * List all active strategic plans
 */
export function listPlans(): StrategicPlan[] {
  return Array.from(activePlans.values());
}