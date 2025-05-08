/**
 * Capability Evolution System
 * 
 * This system tracks agent capabilities and helps them evolve based on usage,
 * success rates, and user feedback. It serves as the backbone for creating
 * a learning system where agent capabilities improve over time.
 */

import { getLocalStorage, setLocalStorage } from './storage';

// Types
export interface CapabilityStats {
  usageCount: number;         // Number of times used
  successRate: number;        // Success rate (0-1)
  feedbackScore: number;      // Average user feedback score (0-5)
  lastUsed: number;           // Timestamp
  evolutionStage: number;     // Current evolution stage (0-5)
  specializations: string[];  // Areas where this capability has specialized
}

export interface CapabilityData {
  id: string;                 // Unique capability ID
  name: string;               // Display name
  description: string;        // Description of what it does
  icon?: string;              // Icon to represent it
  category: string;           // Category (analysis, communication, code, etc.)
  stats: CapabilityStats;     // Usage statistics
  requiredCapabilities?: string[]; // Dependencies on other capabilities
  compatibleAgents: string[]; // Agent types compatible with this capability
}

// Cache of capabilities to avoid excessive storage access
let capabilitiesCache: Record<string, CapabilityData> | null = null;

/**
 * Load all capability data from storage
 */
export function loadCapabilities(): Record<string, CapabilityData> {
  if (capabilitiesCache) {
    return capabilitiesCache;
  }
  
  const storedData = getLocalStorage('agent_capabilities');
  if (storedData) {
    try {
      capabilitiesCache = JSON.parse(storedData);
      return capabilitiesCache;
    } catch (e) {
      console.error('Failed to parse capabilities data:', e);
    }
  }
  
  // Initialize with empty object if nothing stored
  capabilitiesCache = {};
  return capabilitiesCache;
}

/**
 * Save capability data to storage
 */
export function saveCapabilities(capabilities: Record<string, CapabilityData>): void {
  capabilitiesCache = capabilities;
  setLocalStorage('agent_capabilities', JSON.stringify(capabilities));
}

/**
 * Get a specific capability
 */
export function getCapability(id: string): CapabilityData | null {
  const capabilities = loadCapabilities();
  return capabilities[id] || null;
}

/**
 * Register a new capability
 */
export function registerCapability(capability: Omit<CapabilityData, 'stats'> & { stats?: Partial<CapabilityStats> }): CapabilityData {
  const capabilities = loadCapabilities();
  
  // Create with default stats if not provided
  const stats: CapabilityStats = {
    usageCount: 0,
    successRate: 0,
    feedbackScore: 0,
    lastUsed: Date.now(),
    evolutionStage: 0,
    specializations: [],
    ...capability.stats
  };
  
  const newCapability: CapabilityData = {
    ...capability,
    stats
  };
  
  capabilities[capability.id] = newCapability;
  saveCapabilities(capabilities);
  
  return newCapability;
}

/**
 * Record capability usage
 */
export function recordCapabilityUsage(
  capabilityId: string, 
  success: boolean = true, 
  feedbackScore?: number
): void {
  const capabilities = loadCapabilities();
  const capability = capabilities[capabilityId];
  
  if (!capability) {
    console.warn(`Tried to record usage for non-existent capability: ${capabilityId}`);
    return;
  }
  
  // Update stats
  capability.stats.usageCount++;
  capability.stats.lastUsed = Date.now();
  
  // Update success rate with running average
  const prevSuccesses = capability.stats.successRate * (capability.stats.usageCount - 1);
  const newSuccesses = prevSuccesses + (success ? 1 : 0);
  capability.stats.successRate = newSuccesses / capability.stats.usageCount;
  
  // Update feedback score if provided
  if (feedbackScore !== undefined) {
    const prevScore = capability.stats.feedbackScore * (capability.stats.usageCount - 1);
    const newScore = prevScore + feedbackScore;
    capability.stats.feedbackScore = newScore / capability.stats.usageCount;
  }
  
  // Check for evolution opportunity
  checkForEvolution(capability);
  
  // Save updates
  capabilities[capabilityId] = capability;
  saveCapabilities(capabilities);
}

/**
 * Check if a capability should evolve to the next stage
 */
function checkForEvolution(capability: CapabilityData): void {
  const { stats } = capability;
  
  // Evolution criteria
  const canEvolve = 
    stats.usageCount >= (10 * (stats.evolutionStage + 1)) && // More usage needed for higher stages
    stats.successRate >= (0.7 + (stats.evolutionStage * 0.05)) && // Higher success rate needed
    stats.feedbackScore >= (3.5 + (stats.evolutionStage * 0.3)); // Higher feedback needed
  
  if (canEvolve && stats.evolutionStage < 5) {
    stats.evolutionStage++;
    
    // Every other evolution level can develop a specialization
    if (stats.evolutionStage % 2 === 0) {
      detectSpecialization(capability);
    }
  }
}

