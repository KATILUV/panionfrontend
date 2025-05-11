import OpenAI from "openai";
import { v4 as uuidv4 } from 'uuid';
import { log } from './vite';
import * as fs from 'fs';
import path from 'path';

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || "" 
});

// Interface for specialized visual analysis agents
interface VisualAgent {
  id: string;
  name: string;
  role: string;
  specialty: string[];
  description: string;
  analysisApproach: string;
}

// Define the specialized agents for different visual analysis tasks
const visualAgents: Record<string, VisualAgent> = {
  'objectDetector': {
    id: 'object_detector',
    name: 'Object Detector',
    role: 'Visual Object Recognition',
    specialty: ['object detection', 'scene composition', 'spatial relationships'],
    description: 'Identifies and catalogs visible objects in the image, their relationships, and composition',
    analysisApproach: 'Systematic scanning of the image to identify all visible objects and their spatial relationships'
  },
  'contextAnalyzer': {
    id: 'context_analyzer',
    name: 'Context Analyzer',
    role: 'Contextual Understanding',
    specialty: ['scene context', 'environmental analysis', 'setting identification'],
    description: 'Analyzes the broader context, setting, and environment depicted in the image',
    analysisApproach: 'Holistic examination of the scene to determine location, time, environment, and cultural context'
  },
  'textExtractor': {
    id: 'text_extractor',
    name: 'Text Extractor',
    role: 'Text Recognition and Analysis',
    specialty: ['OCR', 'text analysis', 'document understanding'],
    description: 'Extracts and interprets any text visible in the image, including documents, signs, or labels',
    analysisApproach: 'Focused detection of text elements and interpretation of their meaning and significance'
  },
  'emotionInterpreter': {
    id: 'emotion_interpreter',
    name: 'Emotion Interpreter',
    role: 'Emotional and Social Analysis',
    specialty: ['facial expressions', 'body language', 'emotional tone'],
    description: 'Interprets emotional content, social dynamics, and non-verbal cues in the image',
    analysisApproach: 'Analysis of human subjects for emotional states, social interactions, and non-verbal communication'
  },
  'technicalAnalyzer': {
    id: 'technical_analyzer',
    name: 'Technical Analyzer',
    role: 'Technical Image Assessment',
    specialty: ['image quality', 'composition analysis', 'photographic elements'],
    description: 'Evaluates technical aspects of the image including quality, composition, lighting, and photographic techniques',
    analysisApproach: 'Technical assessment of image attributes, photography techniques, and compositional elements'
  },
  'contentModerator': {
    id: 'content_moderator',
    name: 'Content Moderator',
    role: 'Content Safety and Moderation',
    specialty: ['safety assessment', 'content moderation', 'policy compliance'],
    description: 'Assesses the image for potentially sensitive or inappropriate content',
    analysisApproach: 'Evaluation of image content against safety guidelines and identification of potentially sensitive elements'
  },
  'symbolAnalyzer': {
    id: 'symbol_analyzer',
    name: 'Symbol Analyzer',
    role: 'Symbolic and Cultural Analysis',
    specialty: ['symbolism', 'cultural references', 'iconography'],
    description: 'Identifies and interprets symbols, cultural references, and iconography present in the image',
    analysisApproach: 'Recognition of symbolic elements and interpretation of their cultural or contextual meaning'
  }
};

// Types for collaboration session
interface AgentAnalysis {
  agentId: string;
  analysis: string;
  confidence: number;
  focusAreas: string[];
  timestamp: string;
}

interface CollaborationInsight {
  type: 'observation' | 'contradiction' | 'enhancement' | 'question' | 'synthesis';
  content: string;
  sourceAgents: string[];
  confidence: number;
}

interface CollaborationSummary {
  mainFindings: string;
  consensusDescription: string;
  keyInsights: string[];
  uncertainties: string[];
  suggestedFollowups: string[];
}

export interface VisualCollaborationResult {
  imageUrl: string;
  analysisId: string;
  sessionTimestamp: string;
  agentAnalyses: AgentAnalysis[];
  insights: CollaborationInsight[];
  summary: CollaborationSummary;
  conversationMode: string;
}

/**
 * Determines the most appropriate agents for analyzing a specific image based on the conversation mode
 * @param imageUrl URL of the image to be analyzed
 * @param conversationMode The mode of conversation (casual, deep, strategic, etc.)
 * @returns Array of agent IDs best suited for this analysis
 */
