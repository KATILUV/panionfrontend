/**
 * Strategic Service
 * 
 * This service coordinates strategic approaches to complex queries by leveraging
 * internal debate, capability evolution, and external API calls.
 */

import { getInternalDeliberation } from '@/lib/internalDebate';
import { loadCapabilities, recordCapabilityUsage } from '@/lib/capabilityEvolution';
import { nanoid } from '@/lib/utils';

// Request types
export interface StrategicRequest {
  query: string;
  context?: string;
  requiredCapabilities?: string[];
  useDebate?: boolean;
  maxTokens?: number;
  similarityThreshold?: number;
}

// Response types
export interface StrategicResponse {
  result: string;
  reasoning?: string;
  confidence: number;
  usedCapabilities?: string[];
  debateId?: string;
  executionTime?: number;
  operationId: string;
}

// Tracks ongoing operations
const operations: Record<string, {
  status: 'pending' | 'completed' | 'failed';
  progress: number;
  result?: StrategicResponse;
  error?: string;
  startTime: number;
}> = {};

/**
 * Process a query using strategic reasoning
 */
export async function processStrategicQuery(
  request: StrategicRequest
): Promise<{ operationId: string }> {
  const operationId = `op_${nanoid()}`;
  
  // Initialize operation tracking
  operations[operationId] = {
    status: 'pending',
    progress: 0,
    startTime: Date.now()
  };
  
  // Start processing in the background
  executeStrategicQuery(request, operationId).catch(error => {
    console.error('Error in strategic query execution:', error);
    operations[operationId] = {
      ...operations[operationId],
      status: 'failed',
      error: error.message || 'Unknown error during execution',
      progress: 100
    };
  });
  
  // Return operation ID immediately for status polling
  return { operationId };
}

/**
 * Execute the strategic query process
 */
async function executeStrategicQuery(
  request: StrategicRequest,
  operationId: string
): Promise<void> {
  const { query, context = '', useDebate = true, requiredCapabilities = [] } = request;
  const startTime = Date.now();
  
  try {
    // Update progress
    operations[operationId].progress = 10;
    
    // Step 1: Identify required capabilities if not provided
    const capabilities = loadCapabilities();
    let effectiveCapabilities = [...requiredCapabilities];
    
    if (effectiveCapabilities.length === 0) {
      // This would normally call an API to detect required capabilities
      // For now we'll just use a simplified approach
      const potentialCapabilities = Object.values(capabilities)
        .filter(c => query.toLowerCase().includes(c.name.toLowerCase()));
      
      effectiveCapabilities = potentialCapabilities.map(c => c.id);
    }
    
    // Update progress
    operations[operationId].progress = 30;
    
    // Step 2: Run internal debate if enabled
    let deliberationResult;
    if (useDebate) {
      deliberationResult = await getInternalDeliberation(query, context);
      
      // Update progress
      operations[operationId].progress = 60;
    }
    
    // Step 3: Process with strategic API call
    const apiResponse = await fetch('/api/panion/strategic', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query,
        context,
        capabilities: effectiveCapabilities,
        debateResult: deliberationResult ? {
          conclusion: deliberationResult.result,
          confidence: deliberationResult.confidence
        } : undefined
      })
    });
    
    if (!apiResponse.ok) {
      throw new Error(`API error: ${apiResponse.statusText}`);
    }
    
    const apiData = await apiResponse.json();
    
    // Update progress
    operations[operationId].progress = 90;
    
    // Step 4: Record capability usage for learning
    effectiveCapabilities.forEach(capabilityId => {
      recordCapabilityUsage(capabilityId, true);
    });
    
    // Create the response
    const response: StrategicResponse = {
      result: apiData.response || deliberationResult?.result || 'No result generated',
      reasoning: apiData.reasoning || 
        (deliberationResult ? `Internal deliberation: ${deliberationResult.perspectives.map(p => p.role + ': ' + p.content).join(' | ')}` : undefined),
      confidence: apiData.confidence || deliberationResult?.confidence || 0.5,
      usedCapabilities: effectiveCapabilities,
      debateId: deliberationResult ? 'internal_debate' : undefined,
      executionTime: Date.now() - startTime,
      operationId
    };
    
    // Update operation status
    operations[operationId] = {
      ...operations[operationId],
      status: 'completed',
      result: response,
      progress: 100
    };
    
  } catch (error: any) {
    // Handle errors
    operations[operationId] = {
      ...operations[operationId],
      status: 'failed',
      error: error.message || 'Unknown error during execution',
      progress: 100
    };
  }
}

/**
 * Get the status of a strategic operation
 */
export function getOperationStatus(operationId: string): {
  status: 'pending' | 'completed' | 'failed';
  progress: number;
  result?: StrategicResponse;
  error?: string;
} {
  const operation = operations[operationId];
  
  if (!operation) {
    return {
      status: 'failed',
      progress: 100,
      error: 'Operation not found'
    };
  }
  
  return {
    status: operation.status,
    progress: operation.progress,
    result: operation.result,
    error: operation.error
  };
}

/**
 * Utility to help generate random IDs
 */
export function generateOperationId(): string {
  return `op_${nanoid()}`;
}