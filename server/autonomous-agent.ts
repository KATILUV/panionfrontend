import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define the structure of a step in an agent task
interface AgentStep {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  output?: string;
  error?: string;
}

// Define the structure of an agent task
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

// Create a new task
export const createTask = (req: Request, res: Response): void => {
  try {
    // Parse request body
    const { agentType, description, priority = 'medium', autoStart = true, autoRetry = true, resources = {} } = req.body;

    // Validate required fields
    if (!agentType || !description) {
      res.status(400).json({ message: 'Agent type and description are required' });
      return;
    }

    // Generate a unique ID for the task
    const taskId = uuidv4();

    // Create the new task
    const newTask: AgentTask = {
      id: taskId,
      agentType,
      description,
      status: autoStart ? 'in_progress' : 'pending',
      progress: 0,
      steps: [],
      startTime: new Date(),
      logs: [],
      priority,
      resources,
      retryCount: 0,
      maxRetries: autoRetry ? 3 : 0,
    };

    // Add initial log
    newTask.logs.push(`[${new Date().toISOString()}] Task created`);

    // Store the task
    tasks[taskId] = newTask;

    // If autoStart is enabled, start processing the task asynchronously
    if (autoStart) {
      processTask(taskId).catch(error => {
        console.error(`Error processing task ${taskId}:`, error);
        tasks[taskId].logs.push(`[${new Date().toISOString()}] Error: ${error.message}`);
        tasks[taskId].status = 'failed';
        tasks[taskId].error = error.message;
      });
    }

    // Return the task
    res.status(201).json(newTask);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get task status
export const getTaskStatus = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;

    // Validate task exists
    if (!tasks[id]) {
      res.status(404).json({ message: 'Task not found' });
      return;
    }

    // Return the task
    res.json(tasks[id]);
  } catch (error) {
    console.error('Error getting task status:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Pause task
export const pauseTask = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;

    // Validate task exists
    if (!tasks[id]) {
      res.status(404).json({ message: 'Task not found' });
      return;
    }

    // Can only pause in_progress tasks
    if (tasks[id].status !== 'in_progress') {
      res.status(400).json({ message: `Cannot pause task with status: ${tasks[id].status}` });
      return;
    }

    // Update task status
    tasks[id].status = 'paused';
    tasks[id].logs.push(`[${new Date().toISOString()}] Task paused`);

    // Return the updated task
    res.json(tasks[id]);
  } catch (error) {
    console.error('Error pausing task:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Resume task
export const resumeTask = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;

    // Validate task exists
    if (!tasks[id]) {
      res.status(404).json({ message: 'Task not found' });
      return;
    }

    // Can only resume paused tasks
    if (tasks[id].status !== 'paused') {
      res.status(400).json({ message: `Cannot resume task with status: ${tasks[id].status}` });
      return;
    }

    // Update task status
    tasks[id].status = 'in_progress';
    tasks[id].logs.push(`[${new Date().toISOString()}] Task resumed`);

    // Resume processing the task
    processTask(id, tasks[id].checkpoint).catch(error => {
      console.error(`Error processing task ${id}:`, error);
      tasks[id].logs.push(`[${new Date().toISOString()}] Error: ${error.message}`);
      tasks[id].status = 'failed';
      tasks[id].error = error.message;
    });

    // Return the updated task
    res.json(tasks[id]);
  } catch (error) {
    console.error('Error resuming task:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Cancel task
export const cancelTask = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;

    // Validate task exists
    if (!tasks[id]) {
      res.status(404).json({ message: 'Task not found' });
      return;
    }

    // Update task status
    const previousStatus = tasks[id].status;
    tasks[id].status = 'failed';
    tasks[id].logs.push(`[${new Date().toISOString()}] Task cancelled`);
    tasks[id].completionTime = new Date();

    // Return the updated task
    res.json({
      ...tasks[id],
      previousStatus
    });
  } catch (error) {
    console.error('Error cancelling task:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Retry task
export const retryTask = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;

    // Validate task exists
    if (!tasks[id]) {
      res.status(404).json({ message: 'Task not found' });
      return;
    }

    // Can only retry failed or completed tasks
    if (tasks[id].status !== 'failed' && tasks[id].status !== 'completed') {
      res.status(400).json({ message: `Cannot retry task with status: ${tasks[id].status}` });
      return;
    }

    // Create a new task based on the existing one
    const newTaskId = uuidv4();
    const newTask: AgentTask = {
      ...tasks[id],
      id: newTaskId,
      status: 'in_progress',
      progress: 0,
      steps: [],
      startTime: new Date(),
      completionTime: undefined,
      logs: [`[${new Date().toISOString()}] Task retried from task ${id}`],
      error: undefined,
      result: undefined,
      retryCount: (tasks[id].retryCount || 0) + 1
    };

    // Store the new task
    tasks[newTaskId] = newTask;

    // Start processing the new task
    processTask(newTaskId).catch(error => {
      console.error(`Error processing task ${newTaskId}:`, error);
      tasks[newTaskId].logs.push(`[${new Date().toISOString()}] Error: ${error.message}`);
      tasks[newTaskId].status = 'failed';
      tasks[newTaskId].error = error.message;
    });

    // Return the new task
    res.json(newTask);
  } catch (error) {
    console.error('Error retrying task:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get all tasks
export const getAllTasks = (req: Request, res: Response): void => {
  try {
    // Convert tasks object to array and sort by creation time (newest first)
    const taskList = Object.values(tasks).sort((a, b) => 
      new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );

    // Return the tasks
    res.json(taskList);
  } catch (error) {
    console.error('Error getting all tasks:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Process a task asynchronously
async function processTask(taskId: string, checkpoint?: string): Promise<void> {
  // Get the task
  const task = tasks[taskId];
  if (!task) {
    throw new Error('Task not found');
  }

  // Skip processing if task is not in progress
  if (task.status !== 'in_progress') {
    return;
  }

  // Log that processing has started
  task.logs.push(`[${new Date().toISOString()}] Started processing task`);
  
  try {
    // Set initial task steps based on agent type
    if (task.steps.length === 0) {
      switch (task.agentType) {
        case 'data_gathering':
          // Data gathering steps
          task.steps = [
            {
              id: uuidv4(),
              description: 'Analyze and understand the task requirements',
              status: 'pending'
            },
            {
              id: uuidv4(),
              description: 'Identify required data sources',
              status: 'pending'
            },
            {
              id: uuidv4(),
              description: 'Collect data from identified sources',
              status: 'pending'
            },
            {
              id: uuidv4(),
              description: 'Process and validate collected data',
              status: 'pending'
            },
            {
              id: uuidv4(),
              description: 'Format and prepare final results',
              status: 'pending'
            }
          ];
          break;

        case 'analysis':
          // Analysis steps
          task.steps = [
            {
              id: uuidv4(),
              description: 'Analyze and understand the task requirements',
              status: 'pending'
            },
            {
              id: uuidv4(),
              description: 'Review available data and identify patterns',
              status: 'pending'
            },
            {
              id: uuidv4(),
              description: 'Perform data analysis and extract insights',
              status: 'pending'
            },
            {
              id: uuidv4(),
              description: 'Verify and validate findings',
              status: 'pending'
            },
            {
              id: uuidv4(),
              description: 'Generate comprehensive analysis report',
              status: 'pending'
            }
          ];
          break;

        default:
          // General purpose steps
          task.steps = [
            {
              id: uuidv4(),
              description: 'Analyze and understand the task requirements',
              status: 'pending'
            },
            {
              id: uuidv4(),
              description: 'Plan approach and strategy',
              status: 'pending'
            },
            {
              id: uuidv4(),
              description: 'Execute task operations',
              status: 'pending'
            },
            {
              id: uuidv4(),
              description: 'Review and verify results',
              status: 'pending'
            },
            {
              id: uuidv4(),
              description: 'Finalize and prepare output',
              status: 'pending'
            }
          ];
      }
    }

    // Start from checkpoint if provided
    let startIndex = 0;
    if (checkpoint) {
      const checkpointIndex = task.steps.findIndex(step => step.id === checkpoint);
      if (checkpointIndex !== -1) {
        startIndex = checkpointIndex;
      }
    }

    // Process each step
    for (let i = startIndex; i < task.steps.length; i++) {
      // Check if task is still in progress
      if (task.status !== 'in_progress') {
        task.checkpoint = task.steps[i].id;
        return;
      }

      const step = task.steps[i];
      
      // Update step status
      step.status = 'in_progress';
      task.logs.push(`[${new Date().toISOString()}] Started step: ${step.description}`);

      try {
        // Update progress
        task.progress = Math.round(((i) / task.steps.length) * 100);

        // Process the step
        const result = await processStep(task, step);
        
        // Update step status and output
        step.status = 'completed';
        step.output = result;
        task.logs.push(`[${new Date().toISOString()}] Completed step: ${step.description}`);
      } catch (error) {
        // Handle step failure
        step.status = 'failed';
        step.error = error.message;
        task.logs.push(`[${new Date().toISOString()}] Step failed: ${step.description} - ${error.message}`);
        
        // Check if we should retry
        if ((task.retryCount || 0) < (task.maxRetries || 0)) {
          task.logs.push(`[${new Date().toISOString()}] Retrying step: ${step.description}`);
          step.status = 'in_progress';
          
          // Try again
          try {
            const result = await processStep(task, step);
            
            // Update step status and output
            step.status = 'completed';
            step.output = result;
            task.logs.push(`[${new Date().toISOString()}] Retry succeeded for step: ${step.description}`);
          } catch (retryError) {
            // Handle retry failure
            step.status = 'failed';
            step.error = retryError.message;
            task.logs.push(`[${new Date().toISOString()}] Retry failed for step: ${step.description} - ${retryError.message}`);
            
            // Mark task as failed
            task.status = 'failed';
            task.error = `Failed to complete step: ${step.description}`;
            task.completionTime = new Date();
            return;
          }
        } else {
          // Mark task as failed
          task.status = 'failed';
          task.error = `Failed to complete step: ${step.description}`;
          task.completionTime = new Date();
          return;
        }
      }
    }

    // All steps completed successfully
    task.status = 'completed';
    task.progress = 100;
    task.completionTime = new Date();
    task.logs.push(`[${new Date().toISOString()}] Task completed successfully`);

    // Generate result summary
    try {
      const summaryPrompt = `
        Summarize the results of this autonomous agent task. 
        Task description: ${task.description}
        Task type: ${task.agentType}
        
        Steps completed:
        ${task.steps.map(step => `- ${step.description}: ${step.output || 'No output'}`).join('\n')}
        
        Provide a concise, well-formatted summary with key points and insights.
      `;

      // Generate summary
      const summary = await generateTaskSummary(summaryPrompt);
      task.result = summary;
    } catch (error) {
      console.error('Error generating task summary:', error);
      task.logs.push(`[${new Date().toISOString()}] Warning: Could not generate task summary - ${error.message}`);
      task.result = 'Task completed successfully, but summary generation failed.';
    }
  } catch (error) {
    // Handle unexpected errors
    console.error(`Error processing task ${taskId}:`, error);
    task.logs.push(`[${new Date().toISOString()}] Error: ${error.message}`);
    task.status = 'failed';
    task.error = error.message;
    task.completionTime = new Date();
  }
}

// Process a single step
async function processStep(task: AgentTask, step: AgentStep): Promise<string> {
  // Wait a random time to simulate processing
  const waitTime = Math.floor(Math.random() * 5000) + 2000;
  await new Promise(resolve => setTimeout(resolve, waitTime));

  // Different processing based on agent type and step
  const stepPrompt = `
    You are an autonomous agent tasked with: "${task.description}"
    
    You are currently working on step: "${step.description}"
    Agent type: ${task.agentType}
    
    Resources available: ${JSON.stringify(task.resources || {})}
    
    Previous steps:
    ${task.steps
      .filter(s => s.id !== step.id && s.status === 'completed')
      .map(s => `- ${s.description}: ${s.output}`)
      .join('\n')
    }
    
    Your task is to provide a detailed response for this step. Include any relevant findings, insights, or data. Be thorough but concise.
    Format your response professionally, focusing on factual information.
  `;

  // Use OpenAI API to generate step output
  const response = await openai.chat.completions.create({
    model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    messages: [
      { role: "system", content: "You are a sophisticated autonomous agent capable of performing complex tasks. Your responses are factual, detailed, and professional." },
      { role: "user", content: stepPrompt }
    ],
    temperature: 0.7,
    max_tokens: 1000,
  });

  const stepOutput = response.choices[0].message.content || "Step completed successfully";
  return stepOutput;
}

// Generate a task summary
async function generateTaskSummary(prompt: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    messages: [
      { role: "system", content: "You are an expert at summarizing complex tasks and providing insightful summaries. Focus on key results and actionable insights." },
      { role: "user", content: prompt }
    ],
    temperature: 0.5,
    max_tokens: 1000,
  });

  return response.choices[0].message.content || "Task summary generation failed.";
}

// Helper function to create a task programmatically (for API usage)
function createTaskInternal(taskId: string, taskConfig: Partial<AgentTask>): AgentTask {
  // Create the new task with default values merged with provided config
  const newTask: AgentTask = {
    id: taskId,
    agentType: taskConfig.agentType || 'general',
    description: taskConfig.description || 'Task with no description',
    status: taskConfig.status || 'pending',
    progress: taskConfig.progress || 0,
    steps: taskConfig.steps || [],
    startTime: taskConfig.startTime || new Date(),
    logs: taskConfig.logs || [],
    priority: taskConfig.priority || 'medium',
    resources: taskConfig.resources || {},
    retryCount: taskConfig.retryCount || 0,
    maxRetries: taskConfig.maxRetries || 3,
    completionTime: taskConfig.completionTime,
    error: taskConfig.error,
    result: taskConfig.result,
    dependencies: taskConfig.dependencies,
    checkpoint: taskConfig.checkpoint,
    userId: taskConfig.userId
  };

  // Add initial log if none exists
  if (newTask.logs.length === 0) {
    newTask.logs.push(`[${new Date().toISOString()}] Task created`);
  }

  // Store the task
  tasks[taskId] = newTask;
  
  return newTask;
}

// Helper function to start a task programmatically
function startTaskInternal(taskId: string): boolean {
  if (!tasks[taskId]) {
    return false;
  }
  
  // Only start tasks that are in pending state
  if (tasks[taskId].status !== 'pending') {
    return false;
  }
  
  // Update status and start processing
  tasks[taskId].status = 'in_progress';
  tasks[taskId].logs.push(`[${new Date().toISOString()}] Task started`);
  
  // Process the task asynchronously
  processTask(taskId).catch(error => {
    console.error(`Error processing task ${taskId}:`, error);
    tasks[taskId].logs.push(`[${new Date().toISOString()}] Error: ${error instanceof Error ? error.message : String(error)}`);
    tasks[taskId].status = 'failed';
    tasks[taskId].error = error instanceof Error ? error.message : String(error);
  });
  
  return true;
}

// Task management utilities
export const taskManager = {
  tasks,
  processTask,
  createTask: createTaskInternal,
  startTask: startTaskInternal
};