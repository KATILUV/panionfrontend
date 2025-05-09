import OpenAI from "openai";
import { v4 as uuidv4 } from 'uuid';
import { log } from './vite';

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || "" 
});

// Interface for Agent roles and personalities
interface DebateAgent {
  name: string;
  role: string;
  personality: string;
  expertise: string[];
  bias?: string;
  thinking_style: string;
}

// Specialized agent types for different query domains
const domainAgents: Record<string, DebateAgent[]> = {
  // General-purpose debate agents
  'general': [
    {
      name: "Analytical Agent",
      role: "Critical thinker and analyst",
      personality: "Logical, methodical, and detail-oriented",
      expertise: ["data analysis", "critical thinking", "evaluating evidence"],
      thinking_style: "Breaking down problems step by step with logical reasoning"
    },
    {
      name: "Creative Agent",
      role: "Lateral thinker and innovator",
      personality: "Creative, open-minded, and curious",
      expertise: ["idea generation", "connecting disparate concepts", "thinking outside the box"],
      thinking_style: "Exploring unconventional perspectives and creative solutions"
    },
    {
      name: "Pragmatic Agent",
      role: "Practical problem solver",
      personality: "Grounded, efficient, and results-oriented",
      expertise: ["implementation", "risk assessment", "feasibility analysis"],
      thinking_style: "Focusing on practical implementations and real-world constraints"
    },
    {
      name: "Ethical Agent",
      role: "Ethics and values specialist",
      personality: "Thoughtful, principled, and empathetic",
      expertise: ["ethical considerations", "societal impact", "human values"],
      thinking_style: "Considering moral implications and diverse stakeholder perspectives"
    }
  ],
  
  // Specialized agents for business data tasks
  'business_data': [
    {
      name: "Data Strategist",
      role: "Business data expert",
      personality: "Analytical, strategic, and growth-oriented",
      expertise: ["market research", "competitive analysis", "business intelligence"],
      thinking_style: "Finding strategic insights within data patterns"
    },
    {
      name: "Quality Assessor",
      role: "Data quality specialist",
      personality: "Meticulous, precise, and thorough",
      expertise: ["data validation", "quality metrics", "statistical sampling"],
      thinking_style: "Identifying quality issues and ensuring data reliability"
    },
    {
      name: "Implementation Planner",
      role: "Data collection specialist",
      personality: "Methodical, organized, and process-oriented",
      expertise: ["data collection methodologies", "sampling techniques", "field operations"],
      thinking_style: "Creating efficient processes for data acquisition"
    },
    {
      name: "Risk Analyst",
      role: "Data privacy and compliance expert",
      personality: "Careful, regulatory-minded, and security-focused",
      expertise: ["privacy regulations", "data protection", "ethical data collection"],
      thinking_style: "Identifying compliance risks and mitigation strategies"
    }
  ],
  
  // Specialized agents for research tasks
  'research': [
    {
      name: "Research Methodologist",
      role: "Research design expert",
      personality: "Systematic, thorough, and scientific",
      expertise: ["research methodologies", "study design", "experimental frameworks"],
      thinking_style: "Designing robust research approaches"
    },
    {
      name: "Literature Reviewer",
      role: "Existing knowledge specialist",
      personality: "Well-read, contextual, and comprehensive",
      expertise: ["literature analysis", "knowledge synthesis", "academic context"],
      thinking_style: "Connecting new questions to existing knowledge"
    },
    {
      name: "Data Scientist",
      role: "Quantitative analysis expert",
      personality: "Statistical, precise, and analytical",
      expertise: ["statistical analysis", "data modeling", "quantitative methods"],
      thinking_style: "Finding patterns and insights in quantitative data"
    },
    {
      name: "Qualitative Researcher",
      role: "Qualitative insights specialist",
      personality: "Observant, nuanced, and context-aware",
      expertise: ["qualitative analysis", "thematic exploration", "contextual understanding"],
      thinking_style: "Extracting meaning from qualitative information"
    }
  ],
  
  // Specialized agents for strategic planning
  'strategic': [
    {
      name: "Strategic Visionary",
      role: "Long-term strategy expert",
      personality: "Forward-thinking, big-picture oriented, and visionary",
      expertise: ["strategic planning", "future forecasting", "vision setting"],
      thinking_style: "Considering the long-term implications and opportunities"
    },
    {
      name: "Operational Planner",
      role: "Implementation specialist",
      personality: "Practical, detailed, and execution-focused",
      expertise: ["operational planning", "resource allocation", "implementation tactics"],
      thinking_style: "Translating strategy into actionable plans"
    },
    {
      name: "Risk Evaluator",
      role: "Risk assessment expert",
      personality: "Cautious, analytical, and security-minded",
      expertise: ["risk analysis", "contingency planning", "threat assessment"],
      thinking_style: "Identifying potential risks and mitigation strategies"
    },
    {
      name: "Innovation Strategist",
      role: "Disruptive thinking specialist",
      personality: "Innovative, trend-aware, and adaptable",
      expertise: ["innovation strategy", "emerging trends", "disruptive thinking"],
      thinking_style: "Finding novel approaches and breakthrough opportunities"
    }
  ]
};

