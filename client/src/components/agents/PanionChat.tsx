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
  Database,
  Image as ImageIcon,
  Palette,
  Code,
  GraduationCap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePreferencesStore } from '@/state/preferencesStore';
import { CONVERSATION_MODES, DEFAULT_CONVERSATION_MODE, ConversationMode } from '@/types/conversationModes';
import { ChatMessage as GlobalChatMessage, AgentStatusType } from '@/types/chat';
import PanionAgentSettings from './PanionAgentSettings';
import log from '@/utils/logger';
import { useTaskContext } from '@/context/TaskContext';
import { useToast } from '@/hooks/use-toast';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { ImageGallery } from '@/components/gallery';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Message type definition
interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'agent';
  timestamp: Date;
  thinking?: string;
  isLoading?: boolean;
  imageUrl?: string;
  collaborativeAnalysis?: any; // For storing multi-agent analysis results
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
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState('chat');
  const [useMultiAgentAnalysis, setUseMultiAgentAnalysis] = useState<boolean>(false);
  
  // Get task context for activating Daddy Data Agent
  const { activateDaddyData } = useTaskContext();
  const { toast } = useToast();
  
  // Get current conversation mode from preferences
  const conversationMode = usePreferencesStore(
    state => (state.agents?.panion?.conversationMode as ConversationMode) || DEFAULT_CONVERSATION_MODE
  );
  
  // Get mode config
  const modeConfig = CONVERSATION_MODES[conversationMode];
  
  // References
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
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
  
  // Helper function to get cookie by name
  const getCookieValue = (name: string): string | null => {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
  };
  
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
      case 'creative':
        welcomeMessage = "Hello there! I'm Panion, your creative companion. What would you like to imagine, create, or explore today? ✨";
        break;
      case 'technical':
        welcomeMessage = "Hello. I'm Panion, your technical assistant. I'm ready to help with programming, engineering, or other technical topics. What are you working on?";
        break;
      case 'educational':
        welcomeMessage = "Welcome! I'm Panion, your educational assistant. I'm here to help you learn and understand new concepts. What would you like to discover today?";
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
      // Make a real API call to the backend with the current conversation mode
      log.info(`Sending message with ${conversationMode} mode: ${inputValue}`);
      
      // Prepare the API endpoint and request body
      const endpoint = '/api/panion/enhanced-chat';  
      const requestBody = {
        message: inputValue,
        sessionId: sessionId || 'default',
        conversationMode: conversationMode
      };
      
      // Send the request to the backend
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      // Parse the response
      const data = await response.json();
      
      // Extract response content and thinking process
      let responseContent = '';
      let thinking = '';
      
      // Handle different response formats
      if (typeof data === 'string') {
        // Simple string response
        responseContent = data;
      } else if (data.response) {
        // Enhanced response object
        responseContent = data.response;
        thinking = data.thinking || '';
      } else if (data.message || data.content) {
        // Alternative response format
        responseContent = data.message || data.content;
        thinking = data.thinking || data.reasoning || '';
      } else {
        // Fallback for unexpected formats
        responseContent = JSON.stringify(data);
      }
      
      // Special case for business search
      if (businessSearchActivated) {
        thinking = "Detecting business search query and activating Daddy Data Agent...";
        responseContent = `I've detected that you're looking for ${businessSearch!.businessType} in ${businessSearch!.location}. I've activated the Daddy Data Agent to help you find detailed information about businesses matching your search. You should see the results shortly in the Daddy Data window.`;
      }
      
      // Update the agent message with the response
      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempAgentMessage.id 
            ? { 
                ...msg, 
                content: responseContent, 
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
                content: 'Sorry, I encountered an error processing your request. Please try again later.', 
                isLoading: false 
              } 
            : msg
        )
      );
    } finally {
      setIsTyping(false);
    }
  };
  
  // Note: handleInputChange is now handled by ChatInterface via setInputValue
  
  // Note: handleKeyPress is now handled by ChatInterface
  
  // Handle image upload
  const handleImageUpload = async (file: File) => {
    try {
      setIsTyping(true);
      
      // Validate file size before uploading
      const MAX_SIZE = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > MAX_SIZE) {
        toast({
          title: "File too large",
          description: "Please upload images smaller than 5MB",
          variant: "destructive"
        });
        return;
      }
      
      // Add user message with image info
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        content: 'Image uploaded: ' + file.name,
        sender: 'user',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, userMessage]);
      
      // Create FormData to send the image
      const formData = new FormData();
      formData.append('image', file);
      formData.append('conversationMode', conversationMode);
      
      // Add temporary agent response
      const tempAgentMessage: ChatMessage = {
        id: `agent-${Date.now()}`,
        content: '',
        sender: 'agent',
        timestamp: new Date(),
        isLoading: true
      };
      
      setMessages(prev => [...prev, tempAgentMessage]);
      
      // Show loading toast
      toast({
        title: 'Analyzing image...',
        description: 'Your image is being processed with OpenAI Vision',
      });
      
      // Determine which endpoint to use based on the analysis type
      const endpoint = useMultiAgentAnalysis ? '/api/visual-collaboration' : '/api/upload-image';
      
      // Show appropriate loading toast
      toast({
        title: useMultiAgentAnalysis ? 'Multi-agent analysis in progress...' : 'Analyzing image...',
        description: useMultiAgentAnalysis 
          ? 'Your image is being analyzed by multiple specialized AI agents' 
          : 'Your image is being processed with OpenAI Vision',
      });
      
      // Send the image to the backend for analysis
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to upload image');
      }
      
      const data = await response.json();
      
      // Process the response based on the analysis type
      if (useMultiAgentAnalysis) {
        // For multi-agent analysis
        if (!data.result || !data.imageUrl) {
          throw new Error('Invalid response from multi-agent analysis');
        }
        
        const result = data.result;
        
        // Create a formatted message from the collaborative analysis
        const formattedAnalysis = `
# Multi-Agent Visual Analysis

${result.summary.mainFindings}

## Key Insights
${result.summary.keyInsights.map((insight: string) => `- ${insight}`).join('\n')}

## Analysis Details
${result.agentAnalyses.map((analysis: any) => 
  `### ${analysis.agentId.split('_').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}\n${analysis.analysis.substring(0, 150)}...`
).join('\n\n')}

