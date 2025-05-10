/**
 * Manus-like Insight Panel
 * Displays proactive insights and suggestions from the enhanced Panion system
 */

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Lightbulb,
  XCircle,
  ChevronRight,
  Brain,
  Zap,
  Check,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface Insight {
  id: string;
  type: string;
  content: string;
  confidence: number;
}

export interface SubTask {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

export interface Initiative {
  id: string;
  description: string;
  reasoning: string;
}

interface InsightPanelProps {
  insights: Insight[];
  subtasks?: SubTask[];
  initiatives?: Initiative[];
  proactivityScore?: number;
  onDismiss?: (id: string) => void;
  onApplyInitiative?: (initiative: Initiative) => void;
}

export default function InsightPanel({
  insights = [],
  subtasks = [],
  initiatives = [],
  proactivityScore = 0,
  onDismiss,
  onApplyInitiative,
}: InsightPanelProps) {
  const [selectedInsightId, setSelectedInsightId] = useState<string | null>(
    null
  );

  // Get the selected insight
  const selectedInsight = insights.find(
    (insight) => insight.id === selectedInsightId
  );

  // Format confidence level for display
  const getConfidenceLevel = (confidence: number) => {
    if (confidence >= 0.9) return "Very High";
    if (confidence >= 0.7) return "High";
    if (confidence >= 0.5) return "Medium";
    if (confidence >= 0.3) return "Low";
    return "Very Low";
  };

  // Get color based on confidence
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return "bg-green-500";
    if (confidence >= 0.7) return "bg-green-400";
    if (confidence >= 0.5) return "bg-yellow-400";
    if (confidence >= 0.3) return "bg-orange-400";
    return "bg-red-400";
  };

  if (insights.length === 0 && subtasks.length === 0 && initiatives.length === 0) {
    return null;
  }

  return (
    <Card className="w-full max-w-sm bg-card border shadow-md">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Brain className="mr-2 h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Manus Insights</CardTitle>
          </div>
          {proactivityScore > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center">
                    <Zap className="h-4 w-4 text-yellow-500 mr-1" />
                    <span className="text-sm font-medium">
                      {Math.round(proactivityScore * 100)}%
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Proactivity Score: {Math.round(proactivityScore * 100)}%</p>
                  <p className="text-xs text-muted-foreground">
                    Higher score indicates more autonomous behavior
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <CardDescription>
          Proactive assistance based on your conversation
        </CardDescription>
      </CardHeader>

      <Separator />

      <CardContent className="pt-4">
        <ScrollArea className="h-[220px]">
          {/* Subtasks Section */}
          {subtasks.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold mb-2">Decomposed Subtasks</h4>
              <div className="space-y-2">
                {subtasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start space-x-2 text-sm"
                  >
                    <div className="mt-0.5">
                      {task.status === 'completed' ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div>
                      <p>{task.description}</p>
                      <Badge variant={task.status === 'completed' ? "outline" : "secondary"} className="mt-1 text-xs">
                        {task.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Initiative Actions Section */}
          {initiatives.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold mb-2">Suggested Actions</h4>
              <div className="space-y-3">
                {initiatives.map((initiative) => (
                  <div
                    key={initiative.id}
                    className="bg-muted/50 rounded-md p-2 text-sm"
                  >
                    <p className="font-medium">{initiative.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {initiative.reasoning}
                    </p>
                    {onApplyInitiative && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 h-7 text-xs"
                        onClick={() => onApplyInitiative(initiative)}
                      >
                        Apply Suggestion
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Insights Section */}
          {insights.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2">System Insights</h4>
              <div className="space-y-2">
                {insights.map((insight) => (
                  <div
                    key={insight.id}
                    className="flex items-start space-x-2 bg-muted/30 rounded-md p-2 text-sm"
                  >
                    <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <div className="font-medium capitalize">{insight.type}</div>
                        <div className="flex items-center space-x-1">
                          <div
                            className={`h-2 w-2 rounded-full ${getConfidenceColor(
                              insight.confidence
                            )}`}
                          />
                          <span className="text-xs text-muted-foreground">
                            {getConfidenceLevel(insight.confidence)}
                          </span>
                        </div>
                      </div>
                      <p className="mt-1">{insight.content}</p>
                      {onDismiss && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-1 h-6 p-0"
                          onClick={() => onDismiss(insight.id)}
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          <span className="text-xs">Dismiss</span>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ScrollArea>
      </CardContent>

      <CardFooter className="flex justify-end pt-2">
        <Button variant="ghost" size="sm" className="text-xs">
          Learn More About Manus
        </Button>
      </CardFooter>
    </Card>
  );
}