// Default to general-purpose agents
const standardAgents: DebateAgent[] = domainAgents['general'];

// Types for debate rounds and conclusions
interface DebateRound {
  id: string;
  round_number: number;
  perspectives: {
    agent: DebateAgent;
    response: string;
  }[];
  summary: string;
}

interface DebateConclusion {
  finalAnswer: string;
  reasoning: string;
  confidenceScore: number;
  key_insights: string[];
  dissenting_viewpoints: string[];
}

interface DebateResult {
  query: string;
  rounds: DebateRound[];
  conclusion: DebateConclusion;
  agents_used: DebateAgent[];
  debate_id: string;
}

/**
 * Determines the most appropriate agent domain for a given query
 * @param query The query to analyze
 * @param context Additional context information
 * @returns The most relevant domain for agent selection
 */
async function determineDomain(query: string, context: string = ""): Promise<string> {
  try {
    // Use AI to determine the most appropriate domain
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a query classifier that determines the most appropriate domain for a multi-agent debate.
          Available domains are:
          - general: For general questions and topics
          - business_data: For queries about gathering, analyzing, or working with business data
          - research: For queries about research methodologies, literature review, and analysis
          - strategic: For queries about planning, strategy, and decision making
          
          Return ONLY the single most relevant domain name as a lowercase string without any additional explanation or text.`
        },
        {
          role: "user",
          content: `Query: ${query}\n${context ? `Context: ${context}` : ""}`
        }
      ],
      temperature: 0.3,
      max_tokens: 20
    });
    
    const domain = response.choices[0].message.content?.trim().toLowerCase() || 'general';
    
    // Check if the domain is valid, default to general if not
    return domainAgents[domain] ? domain : 'general';
  } catch (error) {
    log(`Error determining domain: ${error}`, 'debate');
    return 'general'; // Default to general domain if there's an error
  }
}

/**
 * Detect conflicts between agent perspectives
 * @param perspectives Array of agent perspectives
 * @returns Information about detected conflicts
 */
async function detectConflicts(perspectives: { agent: DebateAgent; response: string }[]): Promise<{
  hasConflicts: boolean;
  conflictSummary?: string;
  conflictingAgents?: string[];
}> {
  if (perspectives.length < 2) {
    return { hasConflicts: false };
  }
  
  try {
    // Extract the responses only
    const responseTexts = perspectives.map(p => `${p.agent.name}: ${p.response}`).join('\n\n');
    
    // Use AI to detect conflicts
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a conflict detection system for multi-agent debates.
          Analyze the perspectives provided and determine if there are any significant
          conflicts, contradictions, or disagreements between the agents.
          
          Respond in JSON format with the following structure:
          {
            "hasConflicts": boolean,
            "conflictSummary": string (only if hasConflicts is true),
            "conflictingAgents": array of strings (names of agents with conflicting views, only if hasConflicts is true)
          }`
        },
        {
          role: "user",
          content: `Analyze these agent perspectives for conflicts:\n\n${responseTexts}`
        }
      ],
      temperature: 0.3,
      max_tokens: 300,
      response_format: { type: "json_object" }
    });
    
    const result = JSON.parse(response.choices[0].message.content || '{"hasConflicts": false}');
    return {
      hasConflicts: result.hasConflicts,
      conflictSummary: result.conflictSummary,
      conflictingAgents: result.conflictingAgents
    };
  } catch (error) {
    log(`Error detecting conflicts: ${error}`, 'debate');
    return { hasConflicts: false };
  }
}

