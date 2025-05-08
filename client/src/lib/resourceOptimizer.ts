/**
 * Resource Optimizer
 * 
 * This system ensures efficient resource usage by prioritizing:
 * 1. Using existing resources/plugins
 * 2. Improving/updating existing resources
 * 3. Creating new agents only when necessary
 * 
 * The optimizer uses a sophisticated matching algorithm that considers:
 * - Capability overlap
 * - Performance history
 * - Resource utilization
 * - Task complexity
 * - Contextual relevance
 */

import { v4 as uuidv4 } from 'uuid';
import { useAgentStore } from '@/state/agentStore';
import { 
  updateCapabilityStats, 
  getCapabilityStats,
  getEvolvingCapabilities,
  recordCapabilityUsage,
  getCapability
} from './capabilityEvolution';

// Configuration constants for the resource optimizer
const CONFIG = {
  // Thresholds for resource matching
  SIMILARITY_THRESHOLD: 0.7,
  IMPROVEMENT_THRESHOLD: 0.4,
  
  // Weights for scoring algorithms
  CAPABILITY_MATCH_WEIGHT: 0.6,
  PERFORMANCE_WEIGHT: 0.25,
  RESOURCE_LOAD_WEIGHT: 0.15,
  
  // Maximum number of improvements to make to an existing agent
  MAX_IMPROVEMENTS_PER_CYCLE: 3,
  
  // Minimum score required to create a new agent
  NEW_AGENT_CREATION_THRESHOLD: 0.65,
  
  // Resource utilization parameters
  RESOURCE_OVERLOAD_THRESHOLD: 0.85,
  RESOURCE_UNDERUTILIZATION_THRESHOLD: 0.2
};

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
 * Uses a decision tree algorithm to determine the optimal strategy
 */
export async function findOptimalResource(
  requirement: ResourceRequirement
): Promise<ResourceSolution> {
  console.log(`Resource optimizer analyzing requirement: ${requirement.name}`);
  console.log(`Capabilities needed: ${requirement.capabilities.join(', ')}`);
  
  // 1. First check if we have existing agents that can fulfill the requirement
  const existingSolution = await findExistingResource(requirement);
  
  if (existingSolution && existingSolution.score > CONFIG.SIMILARITY_THRESHOLD) {
    console.log(`Found highly suitable existing resource: ${existingSolution.name} (score: ${existingSolution.score.toFixed(2)})`);
    // Record successful capability match for analytics
    existingSolution.capabilities.forEach(cap => {
      recordCapabilityUsage(cap, true);
    });
    return existingSolution;
  }
  
  // 2. If we have a resource that's close but not perfect, try to improve it
  if (existingSolution && existingSolution.score > CONFIG.IMPROVEMENT_THRESHOLD) {
    console.log(`Found potentially improvable resource: ${existingSolution.name} (score: ${existingSolution.score.toFixed(2)})`);
    const improvedSolution = await improveExistingResource(existingSolution, requirement);
    
    if (improvedSolution) {
      console.log(`Successfully improved existing resource: ${improvedSolution.name}`);
      console.log(`Improvements made: ${improvedSolution.improvementsMade?.join(', ')}`);
      return improvedSolution;
    }
  }
  
  // 3. Verify if we should create a new resource based on significance of the task
  const complexityScore = calculateRequirementComplexity(requirement);
  
  if (complexityScore < CONFIG.NEW_AGENT_CREATION_THRESHOLD) {
    console.log(`Task complexity (${complexityScore.toFixed(2)}) below threshold for creating new agent`);
    
    // Return a basic solution using an existing agent with partial capabilities
    if (existingSolution) {
      console.log(`Using partially matching resource instead: ${existingSolution.name}`);
      return existingSolution;
    }
    
    console.log(`No existing resources found, will create minimal new resource`);
    // Create a simpler variant with essential capabilities only
    const trimmedRequirement = {
      ...requirement,
      capabilities: filterEssentialCapabilities(requirement.capabilities)
    };
    const simpleSolution = await createNewResource(trimmedRequirement);
    return simpleSolution;
  }
  
  // 4. If no suitable resources exist or can be improved, create a full-featured new one
  console.log(`Creating new specialized resource for complex requirement`);
  const newSolution = await createNewResource(requirement);
  console.log(`Created new resource: ${newSolution.name} with ${newSolution.capabilities.length} capabilities`);
  
  return newSolution;
}

