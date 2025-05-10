/**
 * TaskDecomposition Component
 * Displays a complex task broken down into smaller subtasks
 */

import React, { useState } from 'react';
import { useTaskDecomposition, type ComplexTask, type Subtask } from '@/hooks/useManus';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertTriangle, RefreshCw, SplitSquareVertical, ArrowDown, Clock, CheckCheck, XCircle, ListChecks } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TaskDecompositionProps {
  sessionId: string;
  maxHeight?: string;
}

export function TaskDecomposition({
  sessionId,
  maxHeight = '700px'
}: TaskDecompositionProps) {
  const [taskDescription, setTaskDescription] = useState<string>('');
  
  const {
    decomposedTask,
    isDecomposing,
    isUpdatingSubtask,
    error,
    decomposeTask,
    updateSubtaskStatus
  } = useTaskDecomposition();
  
  const handleDecomposeTask = () => {
    if (!taskDescription.trim()) return;
    
    decomposeTask({
      taskDescription,
      sessionId
    });
  };
  
  const handleStatusChange = (subtaskId: string, status: 'pending' | 'in_progress' | 'completed' | 'blocked') => {
    if (!decomposedTask) return;
    
    updateSubtaskStatus({
      taskId: decomposedTask.id,
      subtaskId,
      status
    });
  };
  
  // Get subtasks sorted by their dependencies and priority
  const getSortedSubtasks = (subtasks: Subtask[]): Subtask[] => {
    // First, create a map of dependencies
    const dependencyMap = new Map<string, Set<string>>();
    
    subtasks.forEach(subtask => {
      dependencyMap.set(subtask.id, new Set(subtask.dependencies));
    });
    
    // Helper function to check if a subtask has unresolved dependencies
    const hasUnresolvedDependencies = (s: Subtask, resolved: Set<string>) => {
      const deps = dependencyMap.get(s.id) || new Set();
      const depsArray = Array.from(deps);
      for (const dep of depsArray) {
        if (!resolved.has(dep)) {
          return true;
        }
      }
      return false;
    };
    
    // Perform a topological sort
    const result: Subtask[] = [];
    const resolved = new Set<string>();
    
    // While we haven't resolved all subtasks
    while (result.length < subtasks.length) {
      let added = false;
      
      // Find subtasks with resolved dependencies
      const available = subtasks.filter(s => 
        !result.includes(s) && !hasUnresolvedDependencies(s, resolved)
      );
      
      // If there are available subtasks, add them by priority
      if (available.length > 0) {
        // Sort by priority (high to low)
        available.sort((a, b) => b.priority - a.priority);
        const next = available[0];
        result.push(next);
        resolved.add(next.id);
        added = true;
      }
      
      // If we couldn't add any subtasks and we're not done, there's a circular dependency
      if (!added && result.length < subtasks.length) {
        // Just add remaining tasks by priority
        const remaining = subtasks.filter(s => !result.includes(s))
          .sort((a, b) => b.priority - a.priority);
        result.push(...remaining);
        break;
      }
    }
    
    return result;
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="text-muted-foreground">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case 'in_progress':
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            <RefreshCw className="h-3 w-3 mr-1" />
            In Progress
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCheck className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case 'blocked':
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-800 hover:bg-red-100">
            <XCircle className="h-3 w-3 mr-1" />
            Blocked
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            {status}
          </Badge>
        );
    }
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-muted-foreground" />;
      case 'in_progress':
        return <RefreshCw className="h-5 w-5 text-blue-500" />;
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'blocked':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };
  
  const hasDependenciesMet = (subtask: Subtask, allSubtasks: Subtask[]): boolean => {
    if (!subtask.dependencies.length) return true;
    
    return subtask.dependencies.every(depId => {
      const dependency = allSubtasks.find(s => s.id === depId);
      return dependency && dependency.status === 'completed';
    });
  };
  
  const findDependencyNames = (subtask: Subtask, allSubtasks: Subtask[]): string[] => {
    return subtask.dependencies.map(depId => {
      const dependency = allSubtasks.find(s => s.id === depId);
      return dependency ? dependency.description.slice(0, 30) + (dependency.description.length > 30 ? '...' : '') : 'Unknown';
    });
  };
  
  return (
    <Card className="w-full h-full overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center">
          <SplitSquareVertical className="h-5 w-5 mr-2 text-purple-500" />
          <span>Task Decomposition</span>
        </CardTitle>
        <CardDescription>
          Break down complex tasks into manageable subtasks
        </CardDescription>
      </CardHeader>
      
      <CardContent className="px-4 pb-0">
        <div className="space-y-4">
          <div>
            <Textarea
              placeholder="Describe the complex task you want to break down..."
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              className="resize-none min-h-[100px]"
              disabled={isDecomposing || !!decomposedTask}
            />
          </div>
          
          {!decomposedTask && (
            <Button
              className="w-full"
              onClick={handleDecomposeTask}
              disabled={!taskDescription.trim() || isDecomposing}
            >
              {isDecomposing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Decomposing...
                </>
              ) : (
                <>
                  <SplitSquareVertical className="h-4 w-4 mr-2" />
                  Decompose Task
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
      
      <CardContent className="px-4 pt-4 pb-0">
        {isDecomposing ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : error ? (
          <div className="p-4 text-center text-red-500">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p>Failed to decompose task</p>
            <Button 
              variant="outline"
              className="mt-2"
              onClick={handleDecomposeTask}
            >
              Try Again
            </Button>
          </div>
        ) : decomposedTask ? (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium">{decomposedTask.goal}</h3>
              <p className="text-sm text-muted-foreground mt-1">{decomposedTask.description}</p>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <ListChecks className="h-4 w-4 mr-1" />
                <span className="text-sm font-medium">
                  {decomposedTask.subtasks.length} Subtasks
                </span>
              </div>
              <Badge 
                variant={
                  decomposedTask.status === 'completed' ? 'success' :
                  decomposedTask.status === 'in_progress' ? 'default' :
                  decomposedTask.status === 'failed' ? 'destructive' : 'outline'
                }
              >
                {decomposedTask.status.charAt(0).toUpperCase() + decomposedTask.status.slice(1)}
              </Badge>
            </div>
          </div>
        ) : null}
      </CardContent>
      
      <CardContent className="px-4 pb-4 pt-4">
        {decomposedTask && (
          <ScrollArea style={{ maxHeight }}>
            <div className="space-y-4">
              {getSortedSubtasks(decomposedTask.subtasks).map((subtask: Subtask) => {
                const dependencyNames = findDependencyNames(subtask, decomposedTask.subtasks);
                const canUpdate = hasDependenciesMet(subtask, decomposedTask.subtasks);
                
                return (
                  <Card 
                    key={subtask.id} 
                    className={`
                      border-l-4 overflow-hidden transition-all
                      ${subtask.status === 'completed' ? 'border-l-green-500' : 
                        subtask.status === 'in_progress' ? 'border-l-blue-500' : 
                        subtask.status === 'blocked' ? 'border-l-red-500' : 
                        'border-l-muted'}
                    `}
                  >
                    <CardContent className="p-4">
                      <div className="flex">
                        <div className="mr-3 mt-1">
                          {getStatusIcon(subtask.status)}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium">{subtask.description}</h4>
                              {subtask.notes && (
                                <p className="text-sm text-muted-foreground mt-1">{subtask.notes}</p>
                              )}
                            </div>
                            <div>
                              {getStatusBadge(subtask.status)}
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <div className="flex items-center text-xs text-muted-foreground">
                              <span>Complexity: {subtask.estimatedComplexity}/10</span>
                            </div>
                            <div className="text-muted-foreground">•</div>
                            <div className="flex items-center text-xs text-muted-foreground">
                              <span>Priority: {subtask.priority}/10</span>
                            </div>
                          </div>
                          
                          {dependencyNames.length > 0 && (
                            <div className="mt-2">
                              <div className="text-xs text-muted-foreground flex items-center">
                                <ArrowDown className="h-3 w-3 mr-1" />
                                <span>Depends on:</span>
                              </div>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {dependencyNames.map((name: string, index: number) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {name}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          <div className="mt-3">
                            <Select
                              value={subtask.status}
                              onValueChange={(value) => handleStatusChange(
                                subtask.id, 
                                value as 'pending' | 'in_progress' | 'completed' | 'blocked'
                              )}
                              disabled={isUpdatingSubtask || !canUpdate}
                            >
                              <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="blocked">Blocked</SelectItem>
                              </SelectContent>
                            </Select>
                            {!canUpdate && (
                              <p className="text-xs text-red-500 mt-1">
                                Complete dependencies first
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
      
      {decomposedTask && (
        <CardFooter className="px-4 pt-0 pb-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setTaskDescription('');
              decomposeTask({
                taskDescription: '', 
                sessionId
              });
            }}
          >
            Clear & Start New Task
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

export default TaskDecomposition;