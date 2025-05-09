/**
 * Debate Service
 * Provides frontend access to the enhanced multi-agent debate system.
 */

// Interface for debate results
export interface DebateResult {
  answer: string;
  confidence: number;
  thinking?: string;
  insights?: string[];
  domain_experts?: {
    name: string;
    expertise: string;
    contribution: string;
  }[];
  debate_points?: {
    topic: string;
    perspectives: {
      viewpoint: string;
      arguments: string[];
    }[];
  }[];
}

/**
 * Get a detailed analysis using the multi-agent debate system
 * @param query User's query to analyze
 * @param context Additional context to provide to the debate system
 * @returns The debate result with detailed analysis
 */
export async function getDebate(
  query: string, 
  context: string = ""
): Promise<DebateResult> {
  const response = await fetch('/api/debate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      query,
      context,
      options: {
        detailed: true,
        max_experts: 5,
        use_domain_detection: true,
        include_insights: true
      }
    }),
  });

  if (!response.ok) {
    throw new Error(`Debate request failed: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Get a faster, less detailed analysis using the multi-agent debate system
 * @param query User's query to analyze
 * @param context Additional context to provide to the debate system
 * @returns Simplified debate result focused on quick response
 */
export async function getQuickDebate(
  query: string, 
  context: string = ""
): Promise<DebateResult> {
  const response = await fetch('/api/debate/quick', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      query,
      context,
      options: {
        detailed: false,
        max_experts: 3,
        use_domain_detection: true,
        include_insights: true
      }
    }),
  });

  if (!response.ok) {
    throw new Error(`Quick debate request failed: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Extract a formatted response from a debate result
 * @param result The debate result to format
 * @returns Formatted response string
 */
export function extractResponseFromDebate(result: DebateResult): string {
  // If there's a direct answer, use it
  if (result.answer) {
    return result.answer;
  }
  
  // Otherwise build a response from debate points
  let response = "";
  
  if (result.debate_points && result.debate_points.length > 0) {
    response = "Based on the analysis from multiple perspectives:\n\n";
    
    result.debate_points.forEach(point => {
      response += `**${point.topic}**\n`;
      
      point.perspectives.forEach(perspective => {
        response += `- ${perspective.viewpoint}: ${perspective.arguments[0]}\n`;
      });
      
      response += "\n";
    });
  } else if (result.domain_experts && result.domain_experts.length > 0) {
    response = "Based on expert analysis:\n\n";
    
    result.domain_experts.forEach(expert => {
      response += `**${expert.name} (${expert.expertise})**: ${expert.contribution}\n\n`;
    });
  }
  
  // Add insights if available
  if (result.insights && result.insights.length > 0) {
    response += "\nKey insights:\n";
    result.insights.forEach((insight, index) => {
      response += `${index + 1}. ${insight}\n`;
    });
  }
  
  return response.trim();
}