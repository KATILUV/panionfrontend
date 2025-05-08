import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Send, BrainCircuit, Lightbulb, Sparkles, BarChart, MessageSquare, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Spinner } from '@/components/ui/spinner';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useIntelligence } from '@/hooks/use-intelligence';
import { formatDate } from '@/lib/utils';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'agent' | 'system';
  timestamp: number;
  perspectives?: Array<{
    role: string;
    content: string;
  }>;
  confidence?: number;
}

// Helper function to generate a unique ID
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
};

const IntelligentAgent: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      content: "Hello, I'm your Intelligent Agent with advanced reasoning capabilities. I can use internal debate and capability evolution to provide better answers. How can I help you today?",
      role: 'agent',
      timestamp: Date.now()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [activeTab, setActiveTab] = useState('chat');
  const [capabilities, setCapabilities] = useState<string[]>([
    'reasoning', 'web-research', 'data-analysis', 'planning'
  ]);
  const [settings, setSettings] = useState({
    useInternalDebate: true,
    trackCapabilityUsage: true,
    showDebugInfo: false
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  // Initialize intelligence hook
  const {
    isProcessing,
    progress,
    result,
    error,
    processQuery,
    runInternalDebate
  } = useIntelligence({
    autoDebate: settings.useInternalDebate,
    trackCapabilities: settings.trackCapabilityUsage,
    debugMode: settings.showDebugInfo
  });
  
  // Auto-scroll to the latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };
  
  // Handle send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim() || isProcessing) return;
    
    // Add user message
    const userMessageId = generateId();
    const userMessage: Message = {
      id: userMessageId,
      content: inputValue,
      role: 'user',
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    
    // Add a thinking message
    const thinkingMessageId = generateId();
    setMessages(prev => [...prev, {
      id: thinkingMessageId,
      content: 'Thinking...',
      role: 'system',
      timestamp: Date.now()
    }]);
    
    try {
      let responseContent = '';
      let perspectives: Array<{role: string, content: string}> | undefined;
      let confidence: number | undefined;
      
      // Process with internal debate if enabled
      if (settings.useInternalDebate) {
        // Run internal debate
        const debateResult = await runInternalDebate(inputValue);
        
        // Use the debate result
        responseContent = debateResult.result;
        perspectives = debateResult.perspectives;
        confidence = debateResult.confidence;
      } else {
        // Use strategic processing
        const queryResult = await processQuery(inputValue, {
          capabilities,
          useDebate: false
        });
        
        responseContent = queryResult.result;
        confidence = queryResult.confidence;
      }
      
      // Remove thinking message
      setMessages(prev => prev.filter(msg => msg.id !== thinkingMessageId));
      
      // Add agent response
      const agentMessage: Message = {
        id: generateId(),
        content: responseContent,
        role: 'agent',
        timestamp: Date.now(),
        perspectives,
        confidence
      };
      
      setMessages(prev => [...prev, agentMessage]);
      
      // Add debug message if enabled
      if (settings.showDebugInfo && perspectives) {
        const debugMessage: Message = {
          id: generateId(),
          content: `Processed with ${settings.useInternalDebate ? 'internal debate' : 'standard processing'}. Confidence: ${confidence ? (confidence * 100).toFixed(1) + '%' : 'Unknown'}`,
          role: 'system',
          timestamp: Date.now()
        };
        
        setMessages(prev => [...prev, debugMessage]);
      }
    } catch (error: any) {
      // Handle errors
      console.error('Error processing message:', error);
      
      // Remove thinking message
      setMessages(prev => prev.filter(msg => msg.id !== thinkingMessageId));
      
      // Add error message
      const errorMessage: Message = {
        id: generateId(),
        content: `Sorry, I encountered an error while processing your request: ${error.message || 'Unknown error'}`,
        role: 'system',
        timestamp: Date.now()
      };
      
      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: 'Error',
        description: 'Failed to process your request',
        variant: 'destructive'
      });
    }
  };
  
  // Clear chat history
  const clearChat = () => {
    setMessages([{
      id: 'welcome',
      content: "Hello, I'm your Intelligent Agent with advanced reasoning capabilities. I can use internal debate and capability evolution to provide better answers. How can I help you today?",
      role: 'agent',
      timestamp: Date.now()
    }]);
    
    toast({
      title: 'Chat Cleared',
      description: 'All messages have been removed'
    });
  };
  
  // Toggle settings
  const toggleSetting = (setting: keyof typeof settings) => {
    setSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
    
    toast({
      title: `${setting.charAt(0).toUpperCase() + setting.slice(1).replace(/([A-Z])/g, ' $1')}`,
      description: `${!settings[setting] ? 'Enabled' : 'Disabled'}`
    });
  };
  
  // Format the message content with some basic styling
  const formatMessage = (content: string) => {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
      .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
      .replace(/`(.*?)`/g, '<code>$1</code>') // Code
      .split('\n').join('<br />'); // New lines
  };
  
  return (
    <div className="flex flex-col h-full">
      <Tabs defaultValue="chat" value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
        <div className="border-b px-4 py-2">
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <span>Chat</span>
            </TabsTrigger>
            <TabsTrigger value="capabilities" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              <span>Capabilities</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <BrainCircuit className="h-4 w-4" />
              <span>Settings</span>
            </TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="chat" className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div 
                  key={message.id} 
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.role === 'user' 
                        ? 'bg-primary text-primary-foreground' 
                        : message.role === 'system'
                          ? 'bg-muted text-muted-foreground italic text-sm'
                          : 'bg-secondary text-secondary-foreground'
                    }`}
                  >
                    <div 
                      dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
                      className="message-content"
                    />
                    
                    {message.perspectives && message.perspectives.length > 0 && settings.showDebugInfo && (
                      <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-xs font-medium mb-1">Internal Perspectives:</p>
                        <div className="space-y-1">
                          {message.perspectives.slice(0, 3).map((perspective, index) => (
                            <div key={index} className="text-xs">
                              <span className="font-medium">{perspective.role}:</span> {perspective.content.substring(0, 100)}
                              {perspective.content.length > 100 && '...'}
                            </div>
                          ))}
                          {message.perspectives.length > 3 && (
                            <div className="text-xs text-muted-foreground">
                              +{message.perspectives.length - 3} more perspectives
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {message.confidence !== undefined && settings.showDebugInfo && (
                      <div className="mt-1 flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="text-xs mr-1">Confidence:</span>
                          <Progress value={message.confidence * 100} className="w-20 h-2" />
                        </div>
                        <span className="text-xs ml-2">{(message.confidence * 100).toFixed(0)}%</span>
                      </div>
                    )}
                    
                    <div className="text-xs opacity-70 mt-1">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
          
          {isProcessing && (
            <div className="px-4 py-2 border-t">
              <div className="flex items-center gap-2">
                <Spinner size="sm" />
                <span className="text-sm">Processing your request...</span>
                <Progress value={progress} className="flex-1 h-2" />
                <span className="text-xs">{progress}%</span>
              </div>
            </div>
          )}
          
          <div className="p-4 border-t">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Input
                placeholder="Ask me something..."
                value={inputValue}
                onChange={handleInputChange}
                disabled={isProcessing}
                className="flex-1"
              />
              <Button type="submit" disabled={isProcessing || !inputValue.trim()}>
                <Send className="h-4 w-4" />
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={clearChat} 
                disabled={isProcessing || messages.length <= 1}
              >
                <Sparkles className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </TabsContent>
        
        <TabsContent value="capabilities" className="p-4 overflow-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Intelligent Capabilities
              </CardTitle>
              <CardDescription>
                These are the capabilities that power my intelligence
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Core Capabilities</h3>
                  <div className="flex flex-wrap gap-2">
                    {capabilities.map(capability => (
                      <Badge key={capability} variant="secondary">
                        {capability.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Internal Debate System</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    I can internally debate complex questions from multiple perspectives before providing a response.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="col-span-1 bg-muted/50">
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Lightbulb className="h-4 w-4" />
                          Proposer
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <p className="text-xs">Generates initial ideas and approaches</p>
                      </CardContent>
                    </Card>
                    
                    <Card className="col-span-1 bg-muted/50">
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <BarChart className="h-4 w-4" />
                          Synthesizer
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <p className="text-xs">Combines perspectives into a balanced view</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Capability Evolution</h3>
                  <p className="text-sm text-muted-foreground">
                    My capabilities improve over time based on usage patterns and feedback.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="settings" className="p-4 overflow-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BrainCircuit className="h-5 w-5" />
                Intelligence Settings
              </CardTitle>
              <CardDescription>
                Configure how my intelligence features work
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="internal-debate">Internal Debate</Label>
                    <p className="text-sm text-muted-foreground">
                      Consider multiple perspectives before responding
                    </p>
                  </div>
                  <Switch
                    id="internal-debate"
                    checked={settings.useInternalDebate}
                    onCheckedChange={() => toggleSetting('useInternalDebate')}
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="capability-tracking">Capability Tracking</Label>
                    <p className="text-sm text-muted-foreground">
                      Track capability usage to improve over time
                    </p>
                  </div>
                  <Switch
                    id="capability-tracking"
                    checked={settings.trackCapabilityUsage}
                    onCheckedChange={() => toggleSetting('trackCapabilityUsage')}
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="debug-mode">Debug Information</Label>
                    <p className="text-sm text-muted-foreground">
                      Show internal reasoning and confidence scores
                    </p>
                  </div>
                  <Switch
                    id="debug-mode"
                    checked={settings.showDebugInfo}
                    onCheckedChange={() => toggleSetting('showDebugInfo')}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setActiveTab('chat')}>
                Back to Chat
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSettings({
                    useInternalDebate: true,
                    trackCapabilityUsage: true,
                    showDebugInfo: false
                  });
                  
                  toast({
                    title: 'Settings Reset',
                    description: 'All settings have been reset to defaults'
                  });
                }}
              >
                Reset Defaults
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default IntelligentAgent;