import express from 'express';
import { createTask, getTaskStatus, getAllTasks, pauseTask, resumeTask, cancelTask, retryTask } from '../autonomous-agent';

const router = express.Router();

// Create a new task
router.post('/api/tasks', createTask);

// Get task status
router.get('/api/tasks/:id', getTaskStatus);

// Get all tasks
router.get('/api/tasks', getAllTasks);

// Pause a task
router.post('/api/tasks/:id/pause', pauseTask);

// Resume a task
router.post('/api/tasks/:id/resume', resumeTask);

// Cancel a task
router.post('/api/tasks/:id/cancel', cancelTask);

// Retry a task
router.post('/api/tasks/:id/retry', retryTask);

export default router;