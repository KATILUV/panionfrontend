import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Import types
interface TaskStage {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  startTime?: Date;
  endTime?: Date;
  progress?: number; // 0-100
  error?: string;
}

interface LiveProgressEvent {
  id: string;
  timestamp: Date;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error' | 'progress';
  source?: string;
  details?: string;
}

// Define the Task interface
export interface Task {
  id: string;
  description: string;
  agentType: string;
  status: 'pending' | 'in_progress' | 'paused' | 'completed' | 'failed';
  progress: number;
  stages: TaskStage[];
  events: LiveProgressEvent[];
  startTime: Date;
  completionTime?: Date;
  result?: any;
  error?: string;
}

// Define the context shape
interface TaskContextType {
  tasks: Record<string, Task>;
  currentTaskId: string | null;
  setCurrentTaskId: (id: string | null) => void;
  getTask: (id: string) => Task | undefined;
  createTask: (description: string, agentType: string) => Promise<string>;
  cancelTask: (id: string) => Promise<boolean>;
  pauseTask: (id: string) => Promise<boolean>;
  resumeTask: (id: string) => Promise<boolean>;
  retryTask: (id: string) => Promise<string | null>;
  getAllTasks: () => Promise<Task[]>;
  isLoading: boolean;
  error: string | null;
}

// Create the context
const TaskContext = createContext<TaskContextType | undefined>(undefined);

