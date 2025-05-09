import { Router, Request, Response } from 'express';
import { handleMultiAgentDebate, handleQuickDebate } from '../multi-agent-debate';

const router = Router();

// Route for a full, detailed debate analysis
router.post('/api/debate', async (req: Request, res: Response) => {
  try {
    const { query, context, options } = req.body;
    
    // Validate required parameters
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    
    // Process the analysis through the multi-agent debate system
    const result = await handleMultiAgentDebate(query, context || '', options);
    
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error in debate route:', error);
    return res.status(500).json({ 
      error: 'Failed to process debate',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Route for a quick, simplified debate analysis
router.post('/api/debate/quick', async (req: Request, res: Response) => {
  try {
    const { query, context, options } = req.body;
    
    // Validate required parameters
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    
    // Process a faster version of the analysis with fewer experts
    const result = await handleQuickDebate(query, context || '', options);
    
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error in quick debate route:', error);
    return res.status(500).json({ 
      error: 'Failed to process quick debate',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;