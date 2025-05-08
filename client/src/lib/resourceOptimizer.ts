/**
 * Resource Optimizer
 * 
 * This system ensures efficient resource usage by prioritizing:
 * 1. Using existing resources/plugins
 * 2. Improving/updating existing resources
 * 3. Creating new agents only when necessary
 */

import { v4 as uuidv4 } from 'uuid';
import { useAgentStore } from '@/state/agentStore';
import { 
  updateCapabilityStats, 
  getCapabilityStats,
  getEvolvingCapabilities,
  recordCapabilityUsage
} from './capabilityEvolution';

// Similarity threshold to determine if a capability is similar enough
const SIMILARITY_THRESHOLD = 0.7;

export interface ResourceRequirement {
  name: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  capabilities: string[];
}

export interface ResourceSolution {
  type: 'existing' | 'improved' | 'new';
  resourceId: string;
  name: string;
  description?: string;
  capabilities: string[];
  score: number;
  improvementsMade?: string[];
}

/**
 * Find the best resource solution based on requirements
 */
export async function findOptimalResource(
  requirement: ResourceRequirement
): Promise<ResourceSolution> {
  // 1. First check if we have existing agents that can fulfill the requirement
  const existingSolution = await findExistingResource(requirement);
  if (existingSolution && existingSolution.score > SIMILARITY_THRESHOLD) {
    console.log(`Using existing resource: ${existingSolution.name}`);
    return existingSolution;
  }
  
  // 2. If we have a resource that's close but not perfect, try to improve it
  if (existingSolution && existingSolution.score > 0.4) {
    const improvedSolution = await improveExistingResource(existingSolution, requirement);
    if (improvedSolution) {
      console.log(`Improved existing resource: ${improvedSolution.name}`);
      return improvedSolution;
    }
  }
  
  // 3. If no suitable resources exist or can be improved, create a new one
  const newSolution = await createNewResource(requirement);
  console.log(`Created new resource: ${newSolution.name}`);
  return newSolution;
}

/**
 * Find an existing resource that matches the requirements
 */
async function findExistingResource(
  requirement: ResourceRequirement
): Promise<ResourceSolution | null> {
  const store = useAgentStore.getState();
  const allAgents = store.registry;
  
  // Calculate capability match scores for each agent
  const scoredAgents = allAgents
    .filter(agent => agent.capabilities && agent.capabilities.length > 0)
    .map(agent => {
      // Calculate overlap between required capabilities and agent capabilities
      const capabilityOverlap = requirement.capabilities.filter(
        reqCap => agent.capabilities?.includes(reqCap)
      );
      
      const matchScore = capabilityOverlap.length / requirement.capabilities.length;
      
      return {
        type: 'existing' as const,
        resourceId: agent.id,
        name: agent.title,
        capabilities: agent.capabilities || [],
        score: matchScore
      };
    })
    .sort((a, b) => b.score - a.score);
  
  if (scoredAgents.length === 0) return null;
  
  // Return the highest scoring agent if it meets our threshold
  return scoredAgents[0];
}

/**
 * Improve an existing resource to better match requirements
 */
async function improveExistingResource(
  existingSolution: ResourceSolution,
  requirement: ResourceRequirement
): Promise<ResourceSolution | null> {
  const store = useAgentStore.getState();
  const agent = store.registry.find(a => a.id === existingSolution.resourceId);
  
  if (!agent) return null;
  
  // Find capabilities that need to be added
  const missingCapabilities = requirement.capabilities.filter(
    reqCap => !agent.capabilities?.includes(reqCap)
  );
  
  if (missingCapabilities.length === 0) return null;
  
  // In a real implementation, this would use an LLM to enhance the agent
  // For now, we'll just update its capability list
  
  const improvementsMade = missingCapabilities.map(cap => 
    `Added capability: ${cap}`
  );
  
  // Track the evolution of capabilities
  missingCapabilities.forEach(capId => {
    updateCapabilityStats(capId, {
      uses: 1,
      successRate: 0.7, // Initial success rate for new capabilities
      responseTime: 1.0 // Initial response time estimate
    });
  });
  
  return {
    type: 'improved' as const,
    resourceId: existingSolution.resourceId,
    name: agent.title,
    capabilities: [...(agent.capabilities || []), ...missingCapabilities],
    score: 0.85, // Higher score now that it's improved
    improvementsMade
  };
}

/**
 * Create a new resource when no suitable existing ones are found
 */
async function createNewResource(
  requirement: ResourceRequirement
): Promise<ResourceSolution> {
  const store = useAgentStore.getState();
  
  // In a production environment, this would use an LLM to generate 
  // a specialized agent based on requirements
  
  const newAgentId = `dynamic-agent-${uuidv4().substring(0, 8)}`;
  
  // Register the new dynamic agent
  store.createDynamicAgent({
    name: requirement.name,
    description: requirement.description,
    capabilities: requirement.capabilities,
    icon: 'sparkles' // Default icon for new dynamic agents
  });
  
  // Track all new capabilities
  requirement.capabilities.forEach(capId => {
    recordCapabilityUsage(capId, true);
    updateCapabilityStats(capId, {
      uses: 1,
      successRate: 0.7, // Initial success rate
      responseTime: 1.0 // Initial response time
    });
  });
  
  return {
    type: 'new' as const,
    resourceId: newAgentId,
    name: requirement.name,
    description: requirement.description,
    capabilities: requirement.capabilities,
    score: 1.0 // Perfect score since it's tailored to requirements
  };
}

/**
 * Determine if we need specialized resources for a task
 */
export function assessResourceRequirements(query: string): ResourceRequirement | null {
  // Simple heuristic - in production this would use a more sophisticated algorithm
  const complexityIndicators = [
    'analyze', 'complex', 'multiple', 'integrate', 'compare',
    'research', 'investigate', 'synthesis', 'systemic', 'in-depth'
  ];
  
  const dataIndicators = [
    'data', 'dataset', 'database', 'statistics', 'analytics',
    'graph', 'visualization', 'patterns', 'trends', 'correlations'
  ];
  
  const codingIndicators = [
    'code', 'function', 'application', 'program', 'algorithm',
    'api', 'debug', 'implementation', 'software', 'development'
  ];
  
  // Count indicators in the query
  const complexityScore = complexityIndicators.filter(term => 
    query.toLowerCase().includes(term)
  ).length;
  
  const dataScore = dataIndicators.filter(term => 
    query.toLowerCase().includes(term)
  ).length;
  
  const codingScore = codingIndicators.filter(term => 
    query.toLowerCase().includes(term)
  ).length;
  
  // If we detect enough indicators, suggest a resource requirement
  if (complexityScore + dataScore + codingScore >= 2) {
    const capabilities: string[] = [];
    
    if (complexityScore >= 1) capabilities.push('reasoning', 'strategic-planning');
    if (dataScore >= 1) capabilities.push('data-analysis', 'visualization');
    if (codingScore >= 1) capabilities.push('code-generation', 'debugging');
    
    return {
      name: `Task Helper for ${query.substring(0, 30)}...`,
      description: `Specialized resource to assist with: ${query}`,
      priority: complexityScore + dataScore + codingScore >= 4 ? 'high' : 'medium',
      capabilities
    };
  }
  
  return null;
}