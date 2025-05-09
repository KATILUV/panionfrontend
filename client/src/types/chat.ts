// Centralized chat-related types and constants

// Chat message interface used by all agents
export interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: string;
  thinking?: string;
  component?: React.ReactNode;
}

// API response interface
export interface ChatResponse {
  response: string;
  thinking?: string;
  conversationId?: string;
  timestamp?: string;
  additional_info?: Record<string, any>;
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