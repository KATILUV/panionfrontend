/**
 * ReasoningPaths Component
 * Generates and displays multiple reasoning approaches for a problem
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { GitBranch, CheckCircle, XCircle, Gauge, BarChart4 } from 'lucide-react';
import { useReasoningPaths, type ReasoningPath } from '@/hooks/usePanionIntelligence';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ReasoningPathsProps {
  sessionId: string;
  onPathSelected?: (path: ReasoningPath) => void;
}

export function ReasoningPaths({ sessionId, onPathSelected }: ReasoningPathsProps) {
  const [problem, setProblem] = useState<string>('');
  const [numPaths, setNumPaths] = useState<number>(3);
  const { reasoningPaths, isGenerating, generateReasoningPaths } = useReasoningPaths();
  
  const handleGenerate = () => {
    if (problem.trim()) {
      generateReasoningPaths({ problem, sessionId, numPaths });
    }
  };
  
  const handlePathClick = (path: ReasoningPath) => {
    if (onPathSelected) {
      onPathSelected(path);
    }
  };
  
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium mb-2">Multiple Reasoning Paths</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Generate and compare different approaches to solve a problem
        </p>
        
        <div className="space-y-4">
          <Textarea
            placeholder="Describe a problem that needs multiple solution approaches..."
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
            className="min-h-[100px]"
          />
          
          <div className="flex items-end gap-4">
            <div className="space-y-2 flex-1">
              <Label htmlFor="num-paths">Number of approaches to generate</Label>
              <Input
                id="num-paths"
                type="number"
                min={1}
                max={5}
                value={numPaths}
                onChange={(e) => setNumPaths(parseInt(e.target.value) || 3)}
              />
            </div>
            
            <Button 
              onClick={handleGenerate} 
              disabled={isGenerating || !problem.trim()}
              className="mb-0.5"
            >
              {isGenerating ? (
                <>
                  <GitBranch className="h-4 w-4 mr-2 animate-pulse" />
                  Generating paths...
                </>
              ) : (
                <>
                  <GitBranch className="h-4 w-4 mr-2" />
                  Generate reasoning paths
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
      
      {isGenerating && reasoningPaths.length === 0 && (
        <div className="space-y-4 mt-6">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          
          <div className="space-y-4 mt-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="mb-4">
                <CardHeader className="pb-2">
                  <Skeleton className="h-6 w-1/2" />
                </CardHeader>
                <CardContent className="py-2">
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
      
      {reasoningPaths.length > 0 && (
        <ScrollArea className="h-[500px] pr-4">
          {reasoningPaths
            .sort((a, b) => b.estimatedSuccess - a.estimatedSuccess)
            .map((path, index) => (
              <Card 
                key={path.id} 
                className="mb-5 hover:bg-accent/20 cursor-pointer transition-colors"
                onClick={() => handlePathClick(path)}
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <Badge variant="outline" className="mb-2">Approach {index + 1}</Badge>
                      <CardTitle className="text-lg">{path.approach}</CardTitle>
                    </div>
                    <Badge 
                      variant={path.estimatedSuccess > 0.7 ? 'default' : 'outline'}
                      className={path.estimatedSuccess > 0.7 ? 'bg-green-100 text-green-800' : ''}
                    >
                      {Math.round(path.estimatedSuccess * 100)}% success rate
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium mb-1">Reasoning</h4>
                      <p className="text-sm">{path.reasoning}</p>
                    </div>
                    
                    <div className="flex gap-8">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium mb-1 flex items-center">
                          <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                          Pros
                        </h4>
                        <ul className="list-disc list-inside text-sm space-y-1">
                          {path.pros.map((pro, i) => (
                            <li key={i}>{pro}</li>
                          ))}
                        </ul>
                      </div>
                      
                      <div className="flex-1">
                        <h4 className="text-sm font-medium mb-1 flex items-center">
                          <XCircle className="h-4 w-4 text-red-500 mr-1" />
                          Cons
                        </h4>
                        <ul className="list-disc list-inside text-sm space-y-1">
                          {path.cons.map((con, i) => (
                            <li key={i}>{con}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-0">
                  <div className="w-full space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Gauge className="h-4 w-4 mr-1 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Effort required:</span>
                      </div>
                      <span className="text-sm font-medium">{path.estimatedEffort}/10</span>
                    </div>
                    <Progress value={path.estimatedEffort * 10} className="h-2" />
                    
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center">
                        <BarChart4 className="h-4 w-4 mr-1 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Success probability:</span>
                      </div>
                      <span className="text-sm font-medium">{Math.round(path.estimatedSuccess * 100)}%</span>
                    </div>
                    <Progress value={path.estimatedSuccess * 100} className="h-2" />
                  </div>
                </CardFooter>
              </Card>
            ))}
        </ScrollArea>
      )}
    </div>
  );
}

export default ReasoningPaths;