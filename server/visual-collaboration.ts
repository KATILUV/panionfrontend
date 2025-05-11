/**
 * Visual Collaboration Module
 * Implements multi-agent image analysis with specialized agents for different visual aspects
 */

import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { Request, Response } from 'express';
import OpenAI from 'openai';
import { getRelevantMemories } from './memory';

// Configure OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// The newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const MODEL = 'gpt-4o';

// Configure image upload
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const extension = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + extension);
  },
});

export const upload = multer({ storage });

// Define specialized agents
interface VisualAgent {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
}

const visualAgents: VisualAgent[] = [
  {
    id: 'object_detector',
    name: 'Object Detector',
    description: 'Identifies and describes physical objects in the image',
    systemPrompt: `You are an expert in object detection. Focus solely on identifying and describing all visible physical objects in the image. For each object, mention its approximate position, size, and visual characteristics. Don't make assumptions about image context or backstory beyond what is directly visible.`
  },
  {
    id: 'scene_analyzer',
    name: 'Scene Analyzer',
    description: 'Analyzes the overall scene context and environment',
    systemPrompt: `You are an expert in scene analysis. Focus solely on describing the overall context, setting, environmental elements, lighting, and atmosphere of the scene. Consider how these elements work together to create meaning. Don't focus on specific objects unless they contribute to understanding the environment.`
  },
  {
    id: 'emotion_detector',
    name: 'Emotion Detector',
    description: 'Identifies emotions and sentiments conveyed in the image',
    systemPrompt: `You are an expert in emotional analysis of images. Focus solely on detecting emotions, sentiments, mood, and tone conveyed by the image. Consider facial expressions, body language, color schemes, and composition elements that create emotional impact. Don't focus on objects or scene details unless they directly contribute to the emotional content.`
  },
  {
    id: 'text_extractor',
    name: 'Text Extractor',
    description: 'Extracts and interprets any text visible in the image',
    systemPrompt: `You are an expert in optical character recognition. Focus solely on identifying, extracting, and interpreting any text visible in the image. Include signs, labels, captions, book/product titles, computer screens, handwritten notes, etc. Attempt to read text even if partially obscured or at an angle. Don't focus on non-text elements of the image.`
  },
  {
    id: 'symbolism_expert',
    name: 'Symbolism Expert',
    description: 'Identifies symbols, icons, and cultural references',
    systemPrompt: `You are an expert in visual symbolism. Focus solely on identifying and interpreting symbols, cultural references, iconography, metaphors, and visual motifs in the image. Explain their potential meaning and significance. Consider cultural, historical, artistic, and religious contexts. Don't focus on physical objects or scene descriptions unless they have symbolic significance.`
  }
];

/**
 * Performs analysis of an image using a specific agent
 */
async function analyzeWithAgent(
  imagePath: string,
  agent: VisualAgent
): Promise<string> {
  try {
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    const dataURI = `data:image/jpeg;base64,${base64Image}`;

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: agent.systemPrompt
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Please analyze this image based on your expertise.'
            },
            {
              type: 'image_url',
              image_url: {
                url: dataURI
              }
            }
          ]
        }
      ],
      max_tokens: 1000
    });

    return response.choices[0].message.content || 'No analysis generated';
  } catch (error: any) {
    console.error(`Error with ${agent.name} analysis:`, error);
    return `Analysis failed: ${error.message || 'Unknown error'}`;
  }
}

/**
 * Synthesizes the results from multiple agent analyses
 */
async function synthesizeResults(
  imagePath: string,
  agentAnalyses: Array<{ 
    agentId: string;
    analysis: string;
  }>
): Promise<{
  mainFindings: string;
  keyInsights: string[];
  uncertainties: string[];
  suggestedFollowups: string[];
}> {
  try {
    // Extract just the analyses text for the prompt
    const analysesText = agentAnalyses
      .map(item => {
        const agent = visualAgents.find(a => a.id === item.agentId);
        return `${agent?.name || item.agentId} ANALYSIS:\n${item.analysis}\n\n`;
      })
      .join('');

    // Create a system prompt for the synthesizer
    const systemPrompt = `You are an expert in synthesizing analyses from multiple visual AI agents. 
Your task is to create a coherent, insightful summary of the image based on the specialized analyses provided.
Focus on finding connections between different analyses and highlighting the most significant aspects.
Provide your response in JSON format with these exact fields:
- mainFindings: A coherent paragraph summarizing the key elements of the image
- keyInsights: An array of 3-5 most important insights about the image
- uncertainties: An array of any aspects that seem unclear or where agents disagree
- suggestedFollowups: An array of 2-3 questions that might be worth exploring further`;

    // Prepare image for the synthesizing model
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    const dataURI = `data:image/jpeg;base64,${base64Image}`;

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Here are analyses of an image from multiple specialized agents. Please synthesize these into a coherent summary and extract key insights:\n\n${analysesText}`
            },
            {
              type: 'image_url',
              image_url: {
                url: dataURI
              }
            }
          ]
        }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 1500
    });

    const synthesisText = response.choices[0].message.content || '{}';
    const synthesis = JSON.parse(synthesisText);

    return {
      mainFindings: synthesis.mainFindings || 'No main findings generated',
      keyInsights: synthesis.keyInsights || [],
      uncertainties: synthesis.uncertainties || [],
      suggestedFollowups: synthesis.suggestedFollowups || []
    };
  } catch (error: any) {
    console.error('Error synthesizing results:', error);
    return {
      mainFindings: 'Failed to synthesize results due to an error',
      keyInsights: [`Error: ${error.message || 'Unknown error'}`],
      uncertainties: [],
      suggestedFollowups: []
    };
  }
}

/**
 * Multi-agent image analysis endpoint handler
 */
export async function handleMultiAgentImageAnalysis(req: Request, res: Response): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No image file provided' });
      return;
    }

    const imagePath = req.file.path;
    const fileName = req.file.filename;
    const imageUrl = `/uploads/${fileName}`;
    
    // SessionId from form data
    const sessionId = req.body.sessionId || 'default';
    
    // Get memory context for enhanced analysis
    const relevantMemories = await getRelevantMemories(`Analyze this image in the context of our conversation`);
    const memoryContext = relevantMemories.map(m => m.content).join('\n');
    
    console.log(`Starting multi-agent analysis with ${visualAgents.length} agents for session ${sessionId}`);
    
    // Run all agent analyses in parallel
    const agentAnalysisPromises = visualAgents.map(agent => 
      analyzeWithAgent(imagePath, agent)
        .then(analysis => ({
          agentId: agent.id,
          analysis
        }))
    );
    
    const agentAnalyses = await Promise.all(agentAnalysisPromises);
    
    // Synthesize the results
    const summary = await synthesizeResults(imagePath, agentAnalyses);
    
    // Create the collaborative result
    const result = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      imageUrl,
      sessionId,
      agentAnalyses,
      summary,
      // Include metadata about the analysis
      metadata: {
        agentsUsed: visualAgents.length,
        memoryContextLength: memoryContext.length,
        analysisTime: new Date().toISOString()
      }
    };
    
    res.status(200).json({ 
      success: true, 
      imageUrl,
      result
    });
  } catch (error: any) {
    console.error('Error in multi-agent image analysis:', error);
    res.status(500).json({ 
      error: 'Failed to analyze image with multi-agent system',
      message: error.message || 'Unknown error occurred'
    });
  }
}