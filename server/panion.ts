import { Router, Request, Response, NextFunction } from 'express';
import { spawn, ChildProcess } from 'child_process';
import axios from 'axios';
import { log } from './vite';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { taskManager } from './autonomous-agent';
import { extractCapabilities } from './utils/capability-detection';
import OpenAI from 'openai';
import panionBridge from './panion-bridge';
import * as conversationMemory from './conversation-memory';
import * as startupOptimizer from './startup-optimizer';

// Create router
const router = Router();

// Configuration
const PANION_API_PORT = process.env.PANION_API_PORT || 8000;
const PANION_API_URL = `http://localhost:${PANION_API_PORT}`;
const CLARA_ENDPOINT = '/api/clara';
const PANION_ENDPOINT = '/api/panion';
let panionProcess: ChildProcess | null = null;
let panionApiStarted = false;

// Task management
interface Task {
  id: string;
  type: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  description: string;
  location?: string;
  created: string;
  result?: any;
  error?: string;
  data?: any;
  params?: Record<string, any>;
}

const activeTasks: Record<string, Task> = {};

// Agent and system configuration
const AVAILABLE_AGENTS = {
  RESEARCH: 'research',
  PLANNING: 'planning',
  CREATIVE: 'creative',
  CODING: 'coding',
  WEB_SCRAPING: 'web_scraping',
  DATA_ANALYSIS: 'data_analysis',
  DOCUMENT_PROCESSING: 'document_processing',
  VIDEO: 'video',
  TASK_AUTOMATION: 'task_automation',
  DADDY_DATA: 'daddy_data'
};

// Start the Panion API process
// WebSocket server process
let wsServerProcess: ChildProcess | null = null;

export function startPanionAPI(): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      log('Starting Panion API service...', 'panion');
      
      // Kill any existing processes
      if (panionProcess) {
        panionProcess.kill();
        panionProcess = null;
      }
      
      if (wsServerProcess) {
        wsServerProcess.kill();
        wsServerProcess = null;
      }
      
      // Start the WebSocket server in background
      const wsScriptPath = path.resolve('./panion/start_websocket_server.py');
      log(`Starting WebSocket server: python3 ${wsScriptPath}`, 'panion');
      
      wsServerProcess = spawn('python3', [wsScriptPath], {
        detached: true, // Run in background
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      // Handle WebSocket server output
      wsServerProcess.stdout?.on('data', (data) => {
        log(`WS Server: ${data.toString().trim()}`, 'panion-ws');
      });
      
      wsServerProcess.stderr?.on('data', (data) => {
        log(`WS Server Error: ${data.toString().trim()}`, 'panion-ws');
      });
      
      // Spawn the Panion API process
      const pythonPath = 'python3';
      const scriptPath = path.resolve('./panion/simple_chat_api.py');
      
      log(`Executing: ${pythonPath} ${scriptPath}`, 'panion');
      
      panionProcess = spawn(pythonPath, [scriptPath], {
        env: { ...process.env, PANION_API_PORT: String(PANION_API_PORT) },
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      // Handle stdout
      panionProcess.stdout?.on('data', (data) => {
        log(`Panion API: ${data.toString().trim()}`, 'panion');
      });
      
      // Handle stderr
      panionProcess.stderr?.on('data', (data) => {
        log(`Panion API Error: ${data.toString().trim()}`, 'panion');
      });
      
      // Handle close
      panionProcess.on('close', (code) => {
        if (code !== 0) {
          log(`Panion API process exited with code ${code}`, 'panion');
          panionApiStarted = false;
        }
      });
      
      // Check if API is running
      const checkInterval = setInterval(async () => {
        try {
          const response = await axios.get(`${PANION_API_URL}/health`);
          if (response.status === 200) {
            clearInterval(checkInterval);
            panionApiStarted = true;
            log('Panion API service started successfully', 'panion');
            resolve();
          }
        } catch (error) {
          // Still starting up, continue waiting
        }
      }, 1000);
      
      // Set timeout for API startup
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!panionApiStarted) {
          log('Timed out waiting for Panion API to start', 'panion');
          reject(new Error('Timed out waiting for Panion API to start'));
        }
      }, 30000); // 30 second timeout
      
    } catch (error) {
      log(`Error starting Panion API: ${error}`, 'panion');
      reject(error);
    }
  });
}

// Middleware to check if Panion API is running
const checkPanionAPIMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  if (!panionApiStarted) {
    try {
      // Try to check if the API is already running
      await axios.get(`${PANION_API_URL}/health`);
      panionApiStarted = true;
      next();
    } catch (error) {
      try {
        // Start the API if it's not running
        await startPanionAPI();
        next();
      } catch (startError) {
        res.status(503).json({ 
          error: 'Panion API service unavailable',
          message: 'Failed to start Panion API service' 
        });
      }
    }
  } else {
    next();
  }
};

