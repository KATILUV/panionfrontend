/**
 * TaskDecomposition Component
 * Breaks down complex tasks into manageable subtasks with dependencies
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, AlertCircle, Clock, SplitSquareVertical, ArrowDownToLine, ArrowUpToLine } from 'lucide-react';
import { useTaskDecomposition, type ComplexTask, type Subtask } from '@/hooks/usePanionIntelligence';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';

interface TaskDecompositionProps {
  sessionId: string;
  onTaskComplete?: (task: ComplexTask) => void;
}

export function TaskDecomposition({ sessionId, onTaskComplete }: TaskDecompositionProps) {
  const [taskDescription, setTaskDescription] = useState<string>('');
  const { decomposedTask, isDecomposing, isUpdatingSubtask, decomposeTask, updateSubtaskStatus } = useTaskDecomposition();
  
  const handleDecompose = () => {
    if (taskDescription.trim()) {
      decomposeTask({ taskDescription, sessionId });
    }
  };
  
  const handleStatusChange = (taskId: string, subtaskId: string, status: 'pending' | 'in_progress' | 'completed' | 'blocked') => {
    updateSubtaskStatus({ taskId, subtaskId, status });
  };
  
  const getDependencyText = (task: ComplexTask, subtask: Subtask) => {
    if (subtask.dependencies.length === 0) return 'No dependencies';
    
    return subtask.dependencies.map(depId => {
      const dep = task.subtasks.find(s => s.id === depId);
      return dep ? dep.description.substring(0, 30) + (dep.description.length > 30 ? '...' : '') : depId;
    }).join(', ');
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-blue-500" />;
      case 'blocked':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Circle className="h-5 w-5 text-gray-300" />;
    }
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Completed</Badge>;
      case 'in_progress':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">In Progress</Badge>;
      case 'blocked':
        return <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">Blocked</Badge>;
      default:
        return <Badge variant="outline" className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">Pending</Badge>;
    }
  };
  
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium mb-2">Task Decomposition</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Break down complex tasks into manageable subtasks with dependencies
        </p>
        
        <div className="space-y-2">
          <Textarea
            placeholder="Describe a complex task that needs to be broken down..."
            value={taskDescription}
            onChange={(e) => setTaskDescription(e.target.value)}
            className="min-h-[100px]"
          />
          <Button onClick={handleDecompose} disabled={isDecomposing || !taskDescription.trim()}>
            {isDecomposing ? (
              <>
                <SplitSquareVertical className="h-4 w-4 mr-2 animate-pulse" />
                Breaking down task...
              </>
            ) : (
              <>
                <SplitSquareVertical className="h-4 w-4 mr-2" />
                Break down task
              </>
            )}
          </Button>
        </div>
      </div>
      
      {isDecomposing && !decomposedTask && (
        <div className="space-y-4 mt-6">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          
          <div className="space-y-2 mt-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="mb-2">
                <CardHeader className="py-3">
                  <Skeleton className="h-5 w-3/4" />
                </CardHeader>
                <CardContent className="py-2">
                  <Skeleton className="h-4 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
      
      {decomposedTask && (
        <div className="space-y-4 mt-6">
          <div>
            <h4 className="text-xl font-semibold">{decomposedTask.goal}</h4>
            <p className="text-sm text-muted-foreground">
              Created: {format(new Date(decomposedTask.created), 'PPp')}
            </p>
            <p className="mt-2">{decomposedTask.description}</p>
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <h5 className="font-medium">Subtasks ({decomposedTask.subtasks.length})</h5>
              <Badge>Status: {decomposedTask.status}</Badge>
            </div>
            
            <ScrollArea className="h-[400px] pr-4">
              {decomposedTask.subtasks
                .sort((a, b) => {
                  // First by dependencies
                  const aHasThisAsDep = decomposedTask.subtasks.some(s => 
                    s.dependencies.includes(a.id)
                  );
                  const bHasThisAsDep = decomposedTask.subtasks.some(s => 
                    s.dependencies.includes(b.id)
                  );
                  
                  if (aHasThisAsDep && !bHasThisAsDep) return -1;
                  if (!aHasThisAsDep && bHasThisAsDep) return 1;
                  
                  // Then by priority
                  return b.priority - a.priority;
                })
                .map((subtask) => (
                  <Card key={subtask.id} className="mb-3">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start">
                          <div
                            className="mr-3 cursor-pointer"
                            onClick={() => {
                              const newStatus = subtask.status === 'completed' 
                                ? 'pending' 
                                : subtask.status === 'pending' 
                                  ? 'in_progress' 
                                  : subtask.status === 'in_progress' 
                                    ? 'completed' 
                                    : 'pending';
                              handleStatusChange(decomposedTask.id, subtask.id, newStatus);
                            }}
                          >
                            {getStatusIcon(subtask.status)}
                          </div>
                          <div>
                            <CardTitle className="text-base">{subtask.description}</CardTitle>
                            <CardDescription className="mt-1">
                              Priority: {subtask.priority}/10 • Complexity: {subtask.estimatedComplexity}/10
                            </CardDescription>
                          </div>
                        </div>
                        {getStatusBadge(subtask.status)}
                      </div>
                    </CardHeader>
                    {(subtask.dependencies.length > 0 || subtask.notes) && (
                      <CardContent className="pb-3 pt-0">
                        {subtask.dependencies.length > 0 && (
                          <div className="mb-2">
                            <span className="text-xs text-muted-foreground">Dependencies:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {subtask.dependencies.map(depId => {
                                const dep = decomposedTask.subtasks.find(s => s.id === depId);
                                return (
                                  <Badge key={depId} variant="outline" className="text-xs">
                                    <ArrowUpToLine className="h-3 w-3 mr-1" />
                                    {dep ? dep.description.substring(0, 20) + (dep.description.length > 20 ? '...' : '') : depId}
                                  </Badge>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        {subtask.notes && (
                          <div>
                            <span className="text-xs text-muted-foreground">Notes:</span>
                            <p className="text-sm mt-1">{subtask.notes}</p>
                          </div>
                        )}
                      </CardContent>
                    )}
                    <CardFooter className="pt-0 pb-3">
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant={subtask.status === 'pending' ? 'default' : 'outline'} 
                          className="text-xs"
                          onClick={() => handleStatusChange(decomposedTask.id, subtask.id, 'pending')}
                          disabled={isUpdatingSubtask}
                        >
                          Pending
                        </Button>
                        <Button 
                          size="sm" 
                          variant={subtask.status === 'in_progress' ? 'default' : 'outline'} 
                          className="text-xs"
                          onClick={() => handleStatusChange(decomposedTask.id, subtask.id, 'in_progress')}
                          disabled={isUpdatingSubtask}
                        >
                          In Progress
                        </Button>
                        <Button 
                          size="sm" 
                          variant={subtask.status === 'completed' ? 'default' : 'outline'} 
                          className="text-xs"
                          onClick={() => handleStatusChange(decomposedTask.id, subtask.id, 'completed')}
                          disabled={isUpdatingSubtask}
                        >
                          Complete
                        </Button>
                        <Button 
                          size="sm" 
                          variant={subtask.status === 'blocked' ? 'default' : 'outline'} 
                          className="text-xs"
                          onClick={() => handleStatusChange(decomposedTask.id, subtask.id, 'blocked')}
                          disabled={isUpdatingSubtask}
                        >
                          Blocked
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                ))}
            </ScrollArea>
          </div>
        </div>
      )}
    </div>
  );
}

export default TaskDecomposition;