import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  CalendarClock, 
  Clock, 
  Play, 
  Pause, 
  Plus, 
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Trash2,
  FileSpreadsheet,
  Database,
  CheckSquare,
  Cpu
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import {
  useScheduledTaskStore, 
  type ScheduledTask, 
  type TaskPriority, 
  type AgentType,
  initializeTaskProcessor
} from '@/state/scheduledTaskStore';

const priorityColors = {
  'low': 'bg-gray-500/20 text-gray-700',
  'normal': 'bg-blue-500/20 text-blue-700',
  'high': 'bg-yellow-500/20 text-yellow-700',
  'urgent': 'bg-red-500/20 text-red-700'
};

const statusColors = {
  'pending': 'bg-blue-500/20 text-blue-700',
  'running': 'bg-yellow-500/20 text-yellow-700',
  'completed': 'bg-green-500/20 text-green-700',
  'failed': 'bg-red-500/20 text-red-700',
  'cancelled': 'bg-gray-500/20 text-gray-700'
};

const agentIcons: Record<AgentType, React.ReactNode> = {
  'panion': <Cpu className="h-4 w-4" />,
  'daddy_data': <Database className="h-4 w-4" />,
  'research': <FileSpreadsheet className="h-4 w-4" />,
  'analysis': <CheckSquare className="h-4 w-4" />
};

interface TaskFormValues {
  title: string;
  description: string;
  priority: TaskPriority;
  targetAgent: AgentType;
  action: string;
  scheduledTime: string;
  scheduledDate: string;
  parameters: string;
  notifyOnCompletion: boolean;
}

