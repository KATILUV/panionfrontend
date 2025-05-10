/**
 * Manus Container Component
 * Main container for Manus-like AI capabilities
 */

import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useInsights } from '@/hooks/useManus';
import InsightsPanel from './InsightsPanel';
import TaskDecomposition from './TaskDecomposition';
import ReasoningPaths from './ReasoningPaths';
import Verification from './Verification';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  Lightbulb, 
  SplitSquareVertical, 
  GitBranch, 
  ShieldCheck,
  Bell
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ManusContainerProps {
  sessionId: string;
  className?: string;
}

export function ManusContainer({
  sessionId,
  className = ''
}: ManusContainerProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('insights');
  const { insights, isLoading } = useInsights(sessionId);
  const [newInsightNotification, setNewInsightNotification] = useState(false);
  
  // Check for new insights
  useEffect(() => {
    if (insights.length > 0 && activeTab !== 'insights') {
      setNewInsightNotification(true);
    }
  }, [insights, activeTab]);
  
  // Clear notification when switching to insights tab
  useEffect(() => {
    if (activeTab === 'insights') {
      setNewInsightNotification(false);
    }
  }, [activeTab]);
  
  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardHeader className="pb-0">
        <CardTitle className="flex items-center">
          <Brain className="h-5 w-5 mr-2 text-purple-500" />
          <span>Manus Intelligence</span>
        </CardTitle>
        <CardDescription>
          Advanced AI capabilities with Manus-like intelligence
        </CardDescription>
      </CardHeader>
      
      <CardContent className="p-0 pt-3">
        <Tabs defaultValue="insights" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="insights" className="flex items-center">
              <Lightbulb className="h-4 w-4 mr-2" />
              Insights
              {newInsightNotification && (
                <Badge variant="destructive" className="ml-2 h-5 min-w-5 px-1">
                  <Bell className="h-3 w-3" />
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="tasks" className="flex items-center">
              <SplitSquareVertical className="h-4 w-4 mr-2" />
              Tasks
            </TabsTrigger>
            <TabsTrigger value="reasoning" className="flex items-center">
              <GitBranch className="h-4 w-4 mr-2" />
              Reasoning
            </TabsTrigger>
            <TabsTrigger value="verification" className="flex items-center">
              <ShieldCheck className="h-4 w-4 mr-2" />
              Verify
            </TabsTrigger>
          </TabsList>
          
          <div className="p-4">
            <TabsContent value="insights" className="mt-0">
              <InsightsPanel 
                sessionId={sessionId} 
                onInsightSelected={(insight) => {
                  toast({
                    title: insight.title,
                    description: insight.description
                  });
                }}
              />
            </TabsContent>
            
            <TabsContent value="tasks" className="mt-0">
              <TaskDecomposition 
                sessionId={sessionId}
                onTaskComplete={(task) => {
                  toast({
                    title: "Task completed",
                    description: `Task "${task.goal}" has been completed.`,
                    variant: "success"
                  });
                }}
              />
            </TabsContent>
            
            <TabsContent value="reasoning" className="mt-0">
              <ReasoningPaths 
                sessionId={sessionId}
                onPathSelected={(path) => {
                  toast({
                    title: "Approach selected",
                    description: `You've selected: "${path.approach}"`
                  });
                }}
              />
            </TabsContent>
            
            <TabsContent value="verification" className="mt-0">
              <Verification 
                sessionId={sessionId}
                onCorrection={(correctedResult) => {
                  toast({
                    title: "Correction applied",
                    description: "The result has been improved through metacognitive verification."
                  });
                }}
              />
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default ManusContainer;