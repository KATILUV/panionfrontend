/**
 * useManus Hook
 * React hooks for accessing Manus-like capabilities
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

// Interface for insight objects
export interface Insight {
  id: string;
  type: 'opportunity' | 'data_pattern' | 'clarification_needed' | 'potential_error' | 'suggestion' | 'information';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  description: string;
  suggestedAction?: string;
  relatedMessages?: string[];
  timestamp: number;
  sessionId: string;
  confidence: number;
  isAcknowledged: boolean;
}

// Types for reasoning paths
export interface ReasoningPath {
  id: string;
  approach: string;
  reasoning: string;
  confidence: number;
  pros: string[];
  cons: string[];
  estimatedEffort: number; // 1-10 scale
  estimatedSuccess: number; // 0-1 probability
}

// Types for tasks and subtasks
export interface Subtask {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  dependencies: string[];
  estimatedComplexity: number;
  priority: number;
  notes?: string;
}

export interface ComplexTask {
  id: string;
  description: string;
  goal: string;
  subtasks: Subtask[];
  sessionId: string;
  createdAt: number;
  updatedAt: number;
  status: 'planning' | 'in_progress' | 'completed' | 'cancelled';
}

// Hook for accessing Manus insights
export function useInsights(sessionId: string) {
  const queryClient = useQueryClient();
  
  // Get insights
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/manus/insights', sessionId],
    queryFn: () => 
      fetch(`/api/manus/insights/${sessionId}`)
        .then(res => res.json())
        .then(data => data.insights || []),
    // Only refresh every minute to avoid excessive calls
    refetchInterval: 60000,
  });
  
  // Generate insights
  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/manus/insights', { sessionId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/manus/insights', sessionId] });
    }
  });
  
  // Acknowledge an insight
  const acknowledgeMutation = useMutation({
    mutationFn: async (insightId: string) => {
      const res = await apiRequest('POST', `/api/manus/insights/${insightId}/acknowledge`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/manus/insights', sessionId] });
    }
  });
  
  return {
    insights: data || [],
    isLoading,
    error,
    refetch,
    generateInsights: generateMutation.mutate,
    isGenerating: generateMutation.isPending,
    acknowledgeInsight: acknowledgeMutation.mutate,
    isAcknowledging: acknowledgeMutation.isPending
  };
}

// Hook for generating reasoning paths
export function useReasoningPaths() {
  // Generate reasoning paths
  const reasoningMutation = useMutation({
    mutationFn: async ({ 
      problem, 
      sessionId, 
      numPaths = 3 
    }: { 
      problem: string, 
      sessionId: string, 
      numPaths?: number 
    }) => {
      const res = await apiRequest('POST', '/api/manus/reasoning-paths', {
        problem,
        sessionId,
        numPaths
      });
      return res.json();
    }
  });
  
  return {
    generateReasoningPaths: reasoningMutation.mutate,
    isGenerating: reasoningMutation.isPending,
    reasoningPaths: reasoningMutation.data?.paths || [],
    error: reasoningMutation.error
  };
}

// Hook for task decomposition
export function useTaskDecomposition() {
  const queryClient = useQueryClient();
  
  // Decompose a task
  const decomposeMutation = useMutation({
    mutationFn: async ({ 
      taskDescription, 
      sessionId 
    }: { 
      taskDescription: string, 
      sessionId: string 
    }) => {
      const res = await apiRequest('POST', '/api/manus/decompose-task', {
        taskDescription,
        sessionId
      });
      return res.json();
    }
  });
  
  // Get a task by ID
  const useTask = (taskId: string | null) => {
    return useQuery({
      queryKey: ['/api/manus/tasks', taskId],
      queryFn: async () => {
        if (!taskId) return null;
        const res = await fetch(`/api/manus/tasks/${taskId}`);
        const data = await res.json();
        return data.task;
      },
      enabled: !!taskId,
    });
  };
  
  // Update subtask status
  const updateSubtaskMutation = useMutation({
    mutationFn: async ({ 
      taskId, 
      subtaskId, 
      status 
    }: { 
      taskId: string, 
      subtaskId: string, 
      status: 'pending' | 'in_progress' | 'completed' | 'blocked' 
    }) => {
      const res = await apiRequest('PATCH', `/api/manus/tasks/${taskId}/subtasks/${subtaskId}`, {
        status
      });
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/manus/tasks', variables.taskId] });
    }
  });
  
  return {
    decomposeTask: decomposeMutation.mutate,
    isDecomposing: decomposeMutation.isPending,
    decomposedTask: decomposeMutation.data?.task,
    decompositionError: decomposeMutation.error,
    useTask,
    updateSubtaskStatus: updateSubtaskMutation.mutate,
    isUpdatingSubtask: updateSubtaskMutation.isPending
  };
}

// Hook for verification
export function useVerification() {
  // Verify a result
  const verifyMutation = useMutation({
    mutationFn: async ({ 
      result, 
      originalQuery, 
      sessionId 
    }: { 
      result: string, 
      originalQuery: string, 
      sessionId: string 
    }) => {
      const res = await apiRequest('POST', '/api/manus/verify', {
        result,
        originalQuery,
        sessionId
      });
      return res.json();
    }
  });
  
  return {
    verifyResult: verifyMutation.mutate,
    isVerifying: verifyMutation.isPending,
    verification: verifyMutation.data?.verification,
    verificationError: verifyMutation.error
  };
}

// Hook for queueing background tasks
export function useBackgroundTasks() {
  // Queue a task
  const queueMutation = useMutation({
    mutationFn: async ({ 
      type, 
      sessionId, 
      priority = 5, 
      data 
    }: { 
      type: 'generate_insights' | 'analyze_conversation' | 'strategic_planning', 
      sessionId: string, 
      priority?: number, 
      data?: any 
    }) => {
      const res = await apiRequest('POST', '/api/manus/queue', {
        type,
        sessionId,
        priority,
        data
      });
      return res.json();
    }
  });
  
  return {
    queueTask: queueMutation.mutate,
    isQueueing: queueMutation.isPending,
    queuedTaskId: queueMutation.data?.taskId,
    queueError: queueMutation.error
  };
}

// Export all hooks
export default {
  useInsights,
  useReasoningPaths,
  useTaskDecomposition,
  useVerification,
  useBackgroundTasks
};