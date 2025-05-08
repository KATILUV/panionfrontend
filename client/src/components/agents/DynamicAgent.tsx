import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Settings, BrainCircuit, Activity } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AgentStatus } from './AgentStatus';

interface DynamicAgentProps {
  agentId: string;
  name: string;
  description: string;
  capabilities: string[];
  codeInfo?: any;
}

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

const DynamicAgent: React.FC<DynamicAgentProps> = ({ 
  agentId, 
  name, 
  description, 
  capabilities 
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: generateId(),
      content: `Hello! I'm ${name}, a dynamically created agent with the following capabilities: ${capabilities.join(', ')}. ${description}`,
      isUser: false,
      timestamp: formatTime(new Date()),
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(`dynamic_session_${Date.now()}`);
  const [agentStatus, setAgentStatus] = useState<'idle' | 'thinking' | 'active' | 'error'>('idle');
  
  const { toast } = useToast();
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on load
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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
      // Send message to dynamic agent endpoint
      const response = await fetch(`/api/dynamic-agent/${agentId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputValue,
          sessionId,
          capabilities,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to communicate with dynamic agent');
      }
      
      const data = await response.json();
      
      // Create bot message
      const botMessage: ChatMessage = {
        id: generateId(),
        content: data.response || "I'm sorry, I couldn't process that request.",
        isUser: false,
        timestamp: formatTime(new Date()),
        thinking: data.thinking,
      };
      
      // Update messages
      setMessages(prev => [...prev, botMessage]);
      setAgentStatus('idle');
    } catch (error) {
      console.error('Error communicating with agent:', error);
      
      // Create error message
      const errorMessage: ChatMessage = {
        id: generateId(),
        content: "I'm having trouble processing your request right now. Please try again later.",
        isUser: false,
        timestamp: formatTime(new Date()),
      };
      
      setMessages(prev => [...prev, errorMessage]);
      setAgentStatus('error');
      
      toast({
        title: 'Communication Error',
        description: 'Failed to communicate with the agent. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Card className="flex flex-col h-full w-full overflow-hidden bg-card">
      <div className="flex-none p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BrainCircuit className="h-5 w-5 text-purple-500" />
          <h2 className="text-xl font-semibold">{name}</h2>
          <AgentStatus status={agentStatus} />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <Activity className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <ScrollArea className="flex-grow p-4 pb-0">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.isUser ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.isUser
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
                {message.thinking && (
                  <div className="mt-2 text-xs opacity-70 border-t pt-1">
                    <details>
                      <summary>View thinking process</summary>
                      <div className="whitespace-pre-wrap mt-1">
                        {message.thinking}
                      </div>
                    </details>
                  </div>
                )}
                <div className="text-xs opacity-70 text-right mt-1">
                  {message.timestamp}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      
      <div className="flex-none p-4 border-t mt-auto">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={isLoading}
            className="flex-grow"
          />
          <Button 
            onClick={handleSendMessage} 
            disabled={isLoading || !inputValue.trim()}
            variant="default"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default DynamicAgent;