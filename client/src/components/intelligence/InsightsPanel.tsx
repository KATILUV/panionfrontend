/**
 * InsightsPanel Component
 * Displays and manages proactive insights from Panion Intelligence
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Lightbulb, RefreshCw, AlertCircle, TrendingUp, Filter } from 'lucide-react';
import { useInsights, type Insight } from '@/hooks/usePanionIntelligence';
import { format } from 'date-fns';

interface InsightsPanelProps {
  sessionId: string;
  onInsightSelected?: (insight: Insight) => void;
}

export function InsightsPanel({ sessionId, onInsightSelected }: InsightsPanelProps) {
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const { insights, isLoading, generateInsights, isGenerating } = useInsights(sessionId);
  
  const filteredInsights = categoryFilter 
    ? insights.filter(insight => insight.category === categoryFilter)
    : insights;
  
  // Get unique categories from insights
  const categoriesSet = new Set<string>();
  insights.forEach(insight => categoriesSet.add(insight.category));
  const categories = Array.from(categoriesSet);
  
  const handleInsightClick = (insight: Insight) => {
    if (onInsightSelected) {
      onInsightSelected(insight);
    }
  };
  
  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'suggestion':
        return <Lightbulb className="h-4 w-4" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4" />;
      case 'opportunity':
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <Lightbulb className="h-4 w-4" />;
    }
  };
  
  const getCategoryColor = (category: string): string => {
    switch (category.toLowerCase()) {
      case 'suggestion':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'warning':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'opportunity':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Loading insights...</h3>
        </div>
        {[1, 2, 3].map((i) => (
          <Card key={i} className="mb-4">
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-1/3 mb-2" />
              <Skeleton className="h-3 w-1/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-3 w-full mb-2" />
              <Skeleton className="h-3 w-full mb-2" />
              <Skeleton className="h-3 w-4/5" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Proactive Insights</h3>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={() => generateInsights()} 
          disabled={isGenerating}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
          {isGenerating ? 'Generating...' : 'Generate'}
        </Button>
      </div>
      
      {categories.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <div className="flex flex-wrap gap-2">
            {categories.map(category => (
              <Badge 
                key={category}
                variant={categoryFilter === category ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setCategoryFilter(categoryFilter === category ? null : category)}
              >
                {getCategoryIcon(category)}
                <span className="ml-1">{category}</span>
              </Badge>
            ))}
          </div>
        </div>
      )}
      
      {filteredInsights.length === 0 ? (
        <div className="text-center p-6">
          <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h4 className="text-lg font-medium mb-2">No insights yet</h4>
          <p className="text-muted-foreground">
            Generate insights to see intelligent recommendations for your project.
          </p>
        </div>
      ) : (
        <ScrollArea className="h-[500px] pr-4">
          {filteredInsights
            .sort((a, b) => b.importance - a.importance)
            .map((insight) => (
              <Card 
                key={insight.id} 
                className="mb-4 hover:bg-accent/20 cursor-pointer transition-colors"
                onClick={() => handleInsightClick(insight)}
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-base">{insight.title}</CardTitle>
                    <Badge className={getCategoryColor(insight.category)}>
                      {insight.category}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    {format(new Date(insight.timestamp), 'PPp')} • Importance: {insight.importance}/10
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{insight.description}</p>
                </CardContent>
                {insight.relatedInsights && insight.relatedInsights.length > 0 && (
                  <CardFooter className="pt-0">
                    <div className="w-full">
                      <Separator className="my-2" />
                      <div className="text-xs text-muted-foreground">
                        Related insights: {insight.relatedInsights.length}
                      </div>
                    </div>
                  </CardFooter>
                )}
              </Card>
            ))}
        </ScrollArea>
      )}
    </div>
  );
}

export default InsightsPanel;