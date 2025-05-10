import React, { createContext, useContext, useReducer, useCallback, useEffect, useState } from 'react';

// Define the types for task and steps
export interface TaskStep {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  output?: string;
  error?: string;
}

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
  startTime: string; // ISO date string
  completionTime?: string; // ISO date string
  logs: string[];
  checkpoint?: string;
  retryCount?: number;
  maxRetries?: number;
  priority?: 'low' | 'medium' | 'high';
  dependencies?: string[];
  resources?: Record<string, string>;
}

// Define the state type
interface TaskState {
  tasks: Record<string, Task>;
  activeTasks: string[]; // task ids
  completedTasks: string[]; // task ids
  failedTasks: string[]; // task ids
  subscribedTasks: Set<string>; // task ids with active subscriptions
}

// Define the action types
type TaskAction =
  | { type: 'SET_TASKS'; payload: Task[] }
  | { type: 'ADD_TASK'; payload: Task }
  | { type: 'UPDATE_TASK'; payload: Task }
  | { type: 'UPDATE_TASK_PARTIAL'; payload: { id: string; updates: Partial<Task> } }
  | { type: 'SUBSCRIBE_TO_TASK'; payload: string }
  | { type: 'UNSUBSCRIBE_FROM_TASK'; payload: string }
  | { type: 'CLEAR_TASKS' }
  | { type: 'ACTIVATE_DADDY_DATA'; payload: { businessType: string; location: string; taskId?: string } };

// Define the initial state
const initialState: TaskState = {
  tasks: {},
  activeTasks: [],
  completedTasks: [],
  failedTasks: [],
  subscribedTasks: new Set<string>()
};

// Define the reducer function
function taskReducer(state: TaskState, action: TaskAction): TaskState {
  switch (action.type) {
    case 'SET_TASKS': {
      const tasksRecord: Record<string, Task> = {};
      const activeTasks: string[] = [];
      const completedTasks: string[] = [];
      const failedTasks: string[] = [];
      
      // Process all tasks
      action.payload.forEach(task => {
        tasksRecord[task.id] = task;
        
        // Categorize tasks by status
        if (task.status === 'completed') {
          completedTasks.push(task.id);
        } else if (task.status === 'failed') {
          failedTasks.push(task.id);
        } else {
          activeTasks.push(task.id);
        }
      });
      
      return {
        ...state,
        tasks: tasksRecord,
        activeTasks,
        completedTasks,
        failedTasks
      };
    }
    
    case 'ADD_TASK': {
      const task = action.payload;
      
      // Add task to appropriate list
      let activeTasks = [...state.activeTasks];
      let completedTasks = [...state.completedTasks];
      let failedTasks = [...state.failedTasks];
      
      if (task.status === 'completed') {
        completedTasks.push(task.id);
      } else if (task.status === 'failed') {
        failedTasks.push(task.id);
      } else {
        activeTasks.push(task.id);
      }
      
      return {
        ...state,
        tasks: {
          ...state.tasks,
          [task.id]: task
        },
        activeTasks,
        completedTasks,
        failedTasks
      };
    }
    
    case 'UPDATE_TASK': {
      const task = action.payload;
      const prevTask = state.tasks[task.id];
      
      if (!prevTask) {
        return state; // Task doesn't exist, do nothing
      }
      
      // Handle task status changes
      let activeTasks = [...state.activeTasks];
      let completedTasks = [...state.completedTasks];
      let failedTasks = [...state.failedTasks];
      
      // Remove from previous status list
      if (prevTask.status !== task.status) {
        if (prevTask.status === 'completed') {
          completedTasks = completedTasks.filter(id => id !== task.id);
        } else if (prevTask.status === 'failed') {
          failedTasks = failedTasks.filter(id => id !== task.id);
        } else {
          activeTasks = activeTasks.filter(id => id !== task.id);
        }
        
        // Add to new status list
        if (task.status === 'completed') {
          completedTasks.push(task.id);
        } else if (task.status === 'failed') {
          failedTasks.push(task.id);
        } else {
          activeTasks.push(task.id);
        }
      }
      
      return {
        ...state,
        tasks: {
          ...state.tasks,
          [task.id]: task
        },
        activeTasks,
        completedTasks,
        failedTasks
      };
    }
    
    case 'UPDATE_TASK_PARTIAL': {
      const { id, updates } = action.payload;
      const prevTask = state.tasks[id];
      
      if (!prevTask) {
        return state; // Task doesn't exist, do nothing
      }
      
      const updatedTask = { ...prevTask, ...updates };
      
      // Handle task status changes
      let activeTasks = [...state.activeTasks];
      let completedTasks = [...state.completedTasks];
      let failedTasks = [...state.failedTasks];
      
      // Remove from previous status list and add to new one if status changed
      if (updates.status && prevTask.status !== updates.status) {
        if (prevTask.status === 'completed') {
          completedTasks = completedTasks.filter(taskId => taskId !== id);
        } else if (prevTask.status === 'failed') {
          failedTasks = failedTasks.filter(taskId => taskId !== id);
        } else {
          activeTasks = activeTasks.filter(taskId => taskId !== id);
        }
        
        // Add to new status list
        if (updates.status === 'completed') {
          completedTasks.push(id);
        } else if (updates.status === 'failed') {
          failedTasks.push(id);
        } else {
          activeTasks.push(id);
        }
      }
      
      return {
        ...state,
        tasks: {
          ...state.tasks,
          [id]: updatedTask
        },
        activeTasks,
        completedTasks,
        failedTasks
      };
    }
    
    case 'SUBSCRIBE_TO_TASK': {
      const newSubscribedTasks = new Set(state.subscribedTasks);
      newSubscribedTasks.add(action.payload);
      
      return {
        ...state,
        subscribedTasks: newSubscribedTasks
      };
    }
    
    case 'UNSUBSCRIBE_FROM_TASK': {
      const newSubscribedTasks = new Set(state.subscribedTasks);
      newSubscribedTasks.delete(action.payload);
      
      return {
        ...state,
        subscribedTasks: newSubscribedTasks
      };
    }
    
    case 'CLEAR_TASKS':
      return initialState;
    
    case 'ACTIVATE_DADDY_DATA':
      // This is a special action that doesn't directly modify state
      // It's handled in the TaskProvider component
      return state;
      
    default:
      return state;
  }
}

