import React, { createContext, useContext, useReducer, useCallback, useEffect, useState, useRef } from 'react';

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
      const existingTask = state.tasks[task.id];
      
      // Skip if task doesn't exist
      if (!existingTask) {
        return state;
      }
      
      // Update the task in the appropriate lists
      let activeTasks = [...state.activeTasks];
      let completedTasks = [...state.completedTasks];
      let failedTasks = [...state.failedTasks];
      
      // Remove from current list
      if (existingTask.status === 'completed') {
        completedTasks = completedTasks.filter(id => id !== task.id);
      } else if (existingTask.status === 'failed') {
        failedTasks = failedTasks.filter(id => id !== task.id);
      } else {
        activeTasks = activeTasks.filter(id => id !== task.id);
      }
      
      // Add to new list
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
    
    case 'UPDATE_TASK_PARTIAL': {
      const { id, updates } = action.payload;
      const existingTask = state.tasks[id];
      
      // Skip if task doesn't exist
      if (!existingTask) {
        return state;
      }
      
      const updatedTask = {
        ...existingTask,
        ...updates
      };
      
      // Update the task in the appropriate lists if status changed
      let activeTasks = [...state.activeTasks];
      let completedTasks = [...state.completedTasks];
      let failedTasks = [...state.failedTasks];
      
      // Only update lists if status changed
      if (updates.status && updates.status !== existingTask.status) {
        // Remove from current list
        if (existingTask.status === 'completed') {
          completedTasks = completedTasks.filter(tid => tid !== id);
        } else if (existingTask.status === 'failed') {
          failedTasks = failedTasks.filter(tid => tid !== id);
        } else {
          activeTasks = activeTasks.filter(tid => tid !== id);
        }
        
        // Add to new list
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
      const subscribedTasks = new Set(state.subscribedTasks);
      subscribedTasks.add(action.payload);
      
      return {
        ...state,
        subscribedTasks
      };
    }
    
    case 'UNSUBSCRIBE_FROM_TASK': {
      const subscribedTasks = new Set(state.subscribedTasks);
      subscribedTasks.delete(action.payload);
      
      return {
        ...state,
        subscribedTasks
      };
    }
    
    case 'CLEAR_TASKS': {
      return {
        ...state,
        tasks: {},
        activeTasks: [],
        completedTasks: [],
        failedTasks: []
      };
    }
    
    case 'ACTIVATE_DADDY_DATA': {
      // This action doesn't modify the state directly
      // but triggers a side effect in the useEffect
      return state;
    }
    
    default:
      return state;
  }
}

// Create the context
const TaskContext = createContext<{
  state: TaskState;
  dispatch: React.Dispatch<TaskAction>;
  subscribeToTask: (taskId: string) => void;
  unsubscribeFromTask: (taskId: string) => void;
  isConnected: boolean;
  activateDaddyData: (businessType: string, location: string, taskId?: string) => void;
} | undefined>(undefined);

