/**
 * Intelligence Hook
 * 
 * This hook provides access to the system's intelligence features
 * including capability evolution and internal debate.
 */

import { useState, useCallback } from 'react';
import { initializeCapabilities, recordCapabilityUsage, getCapability } from '@/lib/capabilityEvolution';
import { getInternalDeliberation } from '@/lib/internalDebate';
import { processStrategicQuery, getOperationStatus, StrategicResponse } from '@/services/strategicService';

// Initialize capabilities on first import
initializeCapabilities();

interface UseIntelligenceOptions {
  autoDebate?: boolean;
  trackCapabilities?: boolean;
  debugMode?: boolean;
}

interface ProcessOptions {
  useDebate?: boolean;
  capabilities?: string[];
  context?: string;
}

interface UseIntelligenceReturn {
  isProcessing: boolean;
  progress: number;
  result: StrategicResponse | null;
  error: string | null;
  processQuery: (query: string, options?: ProcessOptions) => Promise<StrategicResponse>;
  runInternalDebate: (query: string, context?: string) => Promise<{
    result: string;
    confidence: number;
    perspectives: { role: string; content: string }[];
  }>;
  recordCapabilityUse: (capabilityId: string, success?: boolean, feedbackScore?: number) => void;
  getCapabilityDetails: (capabilityId: string) => any;
}

/**
 * Hook to access the system's intelligence features
 */
export function useIntelligence(options: UseIntelligenceOptions = {}): UseIntelligenceReturn {
  const { autoDebate = true, trackCapabilities = true, debugMode = false } = options;
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<StrategicResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [operationId, setOperationId] = useState<string | null>(null);
  
  /**
   * Process a query using the system's strategic intelligence
   */
  const processQuery = useCallback(async (
    query: string, 
    options: ProcessOptions = {}
  ): Promise<StrategicResponse> => {
    const { useDebate = autoDebate, capabilities = [], context = '' } = options;
    
    setIsProcessing(true);
    setProgress(0);
    setError(null);
    
    try {
      // Start strategic processing
      const { operationId } = await processStrategicQuery({
        query,
        context,
        requiredCapabilities: capabilities,
        useDebate,
      });
      
      setOperationId(operationId);
      setProgress(10);
      
      // Poll for results
      return await pollForResults(operationId);
    } catch (err: any) {
      setError(err.message || 'Failed to process query');
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [autoDebate]);
  
  /**
   * Poll for strategic operation results
   */
  const pollForResults = useCallback(async (opId: string): Promise<StrategicResponse> => {
    return new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        try {
          const status = getOperationStatus(opId);
          
          setProgress(status.progress);
          
          if (status.status === 'completed' && status.result) {
            clearInterval(interval);
            setResult(status.result);
            resolve(status.result);
          } else if (status.status === 'failed') {
            clearInterval(interval);
            const errorMsg = status.error || 'Operation failed without a specific error';
            setError(errorMsg);
            reject(new Error(errorMsg));
          }
        } catch (err) {
          clearInterval(interval);
          setError('Failed to poll operation status');
          reject(err);
        }
      }, 500);
    });
  }, []);
  
  /**
   * Run an internal debate on a query
   */
  const runInternalDebate = useCallback(async (
    query: string, 
    context?: string
  ): Promise<{
    result: string;
    confidence: number;
    perspectives: { role: string; content: string }[];
  }> => {
    setIsProcessing(true);
    
    try {
      const result = await getInternalDeliberation(query, context);
      
      // Log internal debate use for debugging
      if (debugMode) {
        console.log('Internal debate result:', result);
      }
      
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to run internal debate');
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [debugMode]);
  
  /**
   * Record capability usage for learning
   */
  const recordCapabilityUse = useCallback((
    capabilityId: string, 
    success: boolean = true, 
    feedbackScore?: number
  ): void => {
    if (!trackCapabilities) return;
    
    try {
      recordCapabilityUsage(capabilityId, success, feedbackScore);
      
      if (debugMode) {
        console.log(`Recorded capability use: ${capabilityId}, success: ${success}`);
      }
    } catch (err) {
      console.error('Failed to record capability usage:', err);
    }
  }, [trackCapabilities, debugMode]);
  
  /**
   * Get details about a specific capability
   */
  const getCapabilityDetails = useCallback((capabilityId: string): any => {
    return getCapability(capabilityId);
  }, []);
  
  return {
    isProcessing,
    progress,
    result,
    error,
    processQuery,
    runInternalDebate,
    recordCapabilityUse,
    getCapabilityDetails,
  };
}