// Proxy endpoint for Panion API - chat capability
router.post('/api/panion/chat', async (req: Request, res: Response) => {
  try {
    // Debug log full request body
    log(`Chat request body: ${JSON.stringify(req.body)}`, 'panion-debug');
    
    const { 
      message, 
      content,
      sessionId = 'default',
      hasRequiredCapabilities = true, 
      capabilities: requestedCapabilities = []
    } = req.body;
    
    // Support both 'message' and 'content' parameters for flexibility
    const messageContent = content || message;
    
    if (!messageContent || typeof messageContent !== 'string') {
      log(`Invalid message content: ${JSON.stringify(messageContent)}`, 'panion-error');
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'Message content is required and must be a string' 
      });
    }
    
    // Add the message to conversation memory with improved error handling
    try {
      await conversationMemory.addMessage(sessionId, 'user', messageContent, {
        importance: 7, // Higher importance for user messages
        tags: ['user_request']
      });
    } catch (memError) {
      log(`Error adding message to memory (non-critical): ${memError}`, 'memory');
      // Continue without failing - this is non-critical
    }
    
    // Start request timing
    const requestStartTime = Date.now();
    
    // Detect capabilities if not provided, with enhanced context awareness
    let capabilities = requestedCapabilities;
    if (!capabilities || capabilities.length === 0) {
      try {
        // Get relevant context for capability detection
        let detectionContext: conversationMemory.ConversationContextResult | null = null;
        try {
          // Add the message temporarily to include in context retrieval
          // Not adding to memory yet as we'll add it properly later
          const tempMessageId = await conversationMemory.addMessage(
            sessionId, 
            'user', 
            messageContent, 
            { isTemporary: true }
          );
          
          // Get relevant conversation context for capability detection
          detectionContext = await conversationMemory.getRelevantContext(
            sessionId, 
            messageContent
          );
          
          // If this was just for detection, we'd remove the temp message
          // But since we're actually processing the message, we keep it
        } catch (memoryError) {
          log(`Non-critical error accessing conversation context for capability detection: ${memoryError}`, 'panion-error');
          // Continue without context
        }
        
        // Use the enhanced context-aware capability detection
        capabilities = await extractCapabilities(messageContent, detectionContext);
        log(`Auto-detected capabilities with context: ${capabilities.join(', ') || 'none'}`, 'panion');
      } catch (capError) {
        log(`Error auto-detecting capabilities: ${capError}`, 'panion-error');
        // Continue with empty capabilities - the endpoint should still function
        capabilities = [];
      }
    } else {
      log(`Using provided capabilities: ${capabilities.join(', ')}`, 'panion');
    }

    // Check if Panion API is running
    if (!panionApiStarted) {
      log(`Panion API service is not running, using fallback`, 'panion-error');
      
      // Send default response since we can't access the Panion API
      return res.json({
        response: "I'm sorry, but I'm currently operating in limited mode. The full Panion system is unavailable at the moment. I'll do my best to assist with basic queries.",
        thinking: "Panion API service is not running, using fallback response",
        success: true,
        fallback: true
      });
    }

    // Use our optimized bridge for communication with Python
    try {
      // Get relevant conversation context with error handling
      let conversationContext = null;
      try {
        conversationContext = await conversationMemory.getRelevantContext(
          sessionId, 
          messageContent,
          1000 // Limit tokens for better performance
        );
        log(`Retrieved conversation context with ${conversationContext?.messages?.length || 0} messages for chat`, 'memory');
      } catch (contextError) {
        log(`Error retrieving conversation context (non-critical): ${contextError}`, 'memory');
        // Continue without context - the system can still work without it, just less contextually aware
      }
      
      // Use the bridge to communicate with Panion API
      const responseData = await panionBridge.request('/chat', {
        content: messageContent,
        session_id: sessionId,
        context: conversationContext,
        metadata: {
          hasRequiredCapabilities,
          capabilities: capabilities || [],
          requestedAt: new Date().toISOString(),
          client: 'frontend',
        }
      });
      
      // Add timing information
      const requestDuration = Date.now() - requestStartTime;
      log(`Chat request processed in ${requestDuration}ms via bridge`, 'panion-perf');
      
      // Add thinking details to the response
      let thinking = '';
      
      // If capabilities were detected, add related thinking
      if (capabilities && capabilities.length > 0) {
        thinking = `Analyzing request: "${messageContent}"\n\n`;
        thinking += `Detected capabilities needed: ${capabilities.join(', ')}\n\n`;
        
        if (hasRequiredCapabilities) {
          thinking += `Required capabilities are available. Processing request directly.`;
        } else {
          thinking += `Some capabilities were missing. New agents have been created to handle this request.`;
        }
        
        // Merge with existing thinking if there is any
        if (responseData.thinking) {
          thinking += `\n\n${responseData.thinking}`;
        }
        
        // Update the thinking in the response
        responseData.thinking = thinking;
      }
      
      // Standardize the response format - ensure we have the 'response' field for consistency
      // Some API endpoints return 'message' instead of 'response'
      if (responseData.message && !responseData.response) {
        responseData.response = responseData.message;
      }
      
      // Add the assistant response to conversation memory with improved error handling
      if (responseData.response) {
        try {
          await conversationMemory.addMessage(
            sessionId, 
            'assistant', 
            responseData.response, 
            {
              importance: 7, // Higher importance for assistant responses
              tags: ['assistant_response'],
              metadata: {
                capabilities: capabilities || [],
                responseTime: requestDuration
              }
            }
          );
          log(`Successfully saved assistant response to memory for session ${sessionId}`, 'memory');
        } catch (memError) {
          log(`Error saving assistant response to memory (non-critical): ${memError}`, 'memory');
          // Continue without failing - this is non-critical
        }
      }
      
      return res.json(responseData);
    }
    catch (bridgeError) {
      // Log the error but fall back to standard HTTP
      log(`Bridge communication failed, falling back to HTTP: ${bridgeError}`, 'panion-error');
      
      // Forward the request to the Panion API with additional info
      const response = await axios.post(`${PANION_API_URL}/chat`, {
        content: messageContent,
        session_id: sessionId,  // This is the correct format for the backend
        metadata: {
          hasRequiredCapabilities,
          capabilities: capabilities || [],
          requestedAt: new Date().toISOString(),
          client: 'frontend',
        }
      });
      
      // Add timing information
      const requestDuration = Date.now() - requestStartTime;
      log(`Chat request processed in ${requestDuration}ms via HTTP fallback`, 'panion-perf');
    
      // Add thinking details to the response
      let thinking = '';
      
      // If capabilities were detected, add related thinking
      if (capabilities && capabilities.length > 0) {
        thinking = `Analyzing request: "${messageContent}"\n\n`;
        thinking += `Detected capabilities needed: ${capabilities.join(', ')}\n\n`;
        
        if (hasRequiredCapabilities) {
          thinking += `Required capabilities are available. Processing request directly.`;
        } else {
          thinking += `Some capabilities were missing. New agents have been created to handle this request.`;
        }
        
        // Merge with existing thinking if there is any
        if (response.data.thinking) {
          thinking += `\n\n${response.data.thinking}`;
        }
        
        // Update the thinking in the response
        response.data.thinking = thinking;
      }
      
      // Standardize the response format - ensure we have the 'response' field for consistency
      // Some API endpoints return 'message' instead of 'response'
      if (response.data.message && !response.data.response) {
        response.data.response = response.data.message;
      }
      
      // Add the assistant response to conversation memory with improved error handling
      if (response.data.response) {
        try {
          await conversationMemory.addMessage(
            sessionId, 
            'assistant', 
            response.data.response, 
            {
              importance: 7, // Higher importance for assistant responses
              tags: ['assistant_response', 'http_fallback'],
              metadata: {
                capabilities: capabilities || [],
                responseTime: requestDuration,
                via: 'http_fallback'
              }
            }
          );
          log(`Successfully saved assistant response to memory via HTTP fallback for session ${sessionId}`, 'memory');
        } catch (memError) {
          log(`Error saving assistant response to memory via fallback (non-critical): ${memError}`, 'memory');
          // Continue without failing - this is non-critical
        }
      }
      
      return res.json(response.data);
    }
  } catch (error) {
    // This catch block handles any errors in the entire process
    log(`Error in panion chat: ${error}`, 'panion-error');
    
    // Use OpenAI as fallback if we have the key
    try {
      if (process.env.OPENAI_API_KEY) {
        log(`Using OpenAI fallback for chat`, 'panion-debug');
        const openaiClient = new OpenAI({ 
          apiKey: process.env.OPENAI_API_KEY || ""
        });
        
        const fallbackResponse = await openaiClient.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `You are Panion, an intelligent AI assistant. Answer the user's question with clarity and accuracy. 
              Since you're operating in fallback mode, note that some advanced capabilities may not be available, 
              but you'll do your best to provide helpful information with what you can access.`
            },
            {
              role: "user",
              content: req.body.content || req.body.message
            }
          ],
          temperature: 0.7
        });
        
        // Format the response
        const responseText = fallbackResponse.choices[0].message.content || 
          "I'm having trouble processing your request at the moment. Please try again.";
          
        return res.json({
          response: responseText,
          thinking: "The main Panion API was unavailable, so I've provided a direct response using OpenAI as a backup system.",
          success: true,
          fallback: true
        });
      }
    } catch (fallbackError) {
      log(`Fallback to OpenAI also failed: ${fallbackError}`, 'panion-error');
    }
    
    // If all else fails, send a friendly error message
    return res.json({ 
      response: "I'm sorry, but I'm experiencing connection issues. I can't process your request right now. Please try again in a moment.",
      thinking: `Error details: ${error}`,
      success: false,
      error: 'Connection error'
    });
  }
});

// Proxy endpoint for Panion API - get agents
router.get('/api/panion/agents', checkPanionAPIMiddleware, async (_req: Request, res: Response) => {
  try {
    // Use the optimized bridge for communication
    const startTime = Date.now();
    
    try {
      // Use bridge for optimized communication
      const data = await panionBridge.request('/agents');
      
      // Add timing information
      const requestDuration = Date.now() - startTime;
      log(`Agents request processed in ${requestDuration}ms via bridge`, 'panion-perf');
      
      res.json(data);
    } catch (bridgeError) {
      // Log error but fall back to HTTP
      log(`Bridge communication failed for agents, falling back to HTTP: ${bridgeError}`, 'panion-error');
      
      // Fall back to direct HTTP request
      const response = await axios.get(`${PANION_API_URL}/agents`);
      
      // Add timing information
      const requestDuration = Date.now() - startTime;
      log(`Agents request processed in ${requestDuration}ms via HTTP fallback`, 'panion-perf');
      
      res.json(response.data);
    }
  } catch (error) {
    log(`Error getting panion agents: ${error}`, 'panion');
    res.status(500).json({ 
      error: 'Panion API error',
      message: 'Error communicating with Panion API' 
    });
  }
});

