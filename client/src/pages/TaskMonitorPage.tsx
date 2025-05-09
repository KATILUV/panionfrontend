import React, { useEffect, useState } from 'react';
import { useParams, useLocation, Link } from 'wouter';
import { 
  ChevronLeftIcon, 
  LucidePlayCircle, 
  LucidePauseCircle, 
  RotateCcw, 
  XCircle,
  ListFilter,
  Clock,
  CheckCircle2,
  XCircle as Failed,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import LiveProgressStream from '@/components/task/LiveProgressStream';
import TaskTimeline from '@/components/task/TaskTimeline';
import { ConfidenceBadge } from '@/components/task/ConfidenceIndicator';
import { Task, TaskStep, useTaskContext } from '@/context/TaskContext';
import { cn } from '@/lib/utils';

// Component to display when no task is selected
const NoTaskSelected: React.FC = () => {
  const [, navigate] = useLocation();
  const { state } = useTaskContext();
  
  // Get the most recent active task (if any)
  const mostRecentActiveTask = state.activeTasks.length > 0
    ? state.tasks[state.activeTasks[0]]
    : null;
  
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] text-center p-6">
      <div className="mb-8">
        <Clock className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-2xl font-semibold mb-2">No Task Selected</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Select a task from the list on the left or create a new task to monitor its progress.
        </p>
      </div>
      
      {mostRecentActiveTask && (
        <Button 
          variant="outline" 
          onClick={() => navigate(`/tasks/${mostRecentActiveTask.id}`)}
          className="gap-2"
        >
          <LucidePlayCircle className="h-4 w-4" />
          View Active Task
        </Button>
      )}
    </div>
  );
};