// Helper function to fetch tasks from the server
async function fetchTasks(): Promise<Task[]> {
  try {
    const response = await fetch('/api/tasks');
    
    if (!response.ok) {
      throw new Error(`Error fetching tasks: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch tasks:', error);
    return [];
  }
}

// Create the provider component
export const TaskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(taskReducer, initialState);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  
  // Use refs to manage WebSocket reconnection state
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxReconnectAttempts = 5;
  const initialReconnectDelay = 1000;
  
  // Create WebSocket connection
  const createSocketConnection = useCallback(() => {
    // Check if we're already connecting
    if (connectionStatus === 'connecting') return;
    
    // Rate limiting check
    const lastAttemptTime = sessionStorage.getItem('lastTaskWsAttempt');
    const now = Date.now();
    if (lastAttemptTime && (now - parseInt(lastAttemptTime)) < 2000) {
      const waitTime = 2000 + Math.random() * 3000; // 2-5 seconds with jitter
      console.log(`Rate limiting WebSocket connection. Waiting ${Math.round(waitTime/1000)}s before reconnecting`);
      
      // Schedule a reconnection after the rate limit period
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = setTimeout(() => {
        createSocketConnection();
      }, waitTime);
      
      return;
    }
    
    // Update connection status and store attempt time
    setConnectionStatus('connecting');
    sessionStorage.setItem('lastTaskWsAttempt', now.toString());
    
    try {
      // Create a new WebSocket connection
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      console.log(`Connecting to task WebSocket: ${wsUrl} (attempt ${reconnectAttemptsRef.current + 1})`);
      
      const newSocket = new WebSocket(wsUrl);
      
      // Set up event handlers
      newSocket.onopen = () => {
        console.log('Task WebSocket connection established');
        setConnectionStatus('connected');
        reconnectAttemptsRef.current = 0; // Reset reconnect attempts on success
        
        // Send initial messages
        try {
          // Send hello message
          newSocket.send(JSON.stringify({
            type: 'hello',
            timestamp: Date.now()
          }));
          
          // Subscribe to tasks
          if (state.subscribedTasks.size > 0) {
            newSocket.send(JSON.stringify({
              type: 'subscribe',
              taskIds: Array.from(state.subscribedTasks)
            }));
          }
        } catch (error) {
          console.error('Error sending initial messages:', error);
        }
      };
      
      newSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Task WebSocket message received:', data);
          
          // Process different message types
          if (data.type === 'task_update') {
            dispatch({ type: 'UPDATE_TASK', payload: data.task });
          }
          else if (data.type === 'task_created') {
            dispatch({ type: 'ADD_TASK', payload: data.task });
          }
          else if (data.type === 'task_progress') {
            const { taskId, progress, log } = data;
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
              // Update or add the step
              const updatedSteps = task.steps.map(s => 
                s.id === step.id ? step : s
              );
              
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
      
      newSocket.onclose = (event) => {
        console.log(`Task WebSocket connection closed. Code: ${event.code}, Reason: ${event.reason || 'No reason provided'}`);
        setConnectionStatus('disconnected');
        setSocket(null);
        
        // Handle reconnection
        const isAbnormalClosure = event.code !== 1000 && event.code !== 1001;
        const isConnectionReset = event.code === 1006;
        
        if ((isAbnormalClosure || isConnectionReset) && reconnectAttemptsRef.current < maxReconnectAttempts) {
          // Calculate delay with exponential backoff and jitter
          const baseDelay = isConnectionReset ? 3000 : initialReconnectDelay;
          const jitter = Math.random() * 1000;
          const delay = Math.min(baseDelay * Math.pow(1.5, reconnectAttemptsRef.current) + jitter, 15000);
          
          console.log(`Attempting to reconnect task WebSocket in ${Math.round(delay)}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);
          
          // Clean up any existing timer
          if (reconnectTimerRef.current) {
            clearTimeout(reconnectTimerRef.current);
          }
          
          // Schedule reconnection
          reconnectTimerRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            createSocketConnection();
          }, delay);
        } 
        else if (event.code === 1008) {
          // Handle rate limiting from server
          console.log('Connection was rate limited. Waiting longer before reconnecting.');
          
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            const rateLimitDelay = 5000 + (reconnectAttemptsRef.current * 3000);
            
            if (reconnectTimerRef.current) {
              clearTimeout(reconnectTimerRef.current);
            }
            
            reconnectTimerRef.current = setTimeout(() => {
              reconnectAttemptsRef.current++;
              createSocketConnection();
            }, rateLimitDelay);
          }
        } 
        else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          console.error('Maximum task WebSocket reconnection attempts reached. Giving up further attempts.');
          
          // Reset counter after a cool-down period
          reconnectTimerRef.current = setTimeout(() => {
            console.log('Resetting reconnection counter after cool-down period');
            reconnectAttemptsRef.current = 0;
          }, 30000);
        }
      };
      
      newSocket.onerror = (error) => {
        console.error('Task WebSocket error:', error);
        // onclose will be called after this
      };
      
      setSocket(newSocket);
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      setConnectionStatus('disconnected');
      
      // Handle reconnection after error
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        const delay = initialReconnectDelay * Math.pow(1.5, reconnectAttemptsRef.current);
        
        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current);
        }
        
        reconnectTimerRef.current = setTimeout(() => {
          reconnectAttemptsRef.current++;
          createSocketConnection();
        }, delay);
      }
    }
  }, [connectionStatus, state.subscribedTasks]);
  
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
  
  // Fetch tasks on initial load
  useEffect(() => {
    fetchTasks().then(tasks => {
      dispatch({ type: 'SET_TASKS', payload: tasks });
    });
  }, []);
  
  // Initialize WebSocket connection
  useEffect(() => {
    createSocketConnection();
    
    // Cleanup function
    return () => {
      if (socket) {
        socket.close(1000, 'Component unmounting');
      }
      
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, [createSocketConnection, socket]);
  
  // Function to activate Daddy Data agent
  const activateDaddyData = useCallback((businessType: string, location: string, taskId?: string) => {
    console.log(`Activating Daddy Data search: ${businessType} in ${location}`);
    
    // Create a new task if one wasn't provided
    if (!taskId) {
      // This would be handled by the server normally
      const newTaskId = `daddy-data-${Date.now()}`;
      
      // Create a dummy task for now
      const newTask: Task = {
        id: newTaskId,
        agentType: 'daddy-data',
        description: `Search for ${businessType} in ${location}`,
        status: 'pending',
        progress: 0,
        steps: [
          {
            id: `${newTaskId}-step-1`,
            description: 'Preparing business search query',
            status: 'pending'
          },
          {
            id: `${newTaskId}-step-2`,
            description: 'Searching for businesses',
            status: 'pending'
          },
          {
            id: `${newTaskId}-step-3`,
            description: 'Processing results',
            status: 'pending'
          }
        ],
        startTime: new Date().toISOString(),
        logs: [`Task created: Search for ${businessType} in ${location}`]
      };
      
      // Add the task to state
      dispatch({ type: 'ADD_TASK', payload: newTask });
      
      // Subscribe to updates for this task
      subscribeToTask(newTaskId);
      
      // Dispatch the action to trigger actual work on server
      dispatch({ 
        type: 'ACTIVATE_DADDY_DATA', 
        payload: { 
          businessType, 
          location,
          taskId: newTaskId
        } 
      });
      
      // In a real app, we would now make an API call to create the task on the server
      // For demo purposes, we'll simulate task progress
      simulateTaskProgress(newTask);
    } else {
      // Use existing task
      dispatch({ 
        type: 'ACTIVATE_DADDY_DATA', 
        payload: { businessType, location, taskId } 
      });
    }
  }, [subscribeToTask]);
  
  // Helper function to simulate task progress (for demo purposes)
  const simulateTaskProgress = (task: Task) => {
    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += 10;
      
      if (progress <= 100) {
        // Update task progress
        dispatch({
          type: 'UPDATE_TASK_PARTIAL',
          payload: {
            id: task.id,
            updates: { 
              progress,
              logs: [...(task.logs || []), `Progress update: ${progress}%`]
            }
          }
        });
        
        // Update steps based on progress
        if (progress === 30) {
          const updatedSteps = [...task.steps];
          updatedSteps[0] = { ...updatedSteps[0], status: 'completed' };
          updatedSteps[1] = { ...updatedSteps[1], status: 'in_progress' };
          
          dispatch({
            type: 'UPDATE_TASK_PARTIAL',
            payload: {
              id: task.id,
              updates: { 
                steps: updatedSteps,
                status: 'in_progress'
              }
            }
          });
        } else if (progress === 70) {
          const updatedSteps = [...task.steps];
          updatedSteps[1] = { ...updatedSteps[1], status: 'completed' };
          updatedSteps[2] = { ...updatedSteps[2], status: 'in_progress' };
          
          dispatch({
            type: 'UPDATE_TASK_PARTIAL',
            payload: {
              id: task.id,
              updates: { steps: updatedSteps }
            }
          });
        } else if (progress === 100) {
          const updatedSteps = [...task.steps];
          updatedSteps[2] = { ...updatedSteps[2], status: 'completed' };
          
          dispatch({
            type: 'UPDATE_TASK_PARTIAL',
            payload: {
              id: task.id,
              updates: { 
                steps: updatedSteps,
                status: 'completed',
                completionTime: new Date().toISOString(),
                result: {
                  businesses: [
                    { name: 'Example Business 1', address: '123 Main St', phone: '(555) 123-4567', rating: 4.5 },
                    { name: 'Example Business 2', address: '456 Oak Ave', phone: '(555) 987-6543', rating: 4.0 },
                    { name: 'Example Business 3', address: '789 Pine Blvd', phone: '(555) 567-8901', rating: 4.8 }
                  ]
                }
              }
            }
          });
          
          clearInterval(progressInterval);
        }
      } else {
        clearInterval(progressInterval);
      }
    }, 1000);
  };
  
  return (
    <TaskContext.Provider value={{ 
      state, 
      dispatch, 
      subscribeToTask, 
      unsubscribeFromTask,
      isConnected: connectionStatus === 'connected',
      activateDaddyData
    }}>
      {children}
    </TaskContext.Provider>
  );
};

// Custom hook to use the tasks context
export const useTaskContext = () => {
  const context = useContext(TaskContext);
  
  if (context === undefined) {
    throw new Error('useTaskContext must be used within a TaskProvider');
  }
  
  return context;
};