// Proxy endpoint for Panion API - create goal
router.post('/api/panion/goals', checkPanionAPIMiddleware, async (req: Request, res: Response) => {
  try {
    const response = await axios.post(`${PANION_API_URL}/goals`, req.body);
    res.json(response.data);
  } catch (error) {
    log(`Error creating panion goal: ${error}`, 'panion');
    res.status(500).json({ 
      error: 'Panion API error',
      message: 'Error communicating with Panion API' 
    });
  }
});

// Proxy endpoint for Panion API - get system stats
router.get('/api/panion/system/stats', checkPanionAPIMiddleware, async (_req: Request, res: Response) => {
  try {
    // Use optimized bridge with timing metrics
    const startTime = Date.now();
    
    try {
      // Use bridge for optimized communication
      const data = await panionBridge.request('/system/stats');
      
      // Add custom performance metrics
      const systemData = data as any;
      if (systemData && typeof systemData === 'object') {
        // Add bridge performance metrics to the response
        systemData.bridge_metrics = {
          response_time_ms: Date.now() - startTime,
          communication_mode: 'http_direct',
          timestamp: new Date().toISOString()
        };
      }
      
      // Add timing information to logs
      const requestDuration = Date.now() - startTime;
      log(`System stats request processed in ${requestDuration}ms via bridge`, 'panion-perf');
      
      res.json(systemData);
    } catch (bridgeError) {
      // Log error but fall back to HTTP
      log(`Bridge communication failed for system stats, falling back to HTTP: ${bridgeError}`, 'panion-error');
      
      // Fall back to direct HTTP request
      const response = await axios.get(`${PANION_API_URL}/system/stats`);
      
      // Add custom performance metrics
      const systemData = response.data;
      if (systemData && typeof systemData === 'object') {
        // Add fallback performance metrics to the response
        systemData.bridge_metrics = {
          response_time_ms: Date.now() - startTime,
          communication_mode: 'http_fallback',
          timestamp: new Date().toISOString()
        };
      }
      
      // Add timing information
      const requestDuration = Date.now() - startTime;
      log(`System stats request processed in ${requestDuration}ms via HTTP fallback`, 'panion-perf');
      
      res.json(systemData);
    }
  } catch (error) {
    log(`Error getting panion system stats: ${error}`, 'panion');
    res.status(500).json({ 
      error: 'Panion API error',
      message: 'Error communicating with Panion API' 
    });
  }
});

// Additional Panion API endpoints for new features

// Inter-agent communication endpoint for Panion to dispatch tasks to other agents
router.post('/api/panion/dispatch', checkPanionAPIMiddleware, async (req: Request, res: Response) => {
  try {
    const { targetAgent, task, parameters, priority = 'normal', callbackEndpoint = null } = req.body;
    
    if (!targetAgent || !task) {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'Target agent and task are required' 
      });
    }
    
    // Currently handling Daddy Data agent specifically
    if (targetAgent.toLowerCase() === 'daddy_data') {
      try {
        log(`Dispatching task ${task} to Daddy Data agent with priority ${priority}`, 'panion');
        let response;
        
        switch (task) {
          case 'search':
            response = await axios.post('/api/daddy-data/search', {
              query: parameters.query,
              location: parameters.location,
              limit: parameters.limit
            });
            break;
            
          case 'verify':
            response = await axios.post('/api/daddy-data/verify', {
              data: parameters.data,
              fields_to_verify: parameters.fields_to_verify
            });
            break;
            
          case 'organize':
            response = await axios.post('/api/daddy-data/organize', {
              data: parameters.data,
              format: parameters.format,
              structure: parameters.structure
            });
            break;
            
          default:
            throw new Error(`Unknown task type: ${task}`);
        }
        
        // If a callback endpoint is provided, send the results back to the source agent
        if (callbackEndpoint && response.data.success) {
          await axios.post(callbackEndpoint, {
            source: 'daddy_data',
            task,
            taskId: response.data.task_id,
            status: response.data.status,
            result: response.data
          });
        }
        
        res.json({
          success: true,
          taskId: response.data.task_id,
          status: response.data.status,
          message: `Task dispatched to Daddy Data agent: ${task}`
        });
      } catch (error: any) {
        log(`Error dispatching to Daddy Data: ${error.message}`, 'panion');
        res.status(500).json({ 
          success: false,
          error: 'Dispatch error',
          message: `Error dispatching task to Daddy Data: ${error.message}` 
        });
      }
    } else {
      // For future implementation of other agent targets
      res.status(400).json({ 
        success: false,
        error: 'Unsupported agent',
        message: `Agent ${targetAgent} is not supported for direct task dispatch yet` 
      });
    }
  } catch (error: any) {
    log(`Error in inter-agent dispatch: ${error.message}`, 'panion');
    res.status(500).json({ 
      success: false,
      error: 'Panion API error',
      message: 'Error processing inter-agent communication' 
    });
  }
});
router.post('/api/panion/scrape', checkPanionAPIMiddleware, async (req: Request, res: Response) => {
  try {
    const { 
      targetType, 
      location, 
      limit = 20, 
      additionalParams = {}, 
      useEnhancedScraper = false,
      useProxy = true,
      usePlaywright = false 
    } = req.body;
    
    if (!targetType) {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'Target type is required' 
      });
    }
    
    // Use enhanced scraper with adaptive strategies if requested
    if (useEnhancedScraper && targetType === "business") {
      // Determine which approach to show in log
      const proxyText = useProxy ? "with proxy rotation" : "without proxies";
      const playwrightText = usePlaywright ? " and browser automation" : "";
      
      log(`Using enhanced scraper for ${additionalParams.business_type || 'business'} in ${location} ${proxyText}${playwrightText}`, 'panion');
      
      try {
        const response = await axios.post(`${PANION_API_URL}/scrape/enhanced`, {
          business_type: additionalParams.business_type || "shop",
          location,
          limit,
          source: additionalParams.source || "adaptive",
          use_proxy: useProxy,
          use_playwright: usePlaywright
        });
        
        return res.json(response.data);
      } catch (error) {
        log(`Enhanced scraper failed, falling back to standard scraper: ${error}`, 'panion');
        // Continue to standard scraping if enhanced scraper fails
      }
    }
    
    // Standard scraping as fallback
    const response = await axios.post(`${PANION_API_URL}/scrape`, {
      target_type: targetType,
      location,
      limit,
      additional_params: {
        ...additionalParams,
        use_proxy: useProxy,
        use_playwright: usePlaywright
      }
    });
    
    res.json(response.data);
  } catch (error) {
    log(`Error in panion scraping: ${error}`, 'panion');
    res.status(500).json({ 
      error: 'Panion API error',
      message: 'Error communicating with Panion API' 
    });
  }
});

