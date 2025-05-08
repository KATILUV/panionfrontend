import { Router, Request, Response } from 'express';
import { log } from '../vite';

// Create router
const router = Router();

// Map to store active tasks by ID
interface Task {
  id: string;
  targetAgent: string;
  task: string;
  parameters: any;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: any;
  progress: number;
  estimatedTimeRemaining?: number;
}

const tasks: Record<string, Task> = {};

// Get all scheduled tasks
router.get('/api/scheduled-tasks', (_req: Request, res: Response) => {
  try {
    // Convert tasks map to array
    const taskList = Object.values(tasks).sort((a, b) => 
      (b.createdAt.getTime() - a.createdAt.getTime())
    );
    
    res.json({
      success: true,
      tasks: taskList
    });
  } catch (error: any) {
    log(`Error getting scheduled tasks: ${error.message}`, 'scheduled-tasks');
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve tasks',
      message: error.message
    });
  }
});

// Create a new scheduled task
router.post('/api/scheduled-tasks', (req: Request, res: Response) => {
  try {
    const { targetAgent, task, parameters, callbackUrl } = req.body;
    
    if (!targetAgent || !task) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'Target agent and task are required'
      });
    }
    
    // Generate task ID
    const taskId = Date.now().toString(36) + Math.random().toString(36).substring(2);
    
    // Create task record
    const newTask: Task = {
      id: taskId,
      targetAgent,
      task,
      parameters: parameters || {},
      status: 'pending',
      createdAt: new Date(),
      progress: 0
    };
    
    // Store task
    tasks[taskId] = newTask;
    
    log(`Created scheduled task: ${taskId} for agent ${targetAgent}`, 'scheduled-tasks');
    
    res.json({
      success: true,
      taskId,
      task: newTask
    });
  } catch (error: any) {
    log(`Error creating scheduled task: ${error.message}`, 'scheduled-tasks');
    res.status(500).json({
      success: false,
      error: 'Failed to create task',
      message: error.message
    });
  }
});

// Update task status
router.post('/api/scheduled-tasks/:taskId/status', (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const { status, result, progress, estimatedTimeRemaining } = req.body;
    
    if (!tasks[taskId]) {
      return res.status(404).json({
        success: false,
        error: 'Task not found',
        message: `No task with ID ${taskId}`
      });
    }
    
    // Update task status
    const task = tasks[taskId];
    task.status = status || task.status;
    
    if (result !== undefined) {
      task.result = result;
    }
    
    if (progress !== undefined) {
      task.progress = progress;
    }
    
    if (estimatedTimeRemaining !== undefined) {
      task.estimatedTimeRemaining = estimatedTimeRemaining;
    }
    
    // If completing or failing the task, set completion time
    if (status === 'completed' || status === 'failed') {
      task.completedAt = new Date();
    }
    
    // If starting the task, set start time
    if (status === 'running' && !task.startedAt) {
      task.startedAt = new Date();
    }
    
    log(`Updated task ${taskId} status to ${status}`, 'scheduled-tasks');
    
    res.json({
      success: true,
      task
    });
  } catch (error: any) {
    log(`Error updating task status: ${error.message}`, 'scheduled-tasks');
    res.status(500).json({
      success: false,
      error: 'Failed to update task status',
      message: error.message
    });
  }
});

// Handle task completion callbacks from agents
router.post('/api/scheduled-tasks/callback', (req: Request, res: Response) => {
  try {
    const { taskId, status, result, source } = req.body;
    
    log(`Received callback from ${source} for task ${taskId}: ${status}`, 'scheduled-tasks');
    
    if (!tasks[taskId]) {
      // This could be a task created on the client side, just acknowledge
      return res.json({
        success: true,
        message: 'Callback received, but task not found on server'
      });
    }
    
    // Update task
    const task = tasks[taskId];
    task.status = status;
    
    if (result) {
      task.result = result;
    }
    
    if (status === 'completed' || status === 'failed') {
      task.completedAt = new Date();
      task.progress = status === 'completed' ? 100 : task.progress;
    }
    
    res.json({
      success: true,
      message: 'Callback processed successfully'
    });
  } catch (error: any) {
    log(`Error processing task callback: ${error.message}`, 'scheduled-tasks');
    res.status(500).json({
      success: false,
      error: 'Failed to process task callback',
      message: error.message
    });
  }
});

// Get a specific task by ID
router.get('/api/scheduled-tasks/:taskId', (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    
    if (!tasks[taskId]) {
      return res.status(404).json({
        success: false,
        error: 'Task not found',
        message: `No task with ID ${taskId}`
      });
    }
    
    res.json({
      success: true,
      task: tasks[taskId]
    });
  } catch (error: any) {
    log(`Error getting task: ${error.message}`, 'scheduled-tasks');
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve task',
      message: error.message
    });
  }
});

// Delete a task
router.delete('/api/scheduled-tasks/:taskId', (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    
    if (!tasks[taskId]) {
      return res.status(404).json({
        success: false,
        error: 'Task not found',
        message: `No task with ID ${taskId}`
      });
    }
    
    // Remove task
    delete tasks[taskId];
    
    log(`Deleted task ${taskId}`, 'scheduled-tasks');
    
    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error: any) {
    log(`Error deleting task: ${error.message}`, 'scheduled-tasks');
    res.status(500).json({
      success: false,
      error: 'Failed to delete task',
      message: error.message
    });
  }
});

export default router;