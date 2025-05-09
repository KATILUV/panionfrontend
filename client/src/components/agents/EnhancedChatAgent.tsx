import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Settings, BrainCircuit, RotateCcw, Activity, HelpCircle, Search, Database, ZapIcon, Lightbulb, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AgentStatus } from './AgentStatus';
import { useAgentStore } from '@/state/agentStore';
import { Spinner } from '@/components/ui/spinner';
import { useIntelligence } from '@/hooks/use-intelligence';
import { useDebate } from '@/hooks/use-debate';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: string;
  thinking?: string;
  component?: React.ReactNode;
}

// Helper function to generate a random ID
const generateId = () => Math.random().toString(36).substring(2, 9);

// Helper function to format timestamp
const formatTime = (date: Date) => {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Define common capability types for better organization
const CAPABILITIES = {
  WEB_RESEARCH: 'web_research',
  DATA_ANALYSIS: 'data_analysis',
  CONTACT_FINDER: 'contact_finder',
  BUSINESS_RESEARCH: 'business_research',
  BUSINESS_DIRECTORY: 'business_directory',
};

const EnhancedChatAgent: React.FC = () => {
  // AgentStore state
  const isStrategicModeEnabled = useAgentStore(state => state.isStrategicModeEnabled);
  const toggleStrategicMode = useAgentStore(state => state.toggleStrategicMode);
  
  // Local state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: generateId(),
      content: "Hello! I'm your Panion assistant. I can help with your tasks directly or delegate to specialized agents when needed. How can I help you today?",
      isUser: false,
      timestamp: formatTime(new Date()),
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(`session_${Date.now()}`);
  const [agentStatus, setAgentStatus] = useState<'idle' | 'thinking' | 'active' | 'error'>('idle');
  const [processingStage, setProcessingStage] = useState<string | null>(null);
  const [showThinking, setShowThinking] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  
  // Use our custom hooks
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { checkAndProcessWithDebate } = useDebate();
  
  // Strategic mode is controlled by the global store
  const strategicMode = isStrategicModeEnabled;
  
  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Start animated progress
  const startProgressAnimation = () => {
    let progress = 0;
    setProcessingProgress(0);
    
    const interval = setInterval(() => {
      progress += Math.random() * 5;
      if (progress > 90) progress = 90; // Cap at 90% until complete
      setProcessingProgress(progress);
    }, 300);
    
    return interval;
  };
  
  // Helper function to check if we need more information from the user
  const checkIfNeedsMoreInfo = (message: string): string | null => {
    const lowerMessage = message.toLowerCase();
    
    // Check for vague queries that need more details
    if (lowerMessage.includes('find') && lowerMessage.length < 15) {
      return "I'd like to help you find that. Could you provide more details about what specific information you're looking for?";
    }
    
    // For smoke shop research, ask for specific location if not provided
    if ((lowerMessage.includes('smoke shop') || lowerMessage.includes('smokeshop')) && 
        !lowerMessage.includes('in ') && !lowerMessage.includes('near') && !lowerMessage.includes('around')) {
      return "I can help research smoke shops. Could you specify which city or location you're interested in?";
    }
    
    // For data analysis, check if data source is specified
    if (lowerMessage.includes('analyze') && !lowerMessage.includes('data from') && !lowerMessage.includes('dataset')) {
      return "I'd be happy to help with data analysis. Could you specify which dataset or data source you'd like me to analyze?";
    }
    
    return null;
  };
  
  // Function to detect tasks that would benefit from strategic mode
  const shouldUseStrategicMode = (message: string): boolean => {
    const lowerMessage = message.toLowerCase();
    
    // Task complexity indicators
    const hasComplexityIndicators = [
      'compare', 'multi', 'complex', 'comprehensive', 'thorough', 'detailed', 'in-depth',
      'analyze', 'research', 'evaluate', 'assess', 'investigate',
      'different sources', 'multiple perspectives', 'alternative approach', 'various methods',
      'accurate', 'validate', 'verify', 'confirm', 'ensure',
      'strategy', 'strategic', 'optimize', 'plan', 'step by step',
      'market', 'competitor', 'industry', 'business',
      'smart', 'intelligent', 'advanced', 'multi-step', 'planning', 'structured', 'organized'
    ].some(indicator => lowerMessage.includes(indicator));
    
    // Calculate complexity based on message length and indicators
    const isLongMessage = message.length > 100;
    const isVeryLongMessage = message.length > 200;
    
    // Direct triggers for strategic planning
    const strategicPlanningTriggers = [
      'use strategic', 
      'strategic mode',
      'think strategically',
      'need multiple approaches',
      'compare different',
      'analyze in depth'
    ];
    
    // Check for direct triggers
    const hasDirectTrigger = strategicPlanningTriggers.some(trigger => 
      lowerMessage.includes(trigger)
    );
    
    // Return true if we have complexity indicators and long message, or direct trigger
    return (hasComplexityIndicators && isLongMessage) || hasDirectTrigger || isVeryLongMessage;
  };
  
  // Handler for sending a message
  const handleSendMessage = async (message: string) => {
    // Don't send empty messages
    if (!message.trim()) return;
    
    const inputValue = message.trim();
    const progressInterval = startProgressAnimation();
    
    setIsLoading(true);
    setAgentStatus('thinking');
    
    try {
      // Add user message to chat
      const userMessage: ChatMessage = {
        id: generateId(),
        content: inputValue,
        isUser: true,
        timestamp: formatTime(new Date()),
      };
      
      setMessages(prev => [...prev, userMessage]);
      setInputValue(''); // Clear input
      
      // Check if the message requires more information before processing
      const moreInfoNeeded = checkIfNeedsMoreInfo(inputValue);
      if (moreInfoNeeded) {
        const clarificationMessage: ChatMessage = {
          id: generateId(),
          content: moreInfoNeeded,
          isUser: false,
          timestamp: formatTime(new Date()),
        };
        
        setMessages(prev => [...prev, clarificationMessage]);
        setAgentStatus('idle');
        setIsLoading(false);
        clearInterval(progressInterval);
        return;
      }
      
      // Check if we should use strategic mode
      const shouldUseStrategy = strategicMode || shouldUseStrategicMode(inputValue);
      
      if (strategicMode !== shouldUseStrategy) {
        // Update strategic mode state if auto-detection enabled it
        toggleStrategicMode(shouldUseStrategy);
        
        if (shouldUseStrategy) {
          // Let user know we're switching to strategic mode
          const strategicModeMessage: ChatMessage = {
            id: generateId(),
            content: `I'll use strategic planning mode for this complex task to provide a more comprehensive analysis.`,
            isUser: false,
            timestamp: formatTime(new Date()),
          };
          
          setMessages(prev => [...prev, strategicModeMessage]);
        }
      }
      
      setProcessingStage("Detecting capabilities...");
      setProcessingProgress(10);
      
      // Get the last few messages for context
      const recentMessages = messages
        .slice(-5)
        .map(m => m.content)
        .join("\n");
      
      // Check if this is a complex question that should use the debate system
      let useDebate = false;
      let responseContent = '';
      let thinkingContent = '';
      
      if (!shouldUseStrategy) {
        setProcessingStage("Analyzing query complexity...");
        
        // Try to use the debate system for enhanced responses
        const debateResult = await checkAndProcessWithDebate(inputValue, recentMessages);
        
        if (debateResult.shouldUseDebate && debateResult.content) {
          useDebate = true;
          responseContent = debateResult.content;
          thinkingContent = debateResult.thinking || '';
          setProcessingStage("Using enhanced multi-agent debate system...");
        }
      }
      
      // Prepare for standard API call if not using debate system
      if (!useDebate) {
        setProcessingStage("Preparing standard request...");
        
        // Determine required capabilities for the task
        const capabilitiesResponse = await fetch('/api/panion/detect-capabilities', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message: inputValue }),
        });
        
        if (!capabilitiesResponse.ok) {
          throw new Error('Failed to detect required capabilities');
        }
        
        const capabilitiesData = await capabilitiesResponse.json();
        const requiredCapabilities = capabilitiesData.capabilities || [];
        
        console.log('Detected capabilities:', requiredCapabilities);
        
        // Determine endpoint based on mode
        let endpoint = '/api/panion/chat';
        let requestBody = {};
        
        if (shouldUseStrategy) {
          endpoint = '/api/strategic/analyze';
          requestBody = {
            goal: inputValue,
            parameters: {
              sessionId,
              compare_strategies: true,
              use_reflection: true,
              max_attempts: 3
            }
          };
        } else {
          requestBody = {
            content: inputValue,
            sessionId,
            capabilities: requiredCapabilities,
          };
        }
        
        setProcessingStage("Processing your request...");
        setProcessingProgress(50);
        
        // Make the API call
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });
        
        if (!response.ok) {
          throw new Error(`Failed to process message: ${response.statusText}`);
        }
        
        setProcessingStage("Formatting response...");
        setProcessingProgress(80);
        
        const data = await response.json();
        
        // Extract the response content
        responseContent = data.response || data.message || "I received your message, but I'm not sure how to respond.";
        thinkingContent = data.thinking || '';
        
        // For strategic mode, add additional context to thinking content
        if (shouldUseStrategy && data.strategies) {
          thinkingContent += "\n\n**Strategic Analysis:**\n";
          
          // Add strategies information
          data.strategies.forEach((strategy: any, index: number) => {
            thinkingContent += `\n**Strategy ${index + 1}: ${strategy.name}**\n`;
            thinkingContent += `- Approach: ${strategy.approach || 'Not specified'}\n`;
            thinkingContent += `- Success: ${strategy.success ? '✓' : '✗'}\n`;
            if (strategy.reasoning) {
              thinkingContent += `- Reasoning: ${strategy.reasoning}\n`;
            }
          });
        }
      }
      
      // Create bot message with the response
      const botMessage: ChatMessage = {
        id: generateId(),
        content: responseContent,
        isUser: false,
        timestamp: formatTime(new Date()),
        thinking: thinkingContent,
      };
      
      // Update messages
      setMessages(prev => [...prev, botMessage]);
      setAgentStatus('active');
      setProcessingProgress(100);
      
      // Reset status after a short delay
      setTimeout(() => {
        setAgentStatus('idle');
        setProcessingStage(null);
      }, 2000);
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive',
      });
      setAgentStatus('error');
    } finally {
      clearInterval(progressInterval);
      setIsLoading(false);
    }
  };
  
  // Handle form submission
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (inputValue.trim() && !isLoading) {
      handleSendMessage(inputValue);
    }
  };
  
  // Render the component
  return (
    <Card className="flex flex-col h-full border-none shadow-none rounded-none relative overflow-hidden bg-card/50 backdrop-blur-sm">
      {/* Top Bar */}
      <div className="flex items-center p-2 border-b gap-2">
        <div className="flex items-center gap-2 flex-1">
          <AgentStatus status={agentStatus} />
          <span className="font-semibold">Panion</span>
          <Badge variant="outline" className="text-xs bg-background/50">
            Main Hub
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Switch 
                  id="thinking-toggle"
                  checked={showThinking}
                  onCheckedChange={setShowThinking}
                  className="data-[state=checked]:bg-blue-500"
                />
              </TooltipTrigger>
              <TooltipContent>
                Show thinking process
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <Label htmlFor="thinking-toggle" className="text-xs cursor-pointer select-none">
            Thinking
          </Label>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Switch 
                  id="strategic-toggle"
                  checked={strategicMode}
                  onCheckedChange={toggleStrategicMode}
                  className="data-[state=checked]:bg-purple-500"
                />
              </TooltipTrigger>
              <TooltipContent>
                Enable strategic mode for complex tasks
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <Label htmlFor="strategic-toggle" className="text-xs cursor-pointer select-none">
            Strategic
          </Label>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <Settings className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-2">
                <h4 className="font-medium">Settings</h4>
                <div className="flex items-center justify-between">
                  <Label htmlFor="strategic-threshold">Strategic Threshold</Label>
                  <div className="flex items-center gap-2">
                    <BrainCircuit className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">70%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Label>Model</Label>
                  <Badge variant="outline" className="text-xs">Enhanced GPT</Badge>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      
      {/* Status Indicator */}
      {processingStage && (
        <div className="absolute top-12 inset-x-0 bg-background/70 backdrop-blur-sm border-b z-10 p-2">
          <div className="flex items-center gap-2">
            <Spinner size="sm" />
            <span className="text-sm">{processingStage}</span>
            <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${processingProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div 
              key={message.id} 
              className={`flex flex-col ${message.isUser ? 'items-end' : 'items-start'}`}
            >
              <div 
                className={`max-w-[85%] ${
                  message.isUser 
                    ? 'bg-primary text-primary-foreground rounded-tl-lg rounded-tr-lg rounded-bl-lg' 
                    : 'bg-muted rounded-tl-lg rounded-tr-lg rounded-br-lg'
                } p-3`}
              >
                {message.content ? (
                  <div className="prose prose-sm dark:prose-invert">
                    {message.content.split('\n').map((line, i) => (
                      <React.Fragment key={i}>
                        {line}
                        {i < message.content.split('\n').length - 1 && <br />}
                      </React.Fragment>
                    ))}
                  </div>
                ) : (
                  message.component
                )}
              </div>
              
              {/* Thinking process display (only for agent messages) */}
              {showThinking && !message.isUser && message.thinking && (
                <div className="mt-2 p-3 bg-zinc-900/30 text-xs rounded-md w-full max-w-[85%] font-mono overflow-x-auto">
                  {message.thinking.split('\n').map((line, i) => (
                    <React.Fragment key={i}>
                      {line}
                      {i < message.thinking!.split('\n').length - 1 && <br />}
                    </React.Fragment>
                  ))}
                </div>
              )}
              
              <div className="text-xs text-muted-foreground mt-1">
                {message.timestamp}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      
      {/* Input Area */}
      <div className="p-3 border-t mt-auto">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type a message..."
            disabled={isLoading}
            ref={inputRef}
            className="flex-1"
          />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  type="submit" 
                  size="icon" 
                  disabled={isLoading || !inputValue.trim()} 
                  className={strategicMode ? 'bg-purple-600 hover:bg-purple-700' : ''}
                >
                  {isLoading ? (
                    <Spinner />
                  ) : strategicMode ? (
                    <Sparkles className="h-4 w-4" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {strategicMode ? 'Send with strategic processing' : 'Send message'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </form>
      </div>
    </Card>
  );
};

export default EnhancedChatAgent;