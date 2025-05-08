import { Router } from 'express';
import { 
  createTask, 
  getTaskStatus, 
  pauseTask, 
  resumeTask, 
  cancelTask, 
  retryTask, 
  getAllTasks 
} from '../autonomous-agent';

const router = Router();

// Create a new task
router.post('/api/autonomous-agent/tasks', createTask);

// Get task status
router.get('/api/autonomous-agent/tasks/:taskId', getTaskStatus);

// Pause a task
router.post('/api/autonomous-agent/tasks/:taskId/pause', pauseTask);

// Resume a task
router.post('/api/autonomous-agent/tasks/:taskId/resume', resumeTask);

// Cancel a task
router.post('/api/autonomous-agent/tasks/:taskId/cancel', cancelTask);

// Retry a failed task
router.post('/api/autonomous-agent/tasks/:taskId/retry', retryTask);

// Get all tasks
router.get('/api/autonomous-agent/tasks', getAllTasks);

export default router;