// Dedicated endpoint for enhanced scraper with adaptive strategy selection
router.post('/api/panion/scrape/enhanced', checkPanionAPIMiddleware, async (req: Request, res: Response) => {
  try {
    const { 
      businessType, 
      location, 
      limit = 20, 
      source = "adaptive",
      useProxy = true,
      usePlaywright = false,
      useSelenium = false,
      useStrategic = false
    } = req.body;
    
    if (!businessType || !location) {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'Business type and location are required' 
      });
    }
    
    // Determine which approach to show in log
    const proxyText = useProxy ? "with proxy rotation" : "without proxies";
    const playwrightText = usePlaywright ? " and Playwright browser automation" : "";
    const seleniumText = useSelenium ? " and Selenium browser automation" : "";
    const strategicText = useStrategic ? " and strategic orchestration" : "";
    
    log(`Using enhanced scraper for ${businessType} in ${location} with ${source} strategy ${proxyText}${playwrightText}${seleniumText}${strategicText}`, 'panion');
    
    // If strategic mode is enabled, use the chat endpoint to trigger it
    if (useStrategic) {
      // Create a strategic goal through the chat system
      const chatPayload = {
        session_id: 'strategic-scraper-session',
        content: `strategically scrape information about ${businessType} in ${location} using multiple approaches and compare results`,
        metadata: {
          hasRequiredCapabilities: true,
          capabilities: ['strategic_thinking', 'web_research', 'data_integration'],
          client: 'frontend'
        }
      };
      
      const response = await axios.post(`${PANION_API_URL}/chat`, chatPayload);
      
      // Extract operation ID from the response if available
      // Check both response and message fields since the API can return either format
      const responseText = response.data.response || response.data.message || '';
      const operationIdMatch = responseText.match(/Operation ID: (op_\d+)/);
      const operationId = operationIdMatch ? operationIdMatch[1] : null;
      
      // Ensure we have a consistent message format
      const responseMessage = response.data.response || response.data.message || 'Strategic scraping operation initiated';
      
      return res.json({
        status: 'strategic_initiated',
        message: responseMessage,
        response: responseMessage, // Add response field for consistency
        operation_id: operationId,
        thinking: response.data.thinking
      });
    }
    
    // Otherwise forward the request to the enhanced scraper API
    const response = await axios.post(`${PANION_API_URL}/scrape/enhanced`, {
      business_type: businessType,
      location,
      limit,
      source,
      use_proxy: useProxy,
      use_playwright: usePlaywright,
      use_selenium: useSelenium
    });
    
    res.json(response.data);
  } catch (error) {
    log(`Error in enhanced scraping: ${error}`, 'panion');
    res.status(500).json({ 
      error: 'Enhanced scraper error',
      message: 'Error with enhanced scraping system' 
    });
  }
});

// Strategic operation - use multiple approaches and get optimized results
router.post('/api/panion/strategic', checkPanionAPIMiddleware, async (req: Request, res: Response) => {
  try {
    const { goal, parameters } = req.body;
    
    if (!goal) {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'Goal description is required' 
      });
    }
    
    log(`Strategic operation request: ${goal}`, 'panion');
    
    // Start request timing
    const requestStartTime = Date.now();
    
    // Extract capabilities from the request parameters or use a default set
    const userCapabilities = parameters?.capabilities || [];
    const sessionId = parameters?.sessionId || 'default-session';
    
    // Add the strategic goal to conversation memory
    await conversationMemory.addMessage(sessionId, 'user', goal);
    
    // Get relevant conversation context
    const conversationContext = await conversationMemory.getRelevantContext(
      sessionId, 
      goal
    );
    
    try {
      // Use the bridge to communicate with Panion API
      const responseData = await panionBridge.request('/chat', {
        content: goal,
        session_id: sessionId,
        context: conversationContext,
        metadata: {
          hasRequiredCapabilities: true,
          // Don't include web_research by default, let the system detect if it's needed
          capabilities: userCapabilities.length > 0 ? userCapabilities : ['strategic_thinking', 'self_reflection'],
          parameters: parameters || {},
          client: 'frontend',
          requestedAt: new Date().toISOString()
        }
      });
      
      // Add timing information
      const requestDuration = Date.now() - requestStartTime;
      log(`Strategic operation processed in ${requestDuration}ms via bridge`, 'panion-perf');
      
      // Extract operation ID from the response if available
      // Check both response and message fields for the operation ID
      const responseText = responseData.response || responseData.message || '';
      const operationIdMatch = responseText.match(/Operation ID: (op_\d+)/);
      const operationId = operationIdMatch ? operationIdMatch[1] : `op_${Date.now()}`;
      
      // Ensure we have a consistent message format
      const responseMessage = responseData.response || responseData.message || 'Strategic operation initiated';
      
      // Add the assistant response to conversation memory
      await conversationMemory.addMessage(sessionId, 'assistant', responseMessage);
      
      return res.json({
        status: 'initiated',
        message: responseMessage,
        response: responseMessage, // Add response field for consistency
        operation_id: operationId,
        thinking: responseData.thinking
      });
    } catch (bridgeError) {
      // Log error but fall back to HTTP
      log(`Bridge communication failed for strategic operation, falling back to HTTP: ${bridgeError}`, 'panion-error');
      
      // Fall back to direct HTTP request
      const chatPayload = {
        session_id: sessionId,
        content: goal, // The goal statement is sent as chat content
        metadata: {
          hasRequiredCapabilities: true,
          // Don't include web_research by default, let the system detect if it's needed
          capabilities: userCapabilities.length > 0 ? userCapabilities : ['strategic_thinking', 'self_reflection'],
          parameters: parameters || {},
          client: 'frontend'
        }
      };
      
      const response = await axios.post(`${PANION_API_URL}/chat`, chatPayload);
      
      // Add timing information
      const requestDuration = Date.now() - requestStartTime;
      log(`Strategic operation processed in ${requestDuration}ms via HTTP fallback`, 'panion-perf');
      
      // Extract operation ID from the response if available
      // Check both response and message fields for the operation ID
      const responseText = response.data.response || response.data.message || '';
      const operationIdMatch = responseText.match(/Operation ID: (op_\d+)/);
      const operationId = operationIdMatch ? operationIdMatch[1] : `op_${Date.now()}`;
      
      // Ensure we have a consistent message format
      const responseMessage = response.data.response || response.data.message || 'Strategic operation initiated';
      
      // Add the assistant response to conversation memory
      await conversationMemory.addMessage(sessionId, 'assistant', responseMessage);
      
      return res.json({
        status: 'initiated',
        message: responseMessage,
        response: responseMessage, // Add response field for consistency
        operation_id: operationId,
        thinking: response.data.thinking
      });
    }
  } catch (error) {
    log(`Strategic operation error: ${error}`, 'panion');
    res.status(500).json({ 
      error: 'Strategic operation error',
      message: 'Error initiating strategic operation' 
    });
  }
});

// Get status of a strategic operation
router.get('/api/panion/strategic/status/:operationId', checkPanionAPIMiddleware, async (req: Request, res: Response) => {
  try {
    const { operationId } = req.params;
    
    log(`Getting strategic operation status: ${operationId}`, 'panion');
    
    // Get status from the Panion API
    const response = await axios.post(`${PANION_API_URL}/strategic/status`, {
      operation_id: operationId
    });
    
    return res.json(response.data);
  } catch (error) {
    log(`Strategic status error: ${error}`, 'panion');
    res.status(500).json({ 
      error: 'Strategic status error',
      message: 'Error getting strategic operation status' 
    });
  }
});

// Get results of a strategic operation
router.get('/api/panion/strategic/results/:operationId', checkPanionAPIMiddleware, async (req: Request, res: Response) => {
  try {
    const { operationId } = req.params;
    
    log(`Getting strategic operation results: ${operationId}`, 'panion');
    
    // Get results from the Panion API
    const response = await axios.post(`${PANION_API_URL}/strategic/results`, {
      operation_id: operationId
    });
    
    return res.json(response.data);
  } catch (error) {
    log(`Strategic results error: ${error}`, 'panion');
    res.status(500).json({ 
      error: 'Strategic results error',
      message: 'Error getting strategic operation results' 
    });
  }
});

router.post('/api/panion/analyze', checkPanionAPIMiddleware, async (req: Request, res: Response) => {
  try {
    const { dataFile, analysisType, params = {} } = req.body;
    
    if (!dataFile || !analysisType) {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'Data file and analysis type are required' 
      });
    }
    
    // Forward the request to the Panion API
    const response = await axios.post(`${PANION_API_URL}/analyze`, {
      data_file: dataFile,
      analysis_type: analysisType,
      params
    });
    
    res.json(response.data);
  } catch (error) {
    log(`Error in panion data analysis: ${error}`, 'panion');
    res.status(500).json({ 
      error: 'Panion API error',
      message: 'Error communicating with Panion API' 
    });
  }
});

// In-memory task storage for tracking background tasks
const tasks: Record<string, Task> = {};

//  Endpoint for creating a smoke shop search task is defined further down

