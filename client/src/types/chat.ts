// Centralized chat-related types and constants

// Chat message interface used by all agents
export interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: string;
  thinking?: string;
  imageUrl?: string;
  component?: React.ReactNode;
  thinkingState?: ThinkingState;
  sentiment?: MessageSentiment;
  isTyping?: boolean;
  personalityTraits?: string[];
}

// Thinking state to show Panion's thought process in real-time
export type ThinkingState = 
  | 'listening'     // Actively listening to user input
  | 'processing'    // Processing the user's message
  | 'recalling'     // Retrieving memory information
  | 'analyzing'     // Analyzing content or data
  | 'deliberating'  // Weighing different options
  | 'connecting'    // Making connections between ideas
  | 'generating'    // Generating a response
  | 'complete';     // Finished processing

// Message sentiment for adding emotional tone
export type MessageSentiment = 
  | 'neutral'   // Default neutral tone
  | 'thoughtful' // Reflective, considerate
  | 'excited'   // Enthusiastic, energetic
  | 'curious'   // Inquisitive, interested
  | 'concerned' // Worried, cautious
  | 'confident' // Sure, assertive
  | 'empathetic'; // Understanding, compassionate

// API response interface
export interface ChatResponse {
  response: string;
  thinking?: string;
  conversationId?: string;
  timestamp?: string;
  additional_info?: Record<string, any>;
  imageUrl?: string;
}

// Define common capability types for better organization and consistency
export const CAPABILITIES = {
  WEB_RESEARCH: 'web_research',
  DATA_ANALYSIS: 'data_analysis',
  CONTACT_FINDER: 'contact_finder',
  BUSINESS_RESEARCH: 'business_research',
  BUSINESS_DIRECTORY: 'business_directory',
  SMOKESHOP_DATA: 'smokeshop_data',
  COFFEE_SHOP_DATA: 'coffee_shop_data',
  STRATEGIC_PLANNING: 'strategic_planning',
};

// Agent status types
export type AgentStatusType = 'idle' | 'thinking' | 'active' | 'error';