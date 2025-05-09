import express, { Request, Response } from 'express';
import { conductDebate, quickDebate } from '../multi-agent-debate';
import { log } from '../vite';

const router = express.Router();

// Conduct a full multi-agent debate
router.post('/api/debate', async (req: Request, res: Response) => {
  try {
    const { query, context = "", num_rounds = 2, agents = [] } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'Query is required and must be a string'
      });
    }
    
    // Validate num_rounds
    const rounds = Math.min(Math.max(1, Number(num_rounds)), 5); // Between 1 and 5
    
    log(`Starting debate API call for query: "${query}"`, 'debate-api');
    
    // Conduct the debate
    const result = await conductDebate(query, context, rounds, agents);
    
    res.json({
      success: true,
      result
    });
  } catch (error) {
    log(`Error in debate API: ${error}`, 'debate-api');
    res.status(500).json({
      success: false,
      error: 'Failed to conduct debate',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Quick debate for faster responses
router.post('/api/quick-debate', async (req: Request, res: Response) => {
  try {
    const { query, context = "" } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'Query is required and must be a string'
      });
    }
    
    log(`Starting quick debate API call for query: "${query}"`, 'debate-api');
    
    // Conduct a quick debate
    const result = await quickDebate(query, context);
    
    res.json({
      success: true,
      result
    });
  } catch (error) {
    log(`Error in quick debate API: ${error}`, 'debate-api');
    res.status(500).json({
      success: false,
      error: 'Failed to conduct quick debate',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;