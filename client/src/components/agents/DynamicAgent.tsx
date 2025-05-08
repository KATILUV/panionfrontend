import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Settings, Activity, RotateCcw, Cpu } from 'lucide-react';
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

// Helper to generate a random ID
const generateId = () => Math.random().toString(36).substring(2, 9);

// Helper to format timestamp
const formatTime = (date: Date) => {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const DynamicAgent: React.FC<DynamicAgentProps> = ({ 
  agentId, 
  name, 
  description, 
  capabilities 
}) => {
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: generateId(),
      content: `Hello! I'm ${name}, a specialized agent with capabilities for: ${capabilities.join(', ')}. How can I assist you?`,
      isUser: false,
      timestamp: formatTime(new Date()),
    }
  ]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(`session_${agentId}_${Date.now()}`);
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
      // Send message to dynamic agent API
      const response = await fetch(`/api/dynamic-agent/${agentId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputValue,
          sessionId,
          capabilities
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to send message to ${name}`);
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
          <Cpu className="h-5 w-5 mr-2 text-purple-500" />
          <div>
            <h3 className="font-medium">{name}</h3>
            <p className="text-xs text-muted-foreground">{description}</p>
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
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.isUser
                    ? 'bg-purple-500 text-white'
                    : 'bg-muted'
                }`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
                <div className="mt-1 text-xs opacity-70">{message.timestamp}</div>
                
                {/* Thinking display (collapsed by default) */}
                {message.thinking && (
                  <details className="mt-2 text-xs">
                    <summary className="cursor-pointer">View thinking process</summary>
                    <div className="mt-1 p-2 bg-black/20 rounded overflow-x-auto whitespace-pre">
                      {message.thinking}
                    </div>
                  </details>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      
      {/* Input */}
      <div className="border-t p-3">
        <div className="flex gap-2 items-center">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            disabled={isLoading}
          />
          <Button 
            variant="default" 
            size="icon"
            onClick={handleSendMessage}
            disabled={isLoading}
          >
            {isLoading ? (
              <Activity className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default DynamicAgent;