// Endpoint to check task status
router.get('/api/panion/task/:taskId', checkPanionAPIMiddleware, async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    
    if (!taskId || !tasks[taskId]) {
      return res.status(404).json({ 
        error: 'Task not found',
        message: 'The specified task does not exist' 
      });
    }
    
    // Return the current task status
    res.json(tasks[taskId]);
  } catch (error) {
    log(`Error getting task status: ${error}`, 'panion');
    res.status(500).json({ 
      error: 'Task status error',
      message: 'Error retrieving task status' 
    });
  }
});

// Dynamic agent creation endpoint
// Process messages for dynamic agents
router.post('/api/panion/agents/process', checkPanionAPIMiddleware, async (req: Request, res: Response) => {
  try {
    const { 
      agentId, 
      message, 
      capabilities = [], 
      useStrategicMode = true, 
      verboseResponses = false,
      history = []
    } = req.body;
    
    if (!agentId || !message) {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'Agent ID and message are required' 
      });
    }
    
    log(`Processing message for agent ${agentId} with strategic mode: ${useStrategicMode ? 'enabled' : 'disabled'}`, 'panion');
    
    // Forward the request to the Panion API
    const response = await axios.post(`${PANION_API_URL}/agents/process`, {
      agent_id: agentId,
      message,
      capabilities,
      use_strategic_mode: useStrategicMode,
      verbose_responses: verboseResponses,
      history: history.map((msg: any) => ({
        content: msg.content,
        role: msg.role === 'agent' ? 'assistant' : msg.role,
        timestamp: msg.timestamp
      }))
    });
    
    const responseData = response.data || {};
    
    // Return a well-formed response
    res.json({
      success: true,
      response: responseData.response || "I processed your request, but I'm not sure how to respond.",
      reasoning: responseData.reasoning || null,
      metadata: responseData.metadata || {},
      capabilities_used: responseData.capabilities_used || []
    });
  } catch (error) {
    log(`Error processing agent message: ${error}`, 'panion');
    res.status(500).json({ 
      error: 'Panion API error',
      message: 'Error processing agent message'
    });
  }
});

router.post('/api/panion/agents/create', checkPanionAPIMiddleware, async (req: Request, res: Response) => {
  try {
    const { 
      name, 
      description,
      capabilities = [],
      icon = 'cpu',
      agentType = 'specialized'
    } = req.body;
    
    if (!name || !description || !capabilities.length) {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'Agent name, description, and at least one capability are required' 
      });
    }
    
    log(`Creating dynamic agent "${name}" with capabilities: ${capabilities.join(', ')}`, 'panion');
    
    // Forward the request to the Panion API
    const response = await axios.post(`${PANION_API_URL}/agents/create`, {
      name,
      description,
      capabilities,
      icon,
      agent_type: agentType,
      metadata: {
        created_at: new Date().toISOString(),
        client: 'frontend'
      }
    });
    
    res.json(response.data);
  } catch (error) {
    log(`Error creating dynamic agent: ${error}`, 'panion');
    res.status(500).json({ 
      error: 'Panion API error',
      message: 'Error creating dynamic agent' 
    });
  }
});

// Get available capabilities
router.get('/api/panion/capabilities', checkPanionAPIMiddleware, async (_req: Request, res: Response) => {
  try {
    const response = await axios.get(`${PANION_API_URL}/capabilities`);
    res.json(response.data);
  } catch (error) {
    log(`Error getting capabilities: ${error}`, 'panion');
    res.status(500).json({ 
      error: 'Panion API error',
      message: 'Error getting available capabilities' 
    });
  }
});

// Detect required capabilities for a message
router.post('/api/panion/detect-capabilities', async (req: Request, res: Response) => {
  try {
    const { message, sessionId = 'default' } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'Message content is required and must be a string' 
      });
    }
    
    log(`Detecting capabilities for message: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`, 'capability-detection');
    
    const startTime = Date.now();
    
    // Get conversation context if available
    let conversationContext: conversationMemory.ConversationContextResult | null = null;
    try {
      // Temporarily add the message to memory to include in context retrieval
      // This helps get better context but we'll remove it if this is just capability detection
      const tempMessageId = await conversationMemory.addMessage(sessionId, 'user', message, { 
        importance: 5, 
        tags: ['capability_detection']
      });
      
      // Get relevant conversation context
      conversationContext = await conversationMemory.getRelevantContext(
        sessionId, 
        message
      );
      
      // Remove the temporary message if this is just for detection
      if (tempMessageId && req.body.detectOnly === true) {
        // Only remove if this is just for detection, not a real message
        await conversationMemory.cleanupInactiveConversations(0.01); // 36 seconds (immediate cleanup)
      }
    } catch (memoryError) {
      log(`Non-critical error accessing conversation memory: ${memoryError}`, 'memory');
      // Continue without context
    }
    
    // Extract capabilities with the enhanced context
    const capabilities = await extractCapabilities(message, conversationContext);
    
    log(`Detected capabilities: ${capabilities.join(', ') || 'none'}`, 'capability-detection');
    
    // Add timing metrics
    const detectionTime = Date.now() - startTime;
    
    res.json({
      success: true,
      capabilities,
      metrics: {
        detection_time_ms: detectionTime,
        message_length: message.length,
        context_available: conversationContext !== null,
        has_chat_history: conversationContext !== null && Array.isArray(conversationContext.messages) && conversationContext.messages.length > 0
      },
      message: 'Capabilities detected successfully'
    });
  } catch (error) {
    log(`Error detecting capabilities: ${error}`, 'capability-detection');
    res.status(500).json({ 
      error: 'Capability detection error',
      message: 'Error detecting required capabilities',
      capabilities: [] // Return empty array on error to allow fallback
    });
  }
});

router.post('/api/panion/document', checkPanionAPIMiddleware, async (req: Request, res: Response) => {
  try {
    const { file, processType, params = {} } = req.body;
    
    if (!file || !processType) {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'File and process type are required' 
      });
    }
    
    // Forward the request to the Panion API
    const response = await axios.post(`${PANION_API_URL}/document`, {
      file,
      process_type: processType,
      params
    });
    
    res.json(response.data);
  } catch (error) {
    log(`Error in panion document processing: ${error}`, 'panion');
    res.status(500).json({ 
      error: 'Panion API error',
      message: 'Error communicating with Panion API' 
    });
  }
});

router.post('/api/panion/video', checkPanionAPIMiddleware, async (req: Request, res: Response) => {
  try {
    const { title, description, style, duration, resolution } = req.body;
    
    if (!title || !description) {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'Title and description are required' 
      });
    }
    
    // Forward the request to the Panion API
    const response = await axios.post(`${PANION_API_URL}/video`, {
      title,
      description,
      style,
      duration,
      resolution
    });
    
    res.json(response.data);
  } catch (error) {
    log(`Error in panion video generation: ${error}`, 'panion');
    res.status(500).json({ 
      error: 'Panion API error',
      message: 'Error communicating with Panion API' 
    });
  }
});

router.post('/api/panion/schedule', checkPanionAPIMiddleware, async (req: Request, res: Response) => {
  try {
    const { taskName, taskType, schedule, params = {} } = req.body;
    
    if (!taskName || !taskType || !schedule) {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'Task name, type, and schedule are required' 
      });
    }
    
    // Forward the request to the Panion API
    const response = await axios.post(`${PANION_API_URL}/schedule`, {
      task_name: taskName,
      task_type: taskType,
      schedule,
      params
    });
    
    res.json(response.data);
  } catch (error) {
    log(`Error in panion task scheduling: ${error}`, 'panion');
    res.status(500).json({ 
      error: 'Panion API error',
      message: 'Error communicating with Panion API' 
    });
  }
});

