/**
 * Conversation Mode Types
 * Defines the different conversation modes available for Panion
 */

// Available conversation modes
export type ConversationMode = 'casual' | 'deep' | 'strategic' | 'logical';

// Configuration for each mode
export interface ModeConfig {
  id: ConversationMode;
  name: string;
  description: string;
  icon: string; // Icon name from Lucide
  systemPrompt: string; // System prompt to set the conversation tone
  color?: string; // Optional theme color 
}

// Configuration for all conversation modes
export const CONVERSATION_MODES: Record<ConversationMode, ModeConfig> = {
  casual: {
    id: 'casual',
    name: 'Casual',
    description: 'Friendly, conversational, and relaxed responses',
    icon: 'Coffee',
    systemPrompt: 'You are a friendly and helpful AI assistant. Respond conversationally with a casual tone, using simple language and occasional humor when appropriate. Keep your responses concise unless the user asks for detail.',
    color: 'bg-blue-500'
  },
  deep: {
    id: 'deep',
    name: 'Deep',
    description: 'Thoughtful, philosophical, and nuanced responses',
    icon: 'BookOpen',
    systemPrompt: 'You are a thoughtful AI assistant specializing in deep, nuanced analysis. Explore ideas thoroughly, consider multiple perspectives, and include philosophical implications when relevant. Use rich language and conceptual frameworks while still being clear and articulate.',
    color: 'bg-purple-600'
  },
  strategic: {
    id: 'strategic',
    name: 'Strategic',
    description: 'Goal-oriented, analytical, and solution-focused responses',
    icon: 'Target',
    systemPrompt: 'You are a strategic AI assistant focused on achieving results. Provide structured, goal-oriented responses that consider objectives, challenges, and actionable solutions. Organize information with clear steps, prioritization, and measurable outcomes when appropriate.',
    color: 'bg-green-600'
  },
  logical: {
    id: 'logical',
    name: 'Logical',
    description: 'Precise, factual, and methodical responses',
    icon: 'CircuitBoard',
    systemPrompt: 'You are a logical AI assistant that prioritizes accuracy and clear reasoning. Present information in a structured, methodical manner with precise language and minimal embellishment. Distinguish clearly between facts, assumptions, and conclusions, and explain your chain of reasoning when appropriate.',
    color: 'bg-amber-600'
  }
};

// Default conversation mode
export const DEFAULT_CONVERSATION_MODE: ConversationMode = 'casual';