/**
 * Enhanced debate function that automatically selects the most appropriate agents based on query content
 * @param query The question or problem to analyze
 * @param context Additional context or information related to the query
 * @param num_rounds Number of rounds of debate (default: 2)
 * @param agents Optional specific agents to use, otherwise automatically selected based on query
 * @param options Additional options for the debate process
 * @returns A complete debate with multiple perspectives and a conclusion
 */
export async function conductDebate(
  query: string,
  context: string = "",
  num_rounds: number = 2,
  agents?: DebateAgent[],
  options: {
    resolveConflicts?: boolean;
    includeKnowledgeGraph?: boolean;
    debateFormat?: 'standard' | 'structured' | 'adversarial';
  } = { resolveConflicts: true, includeKnowledgeGraph: true, debateFormat: 'standard' }
): Promise<DebateResult> {
  const debate_id = uuidv4();
  const rounds: DebateRound[] = [];
  
  log(`Starting multi-agent debate on: "${query}"`, 'debate');
  
  try {
    // If agents weren't specified, determine the most appropriate domain and select those agents
    let selectedAgents: DebateAgent[];
    
    if (!agents) {
      const domain = await determineDomain(query, context);
      log(`Selected "${domain}" domain for debate on: "${query}"`, 'debate');
      selectedAgents = domainAgents[domain];
    } else {
      // Use provided agents, but limit to 4 if more were provided
      selectedAgents = agents.length > 4 ? agents.slice(0, 4) : agents;
    }
    
    // Add knowledge graph context if requested
    let enhancedContext = context;
    if (options.includeKnowledgeGraph) {
      try {
        // This import is done here to avoid circular dependencies
        const { queryKnowledge } = require('./knowledge-graph');
        const knowledgeResult = await queryKnowledge(query);
        
        if (knowledgeResult && knowledgeResult.relevantInfo) {
          enhancedContext = `${context ? context + '\n\n' : ''}Knowledge Graph Context:\n${knowledgeResult.relevantInfo}`;
          log(`Added knowledge graph context to debate`, 'debate');
        }
      } catch (error) {
        log(`Error adding knowledge graph context: ${error}`, 'debate');
        // Continue without knowledge graph context
      }
    }
    
    // Initial round - get first perspectives
    const initialRound = await debateRound(
      query, 
      enhancedContext, 
      1, 
      selectedAgents,
      [] // No previous rounds for the first round
    );
    
    rounds.push(initialRound);
    
    // Check for conflicts after the first round
    if (options.resolveConflicts) {
      const conflicts = await detectConflicts(initialRound.perspectives);
      
      if (conflicts.hasConflicts) {
        log(`Detected conflicts in debate: ${conflicts.conflictSummary}`, 'debate');
        
        // Add a conflict resolution round
        const conflictResolutionRound = await debateRound(
          query,
          `${enhancedContext}\n\nConflict detected: ${conflicts.conflictSummary}`,
          1.5, // Use fractional round number to indicate special round
          selectedAgents,
          rounds,
          true // Indicate this is a conflict resolution round
        );
        
        rounds.push(conflictResolutionRound);
      }
    }
    
    // Conduct subsequent rounds
    for (let round = 2; round <= num_rounds; round++) {
      const nextRound = await debateRound(
        query,
        enhancedContext,
        round,
        selectedAgents,
        rounds // Pass all previous rounds as context
      );
      
      rounds.push(nextRound);
      
      // Check for new conflicts in each round if conflict resolution is enabled
      if (options.resolveConflicts && round < num_rounds) {
        const conflicts = await detectConflicts(nextRound.perspectives);
        
        if (conflicts.hasConflicts) {
          log(`Detected conflicts in round ${round}: ${conflicts.conflictSummary}`, 'debate');
          
          // Add a conflict resolution round
          const conflictResolutionRound = await debateRound(
            query,
            `${enhancedContext}\n\nConflict detected: ${conflicts.conflictSummary}`,
            round + 0.5, // Use fractional round number to indicate special round
            selectedAgents,
            rounds,
            true // Indicate this is a conflict resolution round
          );
          
          rounds.push(conflictResolutionRound);
        }
      }
    }
    
    // Generate conclusion
    const conclusion = await generateConclusion(query, enhancedContext, rounds, selectedAgents);
    
    log(`Completed multi-agent debate with ${rounds.length} rounds (including ${rounds.filter(r => Math.floor(r.round_number) !== r.round_number).length} conflict resolution rounds) and ${selectedAgents.length} agents`, 'debate');
    
    return {
      query,
      rounds,
      conclusion,
      agents_used: selectedAgents,
      debate_id
    };
  } catch (error) {
    log(`Error in multi-agent debate: ${error}`, 'debate');
    
    // Return a partial result if we have any rounds
    if (rounds.length > 0) {
      return {
        query,
        rounds,
        conclusion: {
          finalAnswer: "Debate could not be completed due to an error.",
          reasoning: "An unexpected error occurred during the multi-agent debate process.",
          confidenceScore: 0.3,
          key_insights: ["Partial results may be available in the debate rounds."],
          dissenting_viewpoints: ["Unable to fully analyze dissenting viewpoints due to error."]
        },
        agents_used: agents || standardAgents,
        debate_id
      };
    }
    
    // If no rounds completed, rethrow the error
    throw error;
  }
}

