import React from 'react';
import { ChatMessage as ChatMessageType } from '@/types/chat';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';

interface ChatMessageProps {
  message: ChatMessageType;
  showThinking: boolean;
  toggleThinking: () => void;
}

export const ChatMessageComponent: React.FC<ChatMessageProps> = ({
  message,
  showThinking,
  toggleThinking
}) => {
  const { content, isUser, timestamp, thinking, component } = message;
  
  return (
    <div className={cn(
      "flex w-full mb-4",
      isUser ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "max-w-[85%]",
        isUser ? "bg-primary text-primary-foreground" : "bg-muted",
        "rounded-lg p-3 shadow-sm"
      )}>
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs opacity-70">{isUser ? 'You' : 'Panion'}</span>
            <span className="text-xs opacity-50">{timestamp}</span>
          </div>
          
          <div className="whitespace-pre-wrap">{content}</div>
          
          {/* Render any embedded component */}
          {component && (
            <div className="mt-2">
              {component}
            </div>
          )}
          
          {/* Thinking process section */}
          {thinking && (
            <div className="mt-2">
              <div className="flex items-center justify-between my-1">
                <span className="text-xs font-medium">Thinking Process</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={toggleThinking}
                >
                  {showThinking ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
              
              {showThinking && (
                <Card className="text-xs p-2 mt-1 bg-background/50 whitespace-pre-wrap leading-relaxed">
                  {thinking?.replace(/\\n/g, '\n')}
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};