/**
 * Calculate the complexity score of a requirement to determine if it justifies a new agent
 */
function calculateRequirementComplexity(requirement: ResourceRequirement): number {
  // Assess based on number of capabilities, priority, and capability importance
  const capabilityCount = requirement.capabilities.length;
  const priorityScore = requirement.priority === 'high' ? 0.3 : 
                        requirement.priority === 'medium' ? 0.2 : 0.1;
  
  // Get importance scores for each capability
  let importanceScore = 0;
  requirement.capabilities.forEach(capId => {
    const capability = getCapability(capId);
    if (capability) {
      importanceScore += capability.importance || 0.5; // Default to medium importance if not specified
    }
  });
  
  // Normalize importance score
  const avgImportance = capabilityCount > 0 ? importanceScore / capabilityCount : 0;
  
  // Combine factors into overall complexity score
  return Math.min(
    (capabilityCount * 0.1) + // More capabilities = more complex
    (priorityScore) +         // Higher priority = more complex
    (avgImportance * 0.6),    // More important capabilities = more complex
    1.0                       // Cap at 1.0
  );
}

/**
 * Filter capabilities to only include essential ones when creating a simplified agent
 */
function filterEssentialCapabilities(capabilities: string[]): string[] {
  // Keep only the most important capabilities
  const prioritizedCapabilities = capabilities
    .map(capId => {
      const cap = getCapability(capId);
      return {
        id: capId,
        importance: cap?.importance || 0.5
      };
    })
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 2) // Keep only the top 2 most important capabilities
    .map(cap => cap.id);
  
  return prioritizedCapabilities;
}

/**
 * Find an existing resource that matches the requirements
 * Uses a weighted scoring system to find the best match
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
      
      // Calculate base capability match score
      const capabilityMatchScore = requirement.capabilities.length > 0 
        ? capabilityOverlap.length / requirement.capabilities.length
        : 0;

      // Calculate performance score based on previous usage (simulated for now)
      // In a real implementation, this would use stored performance metrics
      const performanceScore = Math.random() * 0.3 + 0.6; // Random score between 0.6 and 0.9
      
      // Calculate resource load score (lower is better)
      // In a real implementation, this would check current agent load
      const loadScore = Math.random() * 0.5 + 0.5; // Random score between 0.5 and 1.0
      
      // Calculate final weighted score
      const finalScore = (
        (capabilityMatchScore * CONFIG.CAPABILITY_MATCH_WEIGHT) + 
        (performanceScore * CONFIG.PERFORMANCE_WEIGHT) +
        (loadScore * CONFIG.RESOURCE_LOAD_WEIGHT)
      );
      
      return {
        type: 'existing' as const,
        resourceId: agent.id,
        name: agent.title,
        capabilities: agent.capabilities || [],
        score: finalScore
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
 * Uses NLP-inspired pattern recognition and domain detection
 */
