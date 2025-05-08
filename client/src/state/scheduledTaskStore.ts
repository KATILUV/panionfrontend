import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { log } from './systemLogStore';

export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type AgentType = 'panion' | 'daddy_data' | 'research' | 'analysis';

export interface ScheduledTask {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  targetAgent: AgentType;
  action: string;
  parameters: Record<string, any>;
  status: TaskStatus;
  createdAt: number;
  scheduledFor: number | null;
  startedAt: number | null;
  completedAt: number | null;
  result: any | null;
  error: string | null;
  progress: number; // 0-100 progress percentage
  estimatedDuration: number | null; // Estimated duration in seconds
  parentTaskId: string | null; // For subtasks or task pipeline
  childTaskIds: string[]; // For composite tasks
  autoRetryCount: number; // Number of automatic retries if failed
  notifyOnCompletion: boolean;
}

interface ScheduledTaskState {
  tasks: Record<string, ScheduledTask>;
  taskQueue: string[]; // Task IDs ordered by priority and creation time
  isRunningTasks: boolean;
  
  // Actions
  addTask: (task: Omit<ScheduledTask, 'id' | 'status' | 'createdAt' | 'startedAt' | 'completedAt' | 'progress' | 'childTaskIds' | 'autoRetryCount'>) => string;
  updateTask: (id: string, updates: Partial<ScheduledTask>) => void;
  removeTask: (id: string) => void;
  startTask: (id: string) => void;
  completeTask: (id: string, result: any) => void;
  failTask: (id: string, error: string) => void;
  cancelTask: (id: string) => void;
  updateTaskProgress: (id: string, progress: number) => void;
  toggleTaskExecution: () => void;
  getTasks: (filters?: { status?: TaskStatus; targetAgent?: AgentType }) => ScheduledTask[];
  getActiveTasksForAgent: (agentType: AgentType) => ScheduledTask[];
  getDueTasks: () => ScheduledTask[];
}

