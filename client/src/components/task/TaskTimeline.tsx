import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckIcon, XIcon, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TaskStep } from '@/context/TaskContext';

interface TaskTimelineProps {
  steps: TaskStep[];
  currentStepId?: string;
  className?: string;
  showStepNumbers?: boolean;
}

const TaskTimeline: React.FC<TaskTimelineProps> = ({
  steps,
  currentStepId,
  className,
  showStepNumbers = true
}) => {
  // Find the index of the current step
  const currentStepIndex = currentStepId
    ? steps.findIndex(step => step.id === currentStepId)
    : steps.findIndex(step => step.status === 'in_progress');
  
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="bg-muted/20 p-4">
        <CardTitle className="text-md">Task Progress</CardTitle>
        <CardDescription>
          {currentStepIndex >= 0 
            ? `Step ${currentStepIndex + 1} of ${steps.length}`
            : 'Task not started'
          }
        </CardDescription>
      </CardHeader>
      
      <CardContent className="p-4">
        <div className="space-y-6">
          {steps.map((step, index) => {
            // Determine the status icon
            let StatusIcon = Clock;
            let statusColor = "text-muted-foreground";
            let bgColor = "bg-muted";
            let lineColor = "bg-muted";
            
            if (step.status === 'completed') {
              StatusIcon = CheckIcon;
              statusColor = "text-green-500";
              bgColor = "bg-green-100";
              lineColor = "bg-green-500";
            } else if (step.status === 'failed') {
              StatusIcon = XIcon;
              statusColor = "text-red-500";
              bgColor = "bg-red-100";
              lineColor = "bg-red-500";
            } else if (step.status === 'in_progress') {
              StatusIcon = Clock;
              statusColor = "text-blue-500";
              bgColor = "bg-blue-100";
              lineColor = "bg-blue-300";
            } else if (index < currentStepIndex) {
              // Steps that should have been processed but weren't marked as completed or failed
              StatusIcon = AlertCircle;
              statusColor = "text-yellow-500";
              bgColor = "bg-yellow-100";
              lineColor = "bg-yellow-500";
            }
            
            return (
              <div key={step.id} className="relative">
                {/* Connecting line */}
                {index < steps.length - 1 && (
                  <div className={cn("absolute left-5 top-8 w-[2px] h-[calc(100%-32px)]", lineColor)} />
                )}
                
                <div className="flex items-start gap-4 relative">
                  {/* Status icon */}
                  <div className={cn("flex-shrink-0 rounded-full w-10 h-10 flex items-center justify-center", bgColor)}>
                    <StatusIcon className={cn("h-5 w-5", statusColor)} />
                    {showStepNumbers && (
                      <span className="absolute -top-1 -right-1 h-5 w-5 bg-white border border-muted-foreground/30 rounded-full text-xs flex items-center justify-center">
                        {index + 1}
                      </span>
                    )}
                  </div>
                  
                  {/* Step content */}
                  <div className="flex-1 space-y-1">
                    <div className="font-medium">{step.description}</div>
                    {step.output && (
                      <div className="text-sm text-muted-foreground line-clamp-2">{step.output}</div>
                    )}
                    {step.error && (
                      <div className="text-sm text-red-500">{step.error}</div>
                    )}
                    {step.status === 'in_progress' && (
                      <div className="text-sm text-blue-500 flex items-center gap-1">
                        <span className="inline-block h-2 w-2 bg-blue-500 rounded-full animate-pulse"></span>
                        <span>In progress...</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          
          {steps.length === 0 && (
            <div className="text-center py-4 text-muted-foreground">
              No steps defined for this task
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TaskTimeline;