const TaskSchedulerAgent: React.FC = () => {
  const [activeTab, setActiveTab] = useState('active');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formValues, setFormValues] = useState<TaskFormValues>({
    title: '',
    description: '',
    priority: 'normal',
    targetAgent: 'daddy_data',
    action: 'search',
    scheduledTime: '',
    scheduledDate: '',
    parameters: '{}',
    notifyOnCompletion: true
  });
  
  const {
    tasks,
    taskQueue,
    isRunningTasks,
    getTasks,
    toggleTaskExecution,
    addTask,
    updateTask,
    startTask,
    cancelTask,
    removeTask
  } = useScheduledTaskStore();
  
  const { toast } = useToast();
  
  // Initialize task processor on component mount
  useEffect(() => {
    const unsubscribe = initializeTaskProcessor();
    return () => {
      unsubscribe();
    };
  }, []);
  
  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormValues(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle select changes
  const handleSelectChange = (name: string, value: string) => {
    setFormValues(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle switch changes
  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormValues(prev => ({ ...prev, [name]: checked }));
  };
  
  // Calculate scheduled timestamp
  const calculateScheduledTimestamp = (): number | null => {
    if (!formValues.scheduledDate && !formValues.scheduledTime) {
      return null; // Run immediately
    }
    
    const now = new Date();
    const date = formValues.scheduledDate 
      ? new Date(formValues.scheduledDate) 
      : now;
    
    if (formValues.scheduledTime) {
      const [hours, minutes] = formValues.scheduledTime.split(':').map(Number);
      date.setHours(hours, minutes);
    }
    
    return date.getTime();
  };
  
  // Handle form submission
  const handleSubmit = () => {
    try {
      // Validate required fields
      if (!formValues.title || !formValues.targetAgent || !formValues.action) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields",
          variant: "destructive"
        });
        return;
      }
      
      // Parse parameters JSON
      let parsedParameters = {};
      try {
        parsedParameters = JSON.parse(formValues.parameters);
      } catch (error) {
        toast({
          title: "Invalid Parameters",
          description: "Parameters must be valid JSON",
          variant: "destructive"
        });
        return;
      }
      
      // Calculate scheduled timestamp
      const scheduledFor = calculateScheduledTimestamp();
      
      // Add task
      const taskId = addTask({
        title: formValues.title,
        description: formValues.description,
        priority: formValues.priority,
        targetAgent: formValues.targetAgent,
        action: formValues.action,
        parameters: parsedParameters,
        scheduledFor,
        result: null,
        error: null,
        estimatedDuration: null,
        parentTaskId: null,
        notifyOnCompletion: formValues.notifyOnCompletion
      });
      
      toast({
        title: "Task Created",
        description: scheduledFor 
          ? `Task scheduled for ${new Date(scheduledFor).toLocaleString()}` 
          : "Task added to queue"
      });
      
      // Reset form and close dialog
      setFormValues({
        title: '',
        description: '',
        priority: 'normal',
        targetAgent: 'daddy_data',
        action: 'search',
        scheduledTime: '',
        scheduledDate: '',
        parameters: '{}',
        notifyOnCompletion: true
      });
      
      setIsDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create task",
        variant: "destructive"
      });
    }
  };
  
  // Format remaining time
  const formatRemainingTime = (task: ScheduledTask): string => {
    if (task.status !== 'running' || !task.startedAt || !task.estimatedDuration) {
      return 'Unknown';
    }
    
    const elapsedSeconds = (Date.now() - task.startedAt) / 1000;
    const remainingSeconds = task.estimatedDuration - elapsedSeconds;
    
    if (remainingSeconds <= 0) {
      return 'Completing soon...';
    }
    
    if (remainingSeconds < 60) {
      return `${Math.round(remainingSeconds)} seconds`;
    }
    
    if (remainingSeconds < 3600) {
      return `${Math.round(remainingSeconds / 60)} minutes`;
    }
    
    return `${Math.round(remainingSeconds / 3600)} hours`;
  };
  
  // Format scheduled time
  const formatScheduledTime = (timestamp: number | null): string => {
    if (!timestamp) {
      return 'As soon as possible';
    }
    
    return new Date(timestamp).toLocaleString();
  };
  
  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <RefreshCw className="h-4 w-4 text-yellow-500 animate-spin" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'cancelled':
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
      default:
        return null;
    }
  };
  
  // Get filtered tasks based on active tab
  const getFilteredTasks = () => {
    switch (activeTab) {
      case 'active':
        return getTasks({ status: 'running' });
      case 'pending':
        return getTasks({ status: 'pending' });
      case 'completed':
        return getTasks({ status: 'completed' });
      case 'failed':
        return getTasks({ status: 'failed' });
      case 'all':
      default:
        return Object.values(tasks);
    }
  };
  
  const filteredTasks = getFilteredTasks();
  
  // Determine agent-specific actions based on agent type
  const getActionsForAgent = (agentType: AgentType): { value: string; label: string }[] => {
    switch (agentType) {
      case 'daddy_data':
        return [
          { value: 'search', label: 'Search for Businesses' },
          { value: 'verify', label: 'Verify Data' },
          { value: 'organize', label: 'Organize & Export Data' }
        ];
      case 'panion':
        return [
          { value: 'dispatch', label: 'Dispatch Task' },
          { value: 'analyze', label: 'Analyze Data' },
          { value: 'report', label: 'Generate Report' }
        ];
      case 'research':
        return [
          { value: 'search', label: 'Web Research' },
          { value: 'summarize', label: 'Summarize Findings' },
          { value: 'extract', label: 'Extract Data' }
        ];
      case 'analysis':
        return [
          { value: 'analyze', label: 'Analyze Dataset' },
          { value: 'visualize', label: 'Create Visualization' },
          { value: 'predict', label: 'Predictive Analysis' }
        ];
      default:
        return [];
    }
  };
  
  // Generate parameter template based on agent and action
  const generateParameterTemplate = (): string => {
    const { targetAgent, action } = formValues;
    
    switch (targetAgent) {
      case 'daddy_data':
        switch (action) {
          case 'search':
            return JSON.stringify({
              query: "smoke shops",
              location: "New York",
              limit: 20
            }, null, 2);
          case 'verify':
            return JSON.stringify({
              data: [{ id: 1, name: "Example Business", phone: "123-456-7890" }],
              fields_to_verify: ["name", "phone", "address", "website"]
            }, null, 2);
          case 'organize':
            return JSON.stringify({
              data: [{ id: 1, name: "Example Business" }],
              format: "excel",
              structure: "flat"
            }, null, 2);
          default:
            return '{}';
        }
      default:
        return '{}';
    }
  };
  
  useEffect(() => {
    // Update parameter template when agent or action changes
    setFormValues(prev => ({
      ...prev,
      parameters: generateParameterTemplate()
    }));
  }, [formValues.targetAgent, formValues.action]);
  
  return (
    <div className="w-full max-w-7xl mx-auto p-4">
      <div className="flex items-center gap-2 mb-4">
        <CalendarClock className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Task Scheduler</h1>
      </div>
      <p className="text-gray-500 mb-6">
        Schedule and manage autonomous tasks for all agents. Create recurring tasks, monitor progress, and view task history.
      </p>
      
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Switch
            id="auto-execution"
            checked={isRunningTasks}
            onCheckedChange={toggleTaskExecution}
          />
          <Label htmlFor="auto-execution">
            Autonomous Execution {isRunningTasks ? 'Enabled' : 'Disabled'}
          </Label>
          <Badge className={isRunningTasks ? 'bg-green-500/20 text-green-700' : 'bg-red-500/20 text-red-700'}>
            {isRunningTasks ? 'Active' : 'Paused'}
          </Badge>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Task
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
              <DialogDescription>
                Schedule a task to be executed automatically by the system.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="title">Task Title</Label>
                  <Input
                    id="title"
                    name="title"
                    value={formValues.title}
                    onChange={handleInputChange}
                    placeholder="E.g., Research smoke shops in New York"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="targetAgent">Target Agent</Label>
                  <Select
                    value={formValues.targetAgent}
                    onValueChange={(value) => handleSelectChange('targetAgent', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select agent" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daddy_data">Daddy Data Agent</SelectItem>
                      <SelectItem value="panion">Panion</SelectItem>
                      <SelectItem value="research">Research Agent</SelectItem>
                      <SelectItem value="analysis">Analysis Agent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="action">Action</Label>
                  <Select
                    value={formValues.action}
                    onValueChange={(value) => handleSelectChange('action', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select action" />
                    </SelectTrigger>
                    <SelectContent>
                      {getActionsForAgent(formValues.targetAgent as AgentType).map(action => (
                        <SelectItem key={action.value} value={action.value}>
                          {action.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={formValues.priority}
                    onValueChange={(value) => handleSelectChange('priority', value as TaskPriority)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="notification">Notification</Label>
                  <div className="flex items-center gap-2 pt-2">
                    <Switch
                      id="notification"
                      checked={formValues.notifyOnCompletion}
                      onCheckedChange={(checked) => handleSwitchChange('notifyOnCompletion', checked)}
                    />
                    <Label htmlFor="notification">
                      Notify on completion
                    </Label>
                  </div>
                </div>
                
                <div className="col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formValues.description}
                    onChange={handleInputChange}
                    placeholder="Additional details about the task"
                    rows={2}
                  />
                </div>
                
                <div>
                  <Label htmlFor="scheduledDate">Scheduled Date (Optional)</Label>
                  <Input
                    id="scheduledDate"
                    name="scheduledDate"
                    type="date"
                    value={formValues.scheduledDate}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div>
                  <Label htmlFor="scheduledTime">Scheduled Time (Optional)</Label>
                  <Input
                    id="scheduledTime"
                    name="scheduledTime"
                    type="time"
                    value={formValues.scheduledTime}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="col-span-2">
                  <Label htmlFor="parameters">Parameters (JSON)</Label>
                  <Textarea
                    id="parameters"
                    name="parameters"
                    value={formValues.parameters}
                    onChange={handleInputChange}
                    placeholder="{}"
                    rows={6}
                    className="font-mono"
                  />
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit}>
                Schedule Task
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <Card>
        <CardHeader>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-5">
              <TabsTrigger value="active" className="flex items-center gap-2">
                <Play className="h-4 w-4" />
                Active
              </TabsTrigger>
              <TabsTrigger value="pending" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Pending
              </TabsTrigger>
              <TabsTrigger value="completed" className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Completed
              </TabsTrigger>
              <TabsTrigger value="failed" className="flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                Failed
              </TabsTrigger>
              <TabsTrigger value="all" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                All
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12">
              <CalendarClock className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No Tasks</h3>
              <p className="text-muted-foreground mt-2">
                {activeTab === 'all' 
                  ? "You haven't created any tasks yet. Click 'New Task' to get started." 
                  : `No ${activeTab} tasks available.`}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell>
                        <div className="font-medium">{task.title}</div>
                        <div className="text-sm text-muted-foreground">{task.action}</div>
                        <Badge variant="outline" className={`mt-1 text-xs ${priorityColors[task.priority]}`}>
                          {task.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {agentIcons[task.targetAgent]}
                          <span>{task.targetAgent === 'daddy_data' ? 'Daddy Data' : task.targetAgent}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(task.status)}
                          <Badge className={statusColors[task.status]}>
                            {task.status}
                          </Badge>
                        </div>
                        {task.status === 'running' && (
                          <div className="text-xs text-muted-foreground mt-1">
                            EST: {formatRemainingTime(task)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatScheduledTime(task.scheduledFor)}
                        </div>
                        {task.startedAt && (
                          <div className="text-xs text-muted-foreground">
                            Started: {new Date(task.startedAt).toLocaleString()}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="w-[150px]">
                          <Progress value={task.progress} className="h-2" />
                          <div className="text-xs text-muted-foreground mt-1">
                            {task.progress}%
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {task.status === 'pending' && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => startTask(task.id)}
                              title="Start Now"
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
                          
                          {(task.status === 'pending' || task.status === 'running') && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => cancelTask(task.id)}
                              title="Cancel"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          )}
                          
                          {(task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled') && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => removeTask(task.id)}
                              title="Remove"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="text-sm text-muted-foreground">
            {filteredTasks.length} tasks
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              className="gap-2"
              onClick={() => setActiveTab('all')}
            >
              <Calendar className="h-4 w-4" />
              View All
            </Button>
            <Button 
              variant={isRunningTasks ? "destructive" : "default"} 
              size="sm"
              className="gap-2"
              onClick={toggleTaskExecution}
            >
              {isRunningTasks ? (
                <>
                  <Pause className="h-4 w-4" />
                  Pause Execution
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Resume Execution
                </>
              )}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default TaskSchedulerAgent;