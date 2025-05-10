/**
 * Task Decomposition Component
 * Allows breaking down complex tasks into manageable subtasks
 */

import React, { useState } from 'react';
import { useTaskDecomposition, ComplexTask, Subtask } from '@/hooks/useManus';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { 
  SplitSquareVertical, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  PlusCircle,
  ArrowRight
} from 'lucide-react';

interface TaskDecompositionProps {
  sessionId: string;
  maxHeight?: string;
  onTaskComplete?: (task: ComplexTask) => void;
}

export function TaskDecomposition({
  sessionId,
  maxHeight = '500px',
  onTaskComplete
}: TaskDecompositionProps) {
  const { toast } = useToast();
  const [taskDescription, setTaskDescription] = useState('');
  const { 
    decomposeTask, 
    isDecomposing, 
    decomposedTask, 
    updateSubtaskStatus, 
    isUpdatingSubtask 
  } = useTaskDecomposition();

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskDescription.trim()) {
      toast({
        title: "Task description required",
        description: "Please enter a description of the task you want to decompose.",
        variant: "destructive"
      });
      return;
    }

    decomposeTask({ taskDescription, sessionId });
  };

  // Handle subtask status update
  const handleSubtaskUpdate = (subtask: Subtask, status: 'pending' | 'in_progress' | 'completed' | 'blocked') => {
    if (!decomposedTask) return;
    
    updateSubtaskStatus({
      taskId: decomposedTask.id,
      subtaskId: subtask.id,
      status
    });

    toast({
      title: `Subtask ${status === 'completed' ? 'completed' : 'updated'}`,
      description: subtask.description
    });

    // If all subtasks are completed, notify
    if (status === 'completed' && 
        decomposedTask.subtasks.every(s => 
          s.id === subtask.id ? true : s.status === 'completed'
        )) {
      toast({
        title: "All subtasks completed!",
        description: "The entire task has been completed successfully.",
        variant: "success"
      });
      
      if (onTaskComplete) {
        onTaskComplete(decomposedTask);
      }
    }
  };

  // Get the proper status icon
  const getStatusIcon = (status: Subtask['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'blocked':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <PlusCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  // Check if a subtask can be started based on dependencies
  const canStartSubtask = (subtask: Subtask, allSubtasks: Subtask[]): boolean => {
    if (subtask.status !== 'pending') return false;
    
    // If no dependencies, can start immediately
    if (subtask.dependencies.length === 0) return true;
    
    // Check if all dependencies are completed
    return subtask.dependencies.every(depId => {
      const dependency = allSubtasks.find(s => s.id === depId);
      return dependency && dependency.status === 'completed';
    });
  };

  return (
    <Card className="w-full h-full overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center">
          <SplitSquareVertical className="h-5 w-5 mr-2 text-blue-500" />
          <span>Task Decomposition</span>
        </CardTitle>
        <CardDescription>
          Break down complex tasks into manageable subtasks
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {!decomposedTask ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="taskDescription" className="text-sm font-medium">
                Task Description
              </label>
              <Textarea
                id="taskDescription"
                placeholder="Describe the complex task you want to break down..."
                value={taskDescription}
                onChange={e => setTaskDescription(e.target.value)}
                className="resize-none"
                rows={4}
              />
            </div>
            <Button type="submit" disabled={isDecomposing || !taskDescription.trim()}>
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
          </form>
        ) : (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium">Goal: {decomposedTask.goal}</h3>
              <p className="text-sm text-muted-foreground mt-1">{decomposedTask.description}</p>
            </div>
            
            <div className="bg-muted p-3 rounded-md">
              <h4 className="font-medium mb-2">Subtasks</h4>
              <ScrollArea style={{ maxHeight: maxHeight }}>
                <div className="space-y-3">
                  {decomposedTask.subtasks.map((subtask) => (
                    <Card key={subtask.id} className="overflow-hidden">
                      <div className="p-3 flex items-start gap-3">
                        <div className="pt-0.5">
                          <Checkbox 
                            checked={subtask.status === 'completed'}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                handleSubtaskUpdate(subtask, 'completed');
                              } else {
                                handleSubtaskUpdate(subtask, 'pending');
                              }
                            }}
                            disabled={
                              isUpdatingSubtask || 
                              (subtask.status !== 'completed' && !canStartSubtask(subtask, decomposedTask.subtasks))
                            }
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div className="font-medium">{subtask.description}</div>
                            <Badge className="ml-2" variant={subtask.status === 'completed' ? 'default' : 'outline'}>
                              {getStatusIcon(subtask.status)}
                              <span className="ml-1 capitalize">{subtask.status}</span>
                            </Badge>
                          </div>
                          
                          {subtask.notes && (
                            <p className="text-sm text-muted-foreground mt-1">{subtask.notes}</p>
                          )}
                          
                          <div className="flex justify-between text-xs text-muted-foreground mt-2">
                            <span>Complexity: {subtask.estimatedComplexity}/10</span>
                            <span>Priority: {subtask.priority}/10</span>
                          </div>
                          
                          {subtask.dependencies.length > 0 && (
                            <div className="mt-2 text-xs">
                              <span className="text-muted-foreground">Dependencies:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {subtask.dependencies.map(depId => {
                                  const dep = decomposedTask.subtasks.find(s => s.id === depId);
                                  return dep ? (
                                    <Badge key={depId} variant="outline" className="text-xs">
                                      {dep.status === 'completed' ? 
                                        <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" /> : 
                                        <Clock className="h-3 w-3 mr-1 text-amber-500" />
                                      }
                                      {dep.description.slice(0, 20)}{dep.description.length > 20 ? '...' : ''}
                                    </Badge>
                                  ) : null;
                                })}
                              </div>
                            </div>
                          )}
                          
                          {subtask.status === 'pending' && canStartSubtask(subtask, decomposedTask.subtasks) && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="mt-2"
                              onClick={() => handleSubtaskUpdate(subtask, 'in_progress')}
                              disabled={isUpdatingSubtask}
                            >
                              <ArrowRight className="h-3 w-3 mr-1" />
                              Start Subtask
                            </Button>
                          )}
                          
                          {subtask.status === 'in_progress' && (
                            <Button 
                              size="sm" 
                              variant="default" 
                              className="mt-2"
                              onClick={() => handleSubtaskUpdate(subtask, 'completed')}
                              disabled={isUpdatingSubtask}
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Mark Completed
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
            
            <Button 
              variant="outline" 
              onClick={() => setTaskDescription('')}
            >
              New Task
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default TaskDecomposition;