/**
 * ManusContainer Component
 * A container component for displaying various Manus-like capabilities
 */

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Grid2X2, Lightbulb, SplitSquareVertical, GitBranch, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { InsightsPanel } from './InsightsPanel';
import { TaskDecomposition } from './TaskDecomposition';
import { ReasoningPaths } from './ReasoningPaths';
import { Verification } from './Verification';
import { type Insight, type ReasoningPath, type ComplexTask, type Verification as VerificationType } from '@/hooks/useManus';

interface ManusContainerProps {
  sessionId: string;
  showHeader?: boolean;
  defaultTab?: 'insights' | 'task-decomposition' | 'reasoning-paths' | 'verification';
  maxHeight?: string;
}

export function ManusContainer({
  sessionId,
  showHeader = true,
  defaultTab = 'insights',
  maxHeight = '700px'
}: ManusContainerProps) {
  const [selectedInsight, setSelectedInsight] = useState<Insight | null>(null);
  const [selectedPath, setSelectedPath] = useState<ReasoningPath | null>(null);
  const [selectedTask, setSelectedTask] = useState<ComplexTask | null>(null);
  const [verification, setVerification] = useState<VerificationType | null>(null);
  
  const handleInsightSelected = (insight: Insight) => {
    setSelectedInsight(insight);
  };
  
  const handlePathSelected = (path: ReasoningPath) => {
    setSelectedPath(path);
  };
  
  const handleTaskComplete = (task: ComplexTask) => {
    setSelectedTask(task);
  };
  
  const handleCorrectedResult = (result: string) => {
    // Handle corrected result if needed
  };
  
  return (
    <div className="w-full">
      {showHeader && (
        <div className="mb-4">
          <h2 className="text-2xl font-bold tracking-tight">Manus Intelligence</h2>
          <p className="text-muted-foreground">
            Proactive reasoning and autonomous task management capabilities
          </p>
        </div>
      )}
      
      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="w-full grid grid-cols-4 mb-4">
          <TabsTrigger value="insights" className="flex items-center justify-center">
            <Lightbulb className="h-4 w-4 mr-2" />
            Insights
          </TabsTrigger>
          <TabsTrigger value="task-decomposition" className="flex items-center justify-center">
            <SplitSquareVertical className="h-4 w-4 mr-2" />
            Task Decomposition
          </TabsTrigger>
          <TabsTrigger value="reasoning-paths" className="flex items-center justify-center">
            <GitBranch className="h-4 w-4 mr-2" />
            Reasoning Paths
          </TabsTrigger>
          <TabsTrigger value="verification" className="flex items-center justify-center">
            <ShieldCheck className="h-4 w-4 mr-2" />
            Verification
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="insights" className="mt-0">
          <InsightsPanel 
            sessionId={sessionId} 
            maxHeight={maxHeight}
            onInsightSelected={handleInsightSelected}
          />
        </TabsContent>
        
        <TabsContent value="task-decomposition" className="mt-0">
          <TaskDecomposition 
            sessionId={sessionId} 
            maxHeight={maxHeight}
          />
        </TabsContent>
        
        <TabsContent value="reasoning-paths" className="mt-0">
          <ReasoningPaths 
            sessionId={sessionId} 
            maxHeight={maxHeight}
            onPathSelected={handlePathSelected}
          />
        </TabsContent>
        
        <TabsContent value="verification" className="mt-0">
          <Verification 
            sessionId={sessionId} 
            maxHeight={maxHeight}
          />
        </TabsContent>
      </Tabs>
      
      {selectedInsight && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <Lightbulb className="h-5 w-5 mr-2 text-amber-500" />
                <span>Selected Insight</span>
              </div>
              <Badge variant="outline">{selectedInsight.category}</Badge>
            </CardTitle>
            <CardDescription>
              Importance: {selectedInsight.importance}/10
            </CardDescription>
          </CardHeader>
          <CardContent>
            <h3 className="text-lg font-semibold">{selectedInsight.title}</h3>
            <p className="mt-2">{selectedInsight.description}</p>
          </CardContent>
        </Card>
      )}
      
      {selectedPath && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="flex items-center">
              <GitBranch className="h-5 w-5 mr-2 text-blue-500" />
              <span>Selected Approach: {selectedPath.approach}</span>
            </CardTitle>
            <CardDescription>
              Success Probability: {Math.round(selectedPath.estimatedSuccess * 100)}% | Effort: {selectedPath.estimatedEffort}/10
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{selectedPath.reasoning}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default ManusContainer;