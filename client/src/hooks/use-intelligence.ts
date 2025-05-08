/**
 * Intelligence Hook
 * 
 * Provides a unified interface for all intelligence features including:
 * - Strategic processing
 * - Automatic complexity assessment
 * - Multi-perspective analysis (internal debate)
 * - Resource optimization
 */

import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { processStrategicQuery } from '@/services/strategicService';
import { getInternalDeliberation } from '@/lib/internalDebate';
import { assessResourceRequirements, findOptimalResource } from '@/lib/resourceOptimizer';
import { useAgentStore } from '@/state/agentStore';

export interface UseIntelligenceOptions {
  defaultStrategicThreshold?: number;
  enableAutomaticResourceOptimization?: boolean;
  enableInternalDebate?: boolean;
}

export interface UseIntelligenceReturn {
  isProcessing: boolean;
  complexity: number;
  setComplexity: (value: number) => void;
  strategicThreshold: number;
  setStrategicThreshold: (value: number) => void;
  isStrategicMode: boolean;
  toggleStrategicMode: (override?: boolean) => void;
  assessComplexity: (query: string) => Promise<number>;
  generateResponse: (query: string, options?: QueryOptions) => Promise<string>;
  thinking: string;
  resourcesActivated: string[];
}

export interface QueryOptions {
  forceStrategic?: boolean;
  maxTokens?: number;
  debugMode?: boolean;
  requiredCapabilities?: string[];
  context?: string;
}

