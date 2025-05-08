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
import strategicPlannerRoutes from "./routes/strategicPlannerRoutes";
import autonomousAgentRoutes from "./routes/autonomousAgentRoutes";
import panionRoutes, { startPanionAPI, shutdownPanionAPI } from "./panion";

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
  
  // Use collaboration routes under /api/collaboration prefix
  app.use('/api/collaboration', collaborationRoutes);
  
  // Use Daddy Data routes
  app.use(daddyDataRoutes);
  
  // Use Scheduled Tasks routes
  app.use(scheduledTaskRoutes);
  
  // Use Dynamic Agent routes
  app.use(dynamicAgentRoutes);
  
  // Use Strategic Planner routes
  app.use(strategicPlannerRoutes);
  
  // Use Autonomous Agent routes
  app.use(autonomousAgentRoutes);
  
  // Try to start the Panion API
  try {
    await startPanionAPI();
  } catch (error) {
    console.error('Failed to start Panion API:', error);
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
