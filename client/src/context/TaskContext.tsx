import React, { createContext, useContext, useEffect, useReducer, useState } from 'react';

// Task step type
export interface TaskStep {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  output?: string;
  error?: string;
}

// Task type
export interface Task {
  id: string;
  userId?: string;
  agentType: string;
  description: string;
  status: 'pending' | 'in_progress' | 'paused' | 'completed' | 'failed';
  progress: number;
  steps: TaskStep[];
  result?: any;
  error?: string;
  startTime: string;
  completionTime?: string;
  priority?: 'low' | 'medium' | 'high';
  logs: string[];
}

// WebSocket message types
interface TaskUpdateMessage {
  taskId: string;
  type: 'task_update' | 'step_update';
  timestamp: number;
  status?: string;
  progress?: number;
  message?: string;
  stepId?: string;
  description?: string;
}

// Task action types
type TaskAction =
  | { type: 'SET_TASKS'; payload: Task[] }
  | { type: 'ADD_TASK'; payload: Task }
  | { type: 'UPDATE_TASK'; payload: { id: string; updates: Partial<Task> } }
  | { type: 'UPDATE_STEP'; payload: { taskId: string; stepId: string; updates: Partial<TaskStep> } }
  | { type: 'REMOVE_TASK'; payload: string };

// Task state type
interface TaskState {
  tasks: Record<string, Task>;
  activeTasks: string[];
  completedTasks: string[];
  failedTasks: string[];
}

// Initial task state
const initialState: TaskState = {
  tasks: {},
  activeTasks: [],
  completedTasks: [],
  failedTasks: []
};

// Task reducer function
function taskReducer(state: TaskState, action: TaskAction): TaskState {
  switch (action.type) {
    case 'SET_TASKS': {
      const tasks = action.payload.reduce((acc, task) => {
        acc[task.id] = task;
        return acc;
      }, {} as Record<string, Task>);
      
      const activeTasks = action.payload
        .filter(task => ['in_progress', 'pending', 'paused'].includes(task.status))
        .map(task => task.id);
      
      const completedTasks = action.payload
        .filter(task => task.status === 'completed')
        .map(task => task.id);
      
      const failedTasks = action.payload
        .filter(task => task.status === 'failed')
        .map(task => task.id);
      
      return {
        tasks,
        activeTasks,
        completedTasks,
        failedTasks
      };
    }
    
    case 'ADD_TASK': {
      const task = action.payload;
      const isActive = ['in_progress', 'pending', 'paused'].includes(task.status);
      const isCompleted = task.status === 'completed';
      const isFailed = task.status === 'failed';
      
      return {
        ...state,
        tasks: {
          ...state.tasks,
          [task.id]: task
        },
        activeTasks: isActive ? [...state.activeTasks, task.id] : state.activeTasks,
        completedTasks: isCompleted ? [...state.completedTasks, task.id] : state.completedTasks,
        failedTasks: isFailed ? [...state.failedTasks, task.id] : state.failedTasks
      };
    }
    
    case 'UPDATE_TASK': {
      const { id, updates } = action.payload;
      const task = state.tasks[id];
      
      if (!task) return state;
      
      const updatedTask = { ...task, ...updates };
      const wasActive = ['in_progress', 'pending', 'paused'].includes(task.status);
      const isActive = ['in_progress', 'pending', 'paused'].includes(updatedTask.status);
      const wasCompleted = task.status === 'completed';
      const isCompleted = updatedTask.status === 'completed';
      const wasFailed = task.status === 'failed';
      const isFailed = updatedTask.status === 'failed';
      
      return {
        ...state,
        tasks: {
          ...state.tasks,
          [id]: updatedTask
        },
        activeTasks: isActive !== wasActive
          ? (isActive
              ? [...state.activeTasks, id]
              : state.activeTasks.filter(taskId => taskId !== id))
          : state.activeTasks,
        completedTasks: isCompleted !== wasCompleted
          ? (isCompleted
              ? [...state.completedTasks, id]
              : state.completedTasks.filter(taskId => taskId !== id))
          : state.completedTasks,
        failedTasks: isFailed !== wasFailed
          ? (isFailed
              ? [...state.failedTasks, id]
              : state.failedTasks.filter(taskId => taskId !== id))
          : state.failedTasks
      };
    }
    
    case 'UPDATE_STEP': {
      const { taskId, stepId, updates } = action.payload;
      const task = state.tasks[taskId];
      
      if (!task) return state;
      
      const stepIndex = task.steps.findIndex(step => step.id === stepId);
      if (stepIndex === -1) return state;
      
      const updatedSteps = [...task.steps];
      updatedSteps[stepIndex] = { ...updatedSteps[stepIndex], ...updates };
      
      return {
        ...state,
        tasks: {
          ...state.tasks,
          [taskId]: {
            ...task,
            steps: updatedSteps
          }
        }
      };
    }
    
    case 'REMOVE_TASK': {
      const taskId = action.payload;
      const { [taskId]: removedTask, ...remainingTasks } = state.tasks;
      
      if (!removedTask) return state;
      
      return {
        ...state,
        tasks: remainingTasks,
        activeTasks: state.activeTasks.filter(id => id !== taskId),
        completedTasks: state.completedTasks.filter(id => id !== taskId),
        failedTasks: state.failedTasks.filter(id => id !== taskId)
      };
    }
    
    default:
      return state;
  }
}

