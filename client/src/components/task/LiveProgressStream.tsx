import React, { useEffect, useRef, useState } from 'react';
import { Task, useTaskContext } from '@/context/TaskContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface LiveProgressStreamProps {
  taskId: string;
  height?: number;
  autoScroll?: boolean;
  showHeader?: boolean;
}

const LiveProgressStream: React.FC<LiveProgressStreamProps> = ({
  taskId,
  height = 300,
  autoScroll = true,
  showHeader = true
}) => {
  const { getTask, subscribeToTask, unsubscribeFromTask } = useTaskContext();
  const [task, setTask] = useState<Task | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  // Subscribe to task updates when the component mounts
  useEffect(() => {
    // Get initial task state
    const initialTask = getTask(taskId);
    if (initialTask) {
      setTask(initialTask);
      setLogs(initialTask.logs || []);
    }
    
    // Subscribe to task updates
    subscribeToTask(taskId);
    
    // Clean up when component unmounts
    return () => {
      unsubscribeFromTask(taskId);
    };
  }, [taskId, getTask, subscribeToTask, unsubscribeFromTask]);
  
  // Update the task state when it changes in context
  useEffect(() => {
    const currentTask = getTask(taskId);
    if (currentTask && JSON.stringify(currentTask) !== JSON.stringify(task)) {
      setTask(currentTask);
      setLogs(currentTask.logs || []);
    }
  }, [taskId, getTask, task]);
  
  // Auto-scroll to bottom when logs update
  useEffect(() => {
    if (autoScroll && scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [logs, autoScroll]);
  
  // Render a loading state if no task is available
  if (!task) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="bg-muted/20 p-4">
          <CardTitle className="text-md">Loading task...</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex items-center justify-center h-[200px]">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Helper function to format task status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      case 'in_progress':
        return <Badge variant="secondary" className="bg-blue-500 text-white">In Progress</Badge>;
      case 'paused':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-500">Paused</Badge>;
      case 'completed':
        return <Badge variant="outline" className="border-green-500 text-green-500">Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  // Helper function to format timestamp from log line
  const extractTimestamp = (logLine: string) => {
    const match = logLine.match(/\[(.*?)\]/);
    if (match && match[1]) {
      return match[1];
    }
    return '';
  };
  
  // Helper function to extract message from log line
  const extractMessage = (logLine: string) => {
    const message = logLine.replace(/\[.*?\]/, '').trim();
    return message;
  };
  
  return (
    <Card className="overflow-hidden">
      {showHeader && (
        <CardHeader className="bg-muted/20 p-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-md">{task.description}</CardTitle>
              <CardDescription className="text-xs mt-1">
                {task.agentType} task • Started {new Date(task.startTime).toLocaleString()}
              </CardDescription>
            </div>
            {getStatusBadge(task.status)}
          </div>
          <Progress value={task.progress} className="h-2 mt-2" />
        </CardHeader>
      )}
      
      <CardContent className="p-0">
        <ScrollArea ref={scrollAreaRef} className="h-[var(--stream-height)]" style={{ '--stream-height': `${height}px` } as React.CSSProperties}>
          <div className="py-3 px-4 space-y-2 text-sm font-mono">
            {logs.map((log, index) => (
              <div key={index} className="grid grid-cols-[80px_1fr] gap-2">
                <span className="text-xs text-muted-foreground">{extractTimestamp(log)}</span>
                <span className={extractMessage(log).includes('Error') ? 'text-destructive' : ''}>{extractMessage(log)}</span>
              </div>
            ))}
            
            {task.status === 'in_progress' && (
              <div className="grid grid-cols-[80px_1fr] gap-2">
                <span className="text-xs text-muted-foreground">...</span>
                <span className="animate-pulse">Processing...</span>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default LiveProgressStream;