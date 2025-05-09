import React from 'react';
import { Check, Clock, AlertCircle, ArrowRight, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  currentStage?: string; // ID of the current stage
  orientation?: 'vertical' | 'horizontal';
  showDescription?: boolean;
}

export const TaskTimeline: React.FC<TaskTimelineProps> = ({
  stages,
  currentStage,
  orientation = 'horizontal',
  showDescription = false,
}) => {
  if (!stages || stages.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        No stages available for this task
      </div>
    );
  }

  const getStageIcon = (status: TaskStage['status']) => {
    switch (status) {
      case 'completed':
        return <Check className="h-5 w-5 text-white" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-white animate-pulse" />;
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-white" />;
      case 'skipped':
        return <ArrowRight className="h-5 w-5 text-white" />;
      default:
        return <CheckCircle className="h-5 w-5 text-muted-foreground/40" />;
    }
  };

  const getStageColor = (status: TaskStage['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500 border-green-500';
      case 'in_progress':
        return 'bg-blue-500 border-blue-500';
      case 'failed':
        return 'bg-red-500 border-red-500';
      case 'skipped':
        return 'bg-yellow-500 border-yellow-500';
      default:
        return 'bg-muted border-muted-foreground/25';
    }
  };

  const getStageTextColor = (status: TaskStage['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-500';
      case 'in_progress':
        return 'text-blue-500 font-medium';
      case 'failed':
        return 'text-red-500';
      case 'skipped':
        return 'text-yellow-500';
      default:
        return 'text-muted-foreground';
    }
  };

  const getLineColor = (status: TaskStage['status']) => {
    switch (status) {
      case 'completed':
        return 'border-green-500';
      case 'in_progress':
        return 'border-blue-500';
      case 'failed':
        return 'border-red-500';
      case 'skipped':
        return 'border-yellow-500';
      default:
        return 'border-muted-foreground/25';
    }
  };

  return (
    <div className={cn(
      'grid gap-1',
      orientation === 'vertical' 
        ? 'grid-cols-1' 
        : `grid-cols-${stages.length} md:grid-cols-${stages.length}`
    )}>
      {stages.map((stage, index) => (
        <div 
          key={stage.id} 
          className={cn(
            'flex items-center gap-2',
            orientation === 'vertical' ? 'mb-4' : 'flex-col mb-1'
          )}
        >
          <div className="flex flex-col items-center">
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full border-2',
                getStageColor(stage.status)
              )}
            >
              {getStageIcon(stage.status)}
            </div>
            {index < stages.length - 1 && orientation === 'vertical' && (
              <div className={cn(
                'h-8 w-0 border-l-2 ml-4 my-1',
                getLineColor(stages[index + 1].status)
              )} />
            )}
          </div>

          <div className={cn(
            'flex flex-1',
            orientation === 'vertical' ? 'flex-col' : 'flex-col items-center'
          )}>
            <div className={cn(
              'text-sm font-medium',
              getStageTextColor(stage.status)
            )}>
              {stage.name}
            </div>
            {showDescription && stage.description && (
              <div className="text-xs text-muted-foreground mt-1">
                {stage.description}
              </div>
            )}
            {stage.error && (
              <div className="text-xs text-red-500 mt-1">
                {stage.error}
              </div>
            )}
          </div>

          {index < stages.length - 1 && orientation === 'horizontal' && (
            <div className={cn(
              'hidden md:block h-0 w-full border-t-2 mt-4',
              getLineColor(stages[index + 1].status)
            )} />
          )}
        </div>
      ))}
    </div>
  );
};