// Create the context
interface TaskContextValue {
  state: TaskState;
  dispatch: React.Dispatch<TaskAction>;
  getTask: (id: string) => Task | null;
  getTasks: () => Task[];
  createTask: (taskConfig: Omit<Task, 'id' | 'startTime' | 'logs'>) => Promise<Task>;
  pauseTask: (id: string) => Promise<Task>;
  resumeTask: (id: string) => Promise<Task>;
  cancelTask: (id: string) => Promise<Task>;
  retryTask: (id: string) => Promise<Task>;
  subscribeToTask: (id: string) => void;
  unsubscribeFromTask: (id: string) => void;
  activateDaddyData: (businessType: string, location: string, taskId?: string) => void;
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
}

const TaskContext = createContext<TaskContextValue | null>(null);

// Create the provider component
export const TaskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(taskReducer, initialState);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  
  // Initialize the WebSocket connection
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    console.log('Connecting to WebSocket:', wsUrl);
    setConnectionStatus('connecting');
    
    const newSocket = new WebSocket(wsUrl);
    
    newSocket.onopen = () => {
      console.log('WebSocket connection established');
      setConnectionStatus('connected');
      
      // Subscribe to tasks after connection
      if (state.subscribedTasks.size > 0) {
        const message = {
          type: 'subscribe',
          taskIds: Array.from(state.subscribedTasks)
        };
        newSocket.send(JSON.stringify(message));
      }
    };
    
    newSocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('WebSocket message received:', data);
        
        if (data.type === 'task_update') {
          const task = data.task;
          dispatch({ type: 'UPDATE_TASK', payload: task });
        }
        else if (data.type === 'task_created') {
          const task = data.task;
          dispatch({ type: 'ADD_TASK', payload: task });
        }
        else if (data.type === 'task_progress') {
          const { taskId, progress, log } = data;
          // Update task progress
          dispatch({
            type: 'UPDATE_TASK_PARTIAL',
            payload: {
              id: taskId,
              updates: { 
                progress,
                logs: log ? [...(state.tasks[taskId]?.logs || []), log] : state.tasks[taskId]?.logs
              }
            }
          });
        }
        else if (data.type === 'task_step_update') {
          const { taskId, step } = data;
          const task = state.tasks[taskId];
          
          if (task) {
            // Find and update the step
            const updatedSteps = task.steps.map(s => 
              s.id === step.id ? step : s
            );
            
            // If step wasn't found, add it
            if (!updatedSteps.find(s => s.id === step.id)) {
              updatedSteps.push(step);
            }
            
            dispatch({
              type: 'UPDATE_TASK_PARTIAL',
              payload: {
                id: taskId,
                updates: { steps: updatedSteps }
              }
            });
          }
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };
    
    newSocket.onclose = () => {
      console.log('WebSocket connection closed');
      setConnectionStatus('disconnected');
    };
    
    newSocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnectionStatus('disconnected');
    };
    
    setSocket(newSocket);
    
    // Clean up the socket connection when the component unmounts
    return () => {
      newSocket.close();
    };
  }, []);
  
  // Subscribe to a task
  const subscribeToTask = useCallback((taskId: string) => {
    dispatch({ type: 'SUBSCRIBE_TO_TASK', payload: taskId });
    
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'subscribe',
        taskIds: [taskId]
      }));
    }
  }, [socket]);
  
  // Unsubscribe from a task
  const unsubscribeFromTask = useCallback((taskId: string) => {
    dispatch({ type: 'UNSUBSCRIBE_FROM_TASK', payload: taskId });
    
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'unsubscribe',
        taskIds: [taskId]
      }));
    }
  }, [socket]);
  
  // Initialize data from API
  useEffect(() => {
    // Fetch tasks on initial load
    fetchTasks().then(tasks => {
      dispatch({ type: 'SET_TASKS', payload: tasks });
    });
  }, []);
  
  // Fetch all tasks
  const fetchTasks = async (): Promise<Task[]> => {
    try {
      const response = await fetch('/api/tasks');
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching tasks:', error);
      return [];
    }
  };
  
  // Get a specific task by ID
  const getTask = useCallback((id: string): Task | null => {
    return state.tasks[id] || null;
  }, [state.tasks]);
  
  // Get all tasks
  const getTasks = useCallback((): Task[] => {
    return Object.values(state.tasks);
  }, [state.tasks]);
  
  // Create a new task
  const createTask = async (taskConfig: Omit<Task, 'id' | 'startTime' | 'logs'>): Promise<Task> => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(taskConfig)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const task = await response.json();
      dispatch({ type: 'ADD_TASK', payload: task });
      return task;
    } catch (error) {
      console.error('Error creating task:', error);
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
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const task = await response.json();
      dispatch({ type: 'UPDATE_TASK', payload: task });
      return task;
    } catch (error) {
      console.error('Error pausing task:', error);
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
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const task = await response.json();
      dispatch({ type: 'UPDATE_TASK', payload: task });
      return task;
    } catch (error) {
      console.error('Error resuming task:', error);
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
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const task = await response.json();
      dispatch({ type: 'UPDATE_TASK', payload: task });
      return task;
    } catch (error) {
      console.error('Error canceling task:', error);
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
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const task = await response.json();
      dispatch({ type: 'ADD_TASK', payload: task });
      return task;
    } catch (error) {
      console.error('Error retrying task:', error);
      throw error;
    }
  };
  
  // Function to activate Daddy Data Agent
  const activateDaddyData = useCallback((businessType: string, location: string, taskId?: string) => {
    console.log(`Activating Daddy Data for ${businessType} in ${location}`, taskId ? `with task ID: ${taskId}` : '');
    
    // First dispatch the action to notify any listeners
    dispatch({
      type: 'ACTIVATE_DADDY_DATA',
      payload: { businessType, location, taskId }
    });
    
    // Show a notification or open the Daddy Data Agent window
    // This could trigger a window opening event in the Desktop component
    
    try {
      // Create a custom event that other components can listen for
      const event = new CustomEvent('daddyDataActivated', {
        detail: { businessType, location, taskId }
      });
      window.dispatchEvent(event);
      
      // If there's a task ID, subscribe to updates
      if (taskId) {
        subscribeToTask(taskId);
      }
    } catch (error) {
      console.error('Error dispatching Daddy Data activation event:', error);
    }
  }, [dispatch, subscribeToTask]);

  const value = {
    state,
    dispatch,
    getTask,
    getTasks,
    createTask,
    pauseTask,
    resumeTask,
    cancelTask,
    retryTask,
    subscribeToTask,
    unsubscribeFromTask,
    activateDaddyData,
    connectionStatus
  };
  
  return (
    <TaskContext.Provider value={value}>
      {children}
    </TaskContext.Provider>
  );
};

// Create a custom hook to use the context
export const useTaskContext = (): TaskContextValue => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTaskContext must be used within a TaskProvider');
  }
  return context;
};