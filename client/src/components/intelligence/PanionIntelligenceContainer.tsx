/**
 * PanionIntelligenceContainer Component
 * A container component for displaying Panion's enhanced intelligence capabilities
 */

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Grid2X2, Lightbulb, SplitSquareVertical, GitBranch, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import InsightsPanel from './InsightsPanel';
import TaskDecomposition from './TaskDecomposition';
import ReasoningPaths from './ReasoningPaths';
import Verification from './Verification';
import { 
  type Insight, 
  type ReasoningPath, 
  type ComplexTask, 
  type Verification as VerificationType 
} from '@/hooks/usePanionIntelligence';

interface PanionIntelligenceContainerProps {
  sessionId: string;
  showHeader?: boolean;
  defaultTab?: 'insights' | 'task-decomposition' | 'reasoning-paths' | 'verification';
  maxHeight?: string;
}

export function PanionIntelligenceContainer({
  sessionId,
  showHeader = true,
  defaultTab = 'insights',
  maxHeight = '700px'
}: PanionIntelligenceContainerProps) {
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
          <h2 className="text-2xl font-bold tracking-tight">Panion Intelligence</h2>
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
            Task Breakdown
          </TabsTrigger>
          <TabsTrigger value="reasoning-paths" className="flex items-center justify-center">
            <GitBranch className="h-4 w-4 mr-2" />
            Reasoning
          </TabsTrigger>
          <TabsTrigger value="verification" className="flex items-center justify-center">
            <ShieldCheck className="h-4 w-4 mr-2" />
            Verification
          </TabsTrigger>
        </TabsList>
        
        <div style={{ maxHeight, overflowY: 'auto' }} className="pr-1">
          <TabsContent value="insights" className="mt-0">
            <Card>
              <CardContent className="pt-6">
                <InsightsPanel 
                  sessionId={sessionId} 
                  onInsightSelected={handleInsightSelected} 
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="task-decomposition" className="mt-0">
            <Card>
              <CardContent className="pt-6">
                <TaskDecomposition 
                  sessionId={sessionId} 
                  onTaskComplete={handleTaskComplete} 
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="reasoning-paths" className="mt-0">
            <Card>
              <CardContent className="pt-6">
                <ReasoningPaths 
                  sessionId={sessionId} 
                  onPathSelected={handlePathSelected} 
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="verification" className="mt-0">
            <Card>
              <CardContent className="pt-6">
                <Verification 
                  sessionId={sessionId} 
                  onCorrectedResult={handleCorrectedResult} 
                />
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

export default PanionIntelligenceContainer;