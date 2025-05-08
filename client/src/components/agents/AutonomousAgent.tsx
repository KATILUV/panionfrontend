import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Check, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from '@/hooks/use-toast';

// Define the form schema
const formSchema = z.object({
  description: z
    .string()
    .min(10, { message: "Task description must be at least 10 characters." })
    .max(500, { message: "Task description cannot exceed 500 characters." }),
  autoStart: z.boolean().default(true),
  autoRetry: z.boolean().default(true),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  resources: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AutonomousAgentProps {
  agentType: 'data_gathering' | 'analysis' | 'general';
  onTaskComplete?: (result: any) => void;
  onTaskFailed?: (error: string) => void;
}

const AutonomousAgent: React.FC<AutonomousAgentProps> = ({ 
  agentType, 
  onTaskComplete, 
  onTaskFailed 
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState<'pending' | 'in_progress' | 'paused' | 'completed' | 'failed' | null>(null);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [steps, setSteps] = useState<any[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [pollingInterval, setPollingInterval] = useState<number | null>(null);

  // Define form with default values
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: '',
      autoStart: true,
      autoRetry: true,
      priority: 'medium',
      resources: '',
    },
  });

  // Handle form submission
  const onSubmit = async (values: FormValues) => {
    try {
      setIsSubmitting(true);
      
      // Prepare the task data
      const taskData = {
        agentType,
        description: values.description,
        autoStart: values.autoStart,
        autoRetry: values.autoRetry,
        priority: values.priority,
        resources: values.resources ? JSON.parse(values.resources) : {},
      };

      // Submit the task
      const response = await fetch('/api/autonomous-agent/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create task');
      }

      const data = await response.json();
      
      // Set the task ID and status
      setTaskId(data.id);
      setTaskStatus(data.status);
      setProgress(data.progress || 0);
      
      // Start polling for updates
      startPolling(data.id);
      
      toast({
        title: "Task created",
        description: "Your autonomous agent task has been created and is now processing.",
      });
    } catch (error) {
      console.error('Error creating task:', error);
      toast({
        title: "Failed to create task",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Start polling for task updates
  const startPolling = (id: string) => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }
    
    const interval = window.setInterval(async () => {
      await fetchTaskStatus(id);
    }, 2000); // Poll every 2 seconds
    
    setPollingInterval(interval);
  };

  // Stop polling
  const stopPolling = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
  };

  // Fetch task status
  const fetchTaskStatus = async (id: string) => {
    try {
      const response = await fetch(`/api/autonomous-agent/tasks/${id}`);
      
      if (!response.ok) {
        console.error('Failed to fetch task status');
        return;
      }
      
      const data = await response.json();
      
      setTaskStatus(data.status);
      setProgress(data.progress || 0);
      setSteps(data.steps || []);
      setLogs(data.logs || []);
      
      if (data.result) {
        setResult(data.result);
      }
      
      if (data.error) {
        setError(data.error);
      }
      
      // If the task is completed or failed, stop polling
      if (data.status === 'completed') {
        stopPolling();
        if (onTaskComplete) {
          onTaskComplete(data.result);
        }
      } else if (data.status === 'failed') {
        stopPolling();
        if (onTaskFailed) {
          onTaskFailed(data.error || 'Task failed with no error message');
        }
      }
    } catch (error) {
      console.error('Error fetching task status:', error);
    }
  };

  // Pause task
  const pauseTask = async () => {
    if (!taskId) return;
    
    try {
      const response = await fetch(`/api/autonomous-agent/tasks/${taskId}/pause`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to pause task');
      }
      
      const data = await response.json();
      setTaskStatus(data.status);
      
      toast({
        title: "Task paused",
        description: "Your autonomous agent task has been paused.",
      });
    } catch (error) {
      console.error('Error pausing task:', error);
      toast({
        title: "Failed to pause task",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    }
  };

  // Resume task
  const resumeTask = async () => {
    if (!taskId) return;
    
    try {
      const response = await fetch(`/api/autonomous-agent/tasks/${taskId}/resume`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to resume task');
      }
      
      const data = await response.json();
      setTaskStatus(data.status);
      
      // Restart polling
      startPolling(taskId);
      
      toast({
        title: "Task resumed",
        description: "Your autonomous agent task has been resumed.",
      });
    } catch (error) {
      console.error('Error resuming task:', error);
      toast({
        title: "Failed to resume task",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    }
  };

  // Cancel task
  const cancelTask = async () => {
    if (!taskId) return;
    
    try {
      const response = await fetch(`/api/autonomous-agent/tasks/${taskId}/cancel`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to cancel task');
      }
      
      // Stop polling
      stopPolling();
      
      // Reset state
      setTaskId(null);
      setTaskStatus(null);
      setProgress(0);
      setResult(null);
      setError(null);
      setSteps([]);
      setLogs([]);
      
      // Reset form
      form.reset({
        description: '',
        autoStart: true,
        autoRetry: true,
        priority: 'medium',
        resources: '',
      });
      
      toast({
        title: "Task cancelled",
        description: "Your autonomous agent task has been cancelled.",
      });
    } catch (error) {
      console.error('Error cancelling task:', error);
      toast({
        title: "Failed to cancel task",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    }
  };

  // Retry task
  const retryTask = async () => {
    if (!taskId) return;
    
    try {
      const response = await fetch(`/api/autonomous-agent/tasks/${taskId}/retry`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to retry task');
      }
      
      const data = await response.json();
      
      // Update state with new task info
      setTaskId(data.id);
      setTaskStatus(data.status);
      setProgress(data.progress || 0);
      setResult(null);
      setError(null);
      setSteps(data.steps || []);
      setLogs(data.logs || []);
      
      // Start polling
      startPolling(data.id);
      
      toast({
        title: "Task retried",
        description: "Your autonomous agent task has been retried.",
      });
    } catch (error) {
      console.error('Error retrying task:', error);
      toast({
        title: "Failed to retry task",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    }
  };

  // Cleanup polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  // Render task form if no task is in progress
  if (!taskId) {
    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Task Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describe what you want the agent to do in detail..."
                    className="min-h-[120px]"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Be specific about what you want the agent to accomplish.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <FormControl>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      {...field}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </FormControl>
                  <FormDescription>
                    Task priority affects execution order.
                  </FormDescription>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="resources"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resources (Optional JSON)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder='{"url": "https://example.com"}'
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    JSON of resources needed for the task.
                  </FormDescription>
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="autoStart"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Auto Start</FormLabel>
                    <FormDescription>
                      Start processing immediately after creation.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="autoRetry"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Auto Retry</FormLabel>
                    <FormDescription>
                      Automatically retry on recoverable errors.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Task...
              </>
            ) : (
              'Create Autonomous Task'
            )}
          </Button>
        </form>
      </Form>
    );
  }

  // Render task progress and controls
  return (
    <div className="space-y-6">
      <div className="flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <span className="font-medium text-sm">Task Progress</span>
            <span className="ml-2 text-sm text-muted-foreground">{progress}%</span>
          </div>
          <div className="text-xs font-medium text-muted-foreground">
            {taskStatus && taskStatus.charAt(0).toUpperCase() + taskStatus.slice(1)}
          </div>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <div className="flex flex-wrap gap-2">
        {taskStatus === 'in_progress' && (
          <Button onClick={pauseTask} variant="outline" size="sm">
            Pause
          </Button>
        )}
        
        {taskStatus === 'paused' && (
          <Button onClick={resumeTask} variant="outline" size="sm">
            Resume
          </Button>
        )}
        
        {(taskStatus === 'failed' || taskStatus === 'completed') && (
          <Button onClick={retryTask} variant="outline" size="sm">
            Retry
          </Button>
        )}
        
        {taskStatus !== 'completed' && (
          <Button onClick={cancelTask} variant="destructive" size="sm">
            Cancel
          </Button>
        )}
        
        {taskStatus === 'completed' && (
          <Button onClick={cancelTask} variant="outline" size="sm">
            Start New Task
          </Button>
        )}
      </div>

      {steps.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-3">Task Steps</h3>
          <div className="space-y-2">
            {steps.map((step, index) => (
              <Card key={index} className="overflow-hidden">
                <CardContent className="p-3">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {step.status === 'completed' && (
                        <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center">
                          <Check className="h-3 w-3 text-green-600" />
                        </div>
                      )}
                      {step.status === 'failed' && (
                        <div className="h-5 w-5 rounded-full bg-red-100 flex items-center justify-center">
                          <X className="h-3 w-3 text-red-600" />
                        </div>
                      )}
                      {step.status === 'in_progress' && (
                        <div className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center">
                          <Loader2 className="h-3 w-3 text-blue-600 animate-spin" />
                        </div>
                      )}
                      {step.status === 'pending' && (
                        <div className="h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center">
                          <div className="h-2 w-2 bg-gray-400 rounded-full"></div>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {step.description}
                      </p>
                      {step.output && (
                        <div className="mt-1 text-xs text-gray-700 bg-gray-50 p-2 rounded overflow-auto max-h-20">
                          {step.output}
                        </div>
                      )}
                      {step.error && (
                        <div className="mt-1 text-xs text-red-700 bg-red-50 p-2 rounded overflow-auto max-h-20">
                          {step.error}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {result && (
        <div>
          <h3 className="text-sm font-medium mb-2">Result</h3>
          <div className="bg-green-50 border border-green-100 rounded-md p-3">
            <pre className="text-xs text-gray-800 whitespace-pre-wrap overflow-auto max-h-40">
              {typeof result === 'object' ? JSON.stringify(result, null, 2) : result}
            </pre>
          </div>
        </div>
      )}

      {error && (
        <div>
          <h3 className="text-sm font-medium mb-2">Error</h3>
          <div className="bg-red-50 border border-red-100 rounded-md p-3">
            <pre className="text-xs text-red-800 whitespace-pre-wrap overflow-auto max-h-40">
              {error}
            </pre>
          </div>
        </div>
      )}

      {logs.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-2">Logs</h3>
          <div className="bg-gray-50 border border-gray-100 rounded-md p-2 overflow-auto max-h-40">
            {logs.map((log, index) => (
              <div key={index} className="text-xs font-mono">
                {log}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AutonomousAgent;