${result.summary.uncertainties.length > 0 ? 
  `## Uncertainties\n${result.summary.uncertainties.map((item: string) => `- ${item}`).join('\n')}` : ''}

${result.summary.suggestedFollowups.length > 0 ? 
  `## Suggested Follow-ups\n${result.summary.suggestedFollowups.map((item: string) => `- ${item}`).join('\n')}` : ''}
`;
        
        // Update the agent message with the multi-agent analysis
        setMessages(prev => 
          prev.map(msg => 
            msg.id === tempAgentMessage.id 
              ? { 
                  ...msg, 
                  content: formattedAnalysis, 
                  thinking: 'Synthesizing analysis from multiple agent perspectives...',
                  imageUrl: data.imageUrl,
                  isLoading: false,
                  collaborativeAnalysis: result // Store the full analysis data
                } 
              : msg
          )
        );
        
        // Show success toast for multi-agent analysis
        toast({
          title: 'Collaborative analysis complete',
          description: `${result.agentAnalyses.length} specialized agents analyzed your image`,
        });
      } else {
        // For standard single-agent analysis
        if (!data.imageUrl || !data.analysis) {
          throw new Error('Invalid response from server');
        }
        
        // Update the agent message with the standard analysis
        setMessages(prev => 
          prev.map(msg => 
            msg.id === tempAgentMessage.id 
              ? { 
                  ...msg, 
                  content: data.analysis, 
                  thinking: 'Analyzing the visual content of the image...',
                  imageUrl: data.imageUrl,
                  isLoading: false 
                } 
              : msg
          )
        );
        
        // Show success toast for standard analysis
        toast({
          title: 'Image analysis complete',
          description: 'The image was successfully processed with OpenAI Vision',
        });
      }
      
      // Show a toast notifying the user about the gallery
      toast({
        title: 'Image saved to gallery',
        description: 'You can view and reuse this image in the Gallery tab',
      });
      
    } catch (error) {
      console.error('Error uploading image:', error);
      
      // Update any loading message to show the error
      setMessages(prev => 
        prev.map(msg => 
          msg.isLoading 
            ? { 
                ...msg, 
                content: 'Sorry, I encountered an error processing your image. Please try again.', 
                isLoading: false 
              } 
            : msg
        )
      );
      
      // Show error toast
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to process the image',
        variant: 'destructive'
      });
      
    } finally {
      setIsTyping(false);
      setSelectedImage(null);
    }
  };
  
  // Handler for using images from the gallery in conversation
  const handleUseImageFromGallery = (imageUrl: string, description: string) => {
    // Add a user message referencing the image
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      content: `I'd like to talk about this image from the gallery.`,
      sender: 'user',
      timestamp: new Date(),
      imageUrl: imageUrl
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    // Add an agent response with the image description
    const agentMessage: ChatMessage = {
      id: `agent-${Date.now()}`,
      content: `I see you've selected an image from your gallery. Here's what I know about it:\n\n${description}`,
      sender: 'agent',
      timestamp: new Date(),
      imageUrl: imageUrl
    };
    
    setMessages(prev => [...prev, agentMessage]);
    
    // Switch to chat tab
    setActiveTab('chat');
  };
  
  // Get mode icon
  const getModeIcon = () => {
    switch (conversationMode) {
      case 'casual': return <Coffee size={18} />;
      case 'deep': return <BookOpen size={18} />;
      case 'strategic': return <Target size={18} />;
      case 'logical': return <CircuitBoard size={18} />;
      case 'creative': return <Palette size={18} />;
      case 'technical': return <Code size={18} />;
      case 'educational': return <GraduationCap size={18} />;
      default: return <MessageSquare size={18} />;
    }
  };
  
  // Convert internal message format to the global one
  const convertToGlobalMessages = (messages: ChatMessage[]): GlobalChatMessage[] => {
    return messages.map(msg => {
      const globalMsg: GlobalChatMessage = {
        id: msg.id,
        content: msg.content,
        isUser: msg.sender === 'user',
        timestamp: msg.timestamp.toISOString(),
        thinking: msg.thinking
      };
      
      if (msg.imageUrl) {
        globalMsg.imageUrl = msg.imageUrl;
      }
      
      return globalMsg;
    });
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
        <div className="flex items-center gap-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="h-8">
              <TabsTrigger value="chat">
                <MessageSquare size={16} className="mr-1" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="gallery">
                <ImageIcon size={16} className="mr-1" />
                Gallery
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          <button 
            onClick={() => setShowSettings(true)}
            className="p-1.5 hover:bg-accent rounded-md transition-colors"
            aria-label="Settings"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>
      
      <Tabs value={activeTab} className="flex-1 overflow-hidden">
        <TabsContent value="chat" className="flex-1 flex flex-col h-full mt-0 overflow-hidden">
          {/* Input Area with ChatInterface component */}
          <div className="flex-1 overflow-hidden">
            <ChatInterface
              messages={convertToGlobalMessages(messages)}
              inputValue={inputValue}
              setInputValue={setInputValue}
              isLoading={isTyping}
              agentStatus={isTyping ? 'thinking' : 'idle'}
              sendMessage={handleSendMessage}
              onImageUpload={handleImageUpload}
              messagesEndRef={messagesEndRef}
              strategicMode={conversationMode === 'strategic'}
              title={`Panion - ${modeConfig.name} Mode`}
              showSettings={false}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="gallery" className="p-4 mt-0 h-full overflow-auto">
          <ImageGallery 
            sessionId={getCookieValue('sessionId') || 'default'} 
            onSelectImage={handleUseImageFromGallery}
            height="calc(100vh - 180px)"
          />
        </TabsContent>
      </Tabs>
      
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
              <PanionAgentSettings 
                onClose={() => setShowSettings(false)} 
                useMultiAgentAnalysis={useMultiAgentAnalysis}
                onToggleMultiAgentAnalysis={setUseMultiAgentAnalysis}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PanionChat;