// Dedicated smoke shop search endpoint using Daddy Data
router.post('/api/panion/smokeshop/search', checkPanionAPIMiddleware, async (req: Request, res: Response) => {
  try {
    const { 
      location, 
      limit = 20, 
      includeOwnerInfo: includedOwnerInfo = false,
      include_owner_info = false, 
      deepSearch: includedDeepSearch = false,
      deep_search = false,
      verifyResults: includedVerifyResults = true,
      verify_results = true,
      additionalKeywords: includedAdditionalKeywords = [],
      additional_keywords = [] 
    } = req.body;
    
    // Handle different parameter naming conventions
    const includeOwnerInfo = includedOwnerInfo === true || include_owner_info === true;
    const deepSearch = includedDeepSearch === true || deep_search === true;
    const verifyResults = includedVerifyResults === true || verify_results === true;
    const additionalKeywords = includedAdditionalKeywords.length > 0 ? includedAdditionalKeywords : additional_keywords;
    
    // Log parameters for debugging
    log(`Smoke shop search parameters: location=${location}, includeOwnerInfo=${includeOwnerInfo}, deepSearch=${deepSearch}`, 'panion');
    
    // Verify we have a location - no default anymore to avoid incorrect assumptions
    if (!location) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing location',
        message: 'A location must be specified for smoke shop searches'
      });
    }
    
    // Enhanced task description based on request type
    const taskDescription = includeOwnerInfo 
      ? `Finding smoke shop owner contact information in ${location}` 
      : `Searching for smoke shops in ${location}`;
    
    // Generate task ID
    const taskId = `smokeshop-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Create a new task and add it to tasks storage with enhanced properties
    const task: Task = {
      id: taskId,
      type: includeOwnerInfo ? 'smokeshop_research' : 'smokeshop_search',
      status: 'pending',
      progress: 0,
      description: taskDescription,
      location,
      created: new Date().toISOString(),
      data: {
        limit,
        includeOwnerInfo,
        deepSearch,
        verifyResults,
        additionalKeywords,
        params: { // Store original request parameters for context
          location,
          includeOwnerInfo,
          deepSearch,
          verifyResults
        }
      }
    };
    
    tasks[taskId] = task;
    
    log(`Created ${includeOwnerInfo ? 'owner info' : 'smoke shop'} search task: ${taskId} for ${location}`, 'panion');
    
    // Process this task with progressive updates and verification
    setTimeout(() => {
      try {
        // Update to in-progress
        tasks[taskId].status = 'in_progress';
        tasks[taskId].progress = 10;
        tasks[taskId].description = `${taskDescription} - Initializing search`;
        
        // Build search parameters
        const searchKeywords = ['smoke shop'];
        
        // Add any additional keywords from the request
        if (additionalKeywords && additionalKeywords.length) {
          searchKeywords.push(...additionalKeywords);
        }
        
        // Update progress
        tasks[taskId].progress = 25;
        tasks[taskId].description = `${taskDescription} - Searching data sources`;
        
        // Execute the search using the enhanced scraper
        axios.post(`${PANION_API_URL}/scrape/enhanced`, {
          business_type: searchKeywords.join(' '),
          location: location,
          limit: Math.max(limit, includeOwnerInfo ? 15 : limit), // Get more results for owner searches
          source: deepSearch ? 'comprehensive' : 'adaptive',
          use_proxy: true,
          use_playwright: deepSearch || includeOwnerInfo, // Use more advanced techniques for owner searches
          use_selenium: false, // Keep selenium off by default
          include_owner_info: includeOwnerInfo
        }).then(async response => {
          // Update progress 
          tasks[taskId].progress = 60;
          tasks[taskId].description = `${taskDescription} - Processing results`;
          
          // Process the response data
          const responseData = response.data;
          let results = [];
          
          // Handle different response formats
          if (responseData.results) {
            results = responseData.results;
          } else if (responseData.filepath) {
            try {
              // Read file if data was saved to disk
              log(`Attempting to read data from file: ${responseData.filepath}`, 'panion');
              const fs = require('fs');
              const fileContent = fs.readFileSync(responseData.filepath, 'utf8');
              results = JSON.parse(fileContent);
              log(`Successfully loaded ${results.length} results from ${responseData.filepath}`, 'panion');
            } catch (fileError: any) {
              log(`Error reading file ${responseData.filepath}: ${fileError.message}`, 'panion');
              // Continue with any partial data we might have
              results = responseData.data || [];
            }
          } else if (responseData.file_path) {
            try {
              // Legacy format - read file if data was saved to disk
              const fs = require('fs');
              const fileContent = fs.readFileSync(responseData.file_path, 'utf8');
              results = JSON.parse(fileContent);
            } catch (fileError: any) {
              log(`Error reading file ${responseData.file_path}: ${fileError.message}`, 'panion');
              // Continue with any partial data we might have
              results = responseData.data || [];
            }
          } else if (responseData.data) {
            results = responseData.data;
          } else {
            // If we still don't have results, try looking in the standard location
            try {
              const filename = `smoke_shop_${location.replace(' ', '_')}.json`;
              const possibleFilepath = `./data/scraped/${filename}`;
              log(`Trying to find results in default location: ${possibleFilepath}`, 'panion');
              // Use the imported fs and path modules
              // Define file paths using path.resolve for more reliable path resolution
              const possibleFullPath = path.resolve(process.cwd(), possibleFilepath);
              
              try {
                if (fs.existsSync(possibleFullPath)) {
                  // File exists
                  const fileContent = fs.readFileSync(possibleFullPath, 'utf8');
                  results = JSON.parse(fileContent);
                  log(`Found ${results.length} results in default location`, 'panion');
                } else {
                  log(`No file found at ${possibleFullPath}`, 'panion');
                  
                  // Try alternative format
                  const alternateFilepath = `./data/scraped/smokeshop_${location.replace(' ', '_')}.json`;
                  const alternateFullPath = path.resolve(process.cwd(), alternateFilepath);
                  
                  if (fs.existsSync(alternateFullPath)) {
                    const fileContent = fs.readFileSync(alternateFullPath, 'utf8');
                    results = JSON.parse(fileContent);
                    log(`Found ${results.length} results in alternate location: ${alternateFullPath}`, 'panion');
                  } else {
                    log(`No file found at ${alternateFullPath} either`, 'panion');
                    results = [];
                  }
                }
              } catch (fileError: any) {
                log(`Error reading scrape files: ${fileError.message}`, 'panion');
                results = [];
              }
            } catch (fileError: any) {
              log(`Error reading default location: ${fileError.message}`, 'panion');
              results = [];
            }
          }
          
          // Verify results if requested
          if (verifyResults && results.length > 0) {
            tasks[taskId].progress = 80;
            tasks[taskId].description = `${taskDescription} - Verifying data quality`;
            
            // Enhanced validation function for shop data with detailed quality assessment
            const isValidShopData = (shop: any) => {
              // Basic shop info validation - must have name and at least one contact method
              const hasBasicInfo = shop.name && (shop.address || shop.phone || shop.website || shop.url);
              
              if (!hasBasicInfo) {
                log(`Rejected shop data - missing basic info: ${JSON.stringify(shop).substring(0, 100)}...`, 'panion');
                return false;
              }
              
              // For owner info requests, properly validate owner fields
              if (includeOwnerInfo) {
                // Check for owner-specific fields
                const hasOwnerInfo = shop.owner_name || 
                  shop.owner_email || 
                  (shop.owner_phone && shop.owner_phone !== shop.phone) ||
                  shop.owner_contact ||
                  shop.contact_person ||
                  shop.owner_details;
                
                // When explicitly requesting owner info, we need at least some owner data
                // We're setting a high standard for data quality
                if (!hasOwnerInfo) {
                  // Log this for debugging but still return true to avoid filtering all results
                  // Just mark it with lower quality score 
                  log(`Shop data missing owner info: ${shop.name}`, 'panion');
                  
                  // For this implementation, we'll still include basic shop info
                  // but with a note that owner data needs to be enhanced
                  shop.owner_status = "needs_research";
                  shop.data_quality = "basic";
                  return true;
                } else {
                  // Data has owner info
                  shop.owner_status = "available";
                  shop.data_quality = "enhanced";
                  return true;
                }
              }
              
              // For basic shop queries, just return shops with basic info
              return hasBasicInfo;
            };
            
            // Filter out invalid results
            const validResults = results.filter(isValidShopData);
            
            // Calculate quality score (0-100)
            const qualityScore = results.length > 0 ? (validResults.length / results.length) * 100 : 0;
            
            // Log quality information
            log(`Results quality for ${location}: ${qualityScore.toFixed(1)}% (${validResults.length}/${results.length} valid)`, 'panion');
            
            // If we have enough valid results, use those; otherwise keep the original set
            if (validResults.length >= Math.min(3, limit)) {
              results = validResults;
            }
            
            // Limit to requested number after filtering
            results = results.slice(0, limit);
          }
          
          // Final data preparation and validation
          results.forEach((shop: any) => {
            // Ensure consistent field naming
            if (shop.business_name && !shop.name) shop.name = shop.business_name;
            if (shop.phone_number && !shop.phone) shop.phone = shop.phone_number;
            
            // Process ownership data when requested
            if (includeOwnerInfo) {
              // Check if we found real owner information, or need to mark for further research
              const hasOwnerData = shop.owner_name || 
                shop.owner_email || 
                (shop.owner_phone && shop.owner_phone !== shop.phone) ||
                shop.owner_contact ||
                shop.contact_person ||
                shop.owner_details;
              
              // Add ownership metadata
              if (!hasOwnerData && !shop.owner_status) {
                shop.owner_status = "needs_research";
                shop.data_quality = "basic";
                shop.owner_notes = "Owner information requires further research";
              } else if (hasOwnerData && !shop.owner_status) {
                shop.owner_status = "available";
                shop.data_quality = "enhanced";
              }
              
              // If we didn't find anything about owners at all
              if (!shop.owner_status) {
                shop.owner_status = "unknown";
                shop.data_quality = "basic";
                shop.owner_notes = "No owner information available";
              }
            }
          });
          
          // Successful completion
          tasks[taskId].status = 'completed';
          tasks[taskId].progress = 100;
          tasks[taskId].description = `${taskDescription} - Complete`;
          tasks[taskId].data = results;
          tasks[taskId].params = {
            location,
            includeOwnerInfo,
            deepSearch,
            additionalKeywords
          };
          
          log(`Completed ${includeOwnerInfo ? 'owner info' : 'smoke shop'} search task: ${taskId} with ${results.length} results`, 'panion');
        }).catch(error => {
          // Failed to get data
          tasks[taskId].status = 'failed';
          tasks[taskId].progress = 100;
          tasks[taskId].error = `Failed to get data: ${error.message}`;
          log(`Error getting smoke shop data for task ${taskId}: ${error.message}`, 'panion');
        });
      } catch (error: any) {
        // Update task if there was an error
        tasks[taskId].status = 'failed';
        tasks[taskId].progress = 100;
        tasks[taskId].error = `Failed to process task: ${error.message}`;
        log(`Error processing task ${taskId}: ${error.message}`, 'panion');
      }
    }, 500);
    
    // Return the task ID immediately
    res.json({
      success: true,
      taskId,
      message: includeOwnerInfo 
        ? 'Smoke shop owner information search task created' 
        : 'Smoke shop search task created',
      task
    });
  } catch (error: any) {
    log(`Error creating smoke shop search task: ${error.message}`, 'panion');
    res.status(500).json({
      success: false,
      error: 'Task creation error',
      message: `Error creating smoke shop search task: ${error.message}`
    });
  }
});

// Task status endpoint - simplified to use only local tracking
router.get('/api/panion/task/:taskId', checkPanionAPIMiddleware, async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    
    // Check if task exists in our local tracking
    if (tasks[taskId]) {
      return res.json({
        success: true,
        task: tasks[taskId]
      });
    }
    
    // Task not found
    return res.status(404).json({
      success: false,
      error: 'Task not found',
      message: `No task found with ID: ${taskId}`
    });
  } catch (error: any) {
    log(`Error getting task status: ${error.message}`, 'panion');
    res.status(500).json({
      success: false,
      error: 'Task status error',
      message: `Error getting task status: ${error.message}`
    });
  }
});

// Endpoint to delegate tasks to the autonomous agent
router.post('/api/panion/autonomous-task', checkPanionAPIMiddleware, async (req: Request, res: Response) => {
  try {
    const { 
      description,
      agentType = 'general',
      priority = 'medium',
      autoStart = true,
      autoRetry = true,
      resources = {},
      prompt = '',
      params = {},
      strategicMode = false,
      advancedPlanning = false,
      capabilities = [],
      additionalContext = {}
    } = req.body;
    
    // Use the provided description or generate one from the prompt
    const taskDescription = description || (prompt ? `Autonomous task: ${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}` : null);
    
    if (!taskDescription) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'Either task description or prompt is required'
      });
    }
    
    // Create a task using the autonomous agent system
    const taskData = {
      agentType,
      description: taskDescription,
      priority,
      autoStart,
      autoRetry,
      resources: {
        ...resources,
        prompt,
        params,
        strategicMode,
        advancedPlanning,
        capabilities,
        additionalContext
      }
    };
    
    log(`Creating autonomous task: ${taskDescription}`, 'panion');
    
    // Create a new task with the autonomous agent
    const taskId = uuidv4();
    
    // Create task configuration
    const taskConfig = {
      agentType,
      description: taskDescription,
      priority,
      startTime: new Date(),
      logs: [
        `[${new Date().toISOString()}] Task created through Panion integration`,
        `[${new Date().toISOString()}] Strategy: ${strategicMode ? (advancedPlanning ? 'Advanced Planning' : 'Strategic Mode') : 'Standard'}`
      ],
      resources: taskData.resources,
      retryCount: 0,
      maxRetries: autoRetry ? 3 : 0,
    };
    
    // Use the improved createTask method from taskManager
    const task = taskManager.createTask(taskId, taskConfig);
    
    // Start processing if autoStart is true
    if (autoStart) {
      // Use the dedicated startTask method
      taskManager.startTask(taskId);
    }
    
    return res.json({
      success: true,
      id: taskId,
      message: 'Autonomous task created successfully',
      status: task.status
    });
  } catch (error: any) {
    log(`Error creating autonomous task: ${error.message}`, 'panion');
    res.status(500).json({
      success: false,
      error: 'Autonomous Agent error',
      message: `Error creating autonomous task: ${error.message}`
    });
  }
});

// Clara API endpoints
router.post('/api/clara/chat', async (req: Request, res: Response) => {
  try {
    const { message, sessionId = 'default', userId = 'anonymous' } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'Message is required and must be a string' 
      });
    }
    
    // Check if Panion API is running
    if (!panionApiStarted) {
      log(`Panion API service is not running, using fallback for Clara`, 'panion-error');
      
      // Send default response since we can't access the Clara API
      return res.json({
        response: "I'm Clara, your emotional support companion. I'm currently operating in limited mode and can't access all my capabilities. How can I help you today?",
        thinking: "Clara API service is not running, using fallback response",
        success: true,
        fallback: true
      });
    }
    
    try {
      // Forward the request to the Panion API - Clara endpoint
      const response = await axios.post(`${PANION_API_URL}/clara/chat`, {
        content: message,
        session_id: sessionId,
        user_id: userId
      });
      
      return res.json(response.data);
    } catch (claraApiError) {
      log(`Error in Clara chat API: ${claraApiError}`, 'panion-error');
      
      // Use OpenAI as fallback if we have the key
      try {
        if (process.env.OPENAI_API_KEY) {
          log(`Using OpenAI fallback for Clara chat`, 'panion-debug');
          const openaiClient = new OpenAI({ 
            apiKey: process.env.OPENAI_API_KEY || ""
          });
          
          const fallbackResponse = await openaiClient.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: `You are Clara, an emotional support AI companion. You are warm, compassionate, and empathetic.
                You focus on providing emotional support and personal guidance.
                Since you're operating in fallback mode, note that some advanced capabilities may not be available,
                but you'll do your best to provide supportive and helpful guidance to the user.`
              },
              {
                role: "user",
                content: message
              }
            ],
            temperature: 0.7
          });
          
          // Format the response
          const responseText = fallbackResponse.choices[0].message.content || 
            "I'm having trouble processing your request right now, but I'm here for you. How can I help?";
            
          return res.json({
            response: responseText,
            thinking: "The Clara API was unavailable, so I've provided a direct response using OpenAI as a backup.",
            success: true,
            fallback: true
          });
        }
      } catch (fallbackError) {
        log(`Fallback to OpenAI also failed for Clara: ${fallbackError}`, 'panion-error');
      }
      
      // If all else fails, use a generic supportive message
      return res.json({
        response: "Hi, I'm Clara. I'm experiencing some technical difficulties at the moment, but I'm still here for you. How are you feeling today?",
        thinking: "Multiple fallbacks failed. Using generic supportive response.",
        success: true,
        fallback: true
      });
    }
  } catch (error) {
    log(`Critical error in Clara chat: ${error}`, 'panion-error');
    
    // Even in the worst case, still return something helpful rather than an error
    return res.json({ 
      response: "I'm Clara, your emotional support companion. I seem to be having some technical difficulties, but I'd still like to help if I can. How are you feeling today?",
      thinking: `Error details: ${error}`,
      success: false,
      error: 'Temporary system issue'
    });
  }
});