// The main TaskMonitorPage component
const TaskMonitorPage: React.FC = () => {
  const { taskId } = useParams();
  const [, navigate] = useLocation();
  const { 
    state, 
    getTask,
    pauseTask,
    resumeTask,
    cancelTask,
    retryTask,
    subscribeToTask,
    unsubscribeFromTask,
    connectionStatus
  } = useTaskContext();
  
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  
  // Fetch selected task when taskId changes
  useEffect(() => {
    if (taskId) {
      const task = getTask(taskId);
      setSelectedTask(task);
      
      // Subscribe to task updates
      if (task) {
        subscribeToTask(taskId);
      }
      
      // Unsubscribe when component unmounts or taskId changes
      return () => {
        if (task) {
          unsubscribeFromTask(taskId);
        }
      };
    } else {
      setSelectedTask(null);
    }
  }, [taskId, getTask, subscribeToTask, unsubscribeFromTask]);
  
  // Update selected task when it's updated in the context
  useEffect(() => {
    if (taskId && state.tasks[taskId]) {
      setSelectedTask(state.tasks[taskId]);
    }
  }, [taskId, state.tasks]);
  
  // Filter tasks based on status
  const getFilteredTasks = () => {
    let taskIds = [];
    
    switch (filterStatus) {
      case 'active':
        taskIds = state.activeTasks;
        break;
      case 'completed':
        taskIds = state.completedTasks;
        break;
      case 'failed':
        taskIds = state.failedTasks;
        break;
      default:
        // Combine all tasks and sort by start time (newest first)
        taskIds = [...state.activeTasks, ...state.completedTasks, ...state.failedTasks];
    }
    
    return taskIds.map(id => state.tasks[id]).sort((a, b) => 
      new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
  };
  
  // Handler for task actions
  const handleTaskAction = async (action: 'pause' | 'resume' | 'cancel' | 'retry') => {
    if (!selectedTask) return;
    
    try {
      let updatedTask: Task | null = null;
      
      switch (action) {
        case 'pause':
          updatedTask = await pauseTask(selectedTask.id);
          break;
        case 'resume':
          updatedTask = await resumeTask(selectedTask.id);
          break;
        case 'cancel':
          updatedTask = await cancelTask(selectedTask.id);
          break;
        case 'retry':
          updatedTask = await retryTask(selectedTask.id);
          // Navigate to the new task
          navigate(`/tasks/${updatedTask.id}`);
          break;
      }
      
      if (updatedTask) {
        setSelectedTask(updatedTask);
      }
    } catch (error) {
      console.error(`Error performing ${action} action:`, error);
    }
  };
  
  // Helper function to get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="ml-2">Pending</Badge>;
      case 'in_progress':
        return <Badge variant="secondary" className="bg-blue-500 text-white ml-2">In Progress</Badge>;
      case 'paused':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-500 ml-2">Paused</Badge>;
      case 'completed':
        return <Badge variant="outline" className="border-green-500 text-green-500 ml-2">Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="ml-2">Failed</Badge>;
      default:
        return <Badge variant="outline" className="ml-2">{status}</Badge>;
    }
  };
  
  // Helper function to get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 mr-2" />;
      case 'in_progress':
        return <LucidePlayCircle className="h-4 w-4 mr-2 text-blue-500" />;
      case 'paused':
        return <LucidePauseCircle className="h-4 w-4 mr-2 text-yellow-500" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />;
      case 'failed':
        return <Failed className="h-4 w-4 mr-2 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 mr-2" />;
    }
  };
  
  // Format date or time
  const formatDateTime = (dateString: string, showTimeOnly = false) => {
    const date = new Date(dateString);
    
    if (showTimeOnly) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    return date.toLocaleDateString([], { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Calculate the success rate from steps
  const calculateSuccessRate = (steps: TaskStep[]) => {
    if (steps.length === 0) return 0;
    
    const completedSteps = steps.filter(step => step.status === 'completed').length;
    return completedSteps / steps.length;
  };
  
  return (
    <div className="container mx-auto p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Button variant="outline" asChild>
            <Link to="/" className="flex items-center gap-2">
              <ChevronLeftIcon className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
        <Badge variant={connectionStatus === 'connected' ? 'outline' : 'secondary'} className={connectionStatus === 'connected' ? 'border-green-500 text-green-500' : ''}>
          {connectionStatus === 'connected' ? 'Connected' : connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
        </Badge>
      </div>
      
      {/* Main content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Task list */}
        <Card className="md:col-span-1">
          <CardHeader className="p-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Tasks</CardTitle>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-1">
                    <ListFilter className="h-4 w-4" />
                    Filter
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setFilterStatus(null)} className={!filterStatus ? 'bg-muted/50' : ''}>
                    All Tasks
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterStatus('active')} className={filterStatus === 'active' ? 'bg-muted/50' : ''}>
                    Active Tasks
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterStatus('completed')} className={filterStatus === 'completed' ? 'bg-muted/50' : ''}>
                    Completed Tasks
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterStatus('failed')} className={filterStatus === 'failed' ? 'bg-muted/50' : ''}>
                    Failed Tasks
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-13rem)]">
              <div className="p-1">
                {getFilteredTasks().map(task => (
                  <div key={task.id} className="mb-1">
                    <Button
                      variant={task.id === taskId ? "default" : "ghost"}
                      className={cn(
                        "w-full justify-start text-left p-3 h-auto",
                        task.id === taskId ? "bg-primary text-primary-foreground" : ""
                      )}
                      onClick={() => navigate(`/tasks/${task.id}`)}
                    >
                      <div className="flex flex-col w-full gap-1">
                        <div className="flex items-center">
                          {getStatusIcon(task.status)}
                          <span className="font-medium truncate">{task.description}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs pl-6">
                          <span className="text-muted-foreground">
                            {formatDateTime(task.startTime, true)}
                          </span>
                          <span>{task.agentType}</span>
                        </div>
                      </div>
                    </Button>
                  </div>
                ))}
                
                {getFilteredTasks().length === 0 && (
                  <div className="flex flex-col items-center justify-center h-40 text-center p-4">
                    <p className="text-muted-foreground mb-2">No tasks found</p>
                    <p className="text-xs text-muted-foreground">
                      {filterStatus ? `No ${filterStatus} tasks available` : 'No tasks have been created yet'}
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
        
        {/* Task details */}
        <div className="md:col-span-2">
          {selectedTask ? (
            <div className="space-y-6">
              {/* Task header and controls */}
              <Card>
                <CardHeader className="p-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-xl">{selectedTask.description}</CardTitle>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <span className="mr-2">Agent: {selectedTask.agentType}</span>
                          {getStatusBadge(selectedTask.status)}
                        </div>
                      </div>
                      
                      <ConfidenceBadge 
                        score={calculateSuccessRate(selectedTask.steps)} 
                        tooltipText="Task success rate based on completed steps" 
                      />
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <div>
                        <span className="text-muted-foreground">Started:</span> {formatDateTime(selectedTask.startTime)}
                        {selectedTask.completionTime && (
                          <>
                            <span className="text-muted-foreground ml-4">Finished:</span> {formatDateTime(selectedTask.completionTime)}
                          </>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        {/* Task action buttons */}
                        {selectedTask.status === 'in_progress' && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleTaskAction('pause')} 
                            className="gap-1"
                          >
                            <LucidePauseCircle className="h-4 w-4" />
                            Pause
                          </Button>
                        )}
                        
                        {selectedTask.status === 'paused' && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleTaskAction('resume')} 
                            className="gap-1"
                          >
                            <LucidePlayCircle className="h-4 w-4" />
                            Resume
                          </Button>
                        )}
                        
                        {['in_progress', 'paused'].includes(selectedTask.status) && (
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={() => handleTaskAction('cancel')} 
                            className="gap-1"
                          >
                            <XCircle className="h-4 w-4" />
                            Cancel
                          </Button>
                        )}
                        
                        {['completed', 'failed'].includes(selectedTask.status) && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleTaskAction('retry')} 
                            className="gap-1"
                          >
                            <RotateCcw className="h-4 w-4" />
                            Retry
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </Card>
              
              {/* Task content */}
              <Tabs defaultValue="progress" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="progress">Progress</TabsTrigger>
                  <TabsTrigger value="timeline">Timeline</TabsTrigger>
                  <TabsTrigger value="result">Result</TabsTrigger>
                </TabsList>
                
                {/* Progress tab */}
                <TabsContent value="progress" className="space-y-4">
                  <LiveProgressStream 
                    taskId={selectedTask.id} 
                    height={400} 
                  />
                </TabsContent>
                
                {/* Timeline tab */}
                <TabsContent value="timeline" className="space-y-4">
                  <TaskTimeline 
                    steps={selectedTask.steps}
                  />
                </TabsContent>
                
                {/* Result tab */}
                <TabsContent value="result" className="space-y-4">
                  <Card>
                    <CardHeader className="p-4">
                      <CardTitle className="text-lg">Task Result</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      {selectedTask.status === 'completed' ? (
                        <div className="space-y-4">
                          <div className="whitespace-pre-wrap bg-muted p-4 rounded-md">
                            {selectedTask.result || 'No result data available'}
                          </div>
                        </div>
                      ) : selectedTask.status === 'failed' ? (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 text-red-500">
                            <Failed className="h-5 w-5" />
                            <h3 className="font-medium">Task Failed</h3>
                          </div>
                          <div className="bg-red-50 border border-red-200 p-4 rounded-md">
                            {selectedTask.error || 'No error information available'}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8">
                          <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                          <p className="text-center text-muted-foreground">
                            Task is still in progress. Results will be available once the task is completed.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <NoTaskSelected />
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskMonitorPage;