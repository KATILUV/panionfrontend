import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  CheckCircle2, 
  Clock, 
  CircleDot, 
  XCircle as Failed,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TaskStep } from '@/context/TaskContext';
import { ConfidenceIndicator } from './ConfidenceIndicator';

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
  // Skip rendering if no steps provided
  if (!steps || steps.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="p-4">
          <CardTitle className="text-lg">Task Timeline</CardTitle>
        </CardHeader>
        <CardContent className="p-4 flex justify-center items-center h-48">
          <div className="text-center text-muted-foreground">
            <Clock className="h-10 w-10 mx-auto mb-2" />
            <p>No steps available for this task</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Sort steps by their natural position if no explicit order
  const sortedSteps = [...steps].sort((a, b) => {
    // If both have ID in format "step-1", "step-2", etc. sort by number
    const aMatch = a.id.match(/step-(\d+)/);
    const bMatch = b.id.match(/step-(\d+)/);
    
    if (aMatch && bMatch) {
      return parseInt(aMatch[1]) - parseInt(bMatch[1]);
    }
    
    // Otherwise sort by status (completed first, then in_progress, then pending, then failed)
    const statusOrder = {
      'completed': 0,
      'in_progress': 1,
      'pending': 2,
      'failed': 3
    };
    
    return statusOrder[a.status] - statusOrder[b.status];
  });
  
  // Calculate step completion percentage
  const completedSteps = steps.filter(step => step.status === 'completed').length;
  const completionPercentage = steps.length > 0 ? completedSteps / steps.length : 0;
  
  return (
    <Card className={className}>
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Task Timeline</CardTitle>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">
              {completedSteps} of {steps.length} steps completed
            </span>
            <ConfidenceIndicator 
              score={completionPercentage} 
              size="sm" 
              showLabel={false}
              tooltipText="Percentage of completed steps"
            />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 pt-1">
        <div className="relative pt-2">
          {/* Timeline line */}
          <div className="absolute left-5 top-4 bottom-2 w-px bg-muted"></div>
          
          {/* Steps */}
          {sortedSteps.map((step, index) => {
            // Determine icon based on status
            const StepIcon = step.status === 'completed' ? CheckCircle2 :
                          step.status === 'in_progress' ? CircleDot :
                          step.status === 'failed' ? Failed :
                          Clock;
            
            // Determine status color
            const statusColor = step.status === 'completed' ? 'text-green-500' :
                              step.status === 'in_progress' ? 'text-blue-500' :
                              step.status === 'failed' ? 'text-red-500' :
                              'text-muted-foreground';
            
            // Determine whether this is the current step
            const isCurrent = step.id === currentStepId;
            
            return (
              <div 
                key={step.id} 
                className={cn(
                  "relative pl-10 pb-5",
                  isCurrent && "bg-muted/30 py-2 rounded-lg"
                )}
              >
                {/* Status icon */}
                <div className={cn(
                  "absolute left-0 top-0 flex items-center justify-center w-10 h-10",
                  statusColor
                )}>
                  <StepIcon className="h-5 w-5" />
                  
                  {/* Step number */}
                  {showStepNumbers && (
                    <span className="absolute text-xs font-medium">
                      {index + 1}
                    </span>
                  )}
                </div>
                
                {/* Step content */}
                <div>
                  <h3 className={cn(
                    "text-base font-medium flex items-center",
                    isCurrent && "text-primary"
                  )}>
                    {step.description}
                    {isCurrent && (
                      <span className="ml-2 text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                        Current
                      </span>
                    )}
                  </h3>
                  
                  {/* Status text */}
                  <div className="text-sm text-muted-foreground mt-1 flex items-center">
                    <span className={statusColor}>
                      {step.status === 'completed' ? 'Completed' :
                       step.status === 'in_progress' ? 'In Progress' :
                       step.status === 'failed' ? 'Failed' :
                       'Pending'}
                    </span>
                  </div>
                  
                  {/* Output or error */}
                  {(step.output || step.error) && (
                    <div className="mt-2">
                      {step.output && (
                        <div className="text-sm bg-muted/50 p-2 rounded-md whitespace-pre-wrap">
                          {step.output}
                        </div>
                      )}
                      
                      {step.error && (
                        <div className="text-sm bg-red-50 border border-red-200 p-2 rounded-md mt-2 text-red-800 flex items-start">
                          <AlertTriangle className="h-4 w-4 mr-1 mt-0.5 text-red-500 shrink-0" />
                          <span className="whitespace-pre-wrap">{step.error}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default TaskTimeline;