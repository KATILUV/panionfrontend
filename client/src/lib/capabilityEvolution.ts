/**
 * Capability Evolution System
 * 
 * This module provides a framework for tracking and evolving AI capabilities
 * based on usage patterns and performance.
 */

import { debounce } from '../utils/debounceUtils';
import { getLocalStorage, setLocalStorage } from './storage';

// Storage key for capability data
const STORAGE_KEY = 'panion_capabilities';

// Interface for capability statistics
export interface CapabilityStats {
  usageCount: number;
  successCount: number;
  failureCount: number;
  lastUsed: number;
  feedbackScores: number[];
  averageFeedback: number;
  successRate: number;
  createdAt: number;
  updatedAt: number;
}

// Interface for capability data
export interface CapabilityData {
  id: string;
  name: string;
  description: string;
  version: number;
  importance: number; // 0-1 scale, how important this capability is
  complexity: number; // 0-1 scale, how complex this capability is
  masteryLevel: number; // 0-1 scale, how well the system has mastered this capability
  evolutionPoints: number; // Points that can be spent on improving this capability
  tags: string[];
  stats: CapabilityStats;
  dependencies: string[]; // IDs of other capabilities this one depends on
  isCore: boolean; // Whether this is a core capability or learned
  icon?: string;
}

// Get all capabilities from storage
export function getCapabilities(): Record<string, CapabilityData> {
  const storedData = getLocalStorage<Record<string, CapabilityData>>(STORAGE_KEY);
  return storedData || {};
}

// Save all capabilities to storage
const saveCapabilities = debounce((capabilities: Record<string, CapabilityData>) => {
  setLocalStorage(STORAGE_KEY, capabilities);
}, 500);

/**
 * Update a capability's statistics
 */
