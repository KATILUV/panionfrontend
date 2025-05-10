/**
 * Enhanced Conversation Memory System
 * Stores and retrieves conversation context with persistence
 */

import { log } from './vite';
import { systemLog } from './system-logs';
import { storage } from './storage';
import { type Message, type InsertMessage, type Conversation, type InsertConversation } from '@shared/schema';

// Convert between storage Message and internal MemoryMessage
interface MemoryMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  conversationMode?: string;
}

// Maximum number of messages to keep per session
const MAX_CONVERSATION_LENGTH = 100;

// Maximum amount of time to keep a conversation (1 week in ms)
const MAX_CONVERSATION_AGE = 7 * 24 * 60 * 60 * 1000;

/**
 * Generate a default title for a conversation based on content
 */
async function generateTitle(content: string): Promise<string> {
  // For now, just use the first 20 characters of the message
  // In a production system, we might use an AI to generate a better title
  if (!content || content.length === 0) {
    return `Conversation ${new Date().toLocaleDateString()}`;
  }
  
  const truncated = content.length > 20 
    ? content.substring(0, 20) + '...'
    : content;
  
  return truncated;
}

/**
 * Add a message to the conversation memory with persistence
 */
export async function addMessage(
  role: 'user' | 'assistant' | 'system',
  content: string,
  sessionId: string = 'default',
  conversationMode: string = 'casual'
): Promise<void> {
  const timestamp = new Date().toISOString();
  
  // Check if conversation exists, create if not
  const existingConversation = await storage.getConversation(sessionId);
  
  if (!existingConversation) {
    // Generate a title based on the first message
    const title = await generateTitle(content);
    
    // Create new conversation
    await storage.createConversation({
      sessionId,
      title,
      createdAt: timestamp,
      lastUpdatedAt: timestamp,
      messageCount: 1
    });
  }
  
  // Create and store the message
  const message: InsertMessage = {
    content,
    role,
    timestamp,
    sessionId,
    important: false,
    conversationMode
  };
  
  await storage.createMessage(message);
  
  // Log that we added a message
  log(`Added ${role} message to conversation ${sessionId}`, 'memory');
}

/**
 * Get relevant context for a new message
 */
export async function getRelevantContext(
  message: string,
  sessionId: string = 'default'
): Promise<MemoryMessage[]> {
  // Get messages for this session
  const messages = await storage.getMessages(sessionId);
  
  if (messages.length === 0) {
    return [];
  }
  
  // Filter out old messages
  const now = new Date();
  const cutoffDate = new Date(now.getTime() - MAX_CONVERSATION_AGE);
  const recentMessages = messages.filter(msg => {
    const msgDate = new Date(msg.timestamp);
    return msgDate >= cutoffDate;
  });
  
  // Trim to most recent messages if needed
  const contextMessages = recentMessages.length > MAX_CONVERSATION_LENGTH
    ? recentMessages.slice(-MAX_CONVERSATION_LENGTH)
    : recentMessages;
  
  // Convert to MemoryMessage format
  const memoryMessages: MemoryMessage[] = contextMessages.map(msg => ({
    role: msg.role as 'user' | 'assistant' | 'system',
    content: msg.content,
    timestamp: new Date(msg.timestamp).getTime(),
    conversationMode: msg.conversationMode || undefined
  }));
  
  // Log the context retrieval
  log(`Retrieved context for conversation ${sessionId}: ${memoryMessages.length} messages`, 'memory');
  
  return memoryMessages;
}

/**
 * Clear conversation memory for a session
 */
export async function clearConversation(sessionId: string = 'default'): Promise<void> {
  await storage.deleteConversation(sessionId);
  await storage.deleteMessages(sessionId);
  systemLog.info(`Cleared conversation memory for session ${sessionId}`, 'memory');
}

/**
 * Get all session IDs
 */
export async function getSessionIds(): Promise<string[]> {
  const conversations = await storage.getAllConversations();
  return conversations.map(conversation => conversation.sessionId);
}

/**
 * Get conversation statistics
 */
export async function getMemoryStats(): Promise<{ [key: string]: any }> {
  const conversations = await storage.getAllConversations();
  
  let totalMessages = 0;
  const sessionStats = [];
  
  for (const conversation of conversations) {
    const messages = await storage.getMessages(conversation.sessionId);
    totalMessages += messages.length;
    
    sessionStats.push({
      sessionId: conversation.sessionId,
      title: conversation.title,
      messageCount: messages.length,
      firstMessageTime: conversation.createdAt,
      lastMessageTime: conversation.lastUpdatedAt
    });
  }
  
  return {
    totalSessions: conversations.length,
    totalMessages,
    sessionStats
  };
}

/**
 * List all conversations with metadata
 */
export async function listConversations(): Promise<Conversation[]> {
  return storage.getAllConversations();
}

/**
 * Get full conversation history for a session
 */
export async function getConversationHistory(sessionId: string): Promise<Message[]> {
  return storage.getMessages(sessionId);
}

/**
 * Rename a conversation
 */
export async function renameConversation(sessionId: string, title: string): Promise<Conversation | undefined> {
  return storage.updateConversation(sessionId, { title });
}

/**
 * Clean up old conversations
 */
export async function cleanupOldConversations(): Promise<number> {
  const conversations = await storage.getAllConversations();
  const now = new Date();
  const cutoffDate = new Date(now.getTime() - MAX_CONVERSATION_AGE);
  
  let count = 0;
  
  for (const conversation of conversations) {
    const lastUpdated = new Date(conversation.lastUpdatedAt);
    if (lastUpdated < cutoffDate) {
      await storage.deleteConversation(conversation.sessionId);
      await storage.deleteMessages(conversation.sessionId);
      count++;
    }
  }
  
  if (count > 0) {
    systemLog.info(`Cleaned up ${count} old conversations`, 'memory');
  }
  
  return count;
}

// Initialize and run initial cleanup
systemLog.info('Conversation memory system initialized', 'memory');
cleanupOldConversations().catch(err => {
  systemLog.error(`Failed to clean up old conversations: ${err.message}`, 'memory');
});