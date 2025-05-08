import React, { useState, useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Send, RefreshCw, Code, MessageCircle, Zap, Terminal, Settings } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

interface DynamicAgentProps {
  agentId: string;
  name: string;
  description: string;
  capabilities: string[];
  codeInfo?: any;
}

interface Message {
  id: string;
  content: string;
  role: 'user' | 'agent' | 'system';
  timestamp: number;
}

const DynamicAgent: React.FC<DynamicAgentProps> = ({
  agentId,
  name,
  description,
  capabilities,
  codeInfo
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      content: `Hello, I'm ${name}. I'm a specialized agent that can help with: ${capabilities.join(', ')}. How can I assist you today?`,
      role: 'agent',
      timestamp: Date.now()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const [isDebugMode, setIsDebugMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [settings, setSettings] = useState({
    useStrategicMode: true,
    verboseResponses: false,
    maxContextLength: 10
  });
  
  const { toast } = useToast();

  // Auto scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const generateMessageId = () => {
    return Math.random().toString(36).substring(2, 11);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim()) return;
    
    // Add user message
    const userMessage: Message = {
      id: generateMessageId(),
      content: inputValue,
      role: 'user',
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsProcessing(true);
    
    try {
      // First, add a thinking indicator
      const thinkingId = generateMessageId();
      setMessages(prev => [...prev, {
        id: thinkingId,
        content: 'Thinking...',
        role: 'system',
        timestamp: Date.now()
      }]);
      
      // Call the API with strategic mode if enabled
      const response = await fetch('/api/panion/agents/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          agentId,
          message: inputValue,
          capabilities,
          useStrategicMode: settings.useStrategicMode,
          verboseResponses: settings.verboseResponses,
          history: messages
            .filter(m => m.role !== 'system')
            .slice(-settings.maxContextLength)
        })
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Remove the thinking message
      setMessages(prev => prev.filter(msg => msg.id !== thinkingId));
      
      // Add the agent's response
      const agentMessage: Message = {
        id: generateMessageId(),
        content: data.response || "I'm having trouble processing that request. Could you try again?",
        role: 'agent',
        timestamp: Date.now()
      };
      
      setMessages(prev => [...prev, agentMessage]);
      
      // If in debug mode and reasoning is available, show it
      if (isDebugMode && data.reasoning) {
        const debugMessage: Message = {
          id: generateMessageId(),
          content: `💭 Reasoning: ${data.reasoning}`,
          role: 'system',
          timestamp: Date.now()
        };
        
        setMessages(prev => [...prev, debugMessage]);
      }
    } catch (error) {
      console.error('Error processing request:', error);
      toast({
        title: 'Error',
        description: 'Failed to get a response. Please try again later.',
        variant: 'destructive'
      });
      
      // Add error message to chat
      const errorMessage: Message = {
        id: generateMessageId(),
        content: 'I encountered an error while processing your request. Please try again or contact support if the issue persists.',
        role: 'system',
        timestamp: Date.now()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const clearChat = () => {
    const initialMessage: Message = {
      id: 'welcome',
      content: `Hello, I'm ${name}. I'm a specialized agent that can help with: ${capabilities.join(', ')}. How can I assist you today?`,
      role: 'agent',
      timestamp: Date.now()
    };
    
    setMessages([initialMessage]);
    toast({
      title: 'Chat cleared',
      description: 'Chat history has been reset.'
    });
  };

  const toggleDebugMode = () => {
    setIsDebugMode(!isDebugMode);
    toast({
      title: `Debug mode ${!isDebugMode ? 'enabled' : 'disabled'}`,
      description: !isDebugMode 
        ? 'You will now see agent reasoning in the chat.' 
        : 'Agent reasoning will be hidden.'
    });
  };

  // Format message content with markdown-like syntax
  const formatMessage = (content: string) => {
    // Simple formatting
    const formattedContent = content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
      .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
      .replace(/`(.*?)`/g, '<code>$1</code>') // Inline code
      .replace(/\n/g, '<br />'); // New lines
      
    return (
      <div 
        dangerouslySetInnerHTML={{ __html: formattedContent }}
        className="message-content"
      />
    );
  };

  return (
    <div className="flex flex-col h-full">
      <Tabs defaultValue="chat" value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
        <div className="border-b px-4 py-2">
          <TabsList className="grid grid-cols-4">
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Chat</span>
            </TabsTrigger>
            <TabsTrigger value="capabilities" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              <span className="hidden sm:inline">Capabilities</span>
            </TabsTrigger>
            <TabsTrigger value="code" className="flex items-center gap-2">
              <Code className="h-4 w-4" />
              <span className="hidden sm:inline">Code</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
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
                    {formatMessage(message.content)}
                    <div className="text-xs opacity-70 mt-1">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
          
          <div className="p-4 border-t">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                placeholder={`Ask ${name} something...`}
                value={inputValue}
                onChange={handleInputChange}
                disabled={isProcessing}
                className="flex-1"
              />
              <Button type="submit" disabled={isProcessing || !inputValue.trim()}>
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={clearChat} 
                disabled={isProcessing || messages.length <= 1}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant={isDebugMode ? "secondary" : "outline"}
                onClick={toggleDebugMode}
                title="Toggle debug mode"
              >
                <Terminal className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </TabsContent>

        <TabsContent value="capabilities" className="p-4 overflow-auto h-full">
          <Card>
            <CardHeader>
              <CardTitle>{name}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
              <h3 className="text-lg font-medium mb-2">Capabilities</h3>
              <div className="flex flex-wrap gap-2 mb-4">
                {capabilities.map((capability) => (
                  <Badge key={capability} variant="secondary" className="text-sm">
                    {capability}
                  </Badge>
                ))}
              </div>
              <Separator className="my-4" />
              <div className="space-y-2">
                <h3 className="text-lg font-medium">About this agent</h3>
                <p className="text-sm text-muted-foreground">
                  This agent was dynamically created based on your needs. It specializes in 
                  the capabilities listed above and can collaborate with other agents in the system.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Agent ID: <code className="text-xs bg-muted p-1 rounded">{agentId}</code>
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="code" className="p-4 overflow-auto h-full">
          <Card>
            <CardHeader>
              <CardTitle>Agent Code Information</CardTitle>
              <CardDescription>
                The technical implementation details of this agent
              </CardDescription>
            </CardHeader>
            <CardContent>
              {codeInfo ? (
                <pre className="bg-muted p-4 rounded-md text-xs overflow-auto max-h-[400px]">
                  {JSON.stringify(codeInfo, null, 2)}
                </pre>
              ) : (
                <div className="text-muted-foreground italic">
                  No code information available for this agent.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="p-4 overflow-auto h-full">
          <Card>
            <CardHeader>
              <CardTitle>Agent Settings</CardTitle>
              <CardDescription>
                Configure how this agent operates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="strategic-mode" className="text-base">Strategic Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Uses multiple reasoning strategies for complex tasks
                    </p>
                  </div>
                  <Switch 
                    id="strategic-mode" 
                    checked={settings.useStrategicMode}
                    onCheckedChange={(checked) => setSettings({...settings, useStrategicMode: checked})}
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="verbose-mode" className="text-base">Verbose Responses</Label>
                    <p className="text-sm text-muted-foreground">
                      Provides more detailed explanations
                    </p>
                  </div>
                  <Switch 
                    id="verbose-mode" 
                    checked={settings.verboseResponses}
                    onCheckedChange={(checked) => setSettings({...settings, verboseResponses: checked})}
                  />
                </div>
                
                <Separator />
                
                <div>
                  <Label htmlFor="context-length" className="text-base">Context Length</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Number of previous messages to include for context
                  </p>
                  <div className="flex items-center gap-2">
                    <Input 
                      id="context-length"
                      type="number" 
                      min={1}
                      max={20}
                      value={settings.maxContextLength}
                      onChange={(e) => setSettings({
                        ...settings, 
                        maxContextLength: parseInt(e.target.value) || 10
                      })}
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">messages</span>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                variant="outline" 
                onClick={() => setSettings({
                  useStrategicMode: true,
                  verboseResponses: false,
                  maxContextLength: 10
                })}
                className="w-full"
              >
                Reset to Defaults
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DynamicAgent;