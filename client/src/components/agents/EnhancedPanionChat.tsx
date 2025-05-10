/**
 * EnhancedPanionChat Component
 * Advanced chat interface for Panion with real-time WebSocket communication and multiple conversation modes
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Send, 
  Settings,
  Coffee,
  BookOpen,
  Target,
  CircuitBoard,
  Database,
  Radio,
  WifiOff,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePreferencesStore } from '@/state/preferencesStore';
import { CONVERSATION_MODES, DEFAULT_CONVERSATION_MODE, ConversationMode } from '@/types/conversationModes';
import PanionAgentSettings from './PanionAgentSettings';
import log from '@/utils/logger';
import { useTaskContext } from '@/context/TaskContext';
import { useWebSocketChat } from '@/hooks/useWebSocketChat';
import { useToast } from '@/hooks/use-toast';

// Message type definition
interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'agent';
  timestamp: Date;
  thinking?: string;
  isLoading?: boolean;
}

interface EnhancedPanionChatProps {
  onClose?: () => void;
}

/**
 * EnhancedPanionChat component provides a real-time chat experience with multiple modes via WebSockets
 */
const EnhancedPanionChat: React.FC<EnhancedPanionChatProps> = ({ onClose }) => {
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [dataSearchRequested, setDataSearchRequested] = useState(false);
  const { toast } = useToast();

  // Get task context for activating Daddy Data Agent
  const { activateDaddyData } = useTaskContext();
  
  // Get current conversation mode from preferences
  const conversationMode = usePreferencesStore(
    state => (state.agents?.panion?.conversationMode as ConversationMode) || DEFAULT_CONVERSATION_MODE
  );
  
  // Get mode config
  const modeConfig = CONVERSATION_MODES[conversationMode];
  
  // Initialize WebSocket connection
  const {
    isConnected,
    typingStatus,
    sendMessage: sendWebSocketMessage,
    sendTypingStatus,
    error: wsError,
    reconnect,
    messages: wsMessages
  } = useWebSocketChat({
    conversationMode,
    onConnect: () => {
      log.info("WebSocket connected for Panion chat");
    },
    onDisconnect: () => {
      log.info("WebSocket disconnected for Panion chat");
    },
    onError: (error) => {
      log.error("WebSocket error:", error);
    }
  });

  // References
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // Scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Convert WebSocket messages to UI messages
  useEffect(() => {
    if (wsMessages && wsMessages.length > 0) {
      const formattedMessages = wsMessages.map((msg, index) => {
        return {
          id: `ws-${index}-${Date.now()}`,
          content: msg.message || '',
          sender: msg.sender === 'user' ? 'user' : 'agent',
          timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
          thinking: msg.sender === 'assistant' ? generateThinkingText(conversationMode) : undefined
        } as ChatMessage;
      });

      setMessages(formattedMessages);
    }
  }, [wsMessages, conversationMode]);
  
  // Add welcome message based on conversation mode
  useEffect(() => {
    let welcomeMessage = '';
    
    switch (conversationMode) {
      case 'casual':
        welcomeMessage = "Hi there! I'm Panion, your friendly AI assistant. How can I help you today?";
        break;
      case 'deep':
        welcomeMessage = "Welcome. I'm Panion, ready to explore ideas in depth. What would you like to examine today?";
        break;
      case 'strategic':
        welcomeMessage = "Greetings. I'm Panion, your strategic assistant. What objectives shall we work toward today?";
        break;
      case 'logical':
        welcomeMessage = "Hello. I'm Panion. I'll provide precise, logical assistance. What information do you require?";
        break;
      default:
        welcomeMessage = "Hello! I'm Panion. How can I assist you today?";
    }
    
    // Only add welcome message if no messages exist and we're connected
    if (messages.length === 0 && isConnected) {
      setMessages([{
        id: 'welcome',
        content: welcomeMessage,
        sender: 'agent',
        timestamp: new Date()
      }]);
    }
  }, [conversationMode, messages.length, isConnected]);
  
  // Show WebSocket errors
  useEffect(() => {
    if (wsError) {
      toast({
        title: "Connection Error",
        description: wsError,
        variant: "destructive",
      });
    }
  }, [wsError, toast]);

  // Generate thinking text based on mode
  const generateThinkingText = (mode: ConversationMode): string => {
    switch (mode) {
      case 'casual':
        return "Let me think about this in a friendly, conversational way...";
      case 'deep':
        return "Examining this from multiple perspectives, considering philosophical implications...";
      case 'strategic':
        return "Analyzing from a goal-oriented perspective, identifying objectives and constraints...";
      case 'logical':
        return "Processing with logical analysis, establishing facts and identifying premises...";
      default:
        return "Thinking...";
    }
  };
  
  // Function to detect business search queries
  const detectBusinessSearch = (query: string): { businessType: string, location: string } | null => {
    // Regex patterns for different types of business search queries
    const patterns = [
      // "Find X in Y" pattern
      {
        regex: /(?:find|search for|look for|get|show me|locate)\s+(?:some|the|a|all|any)?\s*(.+?)(?:\s+(?:business(?:es)?|shop(?:s)?|stor(?:e|es)|place(?:s)?))?\s+(?:in|near|around|close to)\s+(.+?)(?:\s|$)/i,
        businessTypeIndex: 1,
        locationIndex: 2
      },
      // "Where can I find X in Y" pattern
      {
        regex: /(?:where\s+can\s+(?:I|we|one|someone|you))\s+(?:find|get|buy|purchase|acquire)\s+(?:some|the|a|all|any)?\s*(.+?)(?:\s+(?:business(?:es)?|shop(?:s)?|stor(?:e|es)|place(?:s)?))?\s+(?:in|near|around|close to)\s+(.+?)(?:\s|$)/i,
        businessTypeIndex: 1,
        locationIndex: 2
      },
      // "X in Y" direct pattern
      {
        regex: /(?:^|\s)(.+?)\s+(?:business(?:es)?|shop(?:s)?|stor(?:e|es)|place(?:s)?)\s+(?:in|near|around|close to)\s+(.+?)(?:\s|$)/i,
        businessTypeIndex: 1,
        locationIndex: 2
      }
    ];
    
    for (const pattern of patterns) {
      const match = query.match(pattern.regex);
      if (match) {
        const businessType = match[pattern.businessTypeIndex].trim();
        const location = match[pattern.locationIndex].trim();
        
        // Only return valid matches with both business type and location
        if (businessType && location) {
          return { businessType, location };
        }
      }
    }
    
    return null;
  };

  // Handle sending a message
  const handleSendMessage = async () => {
    if (!inputValue.trim() || !isConnected) return;
    
    // Add user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      content: inputValue,
      sender: 'user',
      timestamp: new Date()
    };
    
    // Use the message array state for immediate UI update
    setMessages(prev => [...prev, userMessage]);
    
    // Detect if this is a business search query
    const businessSearch = detectBusinessSearch(userMessage.content);
    
    if (businessSearch && !dataSearchRequested) {
      log.info(`Detected business search query: ${businessSearch.businessType} in ${businessSearch.location}`);
      
      // Activate Daddy Data Agent
      activateDaddyData(businessSearch.businessType, businessSearch.location);
      setDataSearchRequested(true);
      
      // After a delay, reset the data search requested flag
      setTimeout(() => {
        setDataSearchRequested(false);
      }, 10000); // Reset after 10 seconds
      
      // Add system message about business search
      const businessSearchMessage: ChatMessage = {
        id: `system-${Date.now()}`,
        content: `I've detected that you're looking for ${businessSearch.businessType} in ${businessSearch.location}. I've activated the Daddy Data Agent to help you find detailed information about businesses matching your search. You should see the results shortly in the Daddy Data window.`,
        sender: 'agent',
        timestamp: new Date(),
        thinking: "Detecting business search query and activating Daddy Data Agent..."
      };
      
      setMessages(prev => [...prev, businessSearchMessage]);
    }
    
    // Add temporary agent response for better UX
    const tempAgentMessage: ChatMessage = {
      id: `agent-${Date.now()}`,
      content: '',
      sender: 'agent',
      timestamp: new Date(),
      isLoading: true
    };
    
    setMessages(prev => [...prev, tempAgentMessage]);
    
    // Send message over WebSocket
    try {
      log.info(`Sending message with ${conversationMode} mode: ${inputValue}`);
      setInputValue('');
      
      // This will trigger a response through the WebSocket that will update the wsMessages
      // which in turn will update our UI through the useEffect hook
      sendWebSocketMessage(inputValue);
      
      // If it's a business search, we'll keep our special message
      // Otherwise, the temporary message will be replaced by the WebSocket response
      if (!businessSearch) {
        // Remove temporary message once WebSocket response arrives
        // This is done in the useEffect watching wsMessages
      }
    } catch (error) {
      log.error('Error sending message:', error);
      
      // Update with error message if WebSocket failed
      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempAgentMessage.id 
            ? { 
                ...msg, 
                content: 'Sorry, I encountered an error processing your request. Please try again later.', 
                isLoading: false 
              } 
            : msg
        )
      );
    }
  };
  
  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    
    // Send typing indicator over WebSocket
    const isTyping = e.target.value.trim().length > 0;
    sendTypingStatus(isTyping);
  };
  
  // Handle key press (Enter to send)
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  // Get mode icon
  const getModeIcon = () => {
    switch (conversationMode) {
      case 'casual': return <Coffee size={18} />;
      case 'deep': return <BookOpen size={18} />;
      case 'strategic': return <Target size={18} />;
      case 'logical': return <CircuitBoard size={18} />;
      default: return <MessageSquare size={18} />;
    }
  };
  
  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-card">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-full ${modeConfig.color || 'bg-primary'} text-white`}>
            {getModeIcon()}
          </div>
          <h2 className="font-medium">Panion - {modeConfig.name} Mode</h2>
          
          {/* Connection Status */}
          {!isConnected && (
            <div className="text-red-500 text-xs flex items-center ml-2">
              <WifiOff className="w-3 h-3 mr-1" />
              <span>Offline</span>
            </div>
          )}
          {isConnected && (
            <div className="text-green-500 text-xs flex items-center ml-2">
              <Radio className="w-3 h-3 mr-1 animate-pulse" />
              <span>Connected</span>
            </div>
          )}
          
          {/* Data Search Indicator */}
          {dataSearchRequested && (
            <div className="flex items-center gap-1 bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs animate-pulse">
              <Database size={12} />
              <span>Data search active</span>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {!isConnected && (
            <button 
              onClick={reconnect}
              className="p-1.5 text-red-500 hover:bg-accent rounded-md transition-colors"
              aria-label="Reconnect"
              title="Reconnect"
            >
              <Radio size={16} />
            </button>
          )}
          <button 
            onClick={() => setShowSettings(true)}
            className="p-1.5 hover:bg-accent rounded-md transition-colors"
            aria-label="Settings"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>
      
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-[80%] px-4 py-2 rounded-lg ${
                  message.sender === 'user' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-card border border-border text-foreground'
                }`}
              >
                {message.isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                ) : (
                  <>
                    {message.thinking && message.sender === 'agent' && (
                      <div className="text-xs italic text-muted-foreground font-medium mb-1">
                        {message.thinking}
                      </div>
                    )}
                    <div className="whitespace-pre-wrap">{message.content}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          ))}
          
          {/* WebSocket Typing Indicator */}
          {typingStatus === 'assistant' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex justify-start"
            >
              <div className="max-w-[80%] px-4 py-2 rounded-lg bg-card border border-border">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input Area */}
      <div className="p-4 border-t border-border bg-card">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
            placeholder={isConnected ? "Type your message..." : "Connection lost. Reconnecting..."}
            className="flex-1 resize-none bg-background rounded-md border border-border p-3 min-h-[44px] max-h-[120px] focus:outline-none focus:ring-1 focus:ring-primary"
            rows={1}
            disabled={!isConnected}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || !isConnected || typingStatus === 'assistant'}
            className={`p-3 rounded-md ${
              !inputValue.trim() || !isConnected || typingStatus === 'assistant'
                ? 'bg-accent text-muted-foreground cursor-not-allowed'
                : 'bg-primary text-primary-foreground'
            }`}
            aria-label="Send message"
          >
            {typingStatus === 'assistant' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send size={18} />
            )}
          </button>
        </div>
      </div>
      
      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm z-10"
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              initial={{ y: 20 }}
              animate={{ y: 0 }}
              exit={{ y: 20 }}
              className="absolute inset-4 sm:inset-10 md:inset-20 bg-card rounded-lg shadow-lg overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <PanionAgentSettings onClose={() => setShowSettings(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EnhancedPanionChat;