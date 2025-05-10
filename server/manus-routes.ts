/**
 * Manus Routes
 * Express routes for Manus-like capabilities
 */

import express, { Router, Request, Response } from 'express';
import { 
  generateInsights, 
  getInsights, 
  generateReasoningPaths, 
  decomposeTask, 
  updateSubtaskStatus,
  getTaskById,
  verifyResult,
  getActiveSessions
} from './enhanced-manus';
import { systemLog } from './system-logs';

const router = Router();

// Set up the routes
// Get insights for a specific session
router.get('/api/manus/insights/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    
    if (!sessionId) {
      return res.status(400).json({
        error: 'Missing sessionId',
        message: 'A session ID is required'
      });
    }
    
    // Get existing insights
    const insights = getInsights(sessionId);
    
    res.json({
      sessionId,
      count: insights.length,
      insights
    });
  } catch (error) {
    systemLog.error(`Error getting insights: ${error}`, 'manus');
    res.status(500).json({
      error: 'Failed to get insights',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Generate new insights for a session
router.post('/api/manus/insights/:sessionId/generate', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    
    if (!sessionId) {
      return res.status(400).json({
        error: 'Missing sessionId',
        message: 'A session ID is required'
      });
    }
    
    // Generate new insights
    const newInsights = await generateInsights(sessionId);
    
    res.json({
      sessionId,
      count: newInsights.length,
      insights: newInsights
    });
  } catch (error) {
    systemLog.error(`Error generating insights: ${error}`, 'manus');
    res.status(500).json({
      error: 'Failed to generate insights',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Generate multiple reasoning paths
router.post('/api/manus/reasoning-paths', async (req: Request, res: Response) => {
  try {
    const { problem, sessionId, numPaths = 3 } = req.body;
    
    if (!problem || !sessionId) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Both problem and sessionId are required'
      });
    }
    
    // Generate reasoning paths
    const paths = await generateReasoningPaths(problem, sessionId, numPaths);
    
    res.json({
      sessionId,
      count: paths.length,
      paths
    });
  } catch (error) {
    systemLog.error(`Error generating reasoning paths: ${error}`, 'manus');
    res.status(500).json({
      error: 'Failed to generate reasoning paths',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Decompose a complex task
router.post('/api/manus/decompose-task', async (req: Request, res: Response) => {
  try {
    const { taskDescription, sessionId } = req.body;
    
    if (!taskDescription || !sessionId) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Both taskDescription and sessionId are required'
      });
    }
    
    // Decompose the task
    const task = await decomposeTask(taskDescription, sessionId);
    
    res.json({
      sessionId,
      task
    });
  } catch (error) {
    systemLog.error(`Error decomposing task: ${error}`, 'manus');
    res.status(500).json({
      error: 'Failed to decompose task',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get a task by ID
router.get('/api/manus/tasks/:taskId', (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    
    if (!taskId) {
      return res.status(400).json({
        error: 'Missing taskId',
        message: 'A task ID is required'
      });
    }
    
    // Get the task
    const task = getTaskById(taskId);
    
    if (!task) {
      return res.status(404).json({
        error: 'Task not found',
        message: `No task found with ID: ${taskId}`
      });
    }
    
    res.json({ task });
  } catch (error) {
    systemLog.error(`Error getting task: ${error}`, 'manus');
    res.status(500).json({
      error: 'Failed to get task',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update subtask status
router.post('/api/manus/update-subtask', (req: Request, res: Response) => {
  try {
    const { taskId, subtaskId, status } = req.body;
    
    if (!taskId || !subtaskId || !status) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'taskId, subtaskId, and status are all required'
      });
    }
    
    // Validate status
    if (!['pending', 'in_progress', 'completed', 'blocked'].includes(status)) {
      return res.status(400).json({
        error: 'Invalid status',
        message: 'Status must be one of: pending, in_progress, completed, blocked'
      });
    }
    
    // Update the subtask
    const success = updateSubtaskStatus(taskId, subtaskId, status);
    
    if (!success) {
      return res.status(404).json({
        error: 'Update failed',
        message: 'Could not find the specified task or subtask'
      });
    }
    
    // Get the updated task
    const updatedTask = getTaskById(taskId);
    
    res.json({
      success: true,
      task: updatedTask
    });
  } catch (error) {
    systemLog.error(`Error updating subtask: ${error}`, 'manus');
    res.status(500).json({
      error: 'Failed to update subtask',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Verify a result
router.post('/api/manus/verify', async (req: Request, res: Response) => {
  try {
    const { originalQuery, result, sessionId } = req.body;
    
    if (!originalQuery || !result || !sessionId) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'originalQuery, result, and sessionId are all required'
      });
    }
    
    // Verify the result
    const verification = await verifyResult(originalQuery, result, sessionId);
    
    res.json({
      sessionId,
      verification
    });
  } catch (error) {
    systemLog.error(`Error verifying result: ${error}`, 'manus');
    res.status(500).json({
      error: 'Failed to verify result',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get active sessions
router.get('/api/manus/sessions', (req: Request, res: Response) => {
  try {
    const sessions = getActiveSessions();
    
    res.json({
      count: sessions.length,
      sessions
    });
  } catch (error) {
    systemLog.error(`Error getting active sessions: ${error}`, 'manus');
    res.status(500).json({
      error: 'Failed to get active sessions',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;