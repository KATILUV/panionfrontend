import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { createServer, type Server } from "http";
import path from "path";
import fs from "fs";
import multer from "multer";
import { handleChatRequest, analyzeImage } from "./openai";
import { 
  searchMemories, 
  smartMemorySearch, 
  saveConversation, 
  getMemoriesByCategory, 
  getMemoryStats,
  MEMORY_CATEGORIES 
} from "./memory";
import {
  getFileStats,
  deleteFile,
  cleanupOldFiles,
  formatFileSize
} from "./utils/fileCleanup";
import agentRoutes from "./routes/agentRoutes";
import collaborationRoutes from "./routes/collaborationRoutes";
import daddyDataRoutes from "./routes/daddyDataRoutes";
import scheduledTaskRoutes from "./routes/scheduledTaskRoutes";
import knowledgeRoutes from "./routes/knowledgeRoutes";
import debateRoutes from "./routes/debateRoutes";
// Import strategic planner functions
import { 
  createPlan, 
  getPlan, 
  listPlans, 
  executePlan, 
  getStrategicPlan 
} from './strategic-planner';
import { log } from './vite';
import autonomousAgentRoutes from "./routes/autonomousAgentRoutes";
import browserRoutes from "./routes/browserRoutes";
import taskRoutes from "./routes/taskRoutes";
import panionRoutes, { startPanionAPI, shutdownPanionAPI } from "./panion";
import { handleEnhancedChat } from "./enhanced-panion";
import { handleEnhancedChatWithWS } from "./enhanced-panion-ws";
import { handleAnthropicChat, analyzeImageWithClaude } from "./anthropic";
import strategicAnalysisRoutes from "./routes/strategicAnalysisRoutes";
import panionIntelligenceRouter from "./panion-intelligence-routes";
import manuRouter from "./manus-routes";
import { systemLog } from "./system-logs";

