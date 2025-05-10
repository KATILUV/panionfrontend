import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Send, RefreshCw, Radio, WifiOff, Loader2 } from "lucide-react";
import { useWebSocketChat, type ConversationMode } from "@/hooks/useWebSocketChat";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// Component props
interface WebSocketChatProps {
  title?: string;
  className?: string;
  defaultMode?: ConversationMode;
}

// Main component
export const WebSocketChat: React.FC<WebSocketChatProps> = ({ 
  title = "AI Chat", 
  className,
  defaultMode = "casual"
}) => {
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  // Initialize WebSocket chat hook
  const {
    isConnected,
    messages,
    sendMessage,
    typingStatus,
    error,
    sendTypingStatus,
    changeConversationMode,
    currentMode,
    reconnect
  } = useWebSocketChat({
    conversationMode: defaultMode,
    onConnect: () => {
      toast({
        title: "Connected",
        description: "Chat connection established",
      });
    },
    onDisconnect: () => {
      toast({
        title: "Disconnected",
        description: "Chat connection lost",
        variant: "destructive",
      });
    },
    onError: (err) => {
      toast({
        title: "Connection Error",
        description: err?.message || "Failed to connect to chat service",
        variant: "destructive",
      });
    }
  });
  
  // Handle message submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) return;
    
    sendMessage(message);
    setMessage("");
    
    // Focus input after sending
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };
  
  // Handle typing events
  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isTyping = e.target.value.length > 0;
    setMessage(e.target.value);
    sendTypingStatus(isTyping);
  };
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);
  
  // Show error in toast when it occurs
  useEffect(() => {
    if (error) {
      toast({
        title: "Chat Error",
        description: error,
        variant: "destructive",
      });
    }
  }, [error, toast]);
  
  return (
    <Card className={cn("flex flex-col h-full max-h-full overflow-hidden", className)}>
      <CardHeader className="pb-3 pt-4">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-semibold">
            {title}
            {!isConnected && (
              <span className="ml-2 text-red-500 text-xs flex items-center">
                <WifiOff className="w-3 h-3 mr-1" />
                Offline
              </span>
            )}
            {isConnected && (
              <span className="ml-2 text-green-500 text-xs flex items-center">
                <Radio className="w-3 h-3 mr-1 animate-pulse" />
                Connected
              </span>
            )}
          </CardTitle>
          
          <div className="flex space-x-2 items-center">
            <Select
              value={currentMode}
              onValueChange={(value: ConversationMode) => changeConversationMode(value)}
              disabled={!isConnected}
            >
              <SelectTrigger className="w-[130px] h-8 text-sm">
                <SelectValue placeholder="Mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="casual">Casual</SelectItem>
                <SelectItem value="deep">Thoughtful</SelectItem>
                <SelectItem value="strategic">Strategic</SelectItem>
                <SelectItem value="logical">Logical</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              size="icon"
              variant="ghost"
              onClick={reconnect}
              disabled={isConnected}
              title="Reconnect"
              className="h-8 w-8"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-grow overflow-auto px-4 pb-0 pt-0">
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>Start a conversation by sending a message</p>
              <p className="text-sm mt-2">Current mode: <span className="font-semibold capitalize">{currentMode}</span></p>
            </div>
          )}
          
          {messages.map((msg, index) => (
            <div
              key={index}
              className={cn(
                "flex",
                msg.sender === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-lg px-4 py-2",
                  msg.sender === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                )}
              >
                {msg.message}
              </div>
            </div>
          ))}
          
          {/* Typing indicator */}
          {typingStatus === 'assistant' && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-lg px-4 py-2 bg-muted">
                <div className="flex space-x-1 items-center">
                  <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '200ms' }}></div>
                  <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '400ms' }}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </CardContent>
      
      <CardFooter className="p-3 pt-2">
        <form onSubmit={handleSubmit} className="flex w-full space-x-2">
          <Input
            ref={inputRef}
            type="text"
            placeholder={isConnected ? "Type your message..." : "Connecting..."}
            value={message}
            onChange={handleTyping}
            disabled={!isConnected}
            className="flex-grow"
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={!isConnected || !message.trim()}
          >
            {typingStatus === 'assistant' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
};

export default WebSocketChat;