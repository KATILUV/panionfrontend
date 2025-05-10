/**
 * ReasoningPaths Component
 * Displays multiple reasoning approaches for solving a problem
 */

import React, { useState } from 'react';
import { useReasoningPaths, type ReasoningPath } from '@/hooks/useManus';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Lightbulb, CheckCircle2, XCircle, AlertTriangle, RefreshCw, Brain, Calculator, ChevronRight, ArrowRightLeft } from 'lucide-react';

interface ReasoningPathsProps {
  sessionId: string;
  onPathSelected?: (path: ReasoningPath) => void;
  maxHeight?: string;
}

export function ReasoningPaths({
  sessionId,
  onPathSelected,
  maxHeight = '600px'
}: ReasoningPathsProps) {
  const [problem, setProblem] = useState<string>('');
  const [activePathId, setActivePathId] = useState<string | null>(null);
  const [numPaths, setNumPaths] = useState<number>(3);
  
  const {
    reasoningPaths,
    isGenerating,
    error,
    generateReasoningPaths
  } = useReasoningPaths();
  
  const handleGeneratePaths = () => {
    if (!problem.trim()) return;
    
    generateReasoningPaths({
      problem,
      sessionId,
      numPaths
    });
  };
  
  const handlePathSelect = (path: ReasoningPath) => {
    setActivePathId(path.id);
    if (onPathSelected) {
      onPathSelected(path);
    }
  };
  
  return (
    <Card className="w-full h-full overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Brain className="h-5 w-5 mr-2 text-blue-500" />
          <span>Multiple Reasoning Paths</span>
        </CardTitle>
        <CardDescription>
          Generate different approaches to solve complex problems
        </CardDescription>
      </CardHeader>
      
      <CardContent className="px-4 pb-0">
        <div className="space-y-4">
          <div>
            <Textarea
              placeholder="Describe the problem you want to solve..."
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              className="resize-none min-h-[100px]"
              disabled={isGenerating}
            />
          </div>
          
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              Generate <span className="font-semibold">{numPaths}</span> different approaches
            </div>
            <div className="flex items-center space-x-2">
              {[2, 3, 4, 5].map(num => (
                <Button
                  key={num}
                  variant={numPaths === num ? "default" : "outline"}
                  size="sm"
                  onClick={() => setNumPaths(num)}
                  disabled={isGenerating}
                >
                  {num}
                </Button>
              ))}
            </div>
          </div>
          
          <Button
            className="w-full"
            onClick={handleGeneratePaths}
            disabled={!problem.trim() || isGenerating}
          >
            {isGenerating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Generate Reasoning Paths
              </>
            )}
          </Button>
        </div>
      </CardContent>
      
      <CardContent className="px-4 pb-4 pt-4">
        {isGenerating ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-36 w-full" />
            <Skeleton className="h-36 w-full" />
          </div>
        ) : error ? (
          <div className="p-4 text-center text-red-500">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p>Failed to generate reasoning paths</p>
            <Button 
              variant="outline"
              className="mt-2"
              onClick={handleGeneratePaths}
            >
              Try Again
            </Button>
          </div>
        ) : reasoningPaths.length > 0 ? (
          <ScrollArea style={{ maxHeight }}>
            <Tabs defaultValue={reasoningPaths[0]?.id}>
              <TabsList className="w-full h-auto flex mb-4 overflow-x-auto justify-start">
                {reasoningPaths.map((path: ReasoningPath, index: number) => (
                  <TabsTrigger
                    key={path.id}
                    value={path.id}
                    className="flex-shrink-0"
                    onClick={() => handlePathSelect(path)}
                  >
                    <span className="mr-1">Path {index + 1}</span>
                    <Progress 
                      value={path.estimatedSuccess * 100} 
                      className="h-1 w-10 ml-1"
                    />
                  </TabsTrigger>
                ))}
              </TabsList>
              
              {reasoningPaths.map((path: ReasoningPath) => (
                <TabsContent 
                  key={path.id} 
                  value={path.id}
                  className="mt-0"
                >
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center">
                        <Lightbulb className="h-5 w-5 mr-2 text-amber-500" />
                        {path.approach}
                      </CardTitle>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <div className="flex items-center">
                          <Calculator className="h-4 w-4 mr-1" />
                          <span>Success: {Math.round(path.estimatedSuccess * 100)}%</span>
                        </div>
                        <div>
                          <span>Effort: {path.estimatedEffort}/10</span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium mb-1">Reasoning</h4>
                        <p className="text-sm text-muted-foreground">{path.reasoning}</p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-sm font-medium mb-1 flex items-center">
                            <CheckCircle2 className="h-4 w-4 mr-1 text-green-500" />
                            Pros
                          </h4>
                          <ul className="space-y-1">
                            {path.pros.map((pro: string, index: number) => (
                              <li key={index} className="text-sm text-muted-foreground flex">
                                <ChevronRight className="h-4 w-4 mr-1 mt-0.5 flex-shrink-0" />
                                <span>{pro}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        <div>
                          <h4 className="text-sm font-medium mb-1 flex items-center">
                            <XCircle className="h-4 w-4 mr-1 text-red-500" />
                            Cons
                          </h4>
                          <ul className="space-y-1">
                            {path.cons.map((con: string, index: number) => (
                              <li key={index} className="text-sm text-muted-foreground flex">
                                <ChevronRight className="h-4 w-4 mr-1 mt-0.5 flex-shrink-0" />
                                <span>{con}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              ))}
            </Tabs>
          </ScrollArea>
        ) : problem.trim() ? (
          <div className="p-8 text-center text-muted-foreground">
            <Lightbulb className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
            <p>Click "Generate Reasoning Paths" to see different approaches</p>
          </div>
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            <Brain className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
            <p>Enter a problem to generate multiple reasoning paths</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ReasoningPaths;