// Configure multer for handling file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req: Request, file: Express.Multer.File, callback: multer.FileFilterCallback) => {
    // Only allow images
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      callback(null, true);
    } else {
      callback(new Error('Only image files are allowed'));
    }
  }
});

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Import dynamic agent routes
import dynamicAgentRoutes from "./routes/dynamicAgentRoutes";

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve static files from uploads directory
  app.use('/uploads', express.static(uploadsDir));
  
  // Use agent routes
  app.use(agentRoutes);
  
  // Use Panion routes
  app.use(panionRoutes);
  
  // Enhanced Panion chat endpoint with memory, self-reflection, and strategic planning
  app.post('/api/panion/enhanced-chat', async (req, res) => {
    try {
      await handleEnhancedChat(req, res);
    } catch (error) {
      console.error('Error in enhanced panion chat:', error);
      res.status(500).json({
        error: 'Enhanced Panion API error',
        message: 'Error processing enhanced chat request',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Use collaboration routes under /api/collaboration prefix
  app.use('/api/collaboration', collaborationRoutes);
  
  // Use Daddy Data routes
  app.use(daddyDataRoutes);
  
  // Use Scheduled Tasks routes
  app.use(scheduledTaskRoutes);
  
  // Use Dynamic Agent routes
  app.use(dynamicAgentRoutes);
  
  // Add strategic planner routes
  app.post('/api/strategic-plan/generate', async (req, res) => {
    try {
      const { goal, conversationHistory = [], capabilities = [] } = req.body;
      
      if (!goal || typeof goal !== 'string') {
        res.status(400).json({ 
          error: 'Invalid request',
          message: 'Goal description is required'
        });
        return;
      }
      
      // Generate strategic plan
      const plan = await getStrategicPlan(goal, conversationHistory, capabilities);
      
      res.json({ 
        success: true,
        plan
      });
    } catch (error) {
      log(`Error generating strategic plan: ${error}`, 'strategic-planner');
      res.status(500).json({
        error: 'Failed to generate strategic plan',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  app.post('/api/strategic-plan/create', (req, res) => {
    try {
      const { goal, context = {} } = req.body;
      
      if (!goal || typeof goal !== 'string') {
        res.status(400).json({ 
          error: 'Invalid request',
          message: 'Goal description is required'
        });
        return;
      }
      
      // Create a new plan
      const plan = createPlan(goal, context);
      
      res.json({
        success: true,
        plan
      });
    } catch (error) {
      log(`Error creating plan: ${error}`, 'strategic-planner');
      res.status(500).json({
        error: 'Failed to create plan',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  app.get('/api/strategic-plan/:id', (req, res) => {
    try {
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({ 
          error: 'Invalid request',
          message: 'Plan ID is required'
        });
        return;
      }
      
      const plan = getPlan(id);
      
      if (!plan) {
        res.status(404).json({
          error: 'Plan not found',
          message: `No plan found with ID: ${id}`
        });
        return;
      }
      
      res.json({
        success: true,
        plan
      });
    } catch (error) {
      log(`Error getting plan: ${error}`, 'strategic-planner');
      res.status(500).json({
        error: 'Failed to get plan',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  app.get('/api/strategic-plans', (req, res) => {
    try {
      const plans = listPlans();
      
      res.json({
        success: true,
        count: plans.length,
        plans
      });
    } catch (error) {
      log(`Error listing plans: ${error}`, 'strategic-planner');
      res.status(500).json({
        error: 'Failed to list plans',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  app.post('/api/strategic-plan/:id/execute', async (req, res) => {
    try {
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({ 
          error: 'Invalid request',
          message: 'Plan ID is required'
        });
        return;
      }
      
      // Check if plan exists
      const plan = getPlan(id);
      
      if (!plan) {
        res.status(404).json({
          error: 'Plan not found',
          message: `No plan found with ID: ${id}`
        });
        return;
      }
      
      // Execute the plan (this is asynchronous)
      await executePlan(id);
      
      res.json({
        success: true,
        message: `Plan ${id} execution started`,
        status: 'in_progress'
      });
    } catch (error) {
      log(`Error executing plan: ${error}`, 'strategic-planner');
      res.status(500).json({
        error: 'Failed to execute plan',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Use Autonomous Agent routes
  app.use(autonomousAgentRoutes);
  
  // Use Browser routes
  app.use(browserRoutes);
  
  // Use Task routes
  app.use(taskRoutes);

  // Use Knowledge Graph routes
  app.use(knowledgeRoutes);
  
  // Use Multi-agent Debate routes
  app.use(debateRoutes);
  
  // Use Strategic Analysis routes
  app.use(strategicAnalysisRoutes);
  
  // Use Panion Intelligence capabilities routes
  app.use(panionIntelligenceRouter);
  
  // Use Manus-like capabilities routes
  app.use(manuRouter);
  
  // Try to start the Panion API
  try {
    await startPanionAPI();
    
    // Now that Panion API is started, add a new WebSocket-enhanced route
    app.post('/api/panion/ws-chat', async (req, res) => {
      try {
        await handleEnhancedChatWithWS(req, res);
        systemLog.info('WebSocket-enhanced chat request handled successfully', 'panion-ws');
      } catch (error) {
        systemLog.error(`Error in WebSocket-enhanced chat: ${error instanceof Error ? error.message : String(error)}`, 'panion-ws');
        res.status(500).json({
          error: 'WebSocket-Enhanced Panion API error',
          message: 'Error processing enhanced chat request',
          details: error instanceof Error ? error.message : String(error)
        });
      }
    });
    
  } catch (error) {
    console.error('Failed to start Panion API:', error);
    systemLog.error(`Failed to start Panion API: ${error instanceof Error ? error.message : String(error)}`, 'startup');
  }
  
  // API routes are defined below

  // Chat endpoint to communicate with OpenAI (text only)
  app.post('/api/chat', async (req, res) => {
    try {
      const { message } = req.body;
      
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ 
          message: 'Message is required and must be a string' 
        });
      }

      // Get session ID from cookies or create a new one
      const sessionId = req.cookies?.sessionId || Date.now().toString();
      
      // Set session cookie if it doesn't exist
      if (!req.cookies?.sessionId) {
        res.cookie('sessionId', sessionId, { 
          maxAge: 24 * 60 * 60 * 1000, // 24 hours 
          httpOnly: true 
        });
      }

      // Process message with OpenAI and update memory
      const response = await handleChatRequest(message, sessionId);
      
      res.json({ response });
    } catch (error) {
      console.error('Error processing chat request:', error);
      res.status(500).json({ 
        message: 'Error processing your request' 
      });
    }
  });

  // Claude (Anthropic) AI chat endpoint
  app.post('/api/claude/chat', async (req, res) => {
    try {
      await handleAnthropicChat(req, res);
    } catch (error) {
      console.error('Error in Claude chat:', error);
      res.status(500).json({ 
        error: 'Claude API error',
        message: 'Error processing chat request',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Claude image analysis endpoint
  app.post('/api/claude/analyze-image', upload.single('image'), async (req: Request & { file?: Express.Multer.File }, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No image file provided' });
      }
      
      // Get prompt if provided or use default
      const { prompt } = req.body;
      
      // Convert buffer to base64
      const imageBase64 = req.file.buffer.toString('base64');
      
      // Analyze image with Claude
      const analysis = await analyzeImageWithClaude(
        imageBase64,
        prompt || "Analyze this image in detail and describe what you see."
      );
      
      // Send back the description
      res.status(200).json({
        success: true,
        response: analysis,
        model: "claude-3-7-sonnet-20250219"
      });
    } catch (error) {
      console.error('Error analyzing image with Claude:', error);
      res.status(500).json({
        error: 'Claude API error',
        message: 'Error analyzing image',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Upload and analyze image
  app.post('/api/upload-image', upload.single('image'), async (req: Request & { file?: Express.Multer.File }, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No image file provided' });
      }
      
      // Get session ID from cookies or create a new one
      const sessionId = req.cookies?.sessionId || Date.now().toString();
      
      // Set session cookie if it doesn't exist
      if (!req.cookies?.sessionId) {
        res.cookie('sessionId', sessionId, { 
          maxAge: 24 * 60 * 60 * 1000, // 24 hours 
          httpOnly: true 
        });
      }

      // Generate a unique filename
      const timestamp = Date.now();
      const filename = `${timestamp}_${req.file.originalname.replace(/\s+/g, '_')}`;
      const filepath = path.join(uploadsDir, filename);
      
      // Save the file
      fs.writeFileSync(filepath, req.file.buffer);
      
      // Convert buffer to base64
      const imageBase64 = req.file.buffer.toString('base64');
      
      // Analyze image with OpenAI
      const description = await analyzeImage(imageBase64, sessionId);
      
      // Get the relative path for the frontend
      const imageUrl = `/uploads/${filename}`;
      
      // Send back the image URL and description
      res.status(200).json({
        imageUrl,
        response: description
      });
    } catch (error) {
      console.error('Error processing image upload:', error);
      res.status(500).json({
        message: 'Error processing your image'
      });
    }
  });
  
  // Search Clara's memories
  app.post('/api/search-memory', async (req, res) => {
    try {
      const { query } = req.body;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ 
          message: 'Query is required and must be a string' 
        });
      }
      
      // Get session ID from cookies or create a new one
      const sessionId = req.cookies?.sessionId || Date.now().toString();
      
      // Simple search
      const memories = await searchMemories(query);
      
      res.json({ 
        count: memories.length,
        memories: memories 
      });
    } catch (error) {
      console.error('Error searching memories:', error);
      res.status(500).json({ 
        message: 'Error searching memories' 
      });
    }
  });
  
  // Smart search using AI
  app.post('/api/smart-memory-search', async (req, res) => {
    try {
      const { query } = req.body;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ 
          message: 'Query is required and must be a string' 
        });
      }
      
      // Get session ID from cookies or create a new one
      const sessionId = req.cookies?.sessionId || Date.now().toString();
      
      // AI-powered search
      const result = await smartMemorySearch(query);
      
      res.json({ result });
    } catch (error) {
      console.error('Error in smart memory search:', error);
      res.status(500).json({ 
        message: 'Error searching memories' 
      });
    }
  });
  
  // Save current conversation
  app.post('/api/save-conversation', async (req, res) => {
    try {
      // Get session ID from cookies
      const sessionId = req.cookies?.sessionId;
      
      if (!sessionId) {
        return res.status(400).json({ 
          message: 'No active conversation to save' 
        });
      }
      
      // Save conversation
      await saveConversation(sessionId);
      
      res.json({ 
        message: 'Conversation saved successfully' 
      });
    } catch (error) {
      console.error('Error saving conversation:', error);
      res.status(500).json({ 
        message: 'Error saving conversation' 
      });
    }
  });

  // Get available memory categories
  app.get('/api/memory-categories', async (req, res) => {
    try {
      res.json({ 
        categories: ['all', ...MEMORY_CATEGORIES]
      });
    } catch (error) {
      console.error('Error getting memory categories:', error);
      res.status(500).json({ 
        message: 'Error retrieving memory categories' 
      });
    }
  });

  // Get memories by category
  app.get('/api/memories/:category', async (req, res) => {
    try {
      const { category } = req.params;
      
      // Validate category
      if (category !== 'all' && !MEMORY_CATEGORIES.includes(category)) {
        return res.status(400).json({ 
          message: `Invalid category. Valid options are: all, ${MEMORY_CATEGORIES.join(', ')}` 
        });
      }
      
      // Get memories by category
      const memories = await getMemoriesByCategory(category);
      
      res.json({ 
        category,
        count: memories.length,
        memories
      });
    } catch (error) {
      console.error('Error getting memories by category:', error);
      res.status(500).json({ 
        message: 'Error retrieving memories' 
      });
    }
  });

  // Smart search with category filter
  app.post('/api/smart-memory-search-by-category', async (req, res) => {
    try {
      const { query, category } = req.body;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ 
          message: 'Query is required and must be a string' 
        });
      }
      
      // Validate category if provided
      if (category && category !== 'all' && !MEMORY_CATEGORIES.includes(category)) {
        return res.status(400).json({ 
          message: `Invalid category. Valid options are: all, ${MEMORY_CATEGORIES.join(', ')}` 
        });
      }
      
      // AI-powered search with category filter
      const result = await smartMemorySearch(query, category);
      
      res.json({ result });
    } catch (error) {
      console.error('Error in smart memory search by category:', error);
      res.status(500).json({ 
        message: 'Error searching memories' 
      });
    }
  });

  // Get memory statistics
  app.get('/api/memory-stats', async (req, res) => {
    try {
      const stats = await getMemoryStats();
      res.json(stats);
    } catch (error) {
      console.error('Error getting memory stats:', error);
      res.status(500).json({ 
        message: 'Error retrieving memory statistics' 
      });
    }
  });

  // Get uploaded files list
  app.get('/api/files', (req, res) => {
    try {
      // Get all files in uploads directory
      const files = getFileStats(uploadsDir);
      
      // Sort by creation date (newest first)
      files.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      // Format response
      const formattedFiles = files.map(file => ({
        name: file.name,
        url: `/uploads/${file.name}`,
        size: formatFileSize(file.size),
        createdAt: file.createdAt.toISOString()
      }));
      
      res.json({
        count: files.length,
        totalSize: formatFileSize(files.reduce((total, file) => total + file.size, 0)),
        files: formattedFiles
      });
    } catch (error) {
      console.error('Error getting files list:', error);
      res.status(500).json({ message: 'Error retrieving files' });
    }
  });
  
  // Delete a specific file
  app.delete('/api/files/:filename', (req, res) => {
    try {
      const { filename } = req.params;
      
      // Prevent directory traversal attacks
      const sanitizedFilename = path.basename(filename);
      const filePath = path.join(uploadsDir, sanitizedFilename);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'File not found' });
      }
      
      // Delete the file
      const success = deleteFile(filePath);
      
      if (success) {
        res.json({ message: 'File deleted successfully' });
      } else {
        res.status(500).json({ message: 'Error deleting file' });
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      res.status(500).json({ message: 'Error deleting file' });
    }
  });
  
  // Clean up old files (keep only a specified number of recent files)
  app.post('/api/files/cleanup', (req, res) => {
    try {
      const { keepCount = 20 } = req.body;
      
      // Validate parameters
      const keepCountNum = parseInt(keepCount.toString(), 10);
      if (isNaN(keepCountNum) || keepCountNum < 0) {
        return res.status(400).json({ message: 'Keep count must be a positive number' });
      }
      
      // Clean up old files
      const deletedCount = cleanupOldFiles(uploadsDir, keepCountNum);
      
      res.json({
        message: `Cleaned up old files. Kept ${keepCountNum} most recent files.`,
        deletedCount
      });
    } catch (error) {
      console.error('Error cleaning up files:', error);
      res.status(500).json({ message: 'Error cleaning up files' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
