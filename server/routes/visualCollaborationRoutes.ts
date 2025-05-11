/**
 * Visual Collaboration Routes
 * Routes for multi-agent image analysis functionality
 */
import express, { Router, Request, Response } from 'express';
import { handleMultiAgentImageAnalysis, upload } from '../visual-collaboration';

const router = Router();

// Multi-agent collaborative image analysis endpoint
router.post('/visual-collaboration', upload.single('image'), async (req: Request & { file?: Express.Multer.File }, res: Response) => {
  try {
    // Pass the request to the handler function
    await handleMultiAgentImageAnalysis(req, res);
  } catch (error: any) {
    console.error('Error in multi-agent image analysis route:', error);
    res.status(500).json({ 
      error: 'Failed to analyze image with multi-agent system',
      message: error.message || 'Unknown error occurred'
    });
  }
});

export default router;