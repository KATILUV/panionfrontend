import { Request, Response } from 'express';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

// Task and step interfaces
interface AgentStep {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  output?: string;
  error?: string;
}

interface AgentTask {
  id: string;
  userId?: string;
  agentType: string;
  description: string;
  status: 'pending' | 'in_progress' | 'paused' | 'completed' | 'failed';
  progress: number;
  steps: AgentStep[];
  result?: any;
  error?: string;
  startTime: Date;
  completionTime?: Date;
  logs: string[];
  checkpoint?: string;
  retryCount?: number;
  maxRetries?: number;
  priority?: 'low' | 'medium' | 'high';
  dependencies?: string[];
  resources?: Record<string, string>;
}

// In-memory storage for tasks
const tasks: Record<string, AgentTask> = {};

// Default steps for different agent types
const getDefaultSteps = (taskType: string): AgentStep[] => {
  switch (taskType) {
    case 'data_gathering':
      return [
        { id: uuidv4(), description: 'Analyze data gathering requirements', status: 'pending' },
        { id: uuidv4(), description: 'Identify optimal data sources', status: 'pending' },
        { id: uuidv4(), description: 'Collect data using appropriate methods', status: 'pending' },
        { id: uuidv4(), description: 'Process and validate collected data', status: 'pending' },
        { id: uuidv4(), description: 'Format and prepare final results', status: 'pending' }
      ];
    case 'analysis':
      return [
        { id: uuidv4(), description: 'Define analysis parameters', status: 'pending' },
        { id: uuidv4(), description: 'Extract relevant features from data', status: 'pending' },
        { id: uuidv4(), description: 'Apply analytical techniques', status: 'pending' },
        { id: uuidv4(), description: 'Interpret analysis results', status: 'pending' },
        { id: uuidv4(), description: 'Generate insights and recommendations', status: 'pending' }
      ];
    default:
      return [
        { id: uuidv4(), description: 'Understand task requirements', status: 'pending' },
        { id: uuidv4(), description: 'Develop execution strategy', status: 'pending' },
        { id: uuidv4(), description: 'Execute primary actions', status: 'pending' },
        { id: uuidv4(), description: 'Review and validate results', status: 'pending' },
        { id: uuidv4(), description: 'Prepare final output', status: 'pending' }
      ];
  }
};

// Add log message to a task
const addTaskLog = (taskId: string, message: string): void => {
  if (tasks[taskId]) {
    const timestamp = new Date().toISOString();
    tasks[taskId].logs.push(`[${timestamp}] ${message}`);
  }
};

// Update task progress based on completed steps
const updateTaskProgress = (taskId: string): void => {
  const task = tasks[taskId];
  if (!task) return;

  const completedSteps = task.steps.filter(s => s.status === 'completed').length;
  const totalSteps = task.steps.length;
  task.progress = Math.round((completedSteps / totalSteps) * 100);

  // If all steps are completed, mark the task as completed
  if (completedSteps === totalSteps) {
    task.status = 'completed';
    task.completionTime = new Date();
    addTaskLog(taskId, 'Task completed successfully');
  }
};

// Retry a failed step
const retryStep = async (taskId: string, stepId: string): Promise<boolean> => {
  const task = tasks[taskId];
  if (!task) return false;

  const step = task.steps.find(s => s.id === stepId);
  if (!step || step.status !== 'failed') return false;

  step.status = 'in_progress';
  addTaskLog(taskId, `Retrying step: ${step.description}`);

  try {
    // Simulate retry logic
    // In a real implementation, this would retry the actual operation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 80% chance of success on retry
    const success = Math.random() > 0.2;
    if (success) {
      step.status = 'completed';
      step.output = `Successfully completed on retry: ${step.description}`;
      step.error = undefined;
      addTaskLog(taskId, `Successfully completed step after retry: ${step.description}`);
      
      // Move to next step if this was not the last one
      const stepIndex = task.steps.findIndex(s => s.id === stepId);
      if (stepIndex < task.steps.length - 1) {
        task.steps[stepIndex + 1].status = 'in_progress';
        addTaskLog(taskId, `Starting next step: ${task.steps[stepIndex + 1].description}`);
      }
      
      if (task.status === 'failed') {
        task.status = 'in_progress';
        task.error = undefined;
      }
      
      updateTaskProgress(taskId);
      return true;
    } else {
      step.status = 'failed';
      step.error = `Failed to complete after retry: ${step.description}`;
      addTaskLog(taskId, `Failed to complete step after retry: ${step.description}`);
      
      // If retry count exceeded, mark task as failed
      task.retryCount = (task.retryCount || 0) + 1;
      if (task.retryCount >= (task.maxRetries || 3)) {
        task.status = 'failed';
        task.error = `Failed after ${task.retryCount} retries at step: ${step.description}`;
        addTaskLog(taskId, `Task failed after maximum retries`);
      }
      
      return false;
    }
  } catch (error) {
    step.status = 'failed';
    step.error = `Error during retry: ${error.message}`;
    addTaskLog(taskId, `Error during retry: ${error.message}`);
    return false;
  }
};

