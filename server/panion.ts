import { Router, Request, Response, NextFunction } from 'express';
import { spawn, ChildProcess } from 'child_process';
import axios from 'axios';
import { log } from './vite';
import path from 'path';

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
export function startPanionAPI(): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      log('Starting Panion API service...', 'panion');
      
      // Kill any existing process
      if (panionProcess) {
        panionProcess.kill();
        panionProcess = null;
      }
      
      // Spawn the Python process
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
router.post('/api/panion/chat', checkPanionAPIMiddleware, async (req: Request, res: Response) => {
  try {
    const { 
      message, 
      sessionId = 'default',
      hasRequiredCapabilities = true, 
      capabilities = []
    } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'Message is required and must be a string' 
      });
    }
    
    // Log capability information
    if (capabilities && capabilities.length > 0) {
      log(`Message requires capabilities: ${capabilities.join(', ')}`, 'panion');
    }
    
    // Forward the request to the Panion API with additional info
    const response = await axios.post(`${PANION_API_URL}/chat`, {
      content: message,
      session_id: sessionId,  // This is the correct format for the backend
      metadata: {
        hasRequiredCapabilities,
        capabilities: capabilities || [],
        requestedAt: new Date().toISOString(),
        client: 'frontend',
      }
    });
    
    // Add thinking details to the response
    let thinking = '';
    
    // If capabilities were detected, add related thinking
    if (capabilities && capabilities.length > 0) {
      thinking = `Analyzing request: "${message}"\n\n`;
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
    
    res.json(response.data);
  } catch (error) {
    log(`Error in panion chat: ${error}`, 'panion');
    res.status(500).json({ 
      error: 'Panion API error',
      message: 'Error communicating with Panion API' 
    });
  }
});

