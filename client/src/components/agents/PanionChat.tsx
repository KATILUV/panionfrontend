/**
 * PanionChat Component
 * Enhanced chat interface for Panion with different conversation modes
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
  Database
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePreferencesStore } from '@/state/preferencesStore';
import { CONVERSATION_MODES, DEFAULT_CONVERSATION_MODE, ConversationMode } from '@/types/conversationModes';
import PanionAgentSettings from './PanionAgentSettings';
import log from '@/utils/logger';
import { useTaskContext } from '@/context/TaskContext';

// Message type definition
interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'agent';
  timestamp: Date;
  thinking?: string;
  isLoading?: boolean;
}

interface PanionChatProps {
  onClose?: () => void;
}

/**
 * PanionChat component provides an enhanced chat experience with modes
 */
const PanionChat: React.FC<PanionChatProps> = ({ onClose }) => {
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [dataSearchRequested, setDataSearchRequested] = useState(false);
  
  // Get task context for activating Daddy Data Agent
  const { activateDaddyData } = useTaskContext();
  
  // Get current conversation mode from preferences
  const conversationMode = usePreferencesStore(
    state => (state.agents?.panion?.conversationMode as ConversationMode) || DEFAULT_CONVERSATION_MODE
  );
  
  // Get mode config
  const modeConfig = CONVERSATION_MODES[conversationMode];
  
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
    
    // Only add welcome message if no messages exist
    if (messages.length === 0) {
      setMessages([{
        id: 'welcome',
        content: welcomeMessage,
        sender: 'agent',
        timestamp: new Date()
      }]);
    }
  }, [conversationMode, messages.length]);
  
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
    if (!inputValue.trim()) return;
    
    // Add user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      content: inputValue,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);
    
    // Detect if this is a business search query
    const businessSearch = detectBusinessSearch(userMessage.content);
    let businessSearchActivated = false;
    
    if (businessSearch && !dataSearchRequested) {
      log.info(`Detected business search query: ${businessSearch.businessType} in ${businessSearch.location}`);
      
      // Activate Daddy Data Agent
      activateDaddyData(businessSearch.businessType, businessSearch.location);
      businessSearchActivated = true;
      setDataSearchRequested(true);
      
      // After a delay, reset the data search requested flag
      setTimeout(() => {
        setDataSearchRequested(false);
      }, 10000); // Reset after 10 seconds
    }
    
    // Add temporary agent response
    const tempAgentMessage: ChatMessage = {
      id: `agent-${Date.now()}`,
      content: '',
      sender: 'agent',
      timestamp: new Date(),
      isLoading: true
    };
    
    setMessages(prev => [...prev, tempAgentMessage]);
    
    try {
      // In a real implementation, we would send the message to the backend
      // along with the current conversation mode
      log.info(`Sending message with ${conversationMode} mode: ${inputValue}`);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Generate a response based on the conversation mode
      let response = '';
      let thinking = '';
      
      // Customize response based on whether this was a business search
      if (businessSearchActivated) {
        thinking = "Detecting business search query and activating Daddy Data Agent...";
        response = `I've detected that you're looking for ${businessSearch!.businessType} in ${businessSearch!.location}. I've activated the Daddy Data Agent to help you find detailed information about businesses matching your search. You should see the results shortly in the Daddy Data window.`;
      } else {
        switch (conversationMode) {
          case 'casual':
            thinking = "Let me think about this in a friendly, conversational way...";
            response = `I'm thinking about your message: "${inputValue}" in a casual way! This is simulating a real response that would come from the API with the casual conversation mode.`;
            break;
          case 'deep':
            thinking = "Examining this from multiple perspectives, considering philosophical implications...";
            response = `Contemplating your message: "${inputValue}" with depth and nuance. This simulates a thoughtful, philosophical response from the deep conversation mode.`;
            break;
          case 'strategic':
            thinking = "Analyzing from a goal-oriented perspective, identifying objectives and constraints...";
            response = `Strategically analyzing your message: "${inputValue}" with a focus on outcomes and solutions. This simulates a structured response from the strategic conversation mode.`;
            break;
          case 'logical':
            thinking = "Processing with logical analysis, establishing facts and identifying premises...";
            response = `Logically processing your message: "${inputValue}" with factual precision. This simulates a methodical response from the logical conversation mode.`;
            break;
          default:
            thinking = "Thinking...";
            response = `I received your message: "${inputValue}"`;
        }
      }
      
      // Update the agent message with the response
      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempAgentMessage.id 
            ? { 
                ...msg, 
                content: response, 
                thinking: thinking,
                isLoading: false 
              } 
            : msg
        )
      );
    } catch (error) {
      log.error('Error sending message:', error);
      
      // Update with error message
      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempAgentMessage.id 
            ? { 
                ...msg, 
                content: 'Sorry, I encountered an error processing your request.', 
                isLoading: false 
              } 
            : msg
        )
      );
    } finally {
      setIsTyping(false);
    }
  };
  
  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
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
          
          {/* Data Search Indicator */}
          {dataSearchRequested && (
            <div className="flex items-center gap-1 bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs animate-pulse">
              <Database size={12} />
              <span>Data search active</span>
            </div>
          )}
        </div>
        <button 
          onClick={() => setShowSettings(true)}
          className="p-1.5 hover:bg-accent rounded-md transition-colors"
          aria-label="Settings"
        >
          <Settings size={18} />
        </button>
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
                    : 'bg-card border border-border'
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
                      <div className="text-xs italic text-muted-foreground mb-1">
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
            placeholder="Type your message..."
            className="flex-1 resize-none bg-background rounded-md border border-border p-3 min-h-[44px] max-h-[120px] focus:outline-none focus:ring-1 focus:ring-primary"
            rows={1}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isTyping}
            className={`p-3 rounded-md ${
              !inputValue.trim() || isTyping
                ? 'bg-accent text-muted-foreground cursor-not-allowed'
                : 'bg-primary text-primary-foreground'
            }`}
            aria-label="Send message"
          >
            <Send size={18} />
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

export default PanionChat;