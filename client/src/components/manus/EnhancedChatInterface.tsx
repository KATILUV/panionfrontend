/**
 * Enhanced Chat Interface with Manus-like capabilities
 * Provides a more intelligent, proactive chat experience with the Panion system
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Card, 
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Send, 
  Lightbulb,
  Brain,
  Settings,
  Sparkles,
  MessageSquare
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import useManusChat, { ManusChatOptions } from '@/hooks/useManusChat';
import InsightPanel, { 
  Insight,
  SubTask,
  Initiative
} from './InsightPanel';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  thinking?: string | null;
}

interface EnhancedChatInterfaceProps {
  className?: string;
  avatarSrc?: string;
  title?: string;
  description?: string;
  onClose?: () => void;
}

export default function EnhancedChatInterface({
  className = '',
  avatarSrc = '',
  title = 'Panion',
  description = 'Intelligent assistant with enhanced capabilities',
  onClose
}: EnhancedChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId] = useState(`session_${Date.now()}`);
  const [isThinking, setIsThinking] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  
  // Settings
  const [chatMode, setChatMode] = useState<'standard' | 'autonomous'>('standard');
  const [enableProactivity, setEnableProactivity] = useState(true);
  const [showThinking, setShowThinking] = useState(false);
  
  // Insights data
  const [insights, setInsights] = useState<Insight[]>([]);
  const [subtasks, setSubtasks] = useState<SubTask[]>([]);
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [proactivityScore, setProactivityScore] = useState(0);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { chat, isLoading, lastResponse } = useManusChat();
  const { toast } = useToast();
  
  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);
  
  // Handle sending a message
  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsThinking(true);
    
    try {
      // Chat options based on settings
      const options: ManusChatOptions = {
        mode: chatMode,
        enableProactivity,
        sessionId
      };
      
      const response = await chat(input, options);
      
      const assistantMessage: Message = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: response.response,
        timestamp: new Date(),
        thinking: response.thinking
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      // Update Manus capabilities if available
      if (response.manus_capabilities) {
        // Update proactivity score
        if (response.manus_capabilities.proactivity_score !== undefined) {
          setProactivityScore(response.manus_capabilities.proactivity_score);
        }
        
        // Update subtasks
        if (response.manus_capabilities.decomposed_subtasks?.length) {
          setSubtasks(response.manus_capabilities.decomposed_subtasks);
        }
        
        // Update initiatives
        if (response.manus_capabilities.initiative_actions?.length) {
          setInitiatives(response.manus_capabilities.initiative_actions);
          
          // Switch to insights tab if initiatives are available and proactivity is enabled
          if (enableProactivity && activeTab === 'chat') {
            toast({
              title: 'Panion has suggestions',
              description: 'Click on Insights to view suggestions from Panion',
              variant: 'default',
            });
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsThinking(false);
    }
  };
  
  // Handle keydown events (Enter to send)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  // Handle applying a suggestion
  const handleApplySuggestion = (initiative: Initiative) => {
    // Set the input to the initiative description
    setInput(initiative.description);
    // Focus the input
    if (inputRef.current) {
      inputRef.current.focus();
    }
    // Switch to chat tab
    setActiveTab('chat');
    
    toast({
      title: 'Suggestion applied',
      description: 'The suggestion has been added to your input.',
      variant: 'default',
    });
  };
  
  // Handle dismissing an insight
  const handleDismissInsight = (id: string) => {
    setInsights(prev => prev.filter(insight => insight.id !== id));
  };

  return (
    <Card className={`flex flex-col h-full ${className}`}>
      <CardHeader className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Avatar>
              <AvatarImage src={avatarSrc} alt={title} />
              <AvatarFallback>
                <Brain className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </CardHeader>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid grid-cols-3 mx-4">
          <TabsTrigger value="chat" className="flex items-center space-x-2">
            <MessageSquare className="h-4 w-4" />
            <span>Chat</span>
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center space-x-2">
            <Lightbulb className="h-4 w-4" />
            <span>Insights</span>
            {initiatives.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full">
                {initiatives.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </TabsTrigger>
        </TabsList>
        
        <Separator />
        
        <TabsContent value="chat" className="flex-1 flex flex-col p-0 m-0">
          <CardContent className="flex-1 p-4 overflow-hidden">
            <ScrollArea className="h-full pr-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground space-y-2 py-8">
                  <Sparkles className="h-12 w-12 mb-2 text-primary/40" />
                  <p>Start a conversation with enhanced Manus-like capabilities.</p>
                  <p className="text-sm">Autonomous reasoning, proactive assistance, and more.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div key={message.id} className="space-y-2">
                      <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-lg p-3 ${
                          message.role === 'user' 
                            ? 'bg-primary text-primary-foreground ml-auto' 
                            : 'bg-muted'
                        }`}>
                          <div className="whitespace-pre-wrap">{message.content}</div>
                        </div>
                      </div>
                      
                      {/* Show thinking notes if enabled and available */}
                      {showThinking && message.thinking && message.role === 'assistant' && (
                        <div className="ml-4 text-xs text-muted-foreground bg-muted/50 p-2 rounded-md">
                          <div className="font-semibold mb-1 flex items-center">
                            <Brain className="h-3 w-3 mr-1" />
                            <span>Thinking process:</span>
                          </div>
                          <div className="whitespace-pre-wrap">{message.thinking}</div>
                        </div>
                      )}
                      
                      <div className={`text-xs text-muted-foreground ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                  
                  {/* Thinking indicator */}
                  {isThinking && (
                    <div className="flex justify-start">
                      <div className="max-w-[80%] rounded-lg p-3 bg-muted">
                        <div className="flex items-center space-x-2">
                          <div className="animate-pulse h-2 w-2 bg-primary rounded-full"></div>
                          <div className="animate-pulse h-2 w-2 bg-primary rounded-full animation-delay-200"></div>
                          <div className="animate-pulse h-2 w-2 bg-primary rounded-full animation-delay-400"></div>
                          <span className="text-sm text-muted-foreground ml-1">Thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>
          </CardContent>
          
          <CardFooter className="p-4 pt-2">
            <div className="flex w-full space-x-2">
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                className="min-h-[60px] flex-1 resize-none"
                disabled={isLoading}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading}
                className="self-end"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardFooter>
        </TabsContent>
        
        <TabsContent value="insights" className="flex-1 p-0 m-0 flex flex-col">
          <CardContent className="flex-1 p-4 overflow-hidden">
            {(insights.length === 0 && subtasks.length === 0 && initiatives.length === 0) ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground space-y-2">
                <Lightbulb className="h-12 w-12 mb-2 text-yellow-500/40" />
                <p>No insights available yet.</p>
                <p className="text-sm">Continue your conversation to generate insights.</p>
              </div>
            ) : (
              <InsightPanel
                insights={insights}
                subtasks={subtasks}
                initiatives={initiatives}
                proactivityScore={proactivityScore}
                onDismiss={handleDismissInsight}
                onApplyInitiative={handleApplySuggestion}
              />
            )}
          </CardContent>
        </TabsContent>
        
        <TabsContent value="settings" className="p-0 m-0 flex-1">
          <CardContent className="p-4 space-y-6">
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Chat Settings</h3>
              <Separator />
            </div>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="chatMode">Chat Mode</Label>
                <Select value={chatMode} onValueChange={(value: any) => setChatMode(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select chat mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="autonomous">Autonomous (Manus-like)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Autonomous mode enables more proactive, independent reasoning.
                </p>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enableProactivity">Enable Proactivity</Label>
                  <p className="text-xs text-muted-foreground">
                    Allow the system to suggest actions and offer insights.
                  </p>
                </div>
                <Switch
                  id="enableProactivity"
                  checked={enableProactivity}
                  onCheckedChange={setEnableProactivity}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="showThinking">Show Thinking Process</Label>
                  <p className="text-xs text-muted-foreground">
                    Display the reasoning behind responses.
                  </p>
                </div>
                <Switch
                  id="showThinking"
                  checked={showThinking}
                  onCheckedChange={setShowThinking}
                />
              </div>
            </div>
            
            <div className="space-y-2 pt-4">
              <h3 className="text-lg font-medium">System Information</h3>
              <Separator />
              
              <div className="space-y-2 mt-2">
                <div className="flex justify-between text-sm">
                  <span>Session ID:</span>
                  <span className="font-mono text-xs">{sessionId}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span>Messages:</span>
                  <span>{messages.length}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span>Last Response Time:</span>
                  <span>
                    {lastResponse?.metrics?.response_time_ms 
                      ? `${lastResponse.metrics.response_time_ms}ms` 
                      : 'N/A'}
                  </span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span>WebSocket Mode:</span>
                  <Badge variant={lastResponse?.metrics?.websocket_mode === 'active' ? 'default' : 'secondary'}>
                    {lastResponse?.metrics?.websocket_mode || 'Not connected'}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </TabsContent>
      </Tabs>
    </Card>
  );
}