export const useScheduledTaskStore = create<ScheduledTaskState>()(
  persist(
    (set, get) => ({
      tasks: {},
      taskQueue: [],
      isRunningTasks: false,
      
      addTask: (taskData) => {
        const id = crypto.randomUUID();
        
        // Create new task
        const task: ScheduledTask = {
          id,
          ...taskData,
          status: 'pending',
          createdAt: Date.now(),
          startedAt: null,
          completedAt: null,
          result: null,
          error: null,
          progress: 0,
          childTaskIds: [],
          autoRetryCount: 0
        };
        
        set((state) => {
          // Add to tasks map
          const newTasks = {
            ...state.tasks,
            [id]: task
          };
          
          // Add to task queue with priority consideration
          const priorityOrder = { 'urgent': 0, 'high': 1, 'normal': 2, 'low': 3 };
          const newTaskQueue = [...state.taskQueue, id].sort((a, b) => {
            const taskA = newTasks[a];
            const taskB = newTasks[b];
            // First by priority (higher priority first)
            const priorityDiff = priorityOrder[taskA.priority] - priorityOrder[taskB.priority];
            if (priorityDiff !== 0) return priorityDiff;
            // Then by scheduled time (earlier first)
            if (taskA.scheduledFor && taskB.scheduledFor) {
              return taskA.scheduledFor - taskB.scheduledFor;
            }
            // Then by creation time (earlier first)
            return taskA.createdAt - taskB.createdAt;
          });
          
          log.info(`Task added to queue: ${task.title} (ID: ${id})`);
          
          return {
            tasks: newTasks,
            taskQueue: newTaskQueue
          };
        });
        
        return id;
      },
      
      updateTask: (id, updates) => {
        set((state) => {
          if (!state.tasks[id]) {
            log.error(`Cannot update non-existent task with ID: ${id}`);
            return state;
          }
          
          const updatedTask = {
            ...state.tasks[id],
            ...updates
          };
          
          log.info(`Task updated: ${updatedTask.title} (ID: ${id})`);
          
          return {
            tasks: {
              ...state.tasks,
              [id]: updatedTask
            }
          };
        });
      },
      
      removeTask: (id) => {
        set((state) => {
          if (!state.tasks[id]) {
            log.error(`Cannot remove non-existent task with ID: ${id}`);
            return state;
          }
          
          const { [id]: removedTask, ...remainingTasks } = state.tasks;
          const updatedQueue = state.taskQueue.filter(taskId => taskId !== id);
          
          log.info(`Task removed: ${removedTask.title} (ID: ${id})`);
          
          return {
            tasks: remainingTasks,
            taskQueue: updatedQueue
          };
        });
      },
      
      startTask: (id) => {
        set((state) => {
          if (!state.tasks[id]) {
            log.error(`Cannot start non-existent task with ID: ${id}`);
            return state;
          }
          
          const task = state.tasks[id];
          if (task.status !== 'pending') {
            log.warn(`Cannot start task that is not pending: ${task.title} (current status: ${task.status})`);
            return state;
          }
          
          const updatedTask = {
            ...task,
            status: 'running' as TaskStatus,
            startedAt: Date.now(),
            progress: 0
          };
          
          log.action(`Starting task: ${task.title} (ID: ${id})`);
          
          return {
            tasks: {
              ...state.tasks,
              [id]: updatedTask
            }
          };
        });
      },
      
      completeTask: (id, result) => {
        set((state) => {
          if (!state.tasks[id]) {
            log.error(`Cannot complete non-existent task with ID: ${id}`);
            return state;
          }
          
          const task = state.tasks[id];
          
          const updatedTask = {
            ...task,
            status: 'completed' as TaskStatus,
            completedAt: Date.now(),
            result,
            progress: 100
          };
          
          log.action(`Completed task: ${task.title} (ID: ${id})`);
          
          // If notification is enabled for this task
          if (task.notifyOnCompletion) {
            // Check if browser notifications are supported and permission is granted
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('Task Completed', {
                body: `Task "${task.title}" has been completed.`,
                icon: '/logo.svg'
              });
            }
          }
          
          return {
            tasks: {
              ...state.tasks,
              [id]: updatedTask
            }
          };
        });
      },
      
      failTask: (id, error) => {
        set((state) => {
          if (!state.tasks[id]) {
            log.error(`Cannot fail non-existent task with ID: ${id}`);
            return state;
          }
          
          const task = state.tasks[id];
          const updatedTask = {
            ...task,
            status: 'failed' as TaskStatus,
            completedAt: Date.now(),
            error
          };
          
          log.error(`Failed task: ${task.title} (ID: ${id}) - ${error}`);
          
          // Implement auto-retry logic if configured
          if (task.autoRetryCount < 3) { // Max 3 retries
            const retryTaskId = get().addTask({
              title: `Retry: ${task.title}`,
              description: task.description,
              priority: task.priority,
              targetAgent: task.targetAgent,
              action: task.action,
              parameters: task.parameters,
              scheduledFor: Date.now() + 30000, // Retry after 30 seconds
              result: null,
              error: null,
              estimatedDuration: task.estimatedDuration,
              parentTaskId: task.parentTaskId,
              notifyOnCompletion: task.notifyOnCompletion
            });
            
            // Update retry count for the new task
            get().updateTask(retryTaskId, {
              autoRetryCount: task.autoRetryCount + 1
            });
            
            log.info(`Scheduled retry for failed task: ${task.title} (Retry #${task.autoRetryCount + 1})`);
          }
          
          return {
            tasks: {
              ...state.tasks,
              [id]: updatedTask
            }
          };
        });
      },
      
      cancelTask: (id) => {
        set((state) => {
          if (!state.tasks[id]) {
            log.error(`Cannot cancel non-existent task with ID: ${id}`);
            return state;
          }
          
          const task = state.tasks[id];
          const updatedTask = {
            ...task,
            status: 'cancelled' as TaskStatus,
            completedAt: Date.now()
          };
          
          log.action(`Cancelled task: ${task.title} (ID: ${id})`);
          
          return {
            tasks: {
              ...state.tasks,
              [id]: updatedTask
            }
          };
        });
      },
      
      updateTaskProgress: (id, progress) => {
        set((state) => {
          if (!state.tasks[id]) {
            log.error(`Cannot update progress for non-existent task with ID: ${id}`);
            return state;
          }
          
          const task = state.tasks[id];
          if (task.status !== 'running') {
            log.warn(`Cannot update progress for task that is not running: ${task.title}`);
            return state;
          }
          
          // Calculate estimated completion time based on progress rate
          let estimatedDuration = task.estimatedDuration;
          
          if (progress > 0 && task.startedAt) {
            const elapsedTime = (Date.now() - task.startedAt) / 1000; // in seconds
            const estimatedTotalTime = elapsedTime / (progress / 100);
            estimatedDuration = estimatedTotalTime;
          }
          
          const updatedTask = {
            ...task,
            progress: Math.max(0, Math.min(100, progress)),
            estimatedDuration
          };
          
          return {
            tasks: {
              ...state.tasks,
              [id]: updatedTask
            }
          };
        });
      },
      
      toggleTaskExecution: () => {
        set((state) => ({
          isRunningTasks: !state.isRunningTasks
        }));
        
        const isRunning = get().isRunningTasks;
        log.info(`Autonomous task execution ${isRunning ? 'enabled' : 'disabled'}`);
      },
      
      getTasks: (filters) => {
        const state = get();
        let filteredTasks = Object.values(state.tasks);
        
        if (filters) {
          if (filters.status) {
            filteredTasks = filteredTasks.filter(task => task.status === filters.status);
          }
          
          if (filters.targetAgent) {
            filteredTasks = filteredTasks.filter(task => task.targetAgent === filters.targetAgent);
          }
        }
        
        return filteredTasks;
      },
      
      getActiveTasksForAgent: (agentType) => {
        const state = get();
        return Object.values(state.tasks).filter(
          task => task.targetAgent === agentType && 
                 (task.status === 'pending' || task.status === 'running')
        );
      },
      
      getDueTasks: () => {
        const state = get();
        const now = Date.now();
        
        return Object.values(state.tasks).filter(
          task => task.status === 'pending' && 
                 (task.scheduledFor === null || task.scheduledFor <= now)
        );
      }
    }),
    {
      name: 'panion-scheduled-tasks',
      partialize: (state) => ({
        tasks: state.tasks,
        taskQueue: state.taskQueue,
        isRunningTasks: state.isRunningTasks
      })
    }
  )
);

