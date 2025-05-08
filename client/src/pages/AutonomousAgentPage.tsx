import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import AutonomousAgent from '@/components/agents/AutonomousAgent';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Braces, Database, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';

interface TaskType {
  id: string;
  name: string;
  description: string;
  agentType: 'data_gathering' | 'analysis' | 'general';
  icon: React.ReactNode;
}

const AutonomousAgentPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedTaskType, setSelectedTaskType] = useState<TaskType | null>(null);

  // Predefined task types
  const taskTypes: TaskType[] = [
    {
      id: 'data_gathering',
      name: 'Data Gathering',
      description: 'Collect, process, and validate data from various sources',
      agentType: 'data_gathering',
      icon: <Search className="h-6 w-6" />
    },
    {
      id: 'analysis',
      name: 'Data Analysis',
      description: 'Analyze data to extract insights and generate reports',
      agentType: 'analysis',
      icon: <Braces className="h-6 w-6" />
    },
    {
      id: 'general',
      name: 'General Purpose',
      description: 'Handle diverse tasks with flexible execution strategy',
      agentType: 'general',
      icon: <Database className="h-6 w-6" />
    }
  ];

  useEffect(() => {
    // Fetch existing tasks when component mounts
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await fetch('/api/autonomous-agent/tasks');
      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      } else {
        console.error('Failed to fetch tasks');
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const handleTaskComplete = (result: any) => {
    toast({
      title: "Task completed",
      description: "The autonomous agent has successfully completed the task.",
    });
    // Refresh the task list
    fetchTasks();
  };

  const handleTaskFailed = (error: string) => {
    toast({
      title: "Task failed",
      description: error,
      variant: "destructive"
    });
    // Refresh the task list
    fetchTasks();
  };

  const selectTaskType = (taskType: TaskType) => {
    setSelectedTaskType(taskType);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation('/')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Autonomous Agent</h1>
          <Badge variant="outline" className="ml-2">
            Beta
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {selectedTaskType ? (
            <Card className="shadow-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {selectedTaskType.icon}
                    <CardTitle>{selectedTaskType.name}</CardTitle>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setSelectedTaskType(null)}
                  >
                    Change
                  </Button>
                </div>
                <CardDescription>{selectedTaskType.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <AutonomousAgent 
                  agentType={selectedTaskType.agentType}
                  onTaskComplete={handleTaskComplete}
                  onTaskFailed={handleTaskFailed}
                />
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Select Task Type</CardTitle>
                <CardDescription>
                  Choose a task type to begin. The autonomous agent will execute your task without requiring constant supervision.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {taskTypes.map((taskType) => (
                    <Card 
                      key={taskType.id} 
                      className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
                      onClick={() => selectTaskType(taskType)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-primary/10 text-primary mb-2">
                          {taskType.icon}
                        </div>
                        <CardTitle className="text-lg">{taskType.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-sm text-muted-foreground">{taskType.description}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="flex justify-center border-t pt-6">
                <p className="text-sm text-muted-foreground text-center max-w-md">
                  Autonomous agents can continue working on complex tasks without requiring constant interaction. 
                  They'll automatically retry on failures and keep you updated on progress.
                </p>
              </CardFooter>
            </Card>
          )}
        </div>

        <div>
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Recent Tasks</CardTitle>
              <CardDescription>
                View and manage your recent autonomous tasks
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tasks.length > 0 ? (
                <div className="space-y-3">
                  {tasks.slice(0, 5).map((task) => (
                    <div key={task.id} className="flex items-center justify-between border rounded-md p-3">
                      <div>
                        <div className="font-medium truncate max-w-[180px]">{task.description}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge 
                            variant={
                              task.status === 'completed' ? 'default' : 
                              task.status === 'in_progress' ? 'secondary' : 
                              task.status === 'failed' ? 'destructive' : 'outline'
                            }
                            className="text-xs"
                          >
                            {task.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {task.progress}% complete
                          </span>
                        </div>
                      </div>
                      <div>
                        <Button size="sm" variant="ghost">Details</Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <div className="rounded-full bg-primary/10 p-3 mb-3">
                    <Database className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground">No tasks yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Start by creating a new autonomous task
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter className="border-t pt-4">
              <div className="w-full flex justify-between">
                <span className="text-xs text-muted-foreground">
                  {tasks.length} total tasks
                </span>
                {tasks.length > 0 && (
                  <Button variant="link" size="sm" className="px-0">
                    View all
                  </Button>
                )}
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AutonomousAgentPage;