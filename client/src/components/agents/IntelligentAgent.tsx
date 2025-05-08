import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { v4 as uuidv4 } from 'uuid';
import { useIntelligence } from '@/hooks/use-intelligence';
import { useToast } from '@/hooks/use-toast';
import { processStrategicQuery } from '@/services/strategicService';
import { getAvailableDebateRoles, getInternalDeliberation } from '@/lib/internalDebate';
import { 
  updateCapabilityStats, 
  getCapabilityStats, 
  trackCapabilityUse,
  getEvolvingCapabilities
} from '@/lib/capabilityEvolution';

interface CapabilityStats {
  id: string;
  name: string;
  stats: {
    strength: number;
  }
}

interface Perspective {
  role: string;
  content: string;
}

const IntelligentAgent: React.FC = () => {
  const { toast } = useToast();
  const intelligence = useIntelligence();
  
  const [query, setQuery] = useState('');
  const [thinking, setThinking] = useState('');
  const [result, setResult] = useState('');
  const [activeTab, setActiveTab] = useState('input');
  const [confidence, setConfidence] = useState(0);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [usedStrategies, setUsedStrategies] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [complexityThreshold, setComplexityThreshold] = useState(70);
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>([]);
  const [availableCapabilities, setAvailableCapabilities] = useState<CapabilityStats[]>([]);
  
  // Load available capabilities on mount
  useEffect(() => {
    const loadCapabilities = async () => {
      const capabilities = await getEvolvingCapabilities();
      setAvailableCapabilities(capabilities);
    };
    
    loadCapabilities();
  }, []);
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) {
      toast({
        title: "Empty query",
        description: "Please enter a question or request.",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    setThinking('Analyzing your query...');
    setActiveTab('thinking');
    
    try {
      // First, assess complexity to determine if we should use strategic mode
      const queryComplexity = await intelligence.assessComplexity(query);
      const useStrategicMode = queryComplexity > complexityThreshold;
      
      setThinking(prev => `${prev}\n\nQuery complexity score: ${queryComplexity}/100`);
      
      if (useStrategicMode) {
        // For complex queries, use the strategic service with internal debate
        setThinking(prev => `${prev}\n\nThis is a complex query. Activating strategic mode with multi-perspective analysis...`);
        
        // Track the capabilities being used
        selectedCapabilities.forEach(capId => {
          trackCapabilityUse(capId);
        });
        
        const startTime = performance.now();
        
        // Use internal debate to generate multiple perspectives
        const deliberation = await getInternalDeliberation(query, selectedCapabilities);
        
        setThinking(prev => `${prev}\n\nPerspectives generated:\n${deliberation.perspectives.map(p => 
          `- ${p.role}: ${p.content}`).join('\n')}`);
        
        // Process the query with the strategic service
        const response = await processStrategicQuery({
          query,
          useDebate: true,
          requiredCapabilities: selectedCapabilities,
          maxTokens: 2000
        });
        
        const endTime = performance.now();
        setExecutionTime(endTime - startTime);
        setConfidence(response.confidence * 100);
        setResult(response.result);
        setUsedStrategies(response.usedCapabilities || []);
        
        // Update capability stats based on result
        selectedCapabilities.forEach(capId => {
          updateCapabilityStats(capId, {
            uses: 1,
            successRate: response.confidence,
            responseTime: (endTime - startTime) / 1000
          });
        });
        
        setActiveTab('result');
      } else {
        // For simpler queries, use the regular intelligence service
        setThinking(prev => `${prev}\n\nThis is a standard query. Using direct processing...`);
        
        const startTime = performance.now();
        const response = await intelligence.generateResponse(query);
        const endTime = performance.now();
        
        setExecutionTime(endTime - startTime);
        setConfidence(85); // Default confidence for simple queries
        setResult(response);
        setUsedStrategies(['natural-language-understanding']);
        
        setActiveTab('result');
      }
    } catch (error) {
      console.error('Error processing query:', error);
      setResult('I encountered an error while processing your request. Please try again.');
      setActiveTab('result');
      toast({
        title: "Processing Error",
        description: "An error occurred while processing your request.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCapabilityToggle = (capabilityId: string) => {
    setSelectedCapabilities(prev => 
      prev.includes(capabilityId)
        ? prev.filter(id => id !== capabilityId)
        : [...prev, capabilityId]
    );
  };
  
  const handleClear = () => {
    setQuery('');
    setThinking('');
    setResult('');
    setActiveTab('input');
    setConfidence(0);
    setExecutionTime(null);
    setUsedStrategies([]);
  };
  
  return (
    <div className="flex flex-col h-full p-4 bg-background">
      <div className="mb-4">
        <h2 className="text-2xl font-bold">Intelligent Agent</h2>
        <p className="text-muted-foreground">Enhanced reasoning with multi-strategy intelligence</p>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="flex justify-between items-center mb-2">
          <TabsList>
            <TabsTrigger value="input">Input</TabsTrigger>
            <TabsTrigger value="thinking">Thinking</TabsTrigger>
            <TabsTrigger value="result">Result</TabsTrigger>
            <TabsTrigger value="capabilities">Capabilities</TabsTrigger>
          </TabsList>
          
          <div className="flex gap-2">
            {isLoading && <Badge variant="outline" className="bg-yellow-100">Processing...</Badge>}
            {confidence > 0 && <Badge variant="outline" className="bg-blue-100">Confidence: {confidence.toFixed(0)}%</Badge>}
            {executionTime && <Badge variant="outline" className="bg-green-100">Time: {(executionTime / 1000).toFixed(2)}s</Badge>}
          </div>
        </div>
        
        <TabsContent value="input" className="flex-1 flex flex-col">
          <Card className="flex-1 flex flex-col">
            <CardHeader>
              <CardTitle>Ask a Question</CardTitle>
              <CardDescription>
                Enter your question or request. For complex queries, the agent will use multiple reasoning strategies.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <form onSubmit={handleSubmit} className="flex flex-col h-full">
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="complexity-threshold" className="text-sm font-medium">
                      Complexity Threshold: {complexityThreshold}
                    </label>
                    <span className="text-xs text-muted-foreground">
                      Higher = use strategic mode less often
                    </span>
                  </div>
                  <Slider
                    id="complexity-threshold"
                    min={0}
                    max={100}
                    step={5}
                    value={[complexityThreshold]}
                    onValueChange={(value) => setComplexityThreshold(value[0])}
                    className="mb-6"
                  />
                </div>
                
                <div className="flex-1">
                  <textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="What would you like to know or analyze?"
                    className="w-full h-full min-h-[200px] p-4 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </form>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={handleClear} disabled={isLoading}>
                Clear
              </Button>
              <Button onClick={handleSubmit} disabled={isLoading || !query.trim()}>
                Process
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="thinking" className="flex-1">
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle>Thinking Process</CardTitle>
              <CardDescription>
                Observe how the agent reasons through your query
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <ScrollArea className="h-full">
                <pre className="whitespace-pre-wrap font-mono text-sm p-4 bg-slate-50 rounded">
                  {thinking || 'No thinking process to display yet.'}
                </pre>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="result" className="flex-1">
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle>Result</CardTitle>
              <CardDescription>
                The agent's response to your query
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <ScrollArea className="h-full">
                <div className="space-y-4">
                  {usedStrategies.length > 0 && (
                    <div className="mb-2">
                      <p className="text-sm font-medium mb-1">Strategies used:</p>
                      <div className="flex flex-wrap gap-1">
                        {usedStrategies.map(strategy => (
                          <Badge key={strategy} variant="secondary" className="mr-1">
                            {strategy}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  <Separator />
                  <div className="prose">
                    {result || 'No result to display yet.'}
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="capabilities" className="flex-1">
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle>Agent Capabilities</CardTitle>
              <CardDescription>
                Select specialized capabilities to use for processing
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <ScrollArea className="h-full">
                <div className="space-y-4">
                  {availableCapabilities.map(capability => (
                    <div 
                      key={capability.id} 
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedCapabilities.includes(capability.id) 
                          ? 'bg-primary/10 border-primary' 
                          : 'hover:bg-slate-50'
                      }`}
                      onClick={() => handleCapabilityToggle(capability.id)}
                    >
                      <div className="flex justify-between items-center">
                        <h3 className="font-medium">{capability.name}</h3>
                        <Badge variant="outline">
                          Strength: {capability.stats.strength.toFixed(1)}
                        </Badge>
                      </div>
                      <div className="mt-2 w-full bg-slate-200 rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{ width: `${Math.min(100, capability.stats.strength)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  
                  {availableCapabilities.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No specialized capabilities available yet.</p>
                      <p className="text-sm mt-2">Capabilities will evolve as you use the system.</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
            <CardFooter>
              <div className="text-sm text-muted-foreground">
                Selected: {selectedCapabilities.length} capabilities
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default IntelligentAgent;