async function selectAgentsForImage(imageUrl: string, conversationMode: string): Promise<string[]> {
  // Default to a standard set if we can't determine specialized needs
  const defaultAgents = ['objectDetector', 'contextAnalyzer', 'emotionInterpreter'];
  
  // If no specific mode is provided, return default agents
  if (!conversationMode) {
    return defaultAgents;
  }
  
  try {
    // Different agent combinations based on conversation mode
    switch (conversationMode.toLowerCase()) {
      case 'casual':
        return ['objectDetector', 'contextAnalyzer', 'emotionInterpreter'];
      case 'deep':
        return ['objectDetector', 'contextAnalyzer', 'symbolAnalyzer', 'emotionInterpreter'];
      case 'strategic':
        return ['objectDetector', 'contextAnalyzer', 'technicalAnalyzer', 'symbolAnalyzer'];
      case 'logical':
        return ['objectDetector', 'textExtractor', 'technicalAnalyzer', 'contentModerator'];
      case 'creative':
        return ['objectDetector', 'symbolAnalyzer', 'emotionInterpreter', 'contextAnalyzer'];
      case 'technical':
        return ['objectDetector', 'textExtractor', 'technicalAnalyzer', 'contentModerator'];
      case 'educational':
        return ['objectDetector', 'contextAnalyzer', 'textExtractor', 'symbolAnalyzer'];
      default:
        return defaultAgents;
    }
  } catch (error) {
    log(`Error selecting agents: ${error}`, 'visual-collab');
    return defaultAgents;
  }
}

/**
 * Performs specialized analysis of an image using a specific agent
 * @param imageUrl URL of the image to analyze
 * @param agentId ID of the agent to use for analysis
 * @returns The agent's analysis results
 */