// Task execution engine
// This should be called on a timer interval to process the task queue
export const processScheduledTasks = async () => {
  const { isRunningTasks, getDueTasks, startTask } = useScheduledTaskStore.getState();
  
  if (!isRunningTasks) return;
  
  const dueTasks = getDueTasks();
  
  for (const task of dueTasks) {
    // Start the task if it's due and not already running
    if (task.status === 'pending') {
      startTask(task.id);
      
      // Dispatch the task to the appropriate agent
      try {
        // Implementation will depend on agent APIs
        switch (task.targetAgent) {
          case 'daddy_data':
            // Example dispatch to Daddy Data agent
            fetch('/api/panion/dispatch', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                targetAgent: 'daddy_data',
                task: task.action,
                parameters: task.parameters,
                priority: task.priority,
                callbackEndpoint: '/api/scheduled-tasks/callback'
              }),
            });
            break;
            
          // Add cases for other agents as needed
          default:
            log.warn(`No implementation for executing tasks on agent type: ${task.targetAgent}`);
        }
      } catch (error: any) {
        log.error(`Error executing task ${task.id}: ${error.message}`);
        const { failTask } = useScheduledTaskStore.getState();
        failTask(task.id, error.message);
      }
    }
  }
};

// Set up interval for autonomous task processing
let taskProcessorInterval: number | null = null;

export const startTaskProcessor = () => {
  if (!taskProcessorInterval) {
    // Check for tasks every 10 seconds
    taskProcessorInterval = window.setInterval(processScheduledTasks, 10000);
    log.info('Task processor started');
  }
};

export const stopTaskProcessor = () => {
  if (taskProcessorInterval) {
    window.clearInterval(taskProcessorInterval);
    taskProcessorInterval = null;
    log.info('Task processor stopped');
  }
};

// Auto-start the task processor when the app loads
// This should be called in a component that's always mounted, like App.tsx
export const initializeTaskProcessor = () => {
  const { isRunningTasks } = useScheduledTaskStore.getState();
  
  if (isRunningTasks) {
    startTaskProcessor();
  }
  
  // Subscribe to changes in the isRunningTasks state
  const unsubscribe = useScheduledTaskStore.subscribe(
    (state) => state.isRunningTasks,
    (isRunning: boolean) => {
      if (isRunning) {
        startTaskProcessor();
      } else {
        stopTaskProcessor();
      }
    }
  );
  
  // Return unsubscribe function for cleanup
  return unsubscribe;
};