// Proxy endpoint for Panion API - get agents
router.get('/api/panion/agents', checkPanionAPIMiddleware, async (_req: Request, res: Response) => {
  try {
    const response = await axios.get(`${PANION_API_URL}/agents`);
    res.json(response.data);
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
    const response = await axios.get(`${PANION_API_URL}/system/stats`);
    res.json(response.data);
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
      const responseText = response.data.response || '';
      const operationIdMatch = responseText.match(/Operation ID: (op_\d+)/);
      const operationId = operationIdMatch ? operationIdMatch[1] : null;
      
      return res.json({
        status: 'strategic_initiated',
        message: response.data.response,
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
    
    // Execute strategic operation - this is handled via the chat API
    const chatPayload = {
      session_id: parameters?.sessionId || 'default-session',
      content: goal, // The goal statement is sent as chat content
      metadata: {
        hasRequiredCapabilities: true,
        capabilities: ['strategic_thinking', 'web_research', 'data_integration'],
        parameters: parameters || {},
        client: 'frontend'
      }
    };
    
    const response = await axios.post(`${PANION_API_URL}/chat`, chatPayload);
    
    // Extract operation ID from the response if available
    const responseText = response.data.response || '';
    const operationIdMatch = responseText.match(/Operation ID: (op_\d+)/);
    const operationId = operationIdMatch ? operationIdMatch[1] : null;
    
    return res.json({
      status: 'initiated',
      message: response.data.response,
      operation_id: operationId,
      thinking: response.data.thinking
    });
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
    const { location = 'New York', limit = 20, additionalKeywords = [] } = req.body;
    
    // Generate task ID
    const taskId = `smokeshop-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Create a new task and add it to tasks storage
    const task: Task = {
      id: taskId,
      type: 'smokeshop_research',
      status: 'pending',
      progress: 0,
      description: `Searching for smoke shops in ${location}`,
      location,
      created: new Date().toISOString(),
      data: {
        limit,
        additionalKeywords
      }
    };
    
    tasks[taskId] = task;
    
    log(`Created smoke shop search task: ${taskId} for ${location}`, 'panion');
    
    // We'll process this task locally since the Python API doesn't have a task endpoint
    // Update the task status
    setTimeout(() => {
      try {
        // Mock processing - this would normally be done by the Python API
        tasks[taskId].status = 'in_progress';
        tasks[taskId].progress = 50;
        
        // After a bit, complete the task
        setTimeout(() => {
          // Try to run a search using the existing endpoint
          axios.post(`${PANION_API_URL}/scrape/enhanced`, {
            business_type: 'smoke shop',
            location: location,
            limit: limit
          }).then(response => {
            // Success
            tasks[taskId].status = 'completed';
            tasks[taskId].progress = 100;
            tasks[taskId].result = response.data;
          }).catch(error => {
            // Failed to get data
            tasks[taskId].status = 'failed';
            tasks[taskId].error = `Failed to get data: ${error.message}`;
            log(`Error getting smoke shop data for task ${taskId}: ${error.message}`, 'panion');
          });
        }, 3000);
      } catch (error: any) {
        // Update task if there was an error
        tasks[taskId].status = 'failed';
        tasks[taskId].error = `Failed to process task: ${error.message}`;
        log(`Error processing task ${taskId}: ${error.message}`, 'panion');
      }
    }, 1000);
    
    // Return the task ID immediately
    res.json({
      success: true,
      taskId,
      message: 'Smoke shop search task created',
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

// Clara API endpoints
router.post('/api/clara/chat', checkPanionAPIMiddleware, async (req: Request, res: Response) => {
  try {
    const { message, sessionId = 'default', userId = 'anonymous' } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'Message is required and must be a string' 
      });
    }
    
    // Forward the request to the Panion API - Clara endpoint
    const response = await axios.post(`${PANION_API_URL}/clara/chat`, {
      content: message,
      session_id: sessionId,
      user_id: userId
    });
    
    res.json(response.data);
  } catch (error) {
    log(`Error in Clara chat: ${error}`, 'panion');
    res.status(500).json({ 
      error: 'Clara API error',
      message: 'Error communicating with Clara API' 
    });
  }
});

router.post('/api/clara/goal', checkPanionAPIMiddleware, async (req: Request, res: Response) => {
  try {
    const { message, sessionId = 'default' } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'Message is required and must be a string' 
      });
    }
    
    // Forward the request to the Panion API - Clara goal creation
    const response = await axios.post(`${PANION_API_URL}/clara/goal`, {
      content: message,
      session_id: sessionId
    });
    
    res.json(response.data);
  } catch (error) {
    log(`Error in Clara goal creation: ${error}`, 'panion');
    res.status(500).json({ 
      error: 'Clara API error',
      message: 'Error communicating with Clara API' 
    });
  }
});

router.get('/api/clara/goals', checkPanionAPIMiddleware, async (req: Request, res: Response) => {
  try {
    // Forward the request to the Panion API - Clara goals
    const response = await axios.get(`${PANION_API_URL}/clara/goals`);
    res.json(response.data);
  } catch (error) {
    log(`Error getting Clara goals: ${error}`, 'panion');
    res.status(500).json({ 
      error: 'Clara API error',
      message: 'Error communicating with Clara API' 
    });
  }
});

router.post('/api/clara/expand-dream', checkPanionAPIMiddleware, async (req: Request, res: Response) => {
  try {
    const { goalId, message } = req.body;
    
    if (!goalId || !message) {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'Goal ID and message are required' 
      });
    }
    
    // Forward the request to the Panion API - Clara dream expansion
    const response = await axios.post(`${PANION_API_URL}/clara/expand-dream`, {
      goal_id: goalId,
      content: message
    });
    
    res.json(response.data);
  } catch (error) {
    log(`Error in Clara dream expansion: ${error}`, 'panion');
    res.status(500).json({ 
      error: 'Clara API error',
      message: 'Error communicating with Clara API' 
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
}

// Clean up on exit
process.on('exit', shutdownPanionAPI);
process.on('SIGINT', () => {
  shutdownPanionAPI();
  process.exit();
});

export default router;