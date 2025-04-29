import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import path from "path";
import fs from "fs";
import multer from "multer";
import { handleChatRequest, analyzeImage } from "./openai";

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

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve static files from uploads directory
  app.use('/uploads', express.static(uploadsDir));
  
  // Serve vanilla HTML for testing
  app.get('/vanilla', (req, res) => {
    const vanillaPath = path.resolve('client', 'public', 'vanilla.html');
    if (fs.existsSync(vanillaPath)) {
      res.sendFile(vanillaPath);
    } else {
      res.status(404).send('Vanilla HTML file not found');
    }
  });

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

  const httpServer = createServer(app);
  return httpServer;
}
