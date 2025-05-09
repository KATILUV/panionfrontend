import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Task, useTaskContext } from '@/context/TaskContext';
import { cn } from '@/lib/utils';
import { Clock, AlertTriangle } from 'lucide-react';

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
  const { state } = useTaskContext();
  const [task, setTask] = useState<Task | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  
  // Update task from context when it changes
  useEffect(() => {
    if (state.tasks[taskId]) {
      setTask(state.tasks[taskId]);
    }
  }, [taskId, state.tasks]);
  
  // Auto-scroll to bottom when logs are updated
  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [task?.logs, autoScroll]);
  
  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (error) {
      return '';
    }
  };
  
  if (!task) {
    return (
      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-lg">Task Progress</CardTitle>
        </CardHeader>
        <CardContent className="p-4 flex justify-center items-center h-48">
          <div className="text-center text-muted-foreground">
            <Clock className="h-10 w-10 mx-auto mb-2" />
            <p>Task information not available</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      {showHeader && (
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Live Progress</CardTitle>
            <div className="text-sm text-muted-foreground">
              Progress: {Math.round(task.progress)}%
            </div>
          </div>
          <Progress 
            className="h-2 mt-2" 
            value={task.progress} 
          />
        </CardHeader>
      )}
      
      <CardContent className={cn("p-4 pt-2", !showHeader && "pt-4")}>
        <ScrollArea 
          ref={scrollAreaRef} 
          className="pr-4" 
          style={{ height: `${height}px` }}
        >
          <div className="space-y-1 font-mono text-sm">
            {task.logs.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                <div className="text-center">
                  <Clock className="h-8 w-8 mx-auto mb-2" />
                  <p>Waiting for task to start...</p>
                </div>
              </div>
            ) : (
              <>
                {task.logs.map((log, index) => {
                  // Check if log contains timestamp (example format: [2025-05-08T12:30:45.123Z])
                  const timestampMatch = log.match(/\[(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\]/);
                  
                  // Extract timestamp from log if available
                  const timestamp = timestampMatch ? timestampMatch[1] : null;
                  
                  // Clean log message by removing timestamp if found
                  const message = timestamp 
                    ? log.replace(`[${timestamp}]`, '').trim() 
                    : log;
                  
                  // Determine if this is an error or warning message
                  const isError = message.toLowerCase().includes('error') || 
                                  message.toLowerCase().includes('exception') || 
                                  message.toLowerCase().includes('failed');
                  
                  const isWarning = message.toLowerCase().includes('warning') || 
                                  message.toLowerCase().includes('warn');
                  
                  return (
                    <div 
                      key={index} 
                      className={cn(
                        "py-1 border-l-2 pl-2",
                        isError ? "border-red-500 bg-red-50 text-red-900" : 
                        isWarning ? "border-yellow-500 bg-yellow-50 text-yellow-900" : 
                        "border-muted"
                      )}
                    >
                      {/* Show timestamp if available */}
                      {timestamp && (
                        <span className="text-xs text-muted-foreground mr-2">
                          {formatTimestamp(timestamp)}
                        </span>
                      )}
                      
                      {/* Show error icon for errors */}
                      {isError && (
                        <AlertTriangle className="inline-block h-3 w-3 text-red-500 mr-1" />
                      )}
                      
                      {/* Log message */}
                      <span className={cn(
                        isError ? "text-red-700" : 
                        isWarning ? "text-yellow-700" : ""
                      )}>
                        {message}
                      </span>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default LiveProgressStream;