import React, { useState, useEffect, useRef } from 'react';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronRight, Play, Pause, AlertCircle, CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AgentStep {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  output?: string;
  error?: string;
}

interface AgentTask {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'paused' | 'completed' | 'failed';
  progress: number;
  steps: AgentStep[];
  result?: any;
  error?: string;
  startTime?: Date;
  completionTime?: Date;
  logs: string[];
}

interface AutonomousAgentProps {
  initialTask?: string;
  agentType?: 'data_gathering' | 'analysis' | 'general';
  onTaskComplete?: (result: any) => void;
  onTaskFailed?: (error: string) => void;
  autoStart?: boolean;
}

const AutonomousAgent: React.FC<AutonomousAgentProps> = ({
  initialTask = '',
  agentType = 'general',
  onTaskComplete,
  onTaskFailed,
  autoStart = false
}) => {
  const [task, setTask] = useState<AgentTask | null>(null);
  const [taskInput, setTaskInput] = useState(initialTask);
  const [isRunning, setIsRunning] = useState(autoStart);
  const [logsVisible, setLogsVisible] = useState(false);
  const [hasConfirmed, setHasConfirmed] = useState(autoStart);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Simulated steps for different agent types
  const getInitialSteps = (taskDescription: string, type: string): AgentStep[] => {
    if (type === 'data_gathering') {
      return [
        { id: '1', description: 'Analyze data gathering requirements', status: 'pending' },
        { id: '2', description: 'Identify optimal data sources', status: 'pending' },
        { id: '3', description: 'Collect data using appropriate methods', status: 'pending' },
        { id: '4', description: 'Process and validate collected data', status: 'pending' },
        { id: '5', description: 'Format and prepare final results', status: 'pending' }
      ];
    } else if (type === 'analysis') {
      return [
        { id: '1', description: 'Define analysis parameters', status: 'pending' },
        { id: '2', description: 'Extract relevant features from data', status: 'pending' },
        { id: '3', description: 'Apply analytical techniques', status: 'pending' },
        { id: '4', description: 'Interpret analysis results', status: 'pending' },
        { id: '5', description: 'Generate insights and recommendations', status: 'pending' }
      ];
    } else {
      // General purpose agent
      return [
        { id: '1', description: 'Understand task requirements', status: 'pending' },
        { id: '2', description: 'Develop execution strategy', status: 'pending' },
        { id: '3', description: 'Execute primary actions', status: 'pending' },
        { id: '4', description: 'Review and validate results', status: 'pending' },
        { id: '5', description: 'Prepare final output', status: 'pending' }
      ];
    }
  };

  // Scroll to bottom of logs when new logs are added
  useEffect(() => {
    if (logsVisible && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [task?.logs, logsVisible]);

  // Start/stop polling based on running state
  useEffect(() => {
    if (isRunning && task) {
      startPolling();
    } else {
      stopPolling();
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [isRunning, task]);

  const startPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    pollingRef.current = setInterval(() => {
      if (task && task.id) {
        fetchTaskStatus(task.id);
      }
    }, 3000); // Poll every 3 seconds
  };

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const fetchTaskStatus = async (taskId: string) => {
    try {
      // In a real implementation, this would call your backend API
      // For now, we'll simulate progress updates
      simulateProgress();
    } catch (error) {
      addLog(`Error fetching task status: ${error.message}`);
    }
  };

  const addLog = (message: string) => {
    if (task) {
      setTask({
        ...task,
        logs: [...task.logs, `[${new Date().toLocaleTimeString()}] ${message}`]
      });
    }
  };

  const simulateProgress = () => {
    if (!task) return;

    // Find the first pending or in_progress step
    const currentStepIndex = task.steps.findIndex(s => s.status === 'in_progress' || s.status === 'pending');
    if (currentStepIndex === -1) return;

    const newSteps = [...task.steps];
    const currentStep = newSteps[currentStepIndex];

    // Simulate step progress
    if (currentStep.status === 'pending') {
      currentStep.status = 'in_progress';
      addLog(`Starting: ${currentStep.description}`);
    } else {
      // 80% chance of success for each step
      const success = Math.random() > 0.2;
      if (success) {
        currentStep.status = 'completed';
        currentStep.output = `Successfully completed: ${currentStep.description}`;
        addLog(`Completed: ${currentStep.description}`);

        // Move to next step if available
        if (currentStepIndex < newSteps.length - 1) {
          newSteps[currentStepIndex + 1].status = 'in_progress';
          addLog(`Starting: ${newSteps[currentStepIndex + 1].description}`);
        }
      } else {
        // Simulate error and recovery
        addLog(`Encountered issue with: ${currentStep.description}`);
        addLog(`Attempting to recover...`);
        
        // 90% chance of recovery after an issue
        const recovers = Math.random() > 0.1;
        if (recovers) {
          addLog(`Successfully recovered`);
        } else {
          currentStep.status = 'failed';
          currentStep.error = `Failed to complete: ${currentStep.description}`;
          addLog(`Failed: ${currentStep.description}`);
          
          if (onTaskFailed) {
            onTaskFailed(currentStep.error);
          }
          
          setIsRunning(false);
          setTask({
            ...task,
            status: 'failed',
            error: `Failed at step: ${currentStep.description}`,
            steps: newSteps,
            completionTime: new Date()
          });
          return;
        }
      }
    }

    // Calculate overall progress
    const completedSteps = newSteps.filter(s => s.status === 'completed').length;
    const totalSteps = newSteps.length;
    const progress = Math.round((completedSteps / totalSteps) * 100);

    // Check if all steps are completed
    if (completedSteps === totalSteps) {
      addLog('All steps completed successfully');
      setIsRunning(false);
      setTask({
        ...task,
        status: 'completed',
        progress: 100,
        steps: newSteps,
        completionTime: new Date(),
        result: { message: 'Task completed successfully' }
      });
      
      if (onTaskComplete) {
        onTaskComplete({ message: 'Task completed successfully' });
      }
    } else {
      setTask({
        ...task,
        progress,
        steps: newSteps,
        status: progress === 100 ? 'completed' : 'in_progress'
      });
    }
  };

  const startTask = () => {
    if (!taskInput.trim()) return;

    const newTaskId = Date.now().toString();
    const initialSteps = getInitialSteps(taskInput, agentType);
    
    // Initial step is in_progress
    initialSteps[0].status = 'in_progress';
    
    const newTask: AgentTask = {
      id: newTaskId,
      description: taskInput,
      status: 'in_progress',
      progress: 0,
      steps: initialSteps,
      logs: [`[${new Date().toLocaleTimeString()}] Task initiated: ${taskInput}`],
      startTime: new Date()
    };
    
    setTask(newTask);
    setIsRunning(true);
    setHasConfirmed(true);
    addLog('Starting autonomous execution');
  };

  const pauseTask = () => {
    setIsRunning(false);
    if (task) {
      setTask({
        ...task,
        status: 'paused'
      });
      addLog('Task paused by user');
    }
  };

  const resumeTask = () => {
    setIsRunning(true);
    if (task) {
      setTask({
        ...task,
        status: 'in_progress'
      });
      addLog('Task resumed by user');
    }
  };

  const resetTask = () => {
    setTask(null);
    setHasConfirmed(false);
    setIsRunning(false);
    stopPolling();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500 animate-pulse';
      case 'failed': return 'bg-red-500';
      case 'paused': return 'bg-yellow-500';
      default: return 'bg-gray-300';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500">Completed</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-500">In Progress</Badge>;
      case 'failed':
        return <Badge className="bg-red-500">Failed</Badge>;
      case 'paused':
        return <Badge className="bg-yellow-500">Paused</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  // Render input form if no task is running yet
  if (!hasConfirmed) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Autonomous Agent</CardTitle>
          <CardDescription>
            Describe what you want the agent to do. It will work autonomously until the task is complete.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Describe your task in detail..."
            className="h-32 mb-4"
            value={taskInput}
            onChange={(e) => setTaskInput(e.target.value)}
          />
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => setTaskInput('')}>
            Clear
          </Button>
          <Button onClick={startTask} disabled={!taskInput.trim()}>
            <Play className="mr-2 h-4 w-4" /> Start Autonomous Task
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Autonomous Agent</CardTitle>
          {task && getStatusBadge(task.status)}
        </div>
        <CardDescription>
          {task?.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {task?.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{task.error}</AlertDescription>
          </Alert>
        )}
        
        {task && (
          <>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Progress</span>
                <span className="text-sm font-medium">{task.progress}%</span>
              </div>
              <Progress value={task.progress} className="h-2" />
            </div>
            
            <div className="space-y-3 my-4">
              {task.steps.map((step) => (
                <div key={step.id} className="flex items-start gap-3">
                  <div className={`w-3 h-3 mt-1.5 rounded-full ${getStatusColor(step.status)}`} />
                  <div className="flex-1">
                    <div className="font-medium text-sm">{step.description}</div>
                    {step.output && (
                      <div className="text-xs text-muted-foreground mt-1">{step.output}</div>
                    )}
                    {step.error && (
                      <div className="text-xs text-red-500 mt-1">{step.error}</div>
                    )}
                  </div>
                  {step.status === 'completed' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                  {step.status === 'in_progress' && <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />}
                  {step.status === 'failed' && <XCircle className="h-4 w-4 text-red-500" />}
                </div>
              ))}
            </div>
            
            <Button 
              variant="outline" 
              className="w-full text-sm" 
              onClick={() => setLogsVisible(!logsVisible)}
            >
              <ChevronRight className={`h-4 w-4 mr-2 transition-transform ${logsVisible ? 'rotate-90' : ''}`} />
              {logsVisible ? 'Hide' : 'Show'} Execution Logs
            </Button>
            
            {logsVisible && (
              <div className="bg-slate-950 text-slate-50 p-3 rounded-md text-xs font-mono h-40 overflow-y-auto">
                {task.logs.map((log, i) => (
                  <div key={i} className="pb-1">{log}</div>
                ))}
                <div ref={logsEndRef} />
              </div>
            )}
          </>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={resetTask}>
          Reset
        </Button>
        <div className="space-x-2">
          {task?.status === 'paused' ? (
            <Button onClick={resumeTask}>
              <Play className="mr-2 h-4 w-4" /> Resume
            </Button>
          ) : task?.status === 'in_progress' ? (
            <Button onClick={pauseTask} variant="secondary">
              <Pause className="mr-2 h-4 w-4" /> Pause
            </Button>
          ) : null}
        </div>
      </CardFooter>
    </Card>
  );
};

export default AutonomousAgent;