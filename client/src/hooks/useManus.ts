/**
 * Manus Intelligence Hooks
 * Custom React hooks for interacting with Manus-like capabilities
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

// Types
export interface Insight {
  id: string;
  sessionId: string;
  title: string;
  description: string;
  importance: number;  // 1-10 scale
  timestamp: number;
  source: 'pattern' | 'reflection' | 'proactive';
  category: string;
  relatedInsights?: string[];
}

export interface ReasoningPath {
  id: string;
  approach: string;
  reasoning: string;
  pros: string[];
  cons: string[];
  estimatedEffort: number;  // 1-10 scale
  estimatedSuccess: number; // 0-1 probability
}

export interface Subtask {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  estimatedComplexity: number; // 1-10 scale
  priority: number; // 1-10 scale
  dependencies: string[];
  notes?: string;
}

export interface ComplexTask {
  id: string;
  goal: string;
  description: string;
  subtasks: Subtask[];
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  created: number;
  updated: number;
}

export interface Verification {
  isValid: boolean;
  confidence: number; // 0-1
  reasoning: string;
  correctedResult?: string;
}

// Hook for insights
export function useInsights(sessionId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch insights
  const { data, isLoading, error } = useQuery<{ insights: Insight[] }>({
    queryKey: ['/api/manus/insights', sessionId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/manus/insights/${sessionId}`);
      return res.json();
    },
    refetchInterval: 30000, // Poll every 30 seconds for new insights
  });
  
  // Generate insights
  const { mutate: generateInsights, isPending: isGenerating } = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/manus/insights/${sessionId}/generate`);
      return res.json();
    },
    onSuccess: (newData) => {
      // Update cache with new insights
      queryClient.setQueryData(['/api/manus/insights', sessionId], (oldData: any) => {
        if (!oldData) return newData;
        return {
          ...oldData,
          insights: [...oldData.insights, ...newData.insights],
        };
      });
      
      // Show toast if insights were generated
      if (newData.insights && newData.insights.length > 0) {
        toast({
          title: "New insights available",
          description: `${newData.insights.length} new insights have been generated.`,
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Failed to generate insights",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    },
  });
  
  // Automatically generate insights when hook is first used
  useEffect(() => {
    if (!isLoading && !error && (!data || data.insights.length === 0)) {
      generateInsights();
    }
  }, [isLoading, error, data, generateInsights]);
  
  return {
    insights: data?.insights || [],
    isLoading,
    error,
    generateInsights,
    isGenerating,
  };
}

// Hook for reasoning paths
export function useReasoningPaths() {
  const { toast } = useToast();
  const [reasoningPaths, setReasoningPaths] = useState<ReasoningPath[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const generateReasoningPaths = async ({
    problem,
    sessionId,
    numPaths = 3,
  }: {
    problem: string;
    sessionId: string;
    numPaths?: number;
  }) => {
    if (!problem) {
      setReasoningPaths([]);
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    
    try {
      const res = await apiRequest('POST', '/api/manus/reasoning-paths', {
        problem,
        sessionId,
        numPaths,
      });
      
      const data = await res.json();
      setReasoningPaths(data.paths || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to generate reasoning paths'));
      toast({
        title: "Failed to generate reasoning paths",
        description: err instanceof Error ? err.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  return {
    reasoningPaths,
    isGenerating,
    error,
    generateReasoningPaths,
  };
}

// Hook for task decomposition
export function useTaskDecomposition() {
  const { toast } = useToast();
  const [decomposedTask, setDecomposedTask] = useState<ComplexTask | null>(null);
  const [isDecomposing, setIsDecomposing] = useState(false);
  const [isUpdatingSubtask, setIsUpdatingSubtask] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const decomposeTask = async ({
    taskDescription,
    sessionId,
  }: {
    taskDescription: string;
    sessionId: string;
  }) => {
    if (!taskDescription) {
      setDecomposedTask(null);
      return;
    }
    
    setIsDecomposing(true);
    setError(null);
    
    try {
      const res = await apiRequest('POST', '/api/manus/decompose-task', {
        taskDescription,
        sessionId,
      });
      
      const data = await res.json();
      setDecomposedTask(data.task || null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to decompose task'));
      toast({
        title: "Failed to decompose task",
        description: err instanceof Error ? err.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsDecomposing(false);
    }
  };
  
  const updateSubtaskStatus = async ({
    taskId,
    subtaskId,
    status,
  }: {
    taskId: string;
    subtaskId: string;
    status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  }) => {
    if (!taskId || !subtaskId) return;
    
    setIsUpdatingSubtask(true);
    
    try {
      const res = await apiRequest('POST', '/api/manus/update-subtask', {
        taskId,
        subtaskId,
        status,
      });
      
      const data = await res.json();
      if (data.success && data.task) {
        setDecomposedTask(data.task);
      }
    } catch (err) {
      toast({
        title: "Failed to update subtask",
        description: err instanceof Error ? err.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingSubtask(false);
    }
  };
  
  return {
    decomposedTask,
    isDecomposing,
    isUpdatingSubtask,
    error,
    decomposeTask,
    updateSubtaskStatus,
  };
}

// Hook for verification
export function useVerification() {
  const { toast } = useToast();
  const [verification, setVerification] = useState<Verification | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<Error | null>(null);
  
  const verifyResult = async ({
    originalQuery,
    result,
    sessionId,
  }: {
    originalQuery: string;
    result: string;
    sessionId: string;
  }) => {
    if (!originalQuery || !result) {
      setVerification(null);
      return;
    }
    
    setIsVerifying(true);
    setVerificationError(null);
    
    try {
      const res = await apiRequest('POST', '/api/manus/verify', {
        originalQuery,
        result,
        sessionId,
      });
      
      const data = await res.json();
      setVerification(data.verification || null);
    } catch (err) {
      setVerificationError(err instanceof Error ? err : new Error('Failed to verify result'));
      toast({
        title: "Failed to verify result",
        description: err instanceof Error ? err.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };
  
  return {
    verification,
    isVerifying,
    verificationError,
    verifyResult,
  };
}

export default {
  useInsights,
  useReasoningPaths,
  useTaskDecomposition,
  useVerification,
};