export function useIntelligence(options: UseIntelligenceOptions = {}): UseIntelligenceReturn {
  const {
    defaultStrategicThreshold = 70,
    enableAutomaticResourceOptimization = true,
    enableInternalDebate = true
  } = options;
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [complexity, setComplexity] = useState(0);
  const [strategicThreshold, setStrategicThreshold] = useState(defaultStrategicThreshold);
  const [isStrategicMode, setIsStrategicMode] = useState(false);
  const [thinking, setThinking] = useState('');
  const [resourcesActivated, setResourcesActivated] = useState<string[]>([]);
  
  const agentStore = useAgentStore();
  
  // Toggle strategic mode on/off
  const toggleStrategicMode = useCallback((override?: boolean) => {
    if (typeof override === 'boolean') {
      setIsStrategicMode(override);
    } else {
      setIsStrategicMode(prev => !prev);
    }
  }, []);
  
  // Assess the complexity of a query
  const assessComplexity = useCallback(async (query: string): Promise<number> => {
    // This is a simplified complexity assessment
    // In production, this would use an LLM or API to assess
    
    const complexityIndicators = [
      { term: 'analyze', weight: 5 },
      { term: 'compare', weight: 5 },
      { term: 'explain', weight: 3 },
      { term: 'why', weight: 3 },
      { term: 'how', weight: 2 },
      { term: 'what', weight: 1 },
      { term: 'complex', weight: 8 },
      { term: 'difficult', weight: 7 },
      { term: 'synthesize', weight: 8 },
      { term: 'multiple', weight: 4 },
      { term: 'research', weight: 6 },
      { term: 'investigate', weight: 6 },
      { term: 'comprehensive', weight: 7 },
      { term: 'detail', weight: 3 },
      { term: 'thorough', weight: 5 }
    ];
    
    // Calculate base complexity from indicators
    let complexityScore = 0;
    let termCount = 0;
    
    complexityIndicators.forEach(indicator => {
      if (query.toLowerCase().includes(indicator.term)) {
        complexityScore += indicator.weight;
        termCount++;
      }
    });
    
    // Add length-based complexity (longer queries tend to be more complex)
    const lengthFactor = Math.min(30, Math.floor(query.length / 20));
    complexityScore += lengthFactor;
    
    // Normalize to 0-100 scale
    const normalizedScore = Math.min(100, Math.round((complexityScore / (50 + lengthFactor)) * 100));
    
    // Update state
    setComplexity(normalizedScore);
    return normalizedScore;
  }, []);
  
  // Generate a response to a query
  const generateResponse = useCallback(async (
    query: string, 
    options: QueryOptions = {}
  ): Promise<string> => {
    const {
      forceStrategic = false,
      maxTokens = 2000,
      debugMode = false,
      requiredCapabilities = [],
      context = ''
    } = options;
    
    setIsProcessing(true);
    setThinking('Analyzing your query...');
    
    try {
      // First, assess query complexity
      const queryComplexity = await assessComplexity(query);
      setThinking(prev => `${prev}\n\nQuery complexity: ${queryComplexity}/100`);
      
      // Determine if strategic mode should be used
      const useStrategic = forceStrategic || 
        isStrategicMode || 
        queryComplexity >= strategicThreshold;
      
      // Automatically activate resource optimization if enabled and query is complex
      let activatedResources: string[] = [];
      if (enableAutomaticResourceOptimization && queryComplexity >= 65) {
        setThinking(prev => `${prev}\n\nAssessing resource requirements...`);
        
        const requirements = assessResourceRequirements(query);
        if (requirements) {
          setThinking(prev => `${prev}\n- Detected need for specialized resources`);
          
          const resourceSolution = await findOptimalResource(requirements);
          setThinking(prev => `${prev}\n- ${resourceSolution.type === 'existing' 
            ? 'Using existing resource' 
            : resourceSolution.type === 'improved' 
              ? 'Improved existing resource' 
              : 'Created new resource'}: ${resourceSolution.name}`);
          
          activatedResources = [resourceSolution.resourceId];
          setResourcesActivated(activatedResources);
          
          if (resourceSolution.improvementsMade) {
            setThinking(prev => `${prev}\n- Improvements: ${resourceSolution.improvementsMade.join(', ')}`);
          }
        }
      }
      
      if (useStrategic) {
        setThinking(prev => `${prev}\n\nUsing strategic mode for this complex query.`);
        
        if (enableInternalDebate) {
          setThinking(prev => `${prev}\n\nInitiating internal debate to analyze multiple perspectives...`);
          
          // Get multiple perspectives through internal debate
          const deliberation = await getInternalDeliberation(query, requiredCapabilities);
          
          setThinking(prev => `${prev}\n\nPerspectives:\n${deliberation.perspectives.map(p => 
            `- ${p.role}: ${p.viewpoint}`).join('\n')}`);
          
          setThinking(prev => `${prev}\n\nDeveloping comprehensive response...`);
        }
        
        // Process the query strategically
        const strategicResponse = await processStrategicQuery({
          query,
          context,
          requiredCapabilities: [...requiredCapabilities, ...activatedResources],
          useDebate: enableInternalDebate,
          maxTokens
        });
        
        if (debugMode) {
          setThinking(prev => `${prev}\n\nConfidence: ${strategicResponse.confidence * 100}%`);
          if (strategicResponse.reasoning) {
            setThinking(prev => `${prev}\n\nReasoning: ${strategicResponse.reasoning}`);
          }
        }
        
        return strategicResponse.result;
      } else {
        // For simpler queries or when strategic mode is off, use a simpler process
        setThinking(prev => `${prev}\n\nUsing standard processing for this query.`);
        
        // Simulating a delay and basic response
        // In production, this would call a real LLM API
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Simulate a basic response generator
        const response = `Here's a response to your query: "${query}"\n\nThis would normally be generated by calling an LLM API in production.`;
        
        return response;
      }
    } catch (error) {
      console.error('Error generating response:', error);
      return 'I encountered an error while processing your request. Please try again.';
    } finally {
      setIsProcessing(false);
    }
  }, [
    assessComplexity, 
    isStrategicMode, 
    strategicThreshold, 
    enableAutomaticResourceOptimization,
    enableInternalDebate
  ]);
  
  return {
    isProcessing,
    complexity,
    setComplexity,
    strategicThreshold,
    setStrategicThreshold,
    isStrategicMode,
    toggleStrategicMode,
    assessComplexity,
    generateResponse,
    thinking,
    resourcesActivated
  };
}