router.post('/api/clara/goal', async (req: Request, res: Response) => {
  try {
    const { message, sessionId = 'default' } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'Message is required and must be a string' 
      });
    }
    
    // Check if Panion API is running
    if (!panionApiStarted) {
      log(`Panion API service is not running, using fallback for Clara goal creation`, 'panion-error');
      
      return res.json({
        success: false,
        goal_id: 'temp_' + Date.now(),
        message: "I've noted your goal, but I'm currently in limited mode and can't process it fully. Please try again later when my systems are back online.",
        fallback: true
      });
    }
    
    try {
      // Forward the request to the Panion API - Clara goal creation
      const response = await axios.post(`${PANION_API_URL}/clara/goal`, {
        content: message,
        session_id: sessionId
      });
      
      return res.json(response.data);
    } catch (goalsApiError) {
      log(`Error in Clara goal creation API: ${goalsApiError}`, 'panion-error');
      
      // Return a helpful response even when the API fails
      return res.json({
        success: false,
        goal_id: 'temp_' + Date.now(),
        message: "I've made note of your goal, but I'm having trouble saving it in my system right now. Could you try again in a few moments?",
        error: "Temporary system issue"
      });
    }
  } catch (error) {
    log(`Critical error in Clara goal creation: ${error}`, 'panion-error');
    
    // Even in the worst case, provide a helpful response
    return res.json({
      success: false,
      message: "I'd like to help with your goal, but I'm experiencing some technical difficulties. Please try again shortly.",
      error: "System error"
    });
  }
});

