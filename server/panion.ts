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
  TASK_AUTOMATION: 'task_automation'
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
    const { message, sessionId = 'default' } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'Message is required and must be a string' 
      });
    }
    
    // Forward the request to the Panion API
    const response = await axios.post(`${PANION_API_URL}/chat`, {
      content: message,
      sessionId
    });
    
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
router.post('/api/panion/scrape', checkPanionAPIMiddleware, async (req: Request, res: Response) => {
  try {
    const { targetType, location, limit = 20, additionalParams = {} } = req.body;
    
    if (!targetType) {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'Target type is required' 
      });
    }
    
    // Forward the request to the Panion API
    const response = await axios.post(`${PANION_API_URL}/scrape`, {
      target_type: targetType,
      location,
      limit,
      additional_params: additionalParams
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