/**
 * Debate Service
 * 
 * Provides access to the enhanced multi-agent debate system in the backend
 * without changing the UI appearance.
 */

import { apiRequest } from "@/lib/queryClient";

// Types for the debate system
export interface DebatePerspective {
  agent: {
    name: string;
    expertise: string;
    confidence: number;
  };
  response: string;
}

export interface DebateRound {
  id: string;
  round_number: number;
  perspectives: DebatePerspective[];
  summary: string;
}

export interface DebateConclusion {
  finalAnswer: string;
  reasoning: string;
  confidenceScore: number;
  key_insights: string[];
  dissenting_viewpoints: string[];
}

export interface DebateResult {
  query: string;
  rounds: DebateRound[];
  conclusion: DebateConclusion;
  agents_used: Array<{
    name: string;
    expertise: string;
    confidence: number;
  }>;
  debate_id: string;
}

export interface QuickDebateResult {
  answer: string;
  confidence: number;
  insights: string[];
}

/**
 * Get a quick debate result without showing the detailed process to the user
 * Used for providing smarter responses without changing UI appearance
 */
export async function getQuickDebate(
  query: string,
  context: string = ""
): Promise<QuickDebateResult> {
  try {
    const response = await apiRequest("POST", "/api/debate/quick", {
      query,
      context
    });
    
    return await response.json();
  } catch (error) {
    console.error("Error in debate service:", error);
    return {
      answer: "I couldn't process your request due to a technical error.",
      confidence: 0.3,
      insights: ["The debate system encountered an error."]
    };
  }
}

/**
 * Get a full debate result with multiple perspectives and rounds
 * Can be used when we want to show detailed analysis to users who request it
 */
export async function getFullDebate(
  query: string,
  context: string = "",
  num_rounds: number = 2,
  agents: string[] = []
): Promise<DebateResult> {
  try {
    const response = await apiRequest("POST", "/api/debate", {
      query,
      context,
      num_rounds,
      agents
    });
    
    return await response.json().result;
  } catch (error) {
    console.error("Error in debate service:", error);
    throw new Error("Failed to conduct debate");
  }
}

/**
 * Extract a simplified response from a debate result
 * For use in the standard chat interface
 */
export function extractResponseFromDebate(debateResult: QuickDebateResult): string {
  // Format insights as bullet points if there are any
  const insightsBullets = debateResult.insights && debateResult.insights.length > 0
    ? "\n\nKey insights:\n" + debateResult.insights.map(i => `• ${i}`).join("\n")
    : "";
    
  return debateResult.answer + insightsBullets;
}