import React, { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AgentStatus } from '@/components/agents/AgentStatus';
import { ChatMessageComponent } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ChatMessage, AgentStatusType } from '@/types/chat';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Settings, BrainCircuit } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  inputValue: string;
  setInputValue: (value: string) => void;
  isLoading: boolean;
  agentStatus: AgentStatusType;
  processingStage?: string | null;
  processingProgress?: number;
  strategicMode?: boolean;
  toggleStrategicMode?: (value?: boolean) => void;
  sendMessage: (message: string) => void;
  onImageUpload?: (file: File) => Promise<void>;
  messagesEndRef?: React.RefObject<HTMLDivElement>;
  inputRef?: React.RefObject<HTMLInputElement>;
  title?: string;
  subtitle?: string;
  showSettings?: boolean;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  inputValue,
  setInputValue,
  isLoading,
  agentStatus,
  processingStage = null,
  processingProgress = 0,
  strategicMode = false,
  toggleStrategicMode,
  sendMessage,
  onImageUpload,
  messagesEndRef,
  inputRef,
  title = "Panion",
  subtitle = "Main Hub",
  showSettings = true,
}) => {
  const [showThinking, setShowThinking] = useState(false);
  
  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      sendMessage(inputValue);
    }
  };
  
  return (
    <Card className="flex flex-col h-full border-none shadow-none rounded-none relative overflow-hidden bg-card/50 backdrop-blur-sm">
      {/* Top Bar */}
      <div className="flex items-center p-2 border-b gap-2">
        <div className="flex items-center gap-2 flex-1">
          <AgentStatus status={agentStatus} />
          <span className="font-semibold">{title}</span>
          <Badge variant="outline" className="text-xs bg-background/50">
            {subtitle}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Thinking Toggle */}
          <div className="flex items-center gap-1">
            <Switch 
              id="thinking-toggle"
              checked={showThinking}
              onCheckedChange={(checked) => setShowThinking(checked)}
              className="data-[state=checked]:bg-blue-500"
            />
            <Label htmlFor="thinking-toggle" className="text-xs">Thinking</Label>
          </div>
          
          {/* Settings Button (if enabled) */}
          {showSettings && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Settings className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-60 p-4">
                <h4 className="font-medium mb-2">Agent Settings</h4>
                
                {/* Strategic Mode Toggle */}
                {toggleStrategicMode && (
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <BrainCircuit className="h-4 w-4" />
                      <Label htmlFor="strategic-mode" className="text-sm">Strategic Mode</Label>
                    </div>
                    <Switch 
                      id="strategic-mode"
                      checked={strategicMode}
                      onCheckedChange={toggleStrategicMode}
                    />
                  </div>
                )}
                
                {/* Other settings can be added here */}
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>
      
      {/* Progress indicator */}
      {isLoading && processingProgress > 0 && (
        <div className="w-full bg-muted/30">
          <Progress value={processingProgress} className="h-1" />
          {processingStage && (
            <div className="px-2 py-1 text-xs text-center text-muted-foreground">
              {processingStage}
            </div>
          )}
        </div>
      )}
      
      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="flex flex-col">
          {messages.map((message) => (
            <ChatMessageComponent
              key={message.id}
              message={message}
              showThinking={showThinking}
              toggleThinking={() => setShowThinking(!showThinking)}
            />
          ))}
          
          {/* Element for scrolling to bottom */}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      
      {/* Chat Input */}
      <div className="p-2 border-t">
        <form onSubmit={handleSubmit}>
          <ChatInput
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleSubmit}
            isLoading={isLoading}
            placeholder="Type your message..."
            strategicMode={strategicMode}
            toggleStrategicMode={toggleStrategicMode ? () => toggleStrategicMode() : undefined}
            inputRef={inputRef}
            onImageUpload={onImageUpload}
          />
        </form>
      </div>
    </Card>
  );
};