/**
 * Conduct a single round of debate with multiple agents
 * @param query The question or problem to analyze
 * @param context Additional context information
 * @param round_number The round number (can be fractional for special rounds like conflict resolution)
 * @param agents The agents participating in the debate
 * @param previous_rounds Previous rounds of the debate for context
 * @param isConflictResolution Whether this is a special conflict resolution round
 * @returns A complete debate round with perspectives and summary
 */
async function debateRound(
  query: string,
  context: string,
  round_number: number,
  agents: DebateAgent[],
  previous_rounds: DebateRound[],
  isConflictResolution: boolean = false
): Promise<DebateRound> {
  const round_id = uuidv4();
  const perspectives: { agent: DebateAgent; response: string }[] = [];
  
  // Different logging for regular rounds vs. conflict resolution rounds
  if (isConflictResolution) {
    log(`Starting conflict resolution round ${round_number}`, 'debate');
  } else {
    log(`Starting debate round ${round_number}`, 'debate');
  }
  
  // Format previous rounds as context
  let previousRoundsText = "";
  if (previous_rounds.length > 0) {
    previousRoundsText = previous_rounds.map(round => {
      return `Round ${round.round_number} Summary: ${round.summary}\n\n` +
        round.perspectives.map(p => 
          `${p.agent.name} (${p.agent.role}): ${p.response}`
        ).join('\n\n');
    }).join('\n\n');
  }
  
  // Get each agent's perspective
  for (const agent of agents) {
    try {
      // Different system prompts for regular rounds vs. conflict resolution rounds
      const systemPrompt = isConflictResolution 
        ? `You are ${agent.name}, a ${agent.role}. Your personality is ${agent.personality}. 
          You have expertise in ${agent.expertise.join(", ")}. 
          Your thinking style is characterized by ${agent.thinking_style}.
          ${agent.bias ? `You tend to have a bias towards ${agent.bias}.` : ""}
          
          This is a special CONFLICT RESOLUTION round. Conflicts or contradictions have been detected
          in the previous perspectives. Your task is to:
          
          1. Address the conflicts directly
          2. Offer clarification on your position
          3. Consider points of agreement with other perspectives
          4. Suggest a potential synthesis or middle ground, if appropriate
          5. Identify where fundamental disagreements remain and why
          
          Be constructive, open-minded, and focus on resolving misunderstandings while
          maintaining intellectual integrity. The goal is to advance the debate through
          productive disagreement and find common ground where possible.`
        : `You are ${agent.name}, a ${agent.role}. Your personality is ${agent.personality}. 
          You have expertise in ${agent.expertise.join(", ")}. 
          Your thinking style is characterized by ${agent.thinking_style}.
          ${agent.bias ? `You tend to have a bias towards ${agent.bias}.` : ""}
          
          In this multi-agent debate, your role is to provide your unique perspective on the query.
          ${round_number > 1 ? 
            `This is round ${Math.floor(round_number)} of the debate. Consider the previous perspectives and build upon them. 
            You may agree or disagree with other agents, but explain your reasoning.` : 
            `This is the first round of the debate. Provide your initial analysis of the query.`}
          
          Focus on aspects of the problem that relate to your expertise and thinking style.
          Be concise but thorough in your response.`;
      
      // Create appropriate user prompt
      const userPrompt = isConflictResolution
        ? `Query: ${query}
          ${context ? `Context: ${context}\n\n` : ""}
          ${previousRoundsText ? `Previous debate rounds:\n${previousRoundsText}\n\n` : ""}
          
          This is a conflict resolution round. Please address the conflicts identified in the previous discussion,
          clarify your position, and seek areas of potential agreement or synthesis with other agents.`
        : `Query: ${query}
          ${context ? `Context: ${context}\n\n` : ""}
          ${previousRoundsText ? `Previous debate rounds:\n${previousRoundsText}\n\n` : ""}
          
          Please provide your perspective on this query${round_number > 1 ? ", considering the previous discussion" : ""}.`;
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: userPrompt
          }
        ],
        temperature: isConflictResolution ? 0.5 : 0.7, // Lower temperature for conflict resolution to encourage convergence
        max_tokens: 600 // Allow more tokens for conflict resolution
      });
      
      const agentResponse = response.choices[0].message.content || 
        `${agent.name} was unable to provide a perspective.`;
      
      perspectives.push({
        agent,
        response: agentResponse
      });
      
    } catch (error) {
      log(`Error getting perspective from ${agent.name}: ${error}`, 'debate');
      perspectives.push({
        agent,
        response: `${agent.name} encountered an error and could not provide a perspective.`
      });
    }
  }
  
  // Generate a summary of the round
  let summary = `Round ${round_number} could not be summarized.`;
  try {
    // Different prompts for regular vs. conflict resolution rounds
    const summaryPrompt = isConflictResolution
      ? `You are a debate mediator summarizing a conflict resolution round.
        Provide a concise summary that focuses on:
        1. The conflicts that were addressed
        2. How perspectives were clarified
        3. Areas where consensus was reached or differences narrowed
        4. Remaining disagreements and their nature
        
        Keep the summary under 200 words and highlight the progress made toward resolution.`
      : `You are an impartial debate moderator. Your task is to summarize the key points and insights from this round of a multi-agent debate.
        Highlight areas of agreement and disagreement between agents. Be concise but comprehensive.`;
    
    const summaryResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: summaryPrompt
        },
        {
          role: "user",
          content: `Query being debated: ${query}
          
          ${perspectives.map(p => 
            `${p.agent.name} (${p.agent.role}): ${p.response}`
          ).join('\n\n')}
          
          Please provide a concise summary of this ${isConflictResolution ? "conflict resolution" : ""} round of debate, highlighting ${isConflictResolution ? "progress toward resolution" : "key insights and areas of disagreement"}.`
        }
      ],
      temperature: 0.5,
      max_tokens: 300
    });
    
    summary = summaryResponse.choices[0].message.content || summary;
    
  } catch (error) {
    log(`Error generating summary for round ${round_number}: ${error}`, 'debate');
    // Use default summary from above
  }
  
  return {
    id: round_id,
    round_number,
    perspectives,
    summary
  };
}