/**
 * Try to detect a specialization for this capability based on usage patterns
 * In a real system, this would analyze actual usage data to find patterns
 */
function detectSpecialization(capability: CapabilityData): void {
  // In a full implementation, this would analyze history of usage
  // For now, we'll just add a placeholder specialization
  
  const possibleSpecializations = {
    'analysis': ['Data Visualization', 'Statistical Analysis', 'Predictive Modeling'],
    'communication': ['Emotional Intelligence', 'Technical Writing', 'Persuasive Narrative'],
    'research': ['Academic Research', 'Market Research', 'Technical Deep Dives'],
    'coding': ['Frontend Development', 'Backend Systems', 'Data Processing'],
    'design': ['UI Design', 'UX Flow Optimization', 'Visual Communication'],
    'planning': ['Project Planning', 'Task Prioritization', 'Resource Allocation'],
  };
  
  const categorySpecializations = possibleSpecializations[capability.category as keyof typeof possibleSpecializations] || [];
  
  if (categorySpecializations.length > 0) {
    // Select a specialization not already present
    const availableSpecializations = categorySpecializations.filter(
      s => !capability.stats.specializations.includes(s)
    );
    
    if (availableSpecializations.length > 0) {
      const newSpecialization = availableSpecializations[
        Math.floor(Math.random() * availableSpecializations.length)
      ];
      
      capability.stats.specializations.push(newSpecialization);
    }
  }
}

/**
 * Get all capabilities in a particular category
 */
export function getCapabilitiesByCategory(category: string): CapabilityData[] {
  const capabilities = loadCapabilities();
  return Object.values(capabilities).filter(c => c.category === category);
}

/**
 * Get the most evolved capabilities
 */
export function getMostEvolvedCapabilities(limit: number = 5): CapabilityData[] {
  const capabilities = loadCapabilities();
  return Object.values(capabilities)
    .sort((a, b) => b.stats.evolutionStage - a.stats.evolutionStage)
    .slice(0, limit);
}

/**
 * Add a compatibility relation between a capability and an agent type
 */
export function addCapabilityAgentCompatibility(capabilityId: string, agentId: string): void {
  const capabilities = loadCapabilities();
  const capability = capabilities[capabilityId];
  
  if (!capability) {
    console.warn(`Tried to update non-existent capability: ${capabilityId}`);
    return;
  }
  
  if (!capability.compatibleAgents.includes(agentId)) {
    capability.compatibleAgents.push(agentId);
    saveCapabilities(capabilities);
  }
}

/**
 * Get all capabilities compatible with a specific agent type
 */
export function getCompatibleCapabilities(agentId: string): CapabilityData[] {
  const capabilities = loadCapabilities();
  return Object.values(capabilities).filter(c => c.compatibleAgents.includes(agentId));
}

/**
 * Initialize the system with some default capabilities
 */
export function initializeCapabilities(): void {
  const capabilities = loadCapabilities();
  
  // Only initialize if empty
  if (Object.keys(capabilities).length === 0) {
    // Core capabilities
    registerCapability({
      id: 'text-analysis',
      name: 'Text Analysis',
      description: 'Analyze and extract insights from text content',
      icon: 'FileText',
      category: 'analysis',
      compatibleAgents: ['research', 'analyst', 'assistant']
    });
    
    registerCapability({
      id: 'web-research',
      name: 'Web Research',
      description: 'Find and synthesize information from web sources',
      icon: 'Globe',
      category: 'research',
      compatibleAgents: ['research', 'analyst']
    });
    
    registerCapability({
      id: 'data-visualization',
      name: 'Data Visualization',
      description: 'Create visual representations of data',
      icon: 'BarChart',
      category: 'analysis',
      compatibleAgents: ['analyst', 'data-scientist']
    });
    
    registerCapability({
      id: 'code-generation',
      name: 'Code Generation',
      description: 'Generate code based on requirements',
      icon: 'Code',
      category: 'coding',
      compatibleAgents: ['developer', 'analyst']
    });
    
    registerCapability({
      id: 'content-creation',
      name: 'Content Creation',
      description: 'Create written content like articles and reports',
      icon: 'FileEdit',
      category: 'communication',
      compatibleAgents: ['writer', 'assistant']
    });
    
    registerCapability({
      id: 'strategic-planning',
      name: 'Strategic Planning',
      description: 'Develop strategic plans and roadmaps',
      icon: 'GitBranch',
      category: 'planning',
      compatibleAgents: ['strategist', 'manager']
    });
  }
}

// Export the types for use in other components
export type { CapabilityData, CapabilityStats };