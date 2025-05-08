import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Settings, BrainCircuit, RotateCcw, Activity } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AgentStatus } from './AgentStatus';
import { useAgentStore } from '../../state/agentStore';

interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: string;
  thinking?: string;
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
  SMOKESHOP_DATA: 'smokeshop_data',
};

const PanionChatAgent: React.FC = () => {
  // Access agent store for capability checking and dynamic agent creation
  const hasCapability = useAgentStore(state => state.hasCapability);
  const createDynamicAgent = useAgentStore(state => state.createDynamicAgent);
  const dynamicAgentCreationInProgress = useAgentStore(state => state.dynamicAgentCreationInProgress);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: generateId(),
      content: "Hello! I'm your Panion assistant. How can I help you today?",
      isUser: false,
      timestamp: formatTime(new Date()),
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(`session_${Date.now()}`);
  const [agentStatus, setAgentStatus] = useState<'idle' | 'thinking' | 'active' | 'error'>('idle');
  
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on load
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  
  // Function to detect missing capabilities based on user input
  const detectRequiredCapabilities = (message: string): string[] => {
    const requiredCapabilities: string[] = [];
    const lowerMessage = message.toLowerCase();
    
    // Detect web research capability requirement
    if (
      lowerMessage.includes('search') || 
      lowerMessage.includes('find information') || 
      lowerMessage.includes('look up') ||
      lowerMessage.includes('research')
    ) {
      requiredCapabilities.push(CAPABILITIES.WEB_RESEARCH);
    }
    
    // Detect data analysis capability requirement
    if (
      lowerMessage.includes('analyze') || 
      lowerMessage.includes('data analysis') || 
      lowerMessage.includes('statistics') ||
      lowerMessage.includes('trends')
    ) {
      requiredCapabilities.push(CAPABILITIES.DATA_ANALYSIS);
    }
    
    // Detect business research capability needs
    if (
      lowerMessage.includes('business') || 
      lowerMessage.includes('company') || 
      lowerMessage.includes('industry') ||
      lowerMessage.includes('market')
    ) {
      requiredCapabilities.push(CAPABILITIES.BUSINESS_RESEARCH);
    }
    
    // Detect smokeshop related queries (specific use case)
    if (
      lowerMessage.includes('smokeshop') || 
      lowerMessage.includes('smoke shop') || 
      lowerMessage.includes('dispensary') ||
      lowerMessage.includes('tobacco')
    ) {
      requiredCapabilities.push(CAPABILITIES.SMOKESHOP_DATA);
    }
    
    // Detect contact finding requirements
    if (
      lowerMessage.includes('contact') || 
      lowerMessage.includes('email') || 
      lowerMessage.includes('phone') ||
      lowerMessage.includes('buyer')
    ) {
      requiredCapabilities.push(CAPABILITIES.CONTACT_FINDER);
    }
    
    return requiredCapabilities;
  };
  
  // Function to handle missing capabilities
  const handleMissingCapabilities = async (requiredCapabilities: string[]): Promise<boolean> => {
    // Filter out capabilities that we already have
    const missingCapabilities = requiredCapabilities.filter(cap => !hasCapability(cap));
    
    if (missingCapabilities.length === 0) {
      return false; // No missing capabilities
    }
    
    // Notify the user about creating specialized agents
    const botMessage: ChatMessage = {
      id: generateId(),
      content: `I need to create specialized agent(s) with the following capabilities to help with your request: ${missingCapabilities.join(', ')}. Please wait a moment...`,
      isUser: false,
      timestamp: formatTime(new Date()),
    };
    
    setMessages(prev => [...prev, botMessage]);
    
    try {
      if (missingCapabilities.includes(CAPABILITIES.SMOKESHOP_DATA)) {
        // Create a specialized agent for smokeshop data
        await createDynamicAgent({
          name: 'Smokeshop Research Agent',
          description: 'Specialized agent for finding and analyzing smokeshop business data and contacts.',
          capabilities: [CAPABILITIES.SMOKESHOP_DATA, CAPABILITIES.BUSINESS_RESEARCH, CAPABILITIES.CONTACT_FINDER],
          icon: 'Building'
        });
        
        // Add confirmation message
        const confirmMessage: ChatMessage = {
          id: generateId(),
          content: 'I\'ve created a Smokeshop Research Agent that can help find the buyer contact information you need. It\'s now available in your workspace.',
          isUser: false,
          timestamp: formatTime(new Date()),
        };
        
        setMessages(prev => [...prev, confirmMessage]);
      } else if (missingCapabilities.includes(CAPABILITIES.BUSINESS_RESEARCH)) {
        // Create a business research agent
        await createDynamicAgent({
          name: 'Business Research Agent',
          description: 'Specialized agent for analyzing businesses, markets, and industry trends.',
          capabilities: [CAPABILITIES.BUSINESS_RESEARCH, CAPABILITIES.WEB_RESEARCH],
          icon: 'LineChart'
        });
        
        // Add confirmation message
        const confirmMessage: ChatMessage = {
          id: generateId(),
          content: 'I\'ve created a Business Research Agent to help with your query. It\'s now available in your workspace.',
          isUser: false,
          timestamp: formatTime(new Date()),
        };
        
        setMessages(prev => [...prev, confirmMessage]);
      } else if (missingCapabilities.includes(CAPABILITIES.DATA_ANALYSIS)) {
        // Create a data analysis agent
        await createDynamicAgent({
          name: 'Data Analysis Agent',
          description: 'Specialized agent for analyzing data sets and extracting insights.',
          capabilities: [CAPABILITIES.DATA_ANALYSIS],
          icon: 'BarChart'
        });
        
        // Add confirmation message
        const confirmMessage: ChatMessage = {
          id: generateId(),
          content: 'I\'ve created a Data Analysis Agent to help analyze the information you need. It\'s now available in your workspace.',
          isUser: false,
          timestamp: formatTime(new Date()),
        };
        
        setMessages(prev => [...prev, confirmMessage]);
      } else if (missingCapabilities.includes(CAPABILITIES.WEB_RESEARCH)) {
        // Create a web research agent
        await createDynamicAgent({
          name: 'Web Research Agent',
          description: 'Specialized agent for finding and organizing information from the web.',
          capabilities: [CAPABILITIES.WEB_RESEARCH],
          icon: 'Globe'
        });
        
        // Add confirmation message
        const confirmMessage: ChatMessage = {
          id: generateId(),
          content: 'I\'ve created a Web Research Agent to help find the information you need. It\'s now available in your workspace.',
          isUser: false,
          timestamp: formatTime(new Date()),
        };
        
        setMessages(prev => [...prev, confirmMessage]);
      }
      
      return true; // Successfully created needed agents
    } catch (error) {
      // Add error message
      const errorMessage: ChatMessage = {
        id: generateId(),
        content: 'I encountered a problem while creating the specialized agent. Let me try to help you directly instead.',
        isUser: false,
        timestamp: formatTime(new Date()),
      };
      
      setMessages(prev => [...prev, errorMessage]);
      console.error('Error creating dynamic agent:', error);
      return false;
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    
    // Create user message
    const userMessage: ChatMessage = {
      id: generateId(),
      content: inputValue,
      isUser: true,
      timestamp: formatTime(new Date()),
    };
    
    // Clear input and update messages
    setInputValue('');
    setMessages(prev => [...prev, userMessage]);
    setAgentStatus('thinking');
    setIsLoading(true);
    
    try {
      // Send message to Panion API
      const response = await fetch('/api/panion/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputValue,
          sessionId,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to send message to Panion');
      }
      
      const data = await response.json();
      
      // Create bot message
      const botMessage: ChatMessage = {
        id: generateId(),
        content: data.response,
        isUser: false,
        timestamp: formatTime(new Date()),
        thinking: data.thinking,
      };
      
      // Update messages
      setMessages(prev => [...prev, botMessage]);
      setAgentStatus('active');
      
      // Reset status after a short delay
      setTimeout(() => {
        setAgentStatus('idle');
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
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSendMessage();
    }
  };

  return (
    <Card className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-3">
        <div className="flex items-center">
          <BrainCircuit className="h-5 w-5 mr-2 text-purple-500" />
          <div>
            <h3 className="font-medium">Panion Chat</h3>
            <p className="text-xs text-muted-foreground">Multi-agent assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AgentStatus status={agentStatus} showLabel={false} size="sm" />
          <Button variant="ghost" size="icon" title="Settings">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Messages */}
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`
                  max-w-[80%] rounded-lg p-3
                  ${message.isUser 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted'}
                `}
              >
                {message.thinking && !message.isUser && (
                  <div className="text-xs italic text-muted-foreground mb-1">
                    {message.thinking}
                  </div>
                )}
                <div className="whitespace-pre-wrap">{message.content}</div>
                <div className="text-xs mt-1 opacity-70 text-right">
                  {message.timestamp}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      
      {/* Input */}
      <div className="border-t p-3">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your message..."
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            className="flex-1"
          />
          <Button 
            onClick={handleSendMessage} 
            disabled={isLoading || !inputValue.trim()}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
          <div className="flex items-center">
            <Activity className="h-3 w-3 mr-1" />
            <span>Connected to Panion API</span>
          </div>
          <button 
            className="flex items-center hover:text-foreground transition-colors" 
            onClick={() => {
              setMessages([{
                id: generateId(),
                content: "Hello! I'm your Panion assistant. How can I help you today?",
                isUser: false,
                timestamp: formatTime(new Date()),
              }]);
              setSessionId(`session_${Date.now()}`);
            }}
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            <span>Reset chat</span>
          </button>
        </div>
      </div>
    </Card>
  );
};

export default PanionChatAgent;