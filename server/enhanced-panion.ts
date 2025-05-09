import { Request, Response } from 'express';
import axios from 'axios';
import { log } from './vite';
import { v4 as uuidv4 } from 'uuid';
import * as memory from './memory';
import OpenAI from 'openai';
import { taskManager } from './autonomous-agent';
import { getStrategicPlan, StrategicPlan } from './strategic-planner';
import { handleAnthropicChatRequest } from './anthropic';

// Simple capability extraction function - will be implemented in full later
async function extractCapabilities(message: string): Promise<string[]> {
  const lowercaseMessage = message.toLowerCase();
  const capabilities: string[] = [];
  
  // Basic pattern matching for capabilities
  if (lowercaseMessage.includes('search') || lowercaseMessage.includes('find') || lowercaseMessage.includes('locate')) {
    capabilities.push('search');
  }
  
  if (lowercaseMessage.includes('analyze') || lowercaseMessage.includes('data') || lowercaseMessage.includes('statistics')) {
    capabilities.push('data_analysis');
  }
  
  if (lowercaseMessage.includes('plan') || lowercaseMessage.includes('steps') || lowercaseMessage.includes('strategy')) {
    capabilities.push('planning');
  }
  
  if (lowercaseMessage.includes('creative') || lowercaseMessage.includes('write') || lowercaseMessage.includes('content')) {
    capabilities.push('creative_writing');
  }
  
  if (lowercaseMessage.includes('code') || lowercaseMessage.includes('program') || lowercaseMessage.includes('develop')) {
    capabilities.push('coding');
  }
  
  if (lowercaseMessage.includes('image') || lowercaseMessage.includes('picture') || lowercaseMessage.includes('photo')) {
    capabilities.push('visual_processing');
  }
  
  if (lowercaseMessage.includes('remember') || lowercaseMessage.includes('recall') || lowercaseMessage.includes('previous')) {
    capabilities.push('memory_recall');
  }
  
  if (lowercaseMessage.includes('coordinate') || lowercaseMessage.includes('team') || lowercaseMessage.includes('collaborate')) {
    capabilities.push('coordination');
  }
  
  // Return detected capabilities, or an empty array if none are detected
  return capabilities;
}

// Initialize OpenAI client for memory operations
// the newest OpenAI model is "gpt-4o" which was released May 13, 2024
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || "" 
});

// Configuration
const PANION_API_PORT = process.env.PANION_API_PORT || 8000;
const PANION_API_URL = `http://localhost:${PANION_API_PORT}`;

// Memory access constants
const SESSION_MEMORY_LIMIT = 10; // Maximum messages to keep in context

// Self-reflection mechanisms
type ReflectionStage = 'pre-analysis' | 'post-analysis' | 'meta-reflection';

interface Reflection {
  stage: ReflectionStage;
  content: string;
  timestamp: string;
}

// Keep track of reflections for different sessions
const sessionReflections: Record<string, Reflection[]> = {};

/**
 * Enhanced chat request handler with memory integration
 */