/**
 * Generate a conclusion from the multi-agent debate
 */
async function generateConclusion(
  query: string,
  context: string,
  rounds: DebateRound[],
  agents: DebateAgent[]
): Promise<DebateConclusion> {
  log(`Generating conclusion for debate on: "${query}"`, 'debate');
  
  try {
    // Format all rounds for the final analysis
    const roundsText = rounds.map(round => {
      return `Round ${round.round_number} Summary: ${round.summary}\n\n` +
        round.perspectives.map(p => 
          `${p.agent.name} (${p.agent.role}): ${p.response}`
        ).join('\n\n');
    }).join('\n\n');
    
    // Generate the conclusion with all perspectives considered
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an impartial debate synthesizer. Your task is to consider all perspectives from a multi-agent debate and form a nuanced conclusion.
          
          Your conclusion should include:
          1. A direct answer to the original query
          2. The reasoning behind this conclusion, considering all perspectives
          3. A confidence score (0.0-1.0) representing how certain this conclusion is
          4. Key insights from the debate
          5. Important dissenting viewpoints that should be considered
          
          Be comprehensive but concise. Your goal is to synthesize the best answer from multiple perspectives.`
        },
        {
          role: "user",
          content: `Original query: ${query}
          ${context ? `Context: ${context}\n\n` : ""}
          
          Multi-agent debate:
          ${roundsText}
          
          Based on this debate between ${agents.map(a => a.name).join(", ")}, please provide a comprehensive conclusion in the following format:
          
          Final Answer: [concise answer to the original query]
          
          Reasoning: [explanation of the reasoning behind this conclusion]
          
          Confidence Score: [number between 0.0 and 1.0]
          
          Key Insights:
          - [key insight 1]
          - [key insight 2]
          - [etc.]
          
          Dissenting Viewpoints:
          - [important dissenting viewpoint 1]
          - [important dissenting viewpoint 2]
          - [etc.]`
        }
      ],
      temperature: 0.4,
      max_tokens: 1000,
      response_format: { type: "text" }
    });
    
    const conclusionText = response.choices[0].message.content || "Failed to generate conclusion.";
    
    // Parse the conclusion text into structured format
    const finalAnswerMatch = conclusionText.match(/Final Answer:(.*?)(?=\n\nReasoning:|$)/s);
    const reasoningMatch = conclusionText.match(/Reasoning:(.*?)(?=\n\nConfidence Score:|$)/s);
    const confidenceMatch = conclusionText.match(/Confidence Score:(.*?)(?=\n\nKey Insights:|$)/s);
    const insightsText = conclusionText.match(/Key Insights:(.*?)(?=\n\nDissenting Viewpoints:|$)/s);
    const dissentingText = conclusionText.match(/Dissenting Viewpoints:(.*?)$/s);
    
    // Extract key insights as array
    const keyInsights: string[] = [];
    if (insightsText && insightsText[1]) {
      const insights = insightsText[1].split("\n-").map(i => i.trim()).filter(Boolean);
      keyInsights.push(...insights);
    }
    
    // Extract dissenting viewpoints as array
    const dissentingViewpoints: string[] = [];
    if (dissentingText && dissentingText[1]) {
      const viewpoints = dissentingText[1].split("\n-").map(v => v.trim()).filter(Boolean);
      dissentingViewpoints.push(...viewpoints);
    }
    
    // Parse confidence score
    let confidenceScore = 0.5; // Default
    if (confidenceMatch && confidenceMatch[1]) {
      const scoreText = confidenceMatch[1].trim();
      const scoreNumber = parseFloat(scoreText);
      if (!isNaN(scoreNumber) && scoreNumber >= 0 && scoreNumber <= 1) {
        confidenceScore = scoreNumber;
      }
    }
    
    return {
      finalAnswer: finalAnswerMatch ? finalAnswerMatch[1].trim() : "No clear answer could be determined.",
      reasoning: reasoningMatch ? reasoningMatch[1].trim() : "Reasoning could not be extracted.",
      confidenceScore,
      key_insights: keyInsights.length > 0 ? keyInsights : ["No key insights were identified."],
      dissenting_viewpoints: dissentingViewpoints.length > 0 ? dissentingViewpoints : ["No dissenting viewpoints were identified."]
    };
    
  } catch (error) {
    log(`Error generating conclusion: ${error}`, 'debate');
    
    // Return a basic conclusion
    return {
      finalAnswer: "Could not generate a comprehensive conclusion due to an error.",
      reasoning: "The debate conclusion process encountered technical difficulties.",
      confidenceScore: 0.3,
      key_insights: [
        "Multiple perspectives were considered in the debate rounds.",
        "Review the individual agent responses for more insights."
      ],
      dissenting_viewpoints: ["Unable to process dissenting viewpoints due to an error."]
    };
  }
}

/**
 * Quick debate with fewer exchanges for time-sensitive queries
 */
export async function quickDebate(
  query: string,
  context: string = ""
): Promise<{ answer: string, confidence: number, insights: string[] }> {
  try {
    // Use a subset of agents for a faster response
    const quickAgents = standardAgents.slice(0, 2); // Just use 2 agents
    
    // Get a simplified debate with just one round
    const debateResult = await conductDebate(query, context, 1, quickAgents);
    
    return {
      answer: debateResult.conclusion.finalAnswer,
      confidence: debateResult.conclusion.confidenceScore,
      insights: debateResult.conclusion.key_insights
    };
  } catch (error) {
    log(`Error in quick debate: ${error}`, 'debate');
    
    return {
      answer: "Unable to complete quick debate due to an error.",
      confidence: 0.1,
      insights: ["The multi-agent debate system encountered an error."]
    };
  }
}