// Auto-recovery system for failed tasks
const attemptRecovery = async (taskId: string): Promise<boolean> => {
  const task = tasks[taskId];
  if (!task || task.status !== 'failed') return false;

  addTaskLog(taskId, 'Attempting automatic recovery');

  // Find the failed step
  const failedStep = task.steps.find(s => s.status === 'failed');
  if (!failedStep) return false;

  return await retryStep(taskId, failedStep.id);
};

// Advance task execution by one step
const advanceTask = async (taskId: string): Promise<void> => {
  const task = tasks[taskId];
  if (!task || task.status !== 'in_progress') return;

  // Find the current step in progress
  const currentStepIndex = task.steps.findIndex(s => s.status === 'in_progress');
  if (currentStepIndex === -1) {
    // If no step is in progress, start the first pending step
    const nextStepIndex = task.steps.findIndex(s => s.status === 'pending');
    if (nextStepIndex !== -1) {
      task.steps[nextStepIndex].status = 'in_progress';
      addTaskLog(taskId, `Starting step: ${task.steps[nextStepIndex].description}`);
    }
    return;
  }

  const currentStep = task.steps[currentStepIndex];

  try {
    // Simulate step execution
    // In a real implementation, this would perform the actual operation
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 90% chance of success
    const success = Math.random() > 0.1;
    
    if (success) {
      currentStep.status = 'completed';
      currentStep.output = `Successfully completed: ${currentStep.description}`;
      addTaskLog(taskId, `Completed step: ${currentStep.description}`);
      
      // Move to the next step if available
      if (currentStepIndex < task.steps.length - 1) {
        task.steps[currentStepIndex + 1].status = 'in_progress';
        addTaskLog(taskId, `Starting step: ${task.steps[currentStepIndex + 1].description}`);
      }
    } else {
      // Simulate failure
      currentStep.status = 'failed';
      currentStep.error = `Failed to complete: ${currentStep.description}`;
      addTaskLog(taskId, `Failed at step: ${currentStep.description}`);
      
      // Attempt auto-recovery
      const recovered = await attemptRecovery(taskId);
      if (!recovered) {
        task.status = 'failed';
        task.error = `Failed at step: ${currentStep.description}`;
        addTaskLog(taskId, 'Auto-recovery failed, task marked as failed');
      }
    }
    
    updateTaskProgress(taskId);
  } catch (error) {
    currentStep.status = 'failed';
    currentStep.error = `Error: ${error.message}`;
    addTaskLog(taskId, `Error: ${error.message}`);
    
    task.status = 'failed';
    task.error = `Error at step ${currentStepIndex + 1}: ${error.message}`;
  }
};

// Route handlers

// Create a new task
export const createTask = (req: Request, res: Response): void => {
  try {
    const { description, agentType = 'general', maxRetries = 3, priority = 'medium' } = req.body;
    
    if (!description) {
      res.status(400).json({ error: 'Task description is required' });
      return;
    }
    
    const taskId = uuidv4();
    const steps = getDefaultSteps(agentType);
    
    // Set the first step to in_progress
    steps[0].status = 'in_progress';
    
    const newTask: AgentTask = {
      id: taskId,
      agentType,
      description,
      status: 'in_progress',
      progress: 0,
      steps,
      startTime: new Date(),
      logs: [`Task created: ${description}`],
      maxRetries,
      retryCount: 0,
      priority: priority as 'low' | 'medium' | 'high'
    };
    
    tasks[taskId] = newTask;
    addTaskLog(taskId, 'Task initiated');
    
    // Start task execution
    setTimeout(() => {
      advanceTask(taskId);
    }, 500);
    
    res.status(201).json({ 
      taskId,
      message: 'Task created successfully',
      task: newTask
    });
  } catch (error) {
    res.status(500).json({ error: `Failed to create task: ${error.message}` });
  }
};

