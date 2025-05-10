/**
 * Conversation Memory System
 * Stores and retrieves conversation context for the enhanced chat system
 */

import { log } from './vite';
import { systemLog } from './system-logs';

// In-memory storage for conversation history by session ID
interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

interface ConversationMemory {
  [sessionId: string]: Message[];
}

// Store messages in memory for now
// In a production system, this would be persisted to a database
const conversations: ConversationMemory = {};

// Maximum number of messages to keep in memory per session
const MAX_CONVERSATION_LENGTH = 50;

// Maximum amount of time to keep a conversation in memory (1 hour in ms)
const MAX_CONVERSATION_AGE = 60 * 60 * 1000;

/**
 * Add a message to the conversation memory
 */
export async function addMessage(
  role: 'user' | 'assistant' | 'system',
  content: string,
  sessionId: string = 'default'
): Promise<void> {
  // Initialize conversation if it doesn't exist
  if (!conversations[sessionId]) {
    conversations[sessionId] = [];
  }

  // Add message
  conversations[sessionId].push({
    role,
    content,
    timestamp: Date.now()
  });

  // Trim conversation if it exceeds the maximum length
  if (conversations[sessionId].length > MAX_CONVERSATION_LENGTH) {
    // Remove oldest messages
    conversations[sessionId] = conversations[sessionId].slice(-MAX_CONVERSATION_LENGTH);
  }

  // Log that we added a message
  log(`Added ${role} message to conversation ${sessionId}`, 'memory');
}

/**
 * Get relevant context for a new message
 */
export async function getRelevantContext(
  message: string,
  sessionId: string = 'default'
): Promise<Message[]> {
  // Initialize conversation if it doesn't exist
  if (!conversations[sessionId]) {
    conversations[sessionId] = [];
    return [];
  }

  // Filter out old messages
  const now = Date.now();
  conversations[sessionId] = conversations[sessionId].filter(
    (msg) => now - msg.timestamp < MAX_CONVERSATION_AGE
  );

  // Get the most recent messages - this is a simple approach
  // In a production system, we might use more sophisticated context retrieval
  const recentMessages = conversations[sessionId].slice(-10);
  
  // Log the context retrieval
  log(`Retrieved context for conversation ${sessionId}: ${recentMessages.length} messages`, 'memory');
  
  return recentMessages;
}

/**
 * Clear conversation memory for a session
 */
export async function clearConversation(sessionId: string = 'default'): Promise<void> {
  if (conversations[sessionId]) {
    delete conversations[sessionId];
    systemLog.info(`Cleared conversation memory for session ${sessionId}`, 'memory');
  }
}

/**
 * Get all session IDs
 */
export function getSessionIds(): string[] {
  return Object.keys(conversations);
}

/**
 * Get conversation statistics
 */
export function getMemoryStats(): { [key: string]: any } {
  const sessions = Object.keys(conversations);
  
  return {
    totalSessions: sessions.length,
    totalMessages: sessions.reduce((total, sessionId) => {
      return total + conversations[sessionId].length;
    }, 0),
    sessionStats: sessions.map(sessionId => ({
      sessionId,
      messageCount: conversations[sessionId].length,
      firstMessageTime: new Date(conversations[sessionId][0]?.timestamp || Date.now()).toISOString(),
      lastMessageTime: new Date(
        conversations[sessionId][conversations[sessionId].length - 1]?.timestamp || Date.now()
      ).toISOString()
    }))
  };
}

// Initialize
systemLog.info('Conversation memory system initialized', 'memory');