// Task context type
interface TaskContextType {
  state: TaskState;
  createTask: (taskConfig: Omit<Task, 'id' | 'startTime' | 'steps' | 'progress' | 'status'>) => Promise<Task>;
  getTask: (id: string) => Task | null;
  getAllTasks: () => Promise<Task[]>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<Task>;
  pauseTask: (id: string) => Promise<Task>;
  resumeTask: (id: string) => Promise<Task>;
  cancelTask: (id: string) => Promise<Task>;
  retryTask: (id: string) => Promise<Task>;
  subscribeToTask: (taskId: string) => void;
  unsubscribeFromTask: (taskId: string) => void;
  connectionStatus: 'connecting' | 'connected' | 'disconnected';
}

// Create the task context
const TaskContext = createContext<TaskContextType | undefined>(undefined);

// Task provider props
interface TaskProviderProps {
  children: React.ReactNode;
}

// Task provider component
export const TaskProvider: React.FC<TaskProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(taskReducer, initialState);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  
  // Initialize WebSocket connection
  useEffect(() => {
    const connectWebSocket = () => {
      // Create WebSocket connection
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      console.log('Connecting to WebSocket at', wsUrl);
      const ws = new WebSocket(wsUrl);
      
      // Set up event handlers
      ws.onopen = () => {
        console.log('WebSocket connection established');
        setConnectionStatus('connected');
      };
      
      ws.onclose = () => {
        console.log('WebSocket connection closed');
        setConnectionStatus('disconnected');
        
        // Attempt to reconnect after a delay
        setTimeout(() => {
          console.log('Attempting to reconnect WebSocket...');
          setConnectionStatus('connecting');
          connectWebSocket();
        }, 5000);
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      ws.onmessage = (event) => {
        try {
          const message: TaskUpdateMessage = JSON.parse(event.data);
          
          if (message.type === 'task_update') {
            handleTaskUpdate(message);
          } else if (message.type === 'step_update') {
            handleStepUpdate(message);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      // Set the socket state
      setSocket(ws);
      
      // Set up heartbeat to keep connection alive
      const heartbeatInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'heartbeat' }));
        }
      }, 30000);
      
      // Clean up on unmount
      return () => {
        clearInterval(heartbeatInterval);
        ws.close();
      };
    };
    
    setConnectionStatus('connecting');
    connectWebSocket();
    
    // Fetch initial tasks on mount
    fetchAllTasks().catch(console.error);
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Handle task update messages
  const handleTaskUpdate = (message: TaskUpdateMessage) => {
    const { taskId, status, progress } = message;
    
    // Update the task in our state
    if (state.tasks[taskId]) {
      dispatch({
        type: 'UPDATE_TASK',
        payload: {
          id: taskId,
          updates: {
            ...(status && { status: status as any }),
            ...(progress !== undefined && { progress })
          }
        }
      });
    } else {
      // If we don't have this task yet, fetch its details
      fetchTask(taskId).catch(console.error);
    }
  };
  
  // Handle step update messages
  const handleStepUpdate = (message: TaskUpdateMessage) => {
    const { taskId, stepId, status, description } = message;
    
    if (!stepId) return;
    
    // Update the step in our state
    if (state.tasks[taskId]) {
      dispatch({
        type: 'UPDATE_STEP',
        payload: {
          taskId,
          stepId,
          updates: {
            ...(status && { status: status as any }),
            ...(description && { description })
          }
        }
      });
    } else {
      // If we don't have this task yet, fetch its details
      fetchTask(taskId).catch(console.error);
    }
  };
  
  // Subscribe to task updates
  const subscribeToTask = (taskId: string) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'subscribe', taskId }));
    }
  };
  
  // Unsubscribe from task updates
  const unsubscribeFromTask = (taskId: string) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'unsubscribe', taskId }));
    }
  };
  
  // Fetch all tasks
  const fetchAllTasks = async (): Promise<Task[]> => {
    try {
      const response = await fetch('/api/tasks');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch tasks: ${response.statusText}`);
      }
      
      const tasks: Task[] = await response.json();
      
      // Update our state with the fetched tasks
      dispatch({ type: 'SET_TASKS', payload: tasks });
      
      return tasks;
    } catch (error) {
      console.error('Error fetching tasks:', error);
      return [];
    }
  };
  
  // Fetch a single task
  const fetchTask = async (id: string): Promise<Task | null> => {
    try {
      const response = await fetch(`/api/tasks/${id}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch task: ${response.statusText}`);
      }
      
      const task: Task = await response.json();
      
      // Update our state with the fetched task
      dispatch({ type: 'ADD_TASK', payload: task });
      
      return task;
    } catch (error) {
      console.error(`Error fetching task ${id}:`, error);
      return null;
    }
  };
  
  // Create a new task
  const createTask = async (
    taskConfig: Omit<Task, 'id' | 'startTime' | 'steps' | 'progress' | 'status'>
  ): Promise<Task> => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(taskConfig)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create task: ${response.statusText}`);
      }
      
      const task: Task = await response.json();
      
      // Update our state with the new task
      dispatch({ type: 'ADD_TASK', payload: task });
      
      // Subscribe to updates for this task
      subscribeToTask(task.id);
      
      return task;
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  };
  
  // Get a task by ID
  const getTask = (id: string): Task | null => {
    return state.tasks[id] || null;
  };
  
  // Get all tasks
  const getAllTasks = async (): Promise<Task[]> => {
    return fetchAllTasks();
  };
  
  // Update a task
  const updateTask = async (id: string, updates: Partial<Task>): Promise<Task> => {
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update task: ${response.statusText}`);
      }
      
      const task: Task = await response.json();
      
      // Update our state with the updated task
      dispatch({
        type: 'UPDATE_TASK',
        payload: { id, updates: task }
      });
      
      return task;
    } catch (error) {
      console.error(`Error updating task ${id}:`, error);
      throw error;
    }
  };
  
  // Pause a task
  const pauseTask = async (id: string): Promise<Task> => {
    try {
      const response = await fetch(`/api/tasks/${id}/pause`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to pause task: ${response.statusText}`);
      }
      
      const task: Task = await response.json();
      
      // Update our state with the paused task
      dispatch({
        type: 'UPDATE_TASK',
        payload: { id, updates: task }
      });
      
      return task;
    } catch (error) {
      console.error(`Error pausing task ${id}:`, error);
      throw error;
    }
  };
  
  // Resume a task
  const resumeTask = async (id: string): Promise<Task> => {
    try {
      const response = await fetch(`/api/tasks/${id}/resume`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to resume task: ${response.statusText}`);
      }
      
      const task: Task = await response.json();
      
      // Update our state with the resumed task
      dispatch({
        type: 'UPDATE_TASK',
        payload: { id, updates: task }
      });
      
      return task;
    } catch (error) {
      console.error(`Error resuming task ${id}:`, error);
      throw error;
    }
  };
  
  // Cancel a task
  const cancelTask = async (id: string): Promise<Task> => {
    try {
      const response = await fetch(`/api/tasks/${id}/cancel`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to cancel task: ${response.statusText}`);
      }
      
      const task: Task = await response.json();
      
      // Update our state with the cancelled task
      dispatch({
        type: 'UPDATE_TASK',
        payload: { id, updates: task }
      });
      
      return task;
    } catch (error) {
      console.error(`Error cancelling task ${id}:`, error);
      throw error;
    }
  };
  
  // Retry a task
  const retryTask = async (id: string): Promise<Task> => {
    try {
      const response = await fetch(`/api/tasks/${id}/retry`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to retry task: ${response.statusText}`);
      }
      
      const task: Task = await response.json();
      
      // Update our state with the new task
      dispatch({ type: 'ADD_TASK', payload: task });
      
      // Subscribe to updates for this task
      subscribeToTask(task.id);
      
      return task;
    } catch (error) {
      console.error(`Error retrying task ${id}:`, error);
      throw error;
    }
  };
  
  return (
    <TaskContext.Provider
      value={{
        state,
        createTask,
        getTask,
        getAllTasks,
        updateTask,
        pauseTask,
        resumeTask,
        cancelTask,
        retryTask,
        subscribeToTask,
        unsubscribeFromTask,
        connectionStatus
      }}
    >
      {children}
    </TaskContext.Provider>
  );
};

// Custom hook to use the task context
export const useTaskContext = (): TaskContextType => {
  const context = useContext(TaskContext);
  
  if (context === undefined) {
    throw new Error('useTaskContext must be used within a TaskProvider');
  }
  
  return context;
};