// Get task status
export const getTaskStatus = (req: Request, res: Response): void => {
  try {
    const { taskId } = req.params;
    
    if (!tasks[taskId]) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    
    res.status(200).json(tasks[taskId]);
  } catch (error) {
    res.status(500).json({ error: `Failed to get task status: ${error.message}` });
  }
};

// Pause a task
export const pauseTask = (req: Request, res: Response): void => {
  try {
    const { taskId } = req.params;
    
    if (!tasks[taskId]) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    
    if (tasks[taskId].status !== 'in_progress') {
      res.status(400).json({ error: 'Task is not in progress' });
      return;
    }
    
    tasks[taskId].status = 'paused';
    addTaskLog(taskId, 'Task paused by user');
    
    res.status(200).json({ 
      taskId,
      message: 'Task paused successfully',
      status: tasks[taskId].status 
    });
  } catch (error) {
    res.status(500).json({ error: `Failed to pause task: ${error.message}` });
  }
};

// Resume a task
export const resumeTask = (req: Request, res: Response): void => {
  try {
    const { taskId } = req.params;
    
    if (!tasks[taskId]) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    
    if (tasks[taskId].status !== 'paused') {
      res.status(400).json({ error: 'Task is not paused' });
      return;
    }
    
    tasks[taskId].status = 'in_progress';
    addTaskLog(taskId, 'Task resumed by user');
    
    // Continue task execution
    setTimeout(() => {
      advanceTask(taskId);
    }, 500);
    
    res.status(200).json({ 
      taskId,
      message: 'Task resumed successfully',
      status: tasks[taskId].status 
    });
  } catch (error) {
    res.status(500).json({ error: `Failed to resume task: ${error.message}` });
  }
};

// Cancel a task
export const cancelTask = (req: Request, res: Response): void => {
  try {
    const { taskId } = req.params;
    
    if (!tasks[taskId]) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    
    if (tasks[taskId].status === 'completed' || tasks[taskId].status === 'failed') {
      res.status(400).json({ error: 'Task is already completed or failed' });
      return;
    }
    
    tasks[taskId].status = 'failed';
    tasks[taskId].error = 'Task canceled by user';
    tasks[taskId].completionTime = new Date();
    addTaskLog(taskId, 'Task canceled by user');
    
    res.status(200).json({ 
      taskId,
      message: 'Task canceled successfully',
      status: tasks[taskId].status 
    });
  } catch (error) {
    res.status(500).json({ error: `Failed to cancel task: ${error.message}` });
  }
};

// Retry a failed task
export const retryTask = (req: Request, res: Response): void => {
  try {
    const { taskId } = req.params;
    
    if (!tasks[taskId]) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    
    if (tasks[taskId].status !== 'failed') {
      res.status(400).json({ error: 'Task is not in failed state' });
      return;
    }
    
    // Reset retry count if needed
    if (req.body.resetRetryCount) {
      tasks[taskId].retryCount = 0;
    }
    
    // Find the first failed step
    const failedStep = tasks[taskId].steps.find(s => s.status === 'failed');
    if (!failedStep) {
      res.status(400).json({ error: 'No failed steps found' });
      return;
    }
    
    // Set the failed step to in_progress and reset the task status
    failedStep.status = 'in_progress';
    tasks[taskId].status = 'in_progress';
    tasks[taskId].error = undefined;
    addTaskLog(taskId, `Retrying task from step: ${failedStep.description}`);
    
    // Continue task execution
    setTimeout(() => {
      advanceTask(taskId);
    }, 500);
    
    res.status(200).json({ 
      taskId,
      message: 'Task retry initiated successfully',
      status: tasks[taskId].status 
    });
  } catch (error) {
    res.status(500).json({ error: `Failed to retry task: ${error.message}` });
  }
};

// Get all tasks
export const getAllTasks = (req: Request, res: Response): void => {
  try {
    const taskList = Object.values(tasks);
    res.status(200).json(taskList);
  } catch (error) {
    res.status(500).json({ error: `Failed to get tasks: ${error.message}` });
  }
};

// Export the task manager object for simulation purposes
export const taskManager = {
  tasks,
  advanceTask,
  retryStep,
  attemptRecovery,
  addTaskLog
};