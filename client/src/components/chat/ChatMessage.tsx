import React, { useState, useEffect } from 'react';
import { ChatMessage as ChatMessageType, ThinkingState, MessageSentiment } from '@/types/chat';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Brain, Clock, Sparkles, Search, Database, 
         ExternalLink, MessageSquare, AlertCircle, HelpCircle, Lightbulb } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ChatMessageProps {
  message: ChatMessageType;
  showThinking: boolean;
  toggleThinking: () => void;
}

// Typing animation component
const TypingIndicator: React.FC = () => {
  return (
    <div className="flex space-x-1 items-center py-2">
      <div className="w-2 h-2 rounded-full bg-primary/50 animate-pulse" style={{ animationDelay: '0ms' }}></div>
      <div className="w-2 h-2 rounded-full bg-primary/50 animate-pulse" style={{ animationDelay: '300ms' }}></div>
      <div className="w-2 h-2 rounded-full bg-primary/50 animate-pulse" style={{ animationDelay: '600ms' }}></div>
    </div>
  );
};

// Thinking state indicator component
const ThinkingStateIndicator: React.FC<{ state: ThinkingState }> = ({ state }) => {
  const getIcon = () => {
    switch (state) {
      case 'listening': return <MessageSquare className="h-3.5 w-3.5" />;
      case 'processing': return <Brain className="h-3.5 w-3.5 animate-pulse" />;
      case 'recalling': return <Database className="h-3.5 w-3.5" />;
      case 'analyzing': return <Search className="h-3.5 w-3.5" />;
      case 'deliberating': return <HelpCircle className="h-3.5 w-3.5" />;
      case 'connecting': return <ExternalLink className="h-3.5 w-3.5" />;
      case 'generating': return <Sparkles className="h-3.5 w-3.5 animate-pulse" />;
      case 'complete': return <Lightbulb className="h-3.5 w-3.5" />;
      default: return null;
    }
  };
  
  const getLabel = () => {
    return state.charAt(0).toUpperCase() + state.slice(1);
  };
  
  return (
    <Badge variant="outline" className="flex items-center gap-1 text-[10px] h-5 px-2">
      {getIcon()}
      <span>{getLabel()}</span>
    </Badge>
  );
};

// Sentiment indicator component
const SentimentIndicator: React.FC<{ sentiment: MessageSentiment }> = ({ sentiment }) => {
  const getSentimentColor = () => {
    switch (sentiment) {
      case 'thoughtful': return "bg-indigo-100 text-indigo-800 border-indigo-300";
      case 'excited': return "bg-amber-100 text-amber-800 border-amber-300";
      case 'curious': return "bg-cyan-100 text-cyan-800 border-cyan-300";
      case 'concerned': return "bg-amber-100 text-amber-800 border-amber-300";
      case 'confident': return "bg-green-100 text-green-800 border-green-300";
      case 'empathetic': return "bg-pink-100 text-pink-800 border-pink-300";
      default: return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };
  
  return (
    <Badge variant="outline" className={cn("text-[10px] h-5", getSentimentColor())}>
      {sentiment}
    </Badge>
  );
};

// Personality traits indicator
const PersonalityTraitsDisplay: React.FC<{ traits: string[] }> = ({ traits }) => {
  if (!traits || traits.length === 0) return null;
  
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {traits.map((trait, index) => (
        <Badge key={index} variant="secondary" className="text-[10px] h-5">
          {trait}
        </Badge>
      ))}
    </div>
  );
};

export const ChatMessageComponent: React.FC<ChatMessageProps> = ({
  message,
  showThinking,
  toggleThinking
}) => {
  const { 
    content, isUser, timestamp, thinking, component, imageUrl,
    thinkingState, sentiment, isTyping, personalityTraits
  } = message;
  
  // Random blinking for thinking state
  const [isBlinking, setIsBlinking] = useState(false);
  
  useEffect(() => {
    if (thinkingState && thinkingState !== 'complete') {
      const interval = setInterval(() => {
        setIsBlinking(prev => !prev);
      }, Math.random() * 2000 + 1000); // Random blink between 1-3 seconds
      
      return () => clearInterval(interval);
    }
  }, [thinkingState]);
  
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
            <div className="flex items-center space-x-2">
              <span className="text-xs opacity-70">{isUser ? 'You' : 'Manus'}</span>
              
              {!isUser && thinkingState && (
                <ThinkingStateIndicator state={thinkingState} />
              )}
              
              {!isUser && sentiment && (
                <SentimentIndicator sentiment={sentiment} />
              )}
            </div>
            <span className="text-xs opacity-50">{timestamp}</span>
          </div>
          
          {/* Show personality traits if present */}
          {!isUser && personalityTraits && personalityTraits.length > 0 && (
            <PersonalityTraitsDisplay traits={personalityTraits} />
          )}
          
          {/* Content or typing indicator */}
          {isTyping ? (
            <TypingIndicator />
          ) : (
            <div className="whitespace-pre-wrap">{content}</div>
          )}
          
          {/* Display image if present */}
          {imageUrl && (
            <div className="mt-2">
              <img 
                src={imageUrl} 
                alt="Shared in conversation" 
                className="max-w-full rounded-md shadow-sm"
                style={{ maxHeight: '300px' }}
              />
            </div>
          )}
          
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