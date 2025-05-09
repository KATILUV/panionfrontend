/**
 * Debate Hook
 * 
 * Provides functionality to use the enhanced multi-agent debate system
 * while maintaining the original UI experience.
 */

import { useState } from 'react';
import { getQuickDebate, extractResponseFromDebate } from '@/services/debateService';
import { isComplexQuestion } from '@/utils/questionComplexityAnalyzer';

interface UseDebateResult {
  checkAndProcessWithDebate: (query: string, context?: string) => Promise<{
    shouldUseDebate: boolean;
    content?: string;
    thinking?: string;
  }>;
  isProcessing: boolean;
}

/**
 * Hook to manage integration with the debate system
 */
export function useDebate(): UseDebateResult {
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * Check if a query is complex enough for debate system and process if needed
   */
  const checkAndProcessWithDebate = async (query: string, context = ""): Promise<{
    shouldUseDebate: boolean;
    content?: string;
    thinking?: string;
  }> => {
    // Don't use debate system for simple questions
    if (!isComplexQuestion(query)) {
      return { shouldUseDebate: false };
    }

    setIsProcessing(true);
    
    try {
      // Use the debate system for complex questions
      const debateResult = await getQuickDebate(query, context);
      
      // Format the response
      const content = extractResponseFromDebate(debateResult);
      
      // Create thinking content showing the debate process
      const thinking = "Enhanced response using multi-agent debate system:\n\n" +
        `Confidence: ${Math.round(debateResult.confidence * 100)}%\n\n` +
        "Key insights from specialized agents:\n" +
        (debateResult.insights && debateResult.insights.length > 0
          ? debateResult.insights.map((insight, index) => `${index + 1}. ${insight}`).join("\n")
          : "No specific insights provided");
      
      return {
        shouldUseDebate: true,
        content,
        thinking
      };
    } catch (error) {
      console.error("Error using debate system:", error);
      // Return false to let the caller fall back to standard processing
      return { shouldUseDebate: false };
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    checkAndProcessWithDebate,
    isProcessing
  };
}