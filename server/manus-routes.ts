/**
 * Manus-like API Routes
 * Exposes enhanced Manus-like capabilities via REST endpoints
 */

import { Router, Request, Response } from 'express';
import enhancedManus from './enhanced-manus';
import { log } from './vite';

const router = Router();

/**
 * Generate insights for a conversation session
 * POST /api/manus/insights
 */
router.post('/api/manus/insights', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({
        error: "Missing required parameter: sessionId"
      });
    }
    
    log(`Generating insights for session ${sessionId}`, 'manus-api');
    const insights = await enhancedManus.generateInsights(sessionId);
    
    return res.json({
      success: true,
      insights,
      count: insights.length
    });
  } catch (error) {
    log(`Error generating insights: ${error}`, 'manus-error');
    return res.status(500).json({
      error: "Failed to generate insights",
      message: error.message
    });
  }
});

/**
 * Get pending insights for a session
 * GET /api/manus/insights/:sessionId
 */
router.get('/api/manus/insights/:sessionId', (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    
    log(`Fetching insights for session ${sessionId}`, 'manus-api');
    const insights = enhancedManus.getPendingInsights(sessionId);
    
    return res.json({
      success: true,
      insights,
      count: insights.length
    });
  } catch (error) {
    log(`Error fetching insights: ${error}`, 'manus-error');
    return res.status(500).json({
      error: "Failed to fetch insights",
      message: error.message
    });
  }
});

/**
 * Acknowledge an insight
 * POST /api/manus/insights/:insightId/acknowledge
 */
router.post('/api/manus/insights/:insightId/acknowledge', (req: Request, res: Response) => {
  try {
    const { insightId } = req.params;
    
    log(`Acknowledging insight ${insightId}`, 'manus-api');
    const acknowledged = enhancedManus.acknowledgeInsight(insightId);
    
    if (!acknowledged) {
      return res.status(404).json({
        error: "Insight not found",
        insightId
      });
    }
    
    return res.json({
      success: true,
      acknowledged: true,
      insightId
    });
  } catch (error) {
    log(`Error acknowledging insight: ${error}`, 'manus-error');
    return res.status(500).json({
      error: "Failed to acknowledge insight",
      message: error.message
    });
  }
});

/**
 * Generate multiple reasoning paths for a problem
 * POST /api/manus/reasoning-paths
 */
router.post('/api/manus/reasoning-paths', async (req: Request, res: Response) => {
  try {
    const { problem, sessionId, numPaths = 3 } = req.body;
    
    if (!problem || !sessionId) {
      return res.status(400).json({
        error: "Missing required parameters: problem, sessionId"
      });
    }
    
    log(`Generating reasoning paths for problem: ${problem}`, 'manus-api');
    const paths = await enhancedManus.generateReasoningPaths(problem, sessionId, numPaths);
    
    return res.json({
      success: true,
      paths,
      count: paths.length
    });
  } catch (error) {
    log(`Error generating reasoning paths: ${error}`, 'manus-error');
    return res.status(500).json({
      error: "Failed to generate reasoning paths",
      message: error.message
    });
  }
});

/**
 * Decompose a task into subtasks
 * POST /api/manus/decompose-task
 */
router.post('/api/manus/decompose-task', async (req: Request, res: Response) => {
  try {
    const { taskDescription, sessionId } = req.body;
    
    if (!taskDescription || !sessionId) {
      return res.status(400).json({
        error: "Missing required parameters: taskDescription, sessionId"
      });
    }
    
    log(`Decomposing task: ${taskDescription}`, 'manus-api');
    const task = await enhancedManus.decomposeTask(taskDescription, sessionId);
    
    if (!task) {
      return res.status(500).json({
        error: "Failed to decompose task"
      });
    }
    
    return res.json({
      success: true,
      task
    });
  } catch (error) {
    log(`Error decomposing task: ${error}`, 'manus-error');
    return res.status(500).json({
      error: "Failed to decompose task",
      message: error.message
    });
  }
});

/**
 * Get a complex task by ID
 * GET /api/manus/tasks/:taskId
 */
router.get('/api/manus/tasks/:taskId', (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    
    log(`Fetching task: ${taskId}`, 'manus-api');
    const task = enhancedManus.getComplexTask(taskId);
    
    if (!task) {
      return res.status(404).json({
        error: "Task not found",
        taskId
      });
    }
    
    return res.json({
      success: true,
      task
    });
  } catch (error) {
    log(`Error fetching task: ${error}`, 'manus-error');
    return res.status(500).json({
      error: "Failed to fetch task",
      message: error.message
    });
  }
});

/**
 * Update subtask status
 * PATCH /api/manus/tasks/:taskId/subtasks/:subtaskId
 */
router.patch('/api/manus/tasks/:taskId/subtasks/:subtaskId', (req: Request, res: Response) => {
  try {
    const { taskId, subtaskId } = req.params;
    const { status } = req.body;
    
    if (!status || !['pending', 'in_progress', 'completed', 'blocked'].includes(status)) {
      return res.status(400).json({
        error: "Invalid status value. Must be one of: pending, in_progress, completed, blocked"
      });
    }
    
    log(`Updating subtask ${subtaskId} status to ${status}`, 'manus-api');
    const updated = enhancedManus.updateSubtaskStatus(taskId, subtaskId, status);
    
    if (!updated) {
      return res.status(404).json({
        error: "Task or subtask not found",
        taskId,
        subtaskId
      });
    }
    
    return res.json({
      success: true,
      updated: true,
      taskId,
      subtaskId,
      status
    });
  } catch (error) {
    log(`Error updating subtask: ${error}`, 'manus-error');
    return res.status(500).json({
      error: "Failed to update subtask",
      message: error.message
    });
  }
});

/**
 * Verify a result using metacognitive evaluation
 * POST /api/manus/verify
 */
router.post('/api/manus/verify', async (req: Request, res: Response) => {
  try {
    const { result, originalQuery, sessionId } = req.body;
    
    if (!result || !originalQuery || !sessionId) {
      return res.status(400).json({
        error: "Missing required parameters: result, originalQuery, sessionId"
      });
    }
    
    log(`Verifying result for query: ${originalQuery}`, 'manus-api');
    const verification = await enhancedManus.verifyResult(result, originalQuery, sessionId);
    
    return res.json({
      success: true,
      verification
    });
  } catch (error) {
    log(`Error verifying result: ${error}`, 'manus-error');
    return res.status(500).json({
      error: "Failed to verify result",
      message: error.message
    });
  }
});

/**
 * Queue a background task
 * POST /api/manus/queue
 */
router.post('/api/manus/queue', (req: Request, res: Response) => {
  try {
    const { type, sessionId, priority = 5, data } = req.body;
    
    if (!type || !sessionId) {
      return res.status(400).json({
        error: "Missing required parameters: type, sessionId"
      });
    }
    
    if (!['generate_insights', 'analyze_conversation', 'strategic_planning'].includes(type)) {
      return res.status(400).json({
        error: "Invalid task type. Must be one of: generate_insights, analyze_conversation, strategic_planning"
      });
    }
    
    log(`Queueing background task: ${type} for session ${sessionId}`, 'manus-api');
    const taskId = enhancedManus.queueBackgroundTask({
      type,
      sessionId,
      priority,
      data
    });
    
    return res.json({
      success: true,
      taskId,
      message: "Task queued successfully"
    });
  } catch (error) {
    log(`Error queueing task: ${error}`, 'manus-error');
    return res.status(500).json({
      error: "Failed to queue task",
      message: error.message
    });
  }
});

export default router;