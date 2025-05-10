/**
 * Reasoning Paths Component
 * Displays multiple approaches to solving a problem with pros and cons
 */

import React, { useState } from 'react';
import { useReasoningPaths, ReasoningPath } from '@/hooks/useManus';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  GitBranch, 
  RefreshCw, 
  ThumbsUp, 
  ThumbsDown, 
  BarChart, 
  Zap,
  Check,
  Brain
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface ReasoningPathsProps {
  sessionId: string;
  maxHeight?: string;
  onPathSelected?: (path: ReasoningPath) => void;
}

export function ReasoningPaths({
  sessionId,
  maxHeight = '500px',
  onPathSelected
}: ReasoningPathsProps) {
  const { toast } = useToast();
  const [problem, setProblem] = useState('');
  const [numPaths, setNumPaths] = useState(3);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  
  const { 
    generateReasoningPaths, 
    isGenerating, 
    reasoningPaths, 
    error 
  } = useReasoningPaths();

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!problem.trim()) {
      toast({
        title: "Problem description required",
        description: "Please enter a description of the problem you want to solve.",
        variant: "destructive"
      });
      return;
    }

    generateReasoningPaths({ problem, sessionId, numPaths });
    setSelectedPath(null);
  };

  // Handle path selection
  const handleSelectPath = (path: ReasoningPath) => {
    setSelectedPath(path.id);
    if (onPathSelected) {
      onPathSelected(path);
    }
    
    toast({
      title: "Approach selected",
      description: `You've selected: "${path.approach}"`
    });
  };

  return (
    <Card className="w-full h-full overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center">
          <GitBranch className="h-5 w-5 mr-2 text-purple-500" />
          <span>Multiple Reasoning Paths</span>
        </CardTitle>
        <CardDescription>
          Generate different approaches to solving a problem
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {reasoningPaths.length === 0 ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="problem" className="text-sm font-medium">
                Problem Description
              </label>
              <Textarea
                id="problem"
                placeholder="Describe the problem you want to solve..."
                value={problem}
                onChange={e => setProblem(e.target.value)}
                className="resize-none"
                rows={4}
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="numPaths" className="text-sm font-medium flex justify-between">
                <span>Number of approaches</span>
                <span className="text-muted-foreground">{numPaths}</span>
              </label>
              <input
                id="numPaths"
                type="range"
                min={2}
                max={5}
                value={numPaths}
                onChange={e => setNumPaths(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>2</span>
                <span>3</span>
                <span>4</span>
                <span>5</span>
              </div>
            </div>
            
            <Button type="submit" disabled={isGenerating || !problem.trim()}>
              {isGenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Generate Approaches
                </>
              )}
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium">Problem: {problem}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {reasoningPaths.length} different approaches generated
              </p>
            </div>
            
            <Tabs defaultValue={reasoningPaths[0]?.id}>
              <TabsList className="w-full">
                {reasoningPaths.map((path, index) => (
                  <TabsTrigger 
                    key={path.id} 
                    value={path.id}
                    className="flex-1"
                  >
                    Approach {index + 1}
                    {selectedPath === path.id && <Check className="ml-1 h-3 w-3" />}
                  </TabsTrigger>
                ))}
              </TabsList>
              
              <ScrollArea style={{ maxHeight }}>
                {reasoningPaths.map((path) => (
                  <TabsContent key={path.id} value={path.id} className="space-y-4 mt-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">
                          {path.approach}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <p className="text-sm">{path.reasoning}</p>
                        
                        <div className="mt-4 space-y-3">
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="font-medium flex items-center">
                                <BarChart className="h-4 w-4 mr-1 text-amber-500" />
                                Effort Required:
                              </span>
                              <span>{path.estimatedEffort}/10</span>
                            </div>
                            <Progress value={path.estimatedEffort * 10} className="h-2" />
                          </div>
                          
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="font-medium flex items-center">
                                <Zap className="h-4 w-4 mr-1 text-green-500" />
                                Success Probability:
                              </span>
                              <span>{Math.round(path.estimatedSuccess * 100)}%</span>
                            </div>
                            <Progress value={path.estimatedSuccess * 100} className="h-2" />
                          </div>
                          
                          <div className="text-sm">
                            <span className="font-medium flex items-center mb-2">
                              <ThumbsUp className="h-4 w-4 mr-1 text-green-500" />
                              Pros:
                            </span>
                            <ul className="space-y-1 ml-6 list-disc">
                              {path.pros.map((pro, index) => (
                                <li key={index}>{pro}</li>
                              ))}
                            </ul>
                          </div>
                          
                          <div className="text-sm">
                            <span className="font-medium flex items-center mb-2">
                              <ThumbsDown className="h-4 w-4 mr-1 text-red-500" />
                              Cons:
                            </span>
                            <ul className="space-y-1 ml-6 list-disc">
                              {path.cons.map((con, index) => (
                                <li key={index}>{con}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="pt-0">
                        <Button 
                          onClick={() => handleSelectPath(path)}
                          variant={selectedPath === path.id ? "default" : "outline"}
                          className="w-full"
                        >
                          {selectedPath === path.id ? (
                            <>
                              <Check className="h-4 w-4 mr-2" />
                              Selected
                            </>
                          ) : (
                            "Select This Approach"
                          )}
                        </Button>
                      </CardFooter>
                    </Card>
                  </TabsContent>
                ))}
              </ScrollArea>
            </Tabs>
            
            <Button 
              variant="outline" 
              onClick={() => {
                setProblem('');
                setSelectedPath(null);
                // Clear the reasoningPaths by forcing a re-render of the component
                generateReasoningPaths({ problem: '', sessionId, numPaths: 0 });
              }}
            >
              New Problem
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ReasoningPaths;