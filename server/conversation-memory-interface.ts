/**
 * Conversation Memory Interface
 * This file provides compatibility interfaces for the conversation memory system
 */

import * as conversationMemory from './conversation-memory';

// Interface matching what Panion expects from conversationMemory
export interface MemoryMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  conversationMode?: string;
}

export interface ConversationContextResult {
  messages: MemoryMessage[];
}

// Add message compatibility function that handles both old and new formats
export async function addMessage(
  sessionId: string, 
  role: 'user' | 'assistant' | 'system', 
  content: string, 
  options?: any
): Promise<void> {
  // Extract conversation mode from options if available
  const conversationMode = options?.conversationMode || 'casual';
  
  // Call the actual addMessage function with all parameters
  await conversationMemory.addMessage(role, content, sessionId, conversationMode);
}

// Get context compatibility function
export async function getRelevantContext(
  sessionId: string,
  message: string,
  options?: any
): Promise<ConversationContextResult> {
  // Get the messages from the real memory system
  const messages = await conversationMemory.getRelevantContext(message, sessionId);
  
  // Return in the format expected by the panion system
  return { messages };
}

// Cleanup compatibility function
export async function cleanupInactiveConversations(): Promise<number> {
  return conversationMemory.cleanupOldConversations();
}

// Export everything from the real conversation memory too
export * from './conversation-memory';