// Provider component
export const TaskProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<Record<string, Task>>({});
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const socketRef = React.useRef<WebSocket | null>(null);

  // Initialize WebSocket connection
  useEffect(() => {
    // Establish WebSocket connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log('TaskContext: WebSocket connected');
      setSocketConnected(true);
      
      // Subscribe to updates for all current tasks
      if (socket.readyState === WebSocket.OPEN) {
        Object.keys(tasks).forEach(taskId => {
          socket.send(JSON.stringify({
            type: 'subscribe',
            taskId
          }));
        });
      }
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Handle different types of events
        if (data.taskId && tasks[data.taskId]) {
          // Format as a LiveProgressEvent
          const progressEvent: LiveProgressEvent = {
            id: data.id || `event-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            timestamp: new Date(data.timestamp || Date.now()),
            message: data.message || 'Event received',
            type: data.type === 'step_update' ? 'progress' : 
                  data.type === 'task_update' && data.status === 'failed' ? 'error' :
                  data.type === 'task_update' && data.status === 'completed' ? 'success' : 'info',
            source: data.source || data.type,
            details: data.details || (data.stepId ? `Step ID: ${data.stepId}` : undefined)
          };

          // Update task state
          setTasks(prev => {
            const updatedTask = { ...prev[data.taskId] };
            
            // Update events
            updatedTask.events = [...(updatedTask.events || []), progressEvent];
            
            // Update task progress if provided
            if (data.progress !== undefined) {
              updatedTask.progress = data.progress;
            }
            
            // Update task status if provided
            if (data.status) {
              updatedTask.status = data.status;
            }
            
            // Update task stages if it's a step update
            if (data.type === 'step_update' && data.stepId && data.status) {
              updatedTask.stages = updatedTask.stages.map(stage => 
                stage.id === data.stepId 
                  ? { ...stage, status: data.status } 
                  : stage
              );
            }
            
            return { ...prev, [data.taskId]: updatedTask };
          });
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setSocketConnected(false);
    };

    socket.onclose = () => {
      console.log('WebSocket connection closed');
      setSocketConnected(false);
    };

    // Heartbeat to keep connection alive
    const heartbeatInterval = setInterval(() => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'heartbeat' }));
      }
    }, 30000);

    return () => {
      clearInterval(heartbeatInterval);
      socket.close();
    };
  }, []);

  // Subscribe to updates when a new task is added
  useEffect(() => {
    if (socketConnected && socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      // Subscribe to the current task
      if (currentTaskId && tasks[currentTaskId]) {
        socketRef.current.send(JSON.stringify({
          type: 'subscribe',
          taskId: currentTaskId
        }));
      }
    }
  }, [currentTaskId, socketConnected, tasks]);

  // Get a specific task
  const getTask = (id: string) => tasks[id];

  // Create a new task
  const createTask = async (description: string, agentType: string): Promise<string> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, agentType })
      });

      if (!response.ok) {
        throw new Error(`Failed to create task: ${response.statusText}`);
      }

      const taskData = await response.json();
      
      // Create a new task object with the returned data
      const newTask: Task = {
        id: taskData.id,
        description: taskData.description,
        agentType: taskData.agentType,
        status: taskData.status,
        progress: taskData.progress || 0,
        stages: taskData.steps?.map((step: any) => ({
          id: step.id,
          name: step.description,
          description: step.description,
          status: step.status,
          progress: 0
        })) || [],
        events: [],
        startTime: new Date(taskData.startTime),
        completionTime: taskData.completionTime ? new Date(taskData.completionTime) : undefined,
        result: taskData.result,
        error: taskData.error
      };

      // Update tasks state
      setTasks(prev => ({ ...prev, [newTask.id]: newTask }));
      
      // Subscribe to the new task
      if (socketConnected && socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          type: 'subscribe',
          taskId: newTask.id
        }));
      }

      // Set as current task
      setCurrentTaskId(newTask.id);
      
      return newTask.id;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create task';
      setError(errorMessage);
      console.error(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Cancel a task
  const cancelTask = async (id: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/tasks/${id}/cancel`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error(`Failed to cancel task: ${response.statusText}`);
      }

      const taskData = await response.json();
      
      // Update the task in state
      setTasks(prev => ({
        ...prev,
        [id]: {
          ...prev[id],
          status: 'failed',
          completionTime: taskData.completionTime ? new Date(taskData.completionTime) : new Date(),
          error: 'Task cancelled by user'
        }
      }));

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to cancel task';
      setError(errorMessage);
      console.error(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Pause a task
  const pauseTask = async (id: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/tasks/${id}/pause`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error(`Failed to pause task: ${response.statusText}`);
      }

      const taskData = await response.json();
      
      // Update the task in state
      setTasks(prev => ({
        ...prev,
        [id]: {
          ...prev[id],
          status: 'paused'
        }
      }));

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to pause task';
      setError(errorMessage);
      console.error(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Resume a task
  const resumeTask = async (id: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/tasks/${id}/resume`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error(`Failed to resume task: ${response.statusText}`);
      }

      const taskData = await response.json();
      
      // Update the task in state
      setTasks(prev => ({
        ...prev,
        [id]: {
          ...prev[id],
          status: 'in_progress'
        }
      }));

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to resume task';
      setError(errorMessage);
      console.error(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Retry a task
  const retryTask = async (id: string): Promise<string | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/tasks/${id}/retry`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error(`Failed to retry task: ${response.statusText}`);
      }

      const taskData = await response.json();
      
      // Create a new task object with the returned data
      const newTask: Task = {
        id: taskData.id,
        description: taskData.description,
        agentType: taskData.agentType,
        status: taskData.status,
        progress: taskData.progress || 0,
        stages: taskData.steps?.map((step: any) => ({
          id: step.id,
          name: step.description,
          description: step.description,
          status: step.status,
          progress: 0
        })) || [],
        events: [],
        startTime: new Date(taskData.startTime),
        completionTime: taskData.completionTime ? new Date(taskData.completionTime) : undefined,
        result: taskData.result,
        error: taskData.error
      };

      // Update tasks state
      setTasks(prev => ({ ...prev, [newTask.id]: newTask }));
      
      // Subscribe to the new task
      if (socketConnected && socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          type: 'subscribe',
          taskId: newTask.id
        }));
      }

      // Set as current task
      setCurrentTaskId(newTask.id);
      
      return newTask.id;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to retry task';
      setError(errorMessage);
      console.error(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Get all tasks
  const getAllTasks = async (): Promise<Task[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/tasks');

      if (!response.ok) {
        throw new Error(`Failed to get tasks: ${response.statusText}`);
      }

      const tasksData = await response.json();
      
      // Convert API response to Task objects
      const fetchedTasks: Record<string, Task> = {};
      
      tasksData.forEach((taskData: any) => {
        fetchedTasks[taskData.id] = {
          id: taskData.id,
          description: taskData.description,
          agentType: taskData.agentType,
          status: taskData.status,
          progress: taskData.progress || 0,
          stages: taskData.steps?.map((step: any) => ({
            id: step.id,
            name: step.description,
            description: step.description,
            status: step.status,
            progress: 0
          })) || [],
          events: [],
          startTime: new Date(taskData.startTime),
          completionTime: taskData.completionTime ? new Date(taskData.completionTime) : undefined,
          result: taskData.result,
          error: taskData.error
        };
      });

      // Subscribe to all tasks
      if (socketConnected && socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        Object.keys(fetchedTasks).forEach(taskId => {
          socketRef.current?.send(JSON.stringify({
            type: 'subscribe',
            taskId
          }));
        });
      }

      // Update tasks state
      setTasks(fetchedTasks);
      
      return Object.values(fetchedTasks);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get tasks';
      setError(errorMessage);
      console.error(errorMessage);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    tasks,
    currentTaskId,
    setCurrentTaskId,
    getTask,
    createTask,
    cancelTask,
    pauseTask,
    resumeTask,
    retryTask,
    getAllTasks,
    isLoading,
    error
  };

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
};

// Custom hook for using the task context
export const useTask = () => {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error('useTask must be used within a TaskProvider');
  }
  return context;
};