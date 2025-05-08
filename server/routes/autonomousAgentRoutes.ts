import express, { Router } from 'express';
import { createTask, getTaskStatus, pauseTask, resumeTask, cancelTask, retryTask, getAllTasks } from '../autonomous-agent';

// Create a router instance for autonomous agent routes
const autonomousAgentRoutes: Router = express.Router();

// GET all tasks
autonomousAgentRoutes.get('/api/autonomous-agent/tasks', getAllTasks);

// POST create a new task
autonomousAgentRoutes.post('/api/autonomous-agent/tasks', createTask);

// GET task status by ID
autonomousAgentRoutes.get('/api/autonomous-agent/tasks/:id', getTaskStatus);

// POST pause a task
autonomousAgentRoutes.post('/api/autonomous-agent/tasks/:id/pause', pauseTask);

// POST resume a task
autonomousAgentRoutes.post('/api/autonomous-agent/tasks/:id/resume', resumeTask);

// POST cancel a task
autonomousAgentRoutes.post('/api/autonomous-agent/tasks/:id/cancel', cancelTask);

// POST retry a task
autonomousAgentRoutes.post('/api/autonomous-agent/tasks/:id/retry', retryTask);

export default autonomousAgentRoutes;