export async function handleEnhancedChat(req: Request, res: Response): Promise<void> {
  try {
    // Extract request data
    const { 
      message, 
      content,
      sessionId = 'default',
      hasRequiredCapabilities = true, 
      capabilities = [],
      strategic = false
    } = req.body;
    
    // Support both 'message' and 'content' parameters for flexibility
    const messageContent = content || message;
    
    if (!messageContent || typeof messageContent !== 'string') {
      res.status(400).json({ 
        error: 'Invalid request',
        message: 'Message content is required and must be a string' 
      });
      return;
    }
    
    // Save user message to memory system
    const userMemory = {
      sessionId,
      content: messageContent,
      isUser: true,
      timestamp: new Date().toISOString()
    };
    await memory.saveToMemory(userMemory);
    
    // Pre-request reflection - analyze user intent and plan response
    const preReflection = await performPreRequestReflection(messageContent, sessionId);
    
    // 1. DETECT AND EXTRACT CAPABILITIES NEEDED
    // Improved capability detection - using AI to infer required capabilities
    let detectedCapabilities = capabilities.length > 0 
      ? capabilities 
      : await extractCapabilities(messageContent);
    
    log(`Detected capabilities: ${detectedCapabilities.join(', ')}`, 'panion');
    
    let response: any;
    let strategicPlan = null;
    
    // 2. DETERMINE IF STRATEGIC PLANNING IS NEEDED
    const needsStrategicPlanning = strategic || 
      preReflection.includes('requires multi-step planning') ||
      preReflection.includes('complex request') ||
      messageContent.toLowerCase().includes('plan') ||
      messageContent.toLowerCase().includes('strategy') ||
      detectedCapabilities.includes('planning') ||
      detectedCapabilities.includes('strategic_thinking');
    
    // 3. RETRIEVE RELEVANT MEMORY CONTEXT
    const relevantMemories = await memory.getRelevantMemories(messageContent);
    const memoryContext = relevantMemories.length > 0 
      ? `Relevant memories:\n${relevantMemories.map(m => `- ${m.content}`).join('\n')}`
      : 'No relevant previous context found.';
    
    // 4. STRATEGIC PLANNING PHASE (if needed)
    if (needsStrategicPlanning) {
      // Get conversation history for context
      const conversationHistory = await memory.getConversationHistory(sessionId);
      
      // Generate a strategic plan
      strategicPlan = await getStrategicPlan(
        messageContent, 
        conversationHistory.map(m => ({
          role: m.isUser ? 'user' : 'assistant',
          content: m.content
        })),
        detectedCapabilities
      );
      
      log(`Generated strategic plan for request: ${JSON.stringify(strategicPlan)}`, 'panion');
    }
    
    // 5. FORWARD REQUEST TO PANION API WITH ENHANCED CONTEXT
    // Prepare the metadata with enhanced context
    const enhancedMetadata = {
      hasRequiredCapabilities,
      capabilities: detectedCapabilities,
      requestedAt: new Date().toISOString(),
      client: 'frontend',
      memoryContext: memoryContext,
      reflection: preReflection,
      strategicPlan: strategicPlan
    };
    
    try {
      // Forward the request to the Panion API with additional context
      response = await axios.post(`${PANION_API_URL}/chat`, {
        content: messageContent,
        session_id: sessionId,
        metadata: enhancedMetadata
      });
      
      response = response.data;
    } catch (error) {
      // Handle API error - use OpenAI as fallback
      log(`Error from Panion API, using OpenAI fallback: ${error}`, 'panion');
      
      // Generate a response using OpenAI directly
      response = await generateFallbackResponse(
        messageContent, 
        sessionId, 
        memoryContext,
        preReflection,
        strategicPlan
      );
    }
    
    // 6. POST-RESPONSE REFLECTION
    const responseContent = response.response || response.message || 'No response generated.';
    const postReflection = await performPostResponseReflection(
      messageContent, 
      responseContent, 
      sessionId
    );
    
    // 7. SAVE PANION'S RESPONSE TO MEMORY
    const assistantMemory = {
      sessionId,
      content: responseContent,
      isUser: false,
      timestamp: new Date().toISOString()
    };
    await memory.saveToMemory(assistantMemory);
    
    // 8. ENHANCE RESPONSE WITH REFLECTIONS, MEMORY, AND STRATEGIC THINKING
    // Add thinking details to the response
    let enhancedThinking = '';
    
    // Memory context
    if (relevantMemories.length > 0) {
      enhancedThinking += `Memory context:\n${memoryContext}\n\n`;
    }
    
    // Pre-request reflection
    enhancedThinking += `Pre-analysis:\n${preReflection}\n\n`;
    
    // Strategic plan if available
    if (strategicPlan) {
      enhancedThinking += `Strategic plan:\n${strategicPlan.planDescription}\n`;
      enhancedThinking += `Steps:\n${strategicPlan.steps.map((step, index) => 
        `${index+1}. ${step.description}`).join('\n')}\n\n`;
    }
    
    // Add capability analysis
    if (detectedCapabilities.length > 0) {
      enhancedThinking += `Detected capabilities needed: ${detectedCapabilities.join(', ')}\n\n`;
    }
    
    // Post-response reflection
    enhancedThinking += `Post-analysis:\n${postReflection}\n\n`;
    
    // Original thinking from API if available
    if (response.thinking) {
      enhancedThinking += `API thinking:\n${response.thinking}`;
    }
    
    // Update response with enhanced thinking
    response.thinking = enhancedThinking;
    
    // 9. PREPARE ADDITIONAL INFO
    // Ensure we always have the 'response' field
    if (response.message && !response.response) {
      response.response = response.message;
    }
    
    // Add memory stats and reflection data
    if (!response.additional_info) {
      response.additional_info = {};
    }
    
    // Add memory information
    const memoryStats = await memory.getMemoryStats();
    response.additional_info.memory = {
      totalStoredMemories: memoryStats.totalMemories,
      relevantMemoriesCount: relevantMemories.length
    };
    
    // Add reflection information
    response.additional_info.reflection = {
      preReflection: preReflection.substring(0, 100) + '...',
      postReflection: postReflection.substring(0, 100) + '...'
    };
    
    // Add strategic information if available
    if (strategicPlan) {
      response.additional_info.strategicPlan = {
        stepCount: strategicPlan.steps.length,
        isComplex: strategicPlan.complexity > 0.7
      };
    }
    
    res.json(response);
  } catch (error) {
    log(`Error in enhanced panion chat: ${error}`, 'panion');
    res.status(500).json({ 
      error: 'Enhanced Panion API error',
      message: 'Error processing enhanced chat request',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Perform pre-request reflection to analyze user intent and plan response
 */
async function performPreRequestReflection(
  message: string, 
  sessionId: string
): Promise<string> {
  try {
    // Get recent conversation history for context
    const conversationHistory = await memory.getConversationHistory(sessionId);
    const recentMessages = conversationHistory.slice(-SESSION_MEMORY_LIMIT);
    
    // Format conversation history for the prompt
    const formattedHistory = recentMessages.map(msg => 
      `${msg.isUser ? 'User' : 'Panion'}: ${msg.content}`
    ).join('\n');
    
    // Ask OpenAI to perform reflection
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are Panion's self-reflection system. Your job is to analyze user messages and determine:
          1. The user's primary intent and any secondary intents
          2. The emotional tone of the message
          3. The complexity of the request
          4. Whether this requires multi-step planning
          5. What capabilities might be needed to fulfill this request
          6. Any potential ambiguities that might need clarification
          7. Whether previous context is essential to understand this request
          
          Be concise but thorough. Your analysis helps Panion respond intelligently.`
        },
        {
          role: "user",
          content: `Recent conversation history:
          ${formattedHistory}
          
          Current user message: "${message}"
          
          Analyze this message comprehensively:`
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });
    
    const reflection = response.choices[0].message.content || 
      "Failed to generate pre-request reflection.";
    
    // Store reflection
    if (!sessionReflections[sessionId]) {
      sessionReflections[sessionId] = [];
    }
    
    sessionReflections[sessionId].push({
      stage: 'pre-analysis',
      content: reflection,
      timestamp: new Date().toISOString()
    });
    
    return reflection;
  } catch (error) {
    log(`Error in pre-request reflection: ${error}`, 'panion');
    return "Error performing pre-request reflection.";
  }
}

/**
 * Perform post-response reflection to evaluate response quality and plan improvements
 */
async function performPostResponseReflection(
  userMessage: string,
  response: string,
  sessionId: string
): Promise<string> {
  try {
    // Get the pre-request reflection if available
    const preReflection = sessionReflections[sessionId]?.find(r => 
      r.stage === 'pre-analysis'
    )?.content || "No pre-request reflection available.";
    
    // Ask OpenAI to perform reflection
    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are Panion's self-evaluation system. Your job is to analyze the response given to a user and evaluate:
          1. How well it addressed the user's stated intent
          2. Whether it missed any important aspects of the request
          3. If the emotional tone was appropriate
          4. Whether follow-up might be needed
          5. How the response could be improved in the future
          
          Be honest but constructive. Your feedback helps Panion improve.`
        },
        {
          role: "user",
          content: `Pre-request analysis:
          ${preReflection}
          
          User message: "${userMessage}"
          
          Panion's response: "${response}"
          
          Evaluate this response:`
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });
    
    const reflection = aiResponse.choices[0].message.content || 
      "Failed to generate post-response reflection.";
    
    // Store reflection
    if (!sessionReflections[sessionId]) {
      sessionReflections[sessionId] = [];
    }
    
    sessionReflections[sessionId].push({
      stage: 'post-analysis',
      content: reflection,
      timestamp: new Date().toISOString()
    });
    
    // Periodically perform meta-reflection (e.g., every 5 messages)
    if (sessionReflections[sessionId].length % 5 === 0) {
      performMetaReflection(sessionId).catch(err => 
        log(`Error in meta-reflection: ${err}`, 'panion')
      );
    }
    
    return reflection;
  } catch (error) {
    log(`Error in post-response reflection: ${error}`, 'panion');
    return "Error performing post-response reflection.";
  }
}

/**
 * Perform meta-reflection to identify patterns and improve over time
 */
async function performMetaReflection(sessionId: string): Promise<void> {
  try {
    // Get all reflections for this session
    const reflections = sessionReflections[sessionId] || [];
    
    if (reflections.length < 3) {
      return; // Not enough data for meta-reflection
    }
    
    // Format reflections for the prompt
    const formattedReflections = reflections.slice(-10).map(r => 
      `[${r.stage}] ${r.timestamp}: ${r.content.substring(0, 200)}...`
    ).join('\n\n');
    
    // Ask OpenAI to perform meta-reflection
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are Panion's meta-reflection system. Your job is to analyze patterns across multiple reflections and identify:
          1. Recurring themes or issues
          2. Overall strengths in responses
          3. Areas for systematic improvement
          4. Potential new capabilities that should be developed
          
          This meta-level analysis helps Panion evolve its capabilities over time.`
        },
        {
          role: "user",
          content: `Recent reflections from session ${sessionId}:
          ${formattedReflections}
          
          Perform a meta-analysis across these reflections:`
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });
    
    const metaReflection = response.choices[0].message.content || 
      "Failed to generate meta-reflection.";
    
    // Store meta-reflection
    sessionReflections[sessionId].push({
      stage: 'meta-reflection',
      content: metaReflection,
      timestamp: new Date().toISOString()
    });
    
    // Here you could potentially update the system based on meta-reflections
    // For example, store insights in a database, adjust capability detection, etc.
    log(`Meta-reflection for session ${sessionId}: ${metaReflection.substring(0, 100)}...`, 'panion');
  } catch (error) {
    log(`Error in meta-reflection: ${error}`, 'panion');
  }
}

/**
 * Generate a fallback response using Anthropic or OpenAI if the Panion API fails
 */
async function generateFallbackResponse(
  message: string,
  sessionId: string,
  memoryContext: string,
  preReflection: string,
  strategicPlan: any
): Promise<any> {
  try {
    // Get conversation history for context
    const conversationHistory = await memory.getConversationHistory(sessionId);
    const recentMessages = conversationHistory.slice(-SESSION_MEMORY_LIMIT);
    
    // Format conversation history for the prompt (works for both OpenAI and Anthropic)
    const formattedMessages = recentMessages.map(msg => ({
      role: msg.isUser ? 'user' : 'assistant',
      content: msg.content
    }));
    
    // Prepare system message with all context
    let systemMessage = `You are Panion, an advanced AI assistant with memory, self-reflection, and strategic planning capabilities. 
    You help users with a wide range of tasks and can coordinate with specialized agents when needed.
    
    Your responses should be:
    - Direct and concise while being complete
    - Helpful and user-focused
    - Conversational but professional
    - Specific rather than generic
    - Honest about limitations`;
    
    // Add memory context if available
    if (memoryContext && memoryContext !== 'No relevant previous context found.') {
      systemMessage += `\n\nRelevant memory context from previous conversations:\n${memoryContext}`;
    }
    
    // Add pre-reflection insights
    systemMessage += `\n\nAnalysis of current request:\n${preReflection}`;
    
    // Add strategic plan if available
    if (strategicPlan) {
      systemMessage += `\n\nStrategic plan for this request:\n${strategicPlan.planDescription}\n`;
      systemMessage += `Steps:\n${strategicPlan.steps.map((step, index) => 
        `${index+1}. ${step.description}`).join('\n')}`;
    }
    
    // Add instructions for the response format
    systemMessage += `\n\nRespond in a helpful, informative way. If the request is unclear, ask for clarification.`;
    
    // First try using Anthropic if we have an API key
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        // Fix message formatting for Anthropic
        const anthropicMessages = formattedMessages.map(msg => {
          // Ensure roles are strictly 'user' or 'assistant' as required by Anthropic API
          const role = msg.role === 'user' ? 'user' : 'assistant';
          return { role, content: msg.content };
        });
        
        // Add the current message
        const allMessages = [...anthropicMessages, { role: 'user', content: message }];
        
        // Use Claude for enhanced conversational ability
        const claudeResponse = await handleAnthropicChatRequest(
          message,
          sessionId,
          allMessages,
          systemMessage
        );
        
        // Format response to match Panion API format
        return {
          response: claudeResponse.response,
          thinking: `Fallback response generated using Claude model.\n\nPre-analysis:\n${preReflection}`,
          model: "claude-3-7-sonnet-20250219",
          additional_info: {
            model: "claude-3-7-sonnet-20250219",
            fallback: true
          }
        };
      } catch (claudeError) {
        log(`Claude API error, falling back to OpenAI: ${claudeError}`, 'panion');
        // Proceed to OpenAI fallback
      }
    }
    
    // Create messages array for the OpenAI API call
    const messages = [
      { role: 'system', content: systemMessage },
      ...formattedMessages,
      { role: 'user', content: message }
    ];
    
    // Generate response using OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      temperature: 0.7,
      max_tokens: 1000
    });
    
    // Format response to match Panion API format
    return {
      response: response.choices[0].message.content,
      thinking: `Fallback response generated using OpenAI directly.\n\nPre-analysis:\n${preReflection}`,
      model: "gpt-4o",
      additional_info: {
        timestamp: new Date().toISOString(),
        session_id: sessionId,
        fallback: true
      }
    };
  } catch (error) {
    log(`Error generating fallback response: ${error}`, 'panion');
    return {
      response: "I apologize, but I'm having trouble processing your request right now. Could you try again in a moment?",
      thinking: "Error generating fallback response.",
      additional_info: {
        timestamp: new Date().toISOString(),
        session_id: sessionId,
        error: true
      }
    };
  }
}