export function updateCapabilityStats(
  capabilityId: string,
  stats: {
    uses?: number;
    successRate?: number;
    responseTime?: number;
  }
) {
  const capabilities = getCapabilities();
  const capability = capabilities[capabilityId];
  
  // If capability doesn't exist, create a basic one
  if (!capability) {
    const newCapability: CapabilityData = {
      id: capabilityId,
      name: capabilityId.charAt(0).toUpperCase() + capabilityId.slice(1).replace(/-/g, ' '),
      description: `Capability for ${capabilityId}`,
      version: 1,
      importance: 0.5,
      complexity: 0.5,
      masteryLevel: 0.1,
      evolutionPoints: 0,
      tags: [],
      stats: {
        usageCount: stats.uses || 0,
        successCount: 0,
        failureCount: 0,
        lastUsed: Date.now(),
        feedbackScores: [],
        averageFeedback: 0,
        successRate: stats.successRate || 0.5,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      dependencies: [],
      isCore: false
    };
    
    capabilities[capabilityId] = newCapability;
  } else {
    // Update existing capability stats
    if (stats.uses) {
      capability.stats.usageCount += stats.uses;
    }
    
    if (stats.successRate !== undefined) {
      capability.stats.successRate = 
        (capability.stats.successRate * 0.7) + (stats.successRate * 0.3);
    }
    
    capability.stats.updatedAt = Date.now();
    capability.stats.lastUsed = Date.now();
    
    capabilities[capabilityId] = capability;
  }
  
  saveCapabilities(capabilities);
}

/**
 * Get statistics for a specific capability
 */
export function getCapabilityStats(capabilityId: string): CapabilityStats | null {
  const capabilities = getCapabilities();
  return capabilities[capabilityId]?.stats || null;
}

/**
 * Track usage of a capability
 */
export function trackCapabilityUse(
  capabilityId: string,
  success: boolean = true
) {
  const capabilities = getCapabilities();
  const capability = capabilities[capabilityId];
  
  if (!capability) {
    // Create a new capability if it doesn't exist
    updateCapabilityStats(capabilityId, { uses: 1, successRate: success ? 1 : 0 });
    return;
  }
  
  // Update usage statistics
  capability.stats.usageCount += 1;
  capability.stats.lastUsed = Date.now();
  
  if (success) {
    capability.stats.successCount += 1;
  } else {
    capability.stats.failureCount += 1;
  }
  
  // Update success rate
  const totalAttempts = capability.stats.successCount + capability.stats.failureCount;
  if (totalAttempts > 0) {
    capability.stats.successRate = capability.stats.successCount / totalAttempts;
  }
  
  // Add evolution points based on usage
  capability.evolutionPoints += 0.1;
  
  // Update mastery level based on success rate and usage
  capability.masteryLevel = Math.min(
    0.99,
    (capability.masteryLevel * 0.8) + (capability.stats.successRate * 0.2)
  );
  
  capabilities[capabilityId] = capability;
  saveCapabilities(capabilities);
}

/**
 * Get all capabilities that are evolving (have gained evolution points)
 */
export function getEvolvingCapabilities(): CapabilityData[] {
  const capabilities = getCapabilities();
  return Object.values(capabilities)
    .filter(cap => cap.evolutionPoints > 0)
    .sort((a, b) => b.evolutionPoints - a.evolutionPoints);
}

// Initialize the capability system with core capabilities
export function initializeCapabilities(): void {
  const existingCapabilities = getCapabilities();
  
  // Only initialize if we don't have capabilities already
  if (Object.keys(existingCapabilities).length > 0) {
    return;
  }
  
  const now = Date.now();
  
  // Core capabilities
  const coreCapabilities: Record<string, CapabilityData> = {
    'reasoning': {
      id: 'reasoning',
      name: 'Reasoning',
      description: 'Logical reasoning and problem solving',
      version: 1.0,
      importance: 1.0,
      complexity: 0.8,
      masteryLevel: 0.7,
      evolutionPoints: 0,
      tags: ['core', 'intelligence', 'logic'],
      stats: {
        usageCount: 0,
        successCount: 0,
        failureCount: 0,
        lastUsed: now,
        feedbackScores: [],
        averageFeedback: 0,
        successRate: 0,
        createdAt: now,
        updatedAt: now
      },
      dependencies: [],
      isCore: true,
      icon: 'brain'
    },
    
    'internal-debate': {
      id: 'internal-debate',
      name: 'Internal Debate',
      description: 'Discuss topics from multiple perspectives internally',
      version: 1.0,
      importance: 0.9,
      complexity: 0.9,
      masteryLevel: 0.6,
      evolutionPoints: 0,
      tags: ['core', 'intelligence', 'discussion'],
      stats: {
        usageCount: 0,
        successCount: 0,
        failureCount: 0,
        lastUsed: now,
        feedbackScores: [],
        averageFeedback: 0,
        successRate: 0,
        createdAt: now,
        updatedAt: now
      },
      dependencies: ['reasoning'],
      isCore: true,
      icon: 'message-circle'
    },
    
    'web-research': {
      id: 'web-research',
      name: 'Web Research',
      description: 'Research information from web sources',
      version: 1.0,
      importance: 0.8,
      complexity: 0.7,
      masteryLevel: 0.5,
      evolutionPoints: 0,
      tags: ['core', 'data', 'research'],
      stats: {
        usageCount: 0,
        successCount: 0,
        failureCount: 0,
        lastUsed: now,
        feedbackScores: [],
        averageFeedback: 0,
        successRate: 0,
        createdAt: now,
        updatedAt: now
      },
      dependencies: [],
      isCore: true,
      icon: 'globe'
    },
    
    'data-analysis': {
      id: 'data-analysis',
      name: 'Data Analysis',
      description: 'Analyze and interpret data sets',
      version: 1.0,
      importance: 0.8,
      complexity: 0.8,
      masteryLevel: 0.6,
      evolutionPoints: 0,
      tags: ['core', 'data', 'analysis'],
      stats: {
        usageCount: 0,
        successCount: 0,
        failureCount: 0,
        lastUsed: now,
        feedbackScores: [],
        averageFeedback: 0,
        successRate: 0,
        createdAt: now,
        updatedAt: now
      },
      dependencies: ['reasoning'],
      isCore: true,
      icon: 'bar-chart'
    },
    
    'planning': {
      id: 'planning',
      name: 'Planning',
      description: 'Create and execute plans for complex goals',
      version: 1.0,
      importance: 0.9,
      complexity: 0.8,
      masteryLevel: 0.6,
      evolutionPoints: 0,
      tags: ['core', 'task', 'planning'],
      stats: {
        usageCount: 0,
        successCount: 0,
        failureCount: 0,
        lastUsed: now,
        feedbackScores: [],
        averageFeedback: 0,
        successRate: 0,
        createdAt: now,
        updatedAt: now
      },
      dependencies: ['reasoning'],
      isCore: true,
      icon: 'list-checks'
    }
  };
  
  // Save the initial capabilities
  saveCapabilities(coreCapabilities);
}

// Get a specific capability
export function getCapability(id: string): CapabilityData | null {
  const capabilities = getCapabilities();
  return capabilities[id] || null;
}

// Record usage of a capability
export function recordCapabilityUsage(
  id: string, 
  success: boolean = true, 
  feedbackScore?: number
): void {
  const capabilities = getCapabilities();
  const capability = capabilities[id];
  
  if (!capability) {
    console.warn(`Capability ${id} not found`);
    return;
  }
  
  const now = Date.now();
  
  // Update statistics
  capability.stats.usageCount += 1;
  capability.stats.lastUsed = now;
  
  if (success) {
    capability.stats.successCount += 1;
  } else {
    capability.stats.failureCount += 1;
  }
  
  // Add feedback score if provided
  if (feedbackScore !== undefined) {
    capability.stats.feedbackScores.push(feedbackScore);
  }
  
  // Recalculate derived stats
  capability.stats.successRate = capability.stats.usageCount > 0
    ? capability.stats.successCount / capability.stats.usageCount
    : 0;
    
  capability.stats.averageFeedback = capability.stats.feedbackScores.length > 0
    ? capability.stats.feedbackScores.reduce((sum, score) => sum + score, 0) / capability.stats.feedbackScores.length
    : 0;
  
  // Update mastery level based on usage and success
  const usageBonus = Math.min(0.1, capability.stats.usageCount / 100);
  const successBonus = capability.stats.successRate * 0.1;
  const feedbackBonus = capability.stats.averageFeedback * 0.1;
  
  capability.masteryLevel = Math.min(
    1.0,
    capability.masteryLevel + usageBonus + successBonus + feedbackBonus
  );
  
  // Add evolution points based on usage
  capability.evolutionPoints += 1;
  
  // Update the capability in storage
  capability.stats.updatedAt = now;
  capabilities[id] = capability;
  saveCapabilities(capabilities);
}

// Register a new capability
export function registerCapability(capability: Omit<CapabilityData, 'stats'>): CapabilityData {
  const capabilities = getCapabilities();
  
  // Check if the capability already exists
  if (capabilities[capability.id]) {
    throw new Error(`Capability ${capability.id} already exists`);
  }
  
  const now = Date.now();
  
  // Create a new capability with default stats
  const newCapability: CapabilityData = {
    ...capability,
    stats: {
      usageCount: 0,
      successCount: 0,
      failureCount: 0,
      lastUsed: now,
      feedbackScores: [],
      averageFeedback: 0,
      successRate: 0,
      createdAt: now,
      updatedAt: now
    }
  };
  
  // Save the new capability
  capabilities[capability.id] = newCapability;
  saveCapabilities(capabilities);
  
  return newCapability;
}

// Evolve a capability by spending evolution points
export function evolveCapability(id: string): CapabilityData | null {
  const capabilities = getCapabilities();
  const capability = capabilities[id];
  
  if (!capability) {
    console.warn(`Capability ${id} not found`);
    return null;
  }
  
  // Check if we have enough evolution points
  if (capability.evolutionPoints < 10) {
    console.warn(`Not enough evolution points for ${id}`);
    return capability;
  }
  
  // Spend points to increase mastery and version
  capability.evolutionPoints -= 10;
  capability.masteryLevel = Math.min(1.0, capability.masteryLevel + 0.1);
  capability.version += 0.1;
  
  // Update the capability in storage
  capability.stats.updatedAt = Date.now();
  capabilities[id] = capability;
  saveCapabilities(capabilities);
  
  return capability;
}

// Get suggested capabilities based on a query
export function getSuggestedCapabilities(
  query: string, 
  count: number = 3,
  requiredTags: string[] = []
): CapabilityData[] {
  const capabilities = getCapabilities();
  
  // Convert capabilities object to array
  const capabilitiesArray = Object.values(capabilities);
  
  // Filter by required tags if provided
  const tagFiltered = requiredTags.length > 0
    ? capabilitiesArray.filter(cap => 
        requiredTags.every(tag => cap.tags.includes(tag))
      )
    : capabilitiesArray;
  
  // Simple keyword matching for now
  const keywords = query.toLowerCase().split(/\s+/);
  
  // Score each capability based on keyword matches and mastery level
  const scored = tagFiltered.map(capability => {
    const nameMatches = keywords.filter(kw => 
      capability.name.toLowerCase().includes(kw)
    ).length;
    
    const descMatches = keywords.filter(kw => 
      capability.description.toLowerCase().includes(kw)
    ).length;
    
    const tagMatches = keywords.filter(kw => 
      capability.tags.some(tag => tag.toLowerCase().includes(kw))
    ).length;
    
    // Calculate overall score
    const matchScore = (nameMatches * 3 + descMatches * 2 + tagMatches) / keywords.length;
    const masteryScore = capability.masteryLevel;
    const importanceScore = capability.importance;
    
    const totalScore = (matchScore * 0.5) + (masteryScore * 0.3) + (importanceScore * 0.2);
    
    return {
      capability,
      score: totalScore
    };
  });
  
  // Sort by score and return top 'count' capabilities
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map(item => item.capability);
}

// Export types that will be used elsewhere
export type { CapabilityData, CapabilityStats };

// Add storage helpers
function getLocalStorage<T>(key: string): T | null {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (e) {
    console.error(`Error retrieving ${key} from localStorage:`, e);
    return null;
  }
}

function setLocalStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error setting ${key} in localStorage:`, e);
  }
}