export function assessResourceRequirements(query: string): ResourceRequirement | null {
  // Domain indicators with weighted relevance
  const domains = {
    complexity: {
      terms: [
        { term: 'analyze', weight: 0.7 },
        { term: 'complex', weight: 0.9 },
        { term: 'multiple', weight: 0.5 },
        { term: 'integrate', weight: 0.8 },
        { term: 'compare', weight: 0.6 },
        { term: 'research', weight: 0.7 },
        { term: 'investigate', weight: 0.7 },
        { term: 'synthesis', weight: 0.8 },
        { term: 'systemic', weight: 0.9 },
        { term: 'in-depth', weight: 0.7 },
        { term: 'comprehensive', weight: 0.8 },
        { term: 'evaluate', weight: 0.6 },
        { term: 'assess', weight: 0.6 },
        { term: 'deep dive', weight: 0.8 }
      ],
      capabilities: ['reasoning', 'strategic-planning', 'critical-thinking']
    },
    
    data: {
      terms: [
        { term: 'data', weight: 0.8 },
        { term: 'dataset', weight: 0.9 },
        { term: 'database', weight: 0.9 },
        { term: 'statistics', weight: 0.8 },
        { term: 'analytics', weight: 0.8 },
        { term: 'graph', weight: 0.6 },
        { term: 'chart', weight: 0.6 },
        { term: 'visualization', weight: 0.7 },
        { term: 'patterns', weight: 0.6 },
        { term: 'trends', weight: 0.6 },
        { term: 'correlations', weight: 0.7 },
        { term: 'metrics', weight: 0.7 },
        { term: 'insights', weight: 0.6 },
        { term: 'numbers', weight: 0.5 }
      ],
      capabilities: ['data-analysis', 'visualization', 'pattern-recognition']
    },
    
    coding: {
      terms: [
        { term: 'code', weight: 0.9 },
        { term: 'function', weight: 0.7 },
        { term: 'application', weight: 0.6 },
        { term: 'program', weight: 0.8 },
        { term: 'algorithm', weight: 0.8 },
        { term: 'api', weight: 0.7 },
        { term: 'debug', weight: 0.8 },
        { term: 'implementation', weight: 0.7 },
        { term: 'software', weight: 0.7 },
        { term: 'development', weight: 0.6 },
        { term: 'programming', weight: 0.9 },
        { term: 'library', weight: 0.7 },
        { term: 'framework', weight: 0.7 },
        { term: 'syntax', weight: 0.8 }
      ],
      capabilities: ['code-generation', 'debugging', 'software-architecture']
    },
    
    creative: {
      terms: [
        { term: 'design', weight: 0.7 },
        { term: 'creative', weight: 0.8 },
        { term: 'innovative', weight: 0.7 },
        { term: 'brainstorm', weight: 0.9 },
        { term: 'idea', weight: 0.6 },
        { term: 'inspiration', weight: 0.7 },
        { term: 'generate', weight: 0.5 },
        { term: 'novel', weight: 0.7 },
        { term: 'original', weight: 0.6 },
        { term: 'aesthetic', weight: 0.7 }
      ],
      capabilities: ['creativity', 'design-thinking', 'brainstorming']
    }
  };
  
  // Calculate weighted scores for each domain
  const lowercaseQuery = query.toLowerCase();
  const domainScores: Record<string, number> = {};
  
  Object.entries(domains).forEach(([domainName, domain]) => {
    let score = 0;
    
    // Check for exact term matches
    domain.terms.forEach(({ term, weight }) => {
      if (lowercaseQuery.includes(term)) {
        score += weight;
      }
    });
    
    // Bonus for domain-specific phrases (more precise detection)
    const phraseBonuses: Record<string, string[]> = {
      'complexity': ['root cause', 'deep analysis', 'underlying factors', 'systems thinking'],
      'data': ['data processing', 'statistical analysis', 'data visualization', 'pattern recognition'],
      'coding': ['code review', 'software development', 'programming language', 'bug fixing'],
      'creative': ['creative solution', 'design thinking', 'innovative approach', 'out of the box']
    };
    
    (phraseBonuses[domainName] || []).forEach(phrase => {
      if (lowercaseQuery.includes(phrase)) {
        score += 1.0; // Strong bonus for phrases
      }
    });
    
    domainScores[domainName] = score;
  });
  
  // Calculate overall complexity and determine if specialized resources are needed
  const totalScore = Object.values(domainScores).reduce((sum, score) => sum + score, 0);
  const domainCount = Object.values(domainScores).filter(score => score > 0.7).length;
  
  // Only create resources for sufficiently complex tasks
  if (totalScore >= 1.5 || domainCount >= 2) {
    // Collect capabilities from relevant domains
    const capabilities: string[] = [];
    
    Object.entries(domains).forEach(([domainName, domain]) => {
      if (domainScores[domainName] >= 0.7) {
        capabilities.push(...domain.capabilities);
      } else if (domainScores[domainName] >= 0.4) {
        // Add the primary capability for domains with moderate relevance
        capabilities.push(domain.capabilities[0]);
      }
    });
    
    // Determine priority based on complexity
    const priority = totalScore >= 3.0 ? 'high' : totalScore >= 1.8 ? 'medium' : 'low';
    
    // Generate a descriptive name based on the most relevant domains
    const topDomains = Object.entries(domainScores)
      .filter(([_, score]) => score >= 0.7)
      .sort(([_, scoreA], [__, scoreB]) => scoreB - scoreA)
      .map(([domain, _]) => domain);
    
    const specialization = topDomains.length > 0 
      ? topDomains.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join('-') 
      : 'Specialized';
    
    return {
      name: `${specialization} Assistant`,
      description: `Specialized resource to assist with: ${query}`,
      priority,
      capabilities: [...new Set(capabilities)] // Remove duplicates
    };
  }
  
  return null;
}