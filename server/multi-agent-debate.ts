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

// Standard debate agents with different perspectives
const standardAgents: DebateAgent[] = [
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
];

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
 * Conduct a multi-agent debate on a complex query
 * @param query The question or problem to analyze
 * @param context Additional context or information related to the query
 * @param num_rounds Number of rounds of debate (default: 2)
 * @param agents Optional specific agents to use, otherwise uses standard agents
 * @returns A complete debate with multiple perspectives and a conclusion
 */
export async function conductDebate(
  query: string,
  context: string = "",
  num_rounds: number = 2,
  agents: DebateAgent[] = standardAgents
): Promise<DebateResult> {
  const debate_id = uuidv4();
  const rounds: DebateRound[] = [];
  
  log(`Starting multi-agent debate on: "${query}"`, 'debate');
  
  try {
    // Select agents if more than 4 were provided
    const selectedAgents = agents.length > 4 ? agents.slice(0, 4) : agents;
    
    // Initial round - get first perspectives
    const initialRound = await debateRound(
      query, 
      context, 
      1, 
      selectedAgents,
      [] // No previous rounds for the first round
    );
    
    rounds.push(initialRound);
    
    // Conduct subsequent rounds
    for (let round = 2; round <= num_rounds; round++) {
      const nextRound = await debateRound(
        query,
        context,
        round,
        selectedAgents,
        rounds // Pass all previous rounds as context
      );
      
      rounds.push(nextRound);
    }
    
    // Generate conclusion
    const conclusion = await generateConclusion(query, context, rounds, selectedAgents);
    
    log(`Completed multi-agent debate with ${num_rounds} rounds and ${selectedAgents.length} agents`, 'debate');
    
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
        agents_used: agents,
        debate_id
      };
    }
    
    // If no rounds completed, rethrow the error
    throw error;
  }
}

/**
 * Conduct a single round of debate with multiple agents
 */
async function debateRound(
  query: string,
  context: string,
  round_number: number,
  agents: DebateAgent[],
  previous_rounds: DebateRound[]
): Promise<DebateRound> {
  const round_id = uuidv4();
  const perspectives: { agent: DebateAgent; response: string }[] = [];
  
  log(`Starting debate round ${round_number}`, 'debate');
  
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
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are ${agent.name}, a ${agent.role}. Your personality is ${agent.personality}. 
            You have expertise in ${agent.expertise.join(", ")}. 
            Your thinking style is characterized by ${agent.thinking_style}.
            ${agent.bias ? `You tend to have a bias towards ${agent.bias}.` : ""}
            
            In this multi-agent debate, your role is to provide your unique perspective on the query.
            ${round_number > 1 ? 
              `This is round ${round_number} of the debate. Consider the previous perspectives and build upon them. 
              You may agree or disagree with other agents, but explain your reasoning.` : 
              `This is the first round of the debate. Provide your initial analysis of the query.`}
            
            Focus on aspects of the problem that relate to your expertise and thinking style.
            Be concise but thorough in your response.`
          },
          {
            role: "user",
            content: `Query: ${query}
            ${context ? `Context: ${context}\n\n` : ""}
            ${previousRoundsText ? `Previous debate rounds:\n${previousRoundsText}\n\n` : ""}
            
            Please provide your perspective on this query${round_number > 1 ? ", considering the previous discussion" : ""}.`
          }
        ],
        temperature: 0.7,
        max_tokens: 500
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
    const summaryResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an impartial debate moderator. Your task is to summarize the key points and insights from this round of a multi-agent debate.
          Highlight areas of agreement and disagreement between agents. Be concise but comprehensive.`
        },
        {
          role: "user",
          content: `Query being debated: ${query}
          
          ${perspectives.map(p => 
            `${p.agent.name} (${p.agent.role}): ${p.response}`
          ).join('\n\n')}
          
          Please provide a concise summary of this round of debate, highlighting key insights and areas of disagreement.`
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