router.get('/api/clara/goals', async (req: Request, res: Response) => {
  try {
    // Check if Panion API is running
    if (!panionApiStarted) {
      log(`Panion API service is not running, using fallback for Clara goals listing`, 'panion-error');
      
      // Return empty goals list with explanatory message
      return res.json({
        goals: [],
        message: "I'm unable to retrieve your goals right now as my systems are in limited mode.",
        fallback: true
      });
    }
    
    try {
      // Forward the request to the Panion API - Clara goals
      const response = await axios.get(`${PANION_API_URL}/clara/goals`);
      return res.json(response.data);
    } catch (goalsApiError) {
      log(`Error getting Clara goals: ${goalsApiError}`, 'panion-error');
      
      // Return empty goals with a helpful message
      return res.json({
        goals: [],
        message: "I'm having trouble retrieving your goals at the moment. Please try again shortly.",
        error: "Temporary system issue"
      });
    }
  } catch (error) {
    log(`Critical error getting Clara goals: ${error}`, 'panion-error');
    
    // Even in worst case, return something useful to the user
    return res.json({
      goals: [],
      message: "I'm experiencing technical difficulties retrieving your goals. Please try again later.",
      error: "System error"
    });
  }
});

router.post('/api/clara/expand-dream', async (req: Request, res: Response) => {
  try {
    const { goalId, message } = req.body;
    
    if (!goalId || !message) {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'Goal ID and message are required' 
      });
    }
    
    // Check if Panion API is running
    if (!panionApiStarted) {
      log(`Panion API service is not running, using fallback for Clara dream expansion`, 'panion-error');
      
      // Return fallback response
      return res.json({
        success: false,
        expansion: "I'd love to expand on your dream, but I'm currently operating in limited mode. Please try again when my systems are fully online.",
        fallback: true
      });
    }
    
    try {
      // Forward the request to the Panion API - Clara dream expansion
      const response = await axios.post(`${PANION_API_URL}/clara/expand-dream`, {
        goal_id: goalId,
        content: message
      });
      
      return res.json(response.data);
    } catch (dreamApiError) {
      log(`Error in Clara dream expansion API: ${dreamApiError}`, 'panion-error');
      
      // Try to provide a helpful generic expansion using OpenAI if available
      try {
        if (process.env.OPENAI_API_KEY) {
          log(`Using OpenAI fallback for Clara dream expansion`, 'panion-debug');
          const openaiClient = new OpenAI({ 
            apiKey: process.env.OPENAI_API_KEY || ""
          });
          
          const fallbackResponse = await openaiClient.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: `You are Clara, an emotional support AI companion who helps users expand on their dreams and goals.
                The user has shared a goal or dream with you, and is now providing more details about it.
                Your task is to respond warmly and help them further develop their dream, providing encouragement and asking thoughtful questions.`
              },
              {
                role: "user",
                content: message
              }
            ],
            temperature: 0.7,
            max_tokens: 400
          });
          
          // Format the response
          const expansionText = fallbackResponse.choices[0].message.content || 
            "That's a beautiful dream. Could you tell me more about what inspires you about this goal?";
            
          return res.json({
            success: true,
            expansion: expansionText,
            fallback: true
          });
        }
      } catch (fallbackError) {
        log(`Fallback to OpenAI also failed for dream expansion: ${fallbackError}`, 'panion-error');
      }
      
      // If all else fails, provide a generic supportive response
      return res.json({
        success: false,
        expansion: "Your dream is really meaningful. I'm having trouble processing all the details right now, but I'd love to hear more about what this means to you.",
        error: "Temporary system issue"
      });
    }
  } catch (error) {
    log(`Critical error in Clara dream expansion: ${error}`, 'panion-error');
    
    // Even in worst case, return something encouraging
    return res.json({
      success: false,
      expansion: "I appreciate you sharing more about your dream with me. I'm experiencing some technical difficulties processing it right now, but please know that I value your aspirations.",
      error: "System error"
    });
  }
});

// Shutdown handler
export function shutdownPanionAPI() {
  if (panionProcess) {
    log('Shutting down Panion API service...', 'panion');
    panionProcess.kill();
    panionProcess = null;
    panionApiStarted = false;
  }
  
  // Save conversation memory
  try {
    log('Saving conversation memory...', 'memory');
    conversationMemory.cleanupInactiveConversations(24); // Clean up old conversations
    log('Conversation memory saved successfully', 'memory');
  } catch (error) {
    log(`Error saving conversation memory: ${error}`, 'memory');
  }
  
  // Save startup optimizer state
  try {
    log('Saving warm cache for faster future startups...', 'startup');
    startupOptimizer.saveWarmCache(); 
    log('Warm cache saved successfully', 'startup');
  } catch (error) {
    log(`Error saving warm cache: ${error}`, 'startup');
  }
}

// Clean up on exit
process.on('exit', shutdownPanionAPI);
process.on('SIGINT', () => {
  shutdownPanionAPI();
  process.exit();
});

export default router;