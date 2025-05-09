import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface TaskStage {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  startTime?: Date;
  endTime?: Date;
  progress?: number; // 0-100
  error?: string;
}

interface TaskTimelineProps {
  stages: TaskStage[];
  currentStage?: string;
  showLabels?: boolean;
  compact?: boolean;
  vertical?: boolean;
}

const TaskTimeline: React.FC<TaskTimelineProps> = ({
  stages,
  currentStage,
  showLabels = true,
  compact = false,
  vertical = false,
}) => {
  // Calculate progress percentage for the current stage
  const currentStageIndex = stages.findIndex(stage => stage.id === currentStage);
  const completedStages = stages.filter(stage => stage.status === 'completed').length;
  
  // Calculate overall progress as the number of completed stages + partial progress of current stage
  const calculateOverallProgress = (): number => {
    if (stages.length === 0) return 0;
    
    // Base progress from completed stages
    let progress = (completedStages / stages.length) * 100;
    
    // Add partial progress from current in-progress stage
    if (currentStageIndex >= 0 && stages[currentStageIndex].status === 'in_progress') {
      const currentStageProgress = stages[currentStageIndex].progress || 0;
      const stageWeight = 1 / stages.length;
      progress += (currentStageProgress / 100) * stageWeight * 100;
    }
    
    return Math.min(100, Math.max(0, progress));
  };

  const overallProgress = calculateOverallProgress();

  // Get status color for a stage
  const getStageColor = (stage: TaskStage): string => {
    switch (stage.status) {
      case 'completed':
        return 'bg-green-500';
      case 'in_progress':
        return 'bg-blue-500';
      case 'failed':
        return 'bg-destructive';
      case 'skipped':
        return 'bg-yellow-500';
      default:
        return 'bg-muted';
    }
  };

  // Get status label for a stage
  const getStageStatusLabel = (stage: TaskStage): string => {
    switch (stage.status) {
      case 'completed':
        return 'Completed';
      case 'in_progress':
        return 'In Progress';
      case 'failed':
        return 'Failed';
      case 'skipped':
        return 'Skipped';
      default:
        return 'Pending';
    }
  };

  // Format time difference
  const formatDuration = (startTime?: Date, endTime?: Date): string => {
    if (!startTime) return 'Not started';
    if (!endTime) return 'In progress';
    
    const diffMs = endTime.getTime() - startTime.getTime();
    if (diffMs < 1000) return `${diffMs}ms`;
    if (diffMs < 60000) return `${Math.round(diffMs / 1000)}s`;
    if (diffMs < 3600000) return `${Math.round(diffMs / 60000)}m ${Math.round((diffMs % 60000) / 1000)}s`;
    
    const hours = Math.floor(diffMs / 3600000);
    const minutes = Math.floor((diffMs % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  };

  if (vertical) {
    // Render vertical timeline
    return (
      <Card className="w-full">
        <CardHeader className="py-3">
          <div className="flex justify-between items-center">
            <CardTitle className="text-sm font-medium">Task Progress</CardTitle>
            <Badge variant="outline" className="ml-2">
              {Math.round(overallProgress)}%
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-3">
          <div className="space-y-4">
            {stages.map((stage, index) => (
              <div key={stage.id} className="relative pl-6">
                {/* Connecting line */}
                {index < stages.length - 1 && (
                  <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-muted" />
                )}
                
                {/* Stage indicator */}
                <div className="absolute left-0 top-1">
                  <div className={`w-[22px] h-[22px] rounded-full ${getStageColor(stage)} flex items-center justify-center`}>
                    {stage.status === 'completed' && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {stage.status === 'failed' && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </div>
                </div>
                
                {/* Stage content */}
                <div className="mb-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">{stage.name}</h4>
                    <Badge variant="outline" className="text-xs">
                      {getStageStatusLabel(stage)}
                    </Badge>
                  </div>
                  
                  {!compact && (
                    <>
                      <p className="text-xs text-muted-foreground mt-1">{stage.description}</p>
                      
                      {(stage.startTime || stage.endTime) && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDuration(stage.startTime, stage.endTime)}
                        </p>
                      )}
                      
                      {stage.status === 'in_progress' && stage.progress !== undefined && (
                        <div className="w-full bg-muted h-1 rounded-full mt-2">
                          <div 
                            className="bg-blue-500 h-1 rounded-full" 
                            style={{ width: `${stage.progress}%` }}
                          ></div>
                        </div>
                      )}
                      
                      {stage.status === 'failed' && stage.error && (
                        <p className="text-xs text-destructive mt-1">{stage.error}</p>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render horizontal timeline
  return (
    <Card className="w-full">
      <CardHeader className="py-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-sm font-medium">Task Progress</CardTitle>
          <Badge variant="outline" className="ml-2">
            {Math.round(overallProgress)}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-3">
        <div className="mb-4">
          <div className="flex w-full h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="bg-blue-500 h-full transition-all duration-500 ease-in-out"
              style={{ width: `${overallProgress}%` }}
            ></div>
          </div>
        </div>
        
        <div className="flex w-full relative justify-between">
          {/* Timeline segments */}
          {stages.map((stage, index) => (
            <TooltipProvider key={stage.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex flex-col items-center relative group" style={{ flexBasis: `${100 / stages.length}%` }}>
                    {/* Stage indicator */}
                    <div 
                      className={`w-6 h-6 rounded-full flex items-center justify-center ${getStageColor(stage)}`}
                    >
                      {stage.status === 'completed' && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      {stage.status === 'failed' && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </div>
                    
                    {/* Stage label */}
                    {showLabels && (
                      <span className="text-xs mt-2 text-center font-medium">{stage.name}</span>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[240px] p-3">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <h4 className="font-medium">{stage.name}</h4>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {getStageStatusLabel(stage)}
                      </Badge>
                    </div>
                    <p className="text-xs">{stage.description}</p>
                    
                    {(stage.startTime || stage.endTime) && (
                      <p className="text-xs opacity-70">
                        {formatDuration(stage.startTime, stage.endTime)}
                      </p>
                    )}
                    
                    {stage.status === 'in_progress' && stage.progress !== undefined && (
                      <div className="w-full bg-muted h-1 rounded-full">
                        <div 
                          className="bg-blue-500 h-1 rounded-full" 
                          style={{ width: `${stage.progress}%` }}
                        ></div>
                      </div>
                    )}
                    
                    {stage.status === 'failed' && stage.error && (
                      <p className="text-xs text-destructive">{stage.error}</p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
          
          {/* Connecting line between stages */}
          <div className="absolute top-3 left-0 right-0 h-0.5 bg-muted -z-10"></div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TaskTimeline;