import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LiveProgressStream from '@/components/task/LiveProgressStream';
import { TaskTimeline } from '@/components/task/TaskTimeline';
import { ConfidenceBadge } from '@/components/task/ConfidenceIndicator';

const TaskMonitorPage: React.FC = () => {
  const [taskId, setTaskId] = useState<string>('');
  const [taskDescription, setTaskDescription] = useState<string>('');
  const [agentType, setAgentType] = useState<string>('data_gathering');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  
  // Fetch all tasks on component mount
  useEffect(() => {
    fetchTasks();
  }, []);
  
  // Fetch all tasks
  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/tasks');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch tasks: ${response.statusText}`);
      }
      
      const data = await response.json();
      setTasks(data);
    } catch (error) {
      setError('Failed to load tasks');
      console.error('Error fetching tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Create a new task
  const createTask = async () => {
    try {
      if (!taskDescription.trim()) {
        setError('Task description is required');
        return;
      }
      
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: taskDescription,
          agentType: agentType,
          autoStart: true
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create task: ${response.statusText}`);
      }
      
      const newTask = await response.json();
      setTaskId(newTask.id);
      setActiveTaskId(newTask.id);
      
      // Refresh tasks list
      fetchTasks();
      
      // Clear form
      setTaskDescription('');
    } catch (error) {
      setError('Failed to create task');
      console.error('Error creating task:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Task status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'paused':
        return 'bg-amber-100 text-amber-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Control task (pause, resume, cancel)
  const controlTask = async (id: string, action: 'pause' | 'resume' | 'cancel' | 'retry') => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`/api/tasks/${id}/${action}`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to ${action} task: ${response.statusText}`);
      }
      
      // If retrying, we get a new task ID
      if (action === 'retry') {
        const newTask = await response.json();
        setActiveTaskId(newTask.id);
      }
      
      // Refresh tasks list
      fetchTasks();
    } catch (error) {
      setError(`Failed to ${action} task`);
      console.error(`Error ${action}ing task:`, error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  // Calculate duration
  const calculateDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime).getTime();
    const end = endTime ? new Date(endTime).getTime() : Date.now();
    const durationMs = end - start;
    
    // Format as mm:ss or hh:mm:ss
    const seconds = Math.floor((durationMs / 1000) % 60);
    const minutes = Math.floor((durationMs / (1000 * 60)) % 60);
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // Convert task steps to timeline stages
  const getTaskStages = (task: any) => {
    if (!task || !task.steps) return [];
    
    return task.steps.map((step: any) => ({
      id: step.id,
      name: step.description,
      description: step.output || 'No output yet',
      status: step.status,
      error: step.error
    }));
  };
  
  // Find the active task object
  const activeTask = tasks.find(task => task.id === activeTaskId);
  
  return (
    <div className="container mx-auto py-6">
      <Tabs defaultValue="monitor" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="monitor">Task Monitor</TabsTrigger>
          <TabsTrigger value="create">Create Task</TabsTrigger>
        </TabsList>
        
        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create New Task</CardTitle>
              <CardDescription>
                Create a new autonomous agent task to analyze data or perform other operations.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="taskDescription">Task Description</Label>
                <Input
                  id="taskDescription"
                  placeholder="Describe what you want the agent to do..."
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="agentType">Agent Type</Label>
                <Select value={agentType} onValueChange={setAgentType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select agent type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="data_gathering">Data Gathering</SelectItem>
                    <SelectItem value="analysis">Analysis</SelectItem>
                    <SelectItem value="general">General Purpose</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={createTask} 
                disabled={isLoading || !taskDescription.trim()}
              >
                {isLoading ? 'Creating...' : 'Create Task'}
              </Button>
              {error && <p className="text-red-500 ml-4">{error}</p>}
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="monitor" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Task List Panel */}
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle>Tasks</CardTitle>
                <CardDescription>
                  Select a task to monitor its progress
                </CardDescription>
              </CardHeader>
              <CardContent className="max-h-[600px] overflow-y-auto">
                {tasks.length === 0 ? (
                  <p className="text-muted-foreground text-center p-4">
                    No tasks found. Create a new task to get started.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {tasks.map((task) => (
                      <div 
                        key={task.id} 
                        className={`p-3 border rounded-md cursor-pointer transition-colors ${
                          activeTaskId === task.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                        }`}
                        onClick={() => setActiveTaskId(task.id)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="font-medium truncate" style={{ maxWidth: '70%' }}>
                            {task.description}
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(task.status)}`}>
                            {task.status}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          <span>Progress: {task.progress}%</span>
                          <span className="mx-2">•</span>
                          <span>Started: {formatDate(task.startTime)}</span>
                          <div className="mt-1">
                            <ConfidenceBadge score={0.8} size="sm" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchTasks}
                  disabled={isLoading}
                >
                  {isLoading ? 'Refreshing...' : 'Refresh'}
                </Button>
              </CardFooter>
            </Card>
            
            {/* Task Details Panel */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>
                  {activeTask ? `Task: ${activeTask.description}` : 'No Task Selected'}
                </CardTitle>
                {activeTask && (
                  <CardDescription>
                    Type: {activeTask.agentType} | Status: {activeTask.status} | Progress: {activeTask.progress}%
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {!activeTask ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">
                      Select a task from the list to view its details
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium mb-1">Started</h4>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(activeTask.startTime)}
                        </p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium mb-1">Duration</h4>
                        <p className="text-sm text-muted-foreground">
                          {calculateDuration(activeTask.startTime, activeTask.completionTime)}
                        </p>
                      </div>
                      {activeTask.completionTime && (
                        <div>
                          <h4 className="text-sm font-medium mb-1">Completed</h4>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(activeTask.completionTime)}
                          </p>
                        </div>
                      )}
                      {activeTask.error && (
                        <div>
                          <h4 className="text-sm font-medium mb-1">Error</h4>
                          <p className="text-sm text-red-500">
                            {activeTask.error}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-medium mb-3">Task Progress</h4>
                      <TaskTimeline 
                        stages={getTaskStages(activeTask)} 
                        currentStage={activeTask.steps?.find((s: any) => s.status === 'in_progress')?.id}
                      />
                    </div>
                    
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-medium mb-3">Live Progress</h4>
                      <LiveProgressStream 
                        taskId={activeTask.id} 
                        height="200px" 
                        autoScroll={true}
                      />
                    </div>
                    
                    {activeTask.result && (
                      <div className="border-t pt-4">
                        <h4 className="text-sm font-medium mb-1">Result</h4>
                        <div className="bg-muted p-3 rounded-md text-sm whitespace-pre-wrap">
                          {activeTask.result}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
              {activeTask && (
                <CardFooter className="flex justify-between">
                  <div>
                    {activeTask.status === 'in_progress' && (
                      <Button 
                        variant="outline"
                        onClick={() => controlTask(activeTask.id, 'pause')}
                        disabled={isLoading}
                      >
                        Pause
                      </Button>
                    )}
                    {activeTask.status === 'paused' && (
                      <Button 
                        variant="outline"
                        onClick={() => controlTask(activeTask.id, 'resume')}
                        disabled={isLoading}
                      >
                        Resume
                      </Button>
                    )}
                    {(activeTask.status === 'completed' || activeTask.status === 'failed') && (
                      <Button 
                        variant="outline"
                        onClick={() => controlTask(activeTask.id, 'retry')}
                        disabled={isLoading}
                      >
                        Retry
                      </Button>
                    )}
                  </div>
                  
                  <Button 
                    variant="destructive"
                    onClick={() => controlTask(activeTask.id, 'cancel')}
                    disabled={isLoading || ['completed', 'failed'].includes(activeTask.status)}
                  >
                    Cancel
                  </Button>
                </CardFooter>
              )}
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TaskMonitorPage;