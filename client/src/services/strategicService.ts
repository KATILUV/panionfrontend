/**
 * Strategic Service
 * 
 * This service coordinates strategic approaches to complex queries by leveraging
 * internal debate, capability evolution, and external API calls.
 */

import { v4 as uuidv4 } from 'uuid';
import { getInternalDeliberation, shouldUseMultiPerspective } from '@/lib/internalDebate';
import { getCapabilities, recordCapabilityUsage, getSuggestedCapabilities } from '@/lib/capabilityEvolution';

// Store for in-progress operations
const operations: Record<string, OperationStatus> = {};

// Request interface
export interface StrategicRequest {
  query: string;
  context?: string;
  requiredCapabilities?: string[];
  useDebate?: boolean;
  maxTokens?: number;
  similarityThreshold?: number;
}

// Response interface
export interface StrategicResponse {
  result: string;
  reasoning?: string;
  confidence: number;
  usedCapabilities?: string[];
  debateId?: string;
  executionTime?: number;
  operationId: string;
}

// Operation status interface
export interface OperationStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  startTime: number;
  endTime?: number;
  error?: string;
  result?: StrategicResponse;
}

/**
 * Process a query using strategic reasoning
 */
export async function processStrategicQuery(
  request: StrategicRequest
): Promise<{ operationId: string }> {
  // Generate a unique operation ID
  const operationId = generateOperationId();
  
  // Initialize the operation
  operations[operationId] = {
    id: operationId,
    status: 'pending',
    progress: 0,
    startTime: Date.now(),
  };
  
  // Start the processing in the background
  setTimeout(() => {
    executeStrategicQuery(request, operationId).catch(error => {
      operations[operationId] = {
        ...operations[operationId],
        status: 'failed',
        error: error.message || 'Unknown error',
        endTime: Date.now(),
      };
    });
  }, 0);
  
  // Return the operation ID for status checking
  return { operationId };
}

/**
 * Execute the strategic query process
 */
async function executeStrategicQuery(
  request: StrategicRequest,
  operationId: string
): Promise<void> {
  const { query, context, requiredCapabilities = [], useDebate = true } = request;
  const startTime = Date.now();
  
  try {
    // Update operation status
    operations[operationId] = {
      ...operations[operationId],
      status: 'processing',
      progress: 10,
    };
    
    // Determine if the query should use internal debate
    const shouldDebate = useDebate && shouldUseMultiPerspective(query);
    
    // Get relevant capabilities for this query
    const suggestedCapabilities = getSuggestedCapabilities(query, 5);
    const allCapabilities = [
      ...requiredCapabilities,
      ...suggestedCapabilities.map(c => c.id)
    ];
    const uniqueCapabilities = [...new Set(allCapabilities)];
    
    // Update progress
    operations[operationId] = {
      ...operations[operationId],
      progress: 30,
    };
    
    let result: string;
    let confidence: number;
    let reasoning: string | undefined;
    let perspectives: { role: string; content: string }[] | undefined;
    
    // Use internal debate if appropriate
    if (shouldDebate) {
      const debateResult = await getInternalDeliberation(query, context);
      result = debateResult.result;
      confidence = debateResult.confidence;
      perspectives = debateResult.perspectives;
      
      // Record capability usage for internal debate
      recordCapabilityUsage('internal-debate', true);
    } else {
      // Simple response generation for now
      // In a real implementation, we would call an appropriate API based on capabilities
      result = `Strategic response to "${query}": This approach considers the key factors and provides a balanced solution.`;
      confidence = 0.75;
    }
    
    // Record capability usage for all used capabilities
    uniqueCapabilities.forEach(capabilityId => {
      recordCapabilityUsage(capabilityId, true);
    });
    
    // Update progress
    operations[operationId] = {
      ...operations[operationId],
      progress: 90,
    };
    
    // Prepare response
    const response: StrategicResponse = {
      result,
      confidence,
      usedCapabilities: uniqueCapabilities,
      reasoning,
      debateId: perspectives ? uuidv4() : undefined,
      executionTime: Date.now() - startTime,
      operationId,
    };
    
    // Mark operation as completed
    operations[operationId] = {
      ...operations[operationId],
      status: 'completed',
      progress: 100,
      result: response,
      endTime: Date.now(),
    };
  } catch (error: any) {
    // Handle errors
    operations[operationId] = {
      ...operations[operationId],
      status: 'failed',
      error: error.message || 'Unknown error',
      endTime: Date.now(),
    };
    
    throw error;
  }
}

/**
 * Get the status of a strategic operation
 */
export function getOperationStatus(operationId: string): {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
  result?: StrategicResponse;
} {
  const operation = operations[operationId];
  
  if (!operation) {
    throw new Error(`Operation ${operationId} not found`);
  }
  
  return {
    status: operation.status,
    progress: operation.progress,
    error: operation.error,
    result: operation.result,
  };
}

/**
 * Utility to help generate random IDs
 */
export function generateOperationId(): string {
  return `op-${uuidv4()}`;
}