async function performAgentAnalysis(imageUrl: string, agentId: string): Promise<AgentAnalysis> {
  const agent = visualAgents[agentId];
  
  if (!agent) {
    throw new Error(`Unknown agent ID: ${agentId}`);
  }
  
  log(`Agent ${agent.name} beginning analysis of image`, 'visual-collab');
  
  try {
    // Provide specialized instructions based on the agent's role
    const systemPrompt = `You are ${agent.name}, a specialized visual analysis agent with expertise in ${agent.specialty.join(', ')}. 
    ${agent.description}
    
    Analyze the provided image using your ${agent.analysisApproach}.
    
    Your analysis should include:
    1. A detailed description related to your specialty area
    2. At least 3 key observations that others might miss
    3. Any uncertainties or areas that would benefit from additional context
    
    Focus only on your specialty area. Other specialized agents will analyze different aspects of the image.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Please analyze this image as ${agent.name} with a focus on ${agent.specialty.join(', ')}.`
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl
              }
            }
          ],
        }
      ],
      max_tokens: 500
    });
    
    // For simplicity, estimate confidence as 0.8-0.95
    const confidence = 0.8 + Math.random() * 0.15;
    
    // Extract focus areas from the agent's specialty
    const focusAreas = agent.specialty;
    
    return {
      agentId: agent.id,
      analysis: response.choices[0].message.content || "Analysis could not be completed.",
      confidence,
      focusAreas,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    log(`Error in agent analysis: ${error}`, 'visual-collab');
    return {
      agentId: agent.id,
      analysis: "Analysis failed due to an error.",
      confidence: 0.1,
      focusAreas: agent.specialty,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Identifies connections, contradictions, and insights between different agent analyses
 * @param analyses Array of agent analyses to synthesize
 * @returns Array of collaboration insights
 */
async function generateCollaborativeInsights(analyses: AgentAnalysis[]): Promise<CollaborationInsight[]> {
  if (analyses.length < 2) {
    return [{
      type: 'observation',
      content: "Insufficient analyses for meaningful collaboration.",
      sourceAgents: analyses.map(a => a.agentId),
      confidence: 0.5
    }];
  }
  
  try {
    // Prepare the analyses for the AI to review
    const analysesText = analyses.map(analysis => {
      const agent = visualAgents[analysis.agentId];
      return `AGENT: ${agent.name} (${agent.role})
ANALYSIS: ${analysis.analysis}
FOCUS AREAS: ${analysis.focusAreas.join(', ')}
CONFIDENCE: ${(analysis.confidence * 100).toFixed(1)}%
---`;
    }).join('\n\n');
    
    // Use AI to identify insights across analyses
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a collaborative intelligence system that identifies meaningful patterns, insights, contradictions, and connections between different specialist analyses of the same image.
          
          Analyze the following specialist reports and generate insights in JSON format with the following structure:
          
          [
            {
              "type": "observation" | "contradiction" | "enhancement" | "question" | "synthesis",
              "content": "Detailed description of the insight",
              "sourceAgents": ["agent_id1", "agent_id2", ...],
              "confidence": number between 0-1
            },
            ...
          ]
          
          Generate 4-6 high-quality insights that genuinely add value beyond individual analyses.`
        },
        {
          role: "user",
          content: `Please analyze these specialist reports and generate collaborative insights:\n\n${analysesText}`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.4
    });
    
    // Parse and return the insights
    const result = JSON.parse(response.choices[0].message.content || '{"insights": []}');
    return result.insights || [];
    
  } catch (error) {
    log(`Error generating collaborative insights: ${error}`, 'visual-collab');
    return [{
      type: 'observation',
      content: "Insight generation failed due to an error.",
      sourceAgents: analyses.map(a => a.agentId),
      confidence: 0.3
    }];
  }
}

/**
 * Creates a comprehensive summary of the collaborative image analysis
 * @param imageUrl URL of the analyzed image
 * @param analyses Array of agent analyses
 * @param insights Collaborative insights between analyses
 * @returns Structured summary of the visual collaboration
 */
async function generateCollaborativeSummary(
  imageUrl: string, 
  analyses: AgentAnalysis[], 
  insights: CollaborationInsight[]
): Promise<CollaborationSummary> {
  try {
    // Prepare the analyses and insights for the AI to summarize
    const analysesText = analyses.map(analysis => {
      const agent = visualAgents[analysis.agentId];
      return `AGENT: ${agent.name} (${agent.role})
ANALYSIS: ${analysis.analysis}`;
    }).join('\n\n---\n\n');
    
    const insightsText = insights.map(insight => {
      return `TYPE: ${insight.type}
CONTENT: ${insight.content}
SOURCE AGENTS: ${insight.sourceAgents.join(', ')}`;
    }).join('\n\n');
    
    // Use AI to generate a comprehensive summary
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a visual intelligence synthesis system that combines specialist analyses and collaborative insights to create a comprehensive understanding of an image.
          
          Create a summary in JSON format with this structure:
          {
            "mainFindings": "One-paragraph executive summary of the key findings",
            "consensusDescription": "Comprehensive description integrating all perspectives",
            "keyInsights": ["Insight 1", "Insight 2", "Insight 3", "Insight 4", "Insight 5"],
            "uncertainties": ["Uncertainty or limitation 1", "Uncertainty or limitation 2"],
            "suggestedFollowups": ["Suggestion 1", "Suggestion 2", "Suggestion 3"]
          }`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Please generate a collaborative summary based on these specialist analyses and insights:\n\nANALYSES:\n${analysesText}\n\nINSIGHTS:\n${insightsText}`
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl
              }
            }
          ],
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3
    });
    
    // Parse and return the summary
    return JSON.parse(response.choices[0].message.content || 
      '{"mainFindings":"Analysis could not be completed.","consensusDescription":"No consensus available.","keyInsights":[],"uncertainties":[],"suggestedFollowups":[]}');
    
  } catch (error) {
    log(`Error generating collaborative summary: ${error}`, 'visual-collab');
    return {
      mainFindings: "Summary generation failed due to an error.",
      consensusDescription: "No consensus available due to an error in processing.",
      keyInsights: ["Error in processing prevented full analysis."],
      uncertainties: ["The reliability of this analysis could not be determined."],
      suggestedFollowups: ["Try analyzing the image again with fewer agents."]
    };
  }
}

/**
 * Main function to orchestrate the multi-agent visual collaboration process
 * @param imageUrl URL of the image to analyze
 * @param conversationMode Conversation mode to determine analysis approach
 * @returns Complete visual collaboration result
 */
export async function analyzeImageCollaboratively(
  imageUrl: string, 
  conversationMode: string = 'casual'
): Promise<VisualCollaborationResult> {
  const analysisId = uuidv4();
  const sessionTimestamp = new Date().toISOString();
  
  log(`Starting collaborative image analysis (ID: ${analysisId}) for ${imageUrl}`, 'visual-collab');
  
  try {
    // 1. Select the appropriate agents based on the image and conversation mode
    const selectedAgentIds = await selectAgentsForImage(imageUrl, conversationMode);
    log(`Selected ${selectedAgentIds.length} agents for analysis: ${selectedAgentIds.join(', ')}`, 'visual-collab');
    
    // 2. Perform individual agent analyses (in parallel)
    const analysisPromises = selectedAgentIds.map(agentId => performAgentAnalysis(imageUrl, agentId));
    const agentAnalyses = await Promise.all(analysisPromises);
    
    // 3. Generate collaborative insights between agent analyses
    const insights = await generateCollaborativeInsights(agentAnalyses);
    
    // 4. Create a comprehensive summary of the collaboration
    const summary = await generateCollaborativeSummary(imageUrl, agentAnalyses, insights);
    
    // 5. Return the complete visual collaboration result
    const result: VisualCollaborationResult = {
      imageUrl,
      analysisId,
      sessionTimestamp,
      agentAnalyses,
      insights,
      summary,
      conversationMode
    };
    
    log(`Completed collaborative image analysis (ID: ${analysisId}) with ${agentAnalyses.length} agents`, 'visual-collab');
    
    return result;
  } catch (error) {
    log(`Error in collaborative image analysis: ${error}`, 'visual-collab');
    throw error;
  }
}

// Optional: Save the collaboration result to a file for future reference
export async function saveCollaborationResult(result: VisualCollaborationResult): Promise<string> {
  try {
    // Create a directory for storing collaboration results if it doesn't exist
    const resultsDir = path.join(process.cwd(), 'data', 'visual_collaborations');
    fs.mkdirSync(resultsDir, { recursive: true });
    
    // Create a filename based on the analysis ID
    const filename = `${result.analysisId}.json`;
    const filePath = path.join(resultsDir, filename);
    
    // Write the result to a JSON file
    fs.writeFileSync(filePath, JSON.stringify(result, null, 2));
    
    log(`Saved collaboration result to ${filePath}`, 'visual-collab');
    return filePath;
  } catch (error) {
    log(`Error saving collaboration result: ${error}`, 'visual-collab');
    return '';
  }
}