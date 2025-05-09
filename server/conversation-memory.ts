/**
 * Conversation Memory Management System
 * 
 * This module provides sophisticated memory management for long-running conversations
 * It includes:
 * 1. Automatic conversation summarization
 * 2. Memory pruning to prevent context overflow
 * 3. Key information extraction and persistence
 * 4. Hierarchical memory (short-term, medium-term, long-term)
 */

import { log } from './vite';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import * as knowledgeGraph from './knowledge-graph';

// Memory entry
interface MemoryEntry {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  importance: number; // 0-10 score
  tags: string[];
  embedding?: number[]; // Vector embedding for semantic search
}

// Memory chunk (summarized conversation segment)
interface MemoryChunk {
  id: string;
  summary: string;
  timeRange: {
    start: number;
    end: number;
  };
  messageIds: string[]; // References to original messages
  importance: number; // 0-10 score
  embedding?: number[]; // Vector embedding for semantic search
}

// Full conversation context
interface ConversationContext {
  sessionId: string;
  shortTermMemory: MemoryEntry[]; // Recent messages (full content)
  mediumTermMemory: MemoryChunk[]; // Summarized conversation segments
  longTermMemory: MemoryChunk[]; // Key insights and information
  facts: Array<{
    id: string;
    content: string;
    confidence: number;
    timestamp: number;
  }>;
  metadata: Record<string, any>;
  lastSummarized: number;
}

// Memory manager configuration
interface MemoryConfig {
  maxShortTermSize: number; // Max number of recent messages to keep in full
  shortTermSizeTokens: number; // Approximate max tokens for short term memory
  summarizeEveryMessages: number; // How often to summarize (message count)
  summarizeEveryMinutes: number; // How often to summarize (time-based)
  minImportanceThreshold: number; // Min importance score to keep in medium term
  persistPath?: string; // Where to save conversations
}

// OpenAI client
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || ""
});

// Default configuration
const DEFAULT_CONFIG: MemoryConfig = {
  maxShortTermSize: 20,
  shortTermSizeTokens: 4000,
  summarizeEveryMessages: 10,
  summarizeEveryMinutes: 15,
  minImportanceThreshold: 3,
  persistPath: './data/conversations'
};

// Active conversations
const activeConversations = new Map<string, ConversationContext>();

// Configuration
let config: MemoryConfig = { ...DEFAULT_CONFIG };

// Initialize conversations directory if needed
function initStorage(): void {
  if (config.persistPath) {
    try {
      if (!fs.existsSync(config.persistPath)) {
        fs.mkdirSync(config.persistPath, { recursive: true });
      }
    } catch (error) {
      log(`Error initializing conversation storage: ${error}`, 'memory');
    }
  }
}

/**
 * Initialize the memory system
 */
export function initialize(customConfig?: Partial<MemoryConfig>): void {
  config = { ...DEFAULT_CONFIG, ...customConfig };
  initStorage();
  log('Conversation memory system initialized', 'memory');
}

/**
 * Get or create a conversation context
 */
function getConversation(sessionId: string): ConversationContext {
  if (!activeConversations.has(sessionId)) {
    // Try to load from persistent storage
    let loadedContext: ConversationContext | null = null;
    
    if (config.persistPath) {
      try {
        const filePath = path.join(config.persistPath, `${sessionId}.json`);
        if (fs.existsSync(filePath)) {
          const data = fs.readFileSync(filePath, 'utf8');
          loadedContext = JSON.parse(data);
        }
      } catch (error) {
        log(`Error loading conversation ${sessionId}: ${error}`, 'memory');
      }
    }
    
    if (loadedContext) {
      activeConversations.set(sessionId, loadedContext);
    } else {
      // Create new conversation context
      activeConversations.set(sessionId, {
        sessionId,
        shortTermMemory: [],
        mediumTermMemory: [],
        longTermMemory: [],
        facts: [],
        metadata: {},
        lastSummarized: Date.now()
      });
    }
  }
  
  return activeConversations.get(sessionId)!;
}

/**
 * Save the conversation to persistent storage
 */
function saveConversation(sessionId: string): void {
  if (!config.persistPath) return;
  
  const conversation = activeConversations.get(sessionId);
  if (!conversation) return;
  
  try {
    const filePath = path.join(config.persistPath, `${sessionId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(conversation, null, 2));
  } catch (error) {
    log(`Error saving conversation ${sessionId}: ${error}`, 'memory');
  }
}

/**
 * Add a message to the conversation memory
 */
export async function addMessage(
  sessionId: string,
  role: 'user' | 'assistant' | 'system',
  content: string
): Promise<void> {
  const conversation = getConversation(sessionId);
  
  // Create memory entry
  const entry: MemoryEntry = {
    id: uuidv4(),
    role,
    content,
    timestamp: Date.now(),
    importance: 5, // Default medium importance
    tags: []
  };
  
  // Add to short-term memory
  conversation.shortTermMemory.push(entry);
  
  // Update embeddings for semantic search (async)
  try {
    createEmbedding(entry.content).then(embedding => {
      if (embedding) {
        entry.embedding = embedding;
      }
    });
  } catch (error) {
    log(`Error creating embedding: ${error}`, 'memory');
  }
  
  // Extract important information and update knowledge graph (async)
  setTimeout(() => {
    extractInformation(sessionId, entry).catch(error => {
      log(`Error extracting information: ${error}`, 'memory');
    });
  }, 100);
  
  // Check if we need to summarize
  const shouldSummarizeByCount = 
    conversation.shortTermMemory.length >= config.summarizeEveryMessages;
  
  const shouldSummarizeByTime = 
    (Date.now() - conversation.lastSummarized) > (config.summarizeEveryMinutes * 60 * 1000);
  
  if (shouldSummarizeByCount || shouldSummarizeByTime) {
    summarizeConversation(sessionId).catch(error => {
      log(`Error summarizing conversation: ${error}`, 'memory');
    });
  }
  
  // Save to persistence
  if (role === 'assistant') {
    saveConversation(sessionId);
  }
}

/**
 * Rate the importance of a memory entry
 */
async function rateImportance(entry: MemoryEntry): Promise<number> {
  // If no OpenAI API key, just return medium importance
  if (!process.env.OPENAI_API_KEY) {
    return 5;
  }
  
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Rate the importance of this message for memory retention on a scale of 1-10, where 10 is extremely important information that should be remembered long-term, and 1 is routine or trivial information. Return only the number."
        },
        {
          role: "user",
          content: `Message (${entry.role}): ${entry.content}`
        }
      ],
      temperature: 0.3,
      max_tokens: 10
    });
    
    const importanceText = response.choices[0].message.content?.trim() || '';
    const importanceValue = parseInt(importanceText, 10);
    
    if (isNaN(importanceValue) || importanceValue < 1 || importanceValue > 10) {
      return 5; // Default to medium importance if parsing fails
    }
    
    return importanceValue;
  } catch (error) {
    log(`Error rating importance: ${error}`, 'memory');
    return 5; // Default to medium importance on error
  }
}

/**
 * Create an embedding for semantic search
 */
async function createEmbedding(text: string): Promise<number[] | null> {
  if (!process.env.OPENAI_API_KEY) {
    return null; // Skip if no API key
  }
  
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: text
    });
    
    return response.data[0].embedding;
  } catch (error) {
    log(`Error creating embedding: ${error}`, 'memory');
    return null;
  }
}

/**
 * Extract important information from a message
 */
async function extractInformation(sessionId: string, entry: MemoryEntry): Promise<void> {
  if (!process.env.OPENAI_API_KEY) {
    return; // Skip if no API key
  }
  
  // Skip system messages
  if (entry.role === 'system') {
    return;
  }
  
  try {
    // Rate importance first
    const importance = await rateImportance(entry);
    entry.importance = importance;
    
    // Only extract facts from high-importance messages
    if (importance >= 7) {
      // Extract facts
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "Extract key facts from this message that should be remembered long-term. Return as a JSON array of strings, with each string being a distinct fact. Only extract factual information, not opinions or conversational elements."
          },
          {
            role: "user",
            content: entry.content
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3
      });
      
      try {
        const result = JSON.parse(response.choices[0].message.content || '{"facts": []}');
        const facts = Array.isArray(result.facts) ? result.facts : [];
        
        const conversation = getConversation(sessionId);
        
        // Add facts to conversation context
        facts.forEach((factContent: string) => {
          conversation.facts.push({
            id: uuidv4(),
            content: factContent,
            confidence: 0.8,
            timestamp: Date.now()
          });
        });
        
        // Also add high-importance facts to knowledge graph
        facts.forEach((factContent: string) => {
          knowledgeGraph.addKnowledge(factContent).catch(error => {
            log(`Error adding fact to knowledge graph: ${error}`, 'memory');
          });
        });
      } catch (error) {
        log(`Error parsing facts: ${error}`, 'memory');
      }
    }
  } catch (error) {
    log(`Error extracting information: ${error}`, 'memory');
  }
}

/**
 * Summarize conversation and manage memory hierarchies
 */
async function summarizeConversation(sessionId: string): Promise<void> {
  if (!process.env.OPENAI_API_KEY) {
    return; // Skip if no API key
  }
  
  const conversation = getConversation(sessionId);
  
  // Need at least a few messages to summarize
  if (conversation.shortTermMemory.length < 3) {
    return;
  }
  
  // Update last summarized timestamp
  conversation.lastSummarized = Date.now();
  
  try {
    // Build the conversation history for summarization
    const conversationHistory = conversation.shortTermMemory.map(entry => 
      `${entry.role}: ${entry.content}`
    ).join('\n\n');
    
    // Generate summary
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Summarize this conversation segment concisely, capturing key points, decisions, and information. Keep proper nouns, numbers, and critical details intact."
        },
        {
          role: "user",
          content: conversationHistory
        }
      ],
      temperature: 0.3,
      max_tokens: 300
    });
    
    const summary = response.choices[0].message.content || 'Conversation summary unavailable.';
    
    // Create a new memory chunk
    const chunk: MemoryChunk = {
      id: uuidv4(),
      summary,
      timeRange: {
        start: conversation.shortTermMemory[0].timestamp,
        end: conversation.shortTermMemory[conversation.shortTermMemory.length - 1].timestamp
      },
      messageIds: conversation.shortTermMemory.map(m => m.id),
      importance: Math.max(...conversation.shortTermMemory.map(m => m.importance))
    };
    
    // Create embedding for the summary
    const embedding = await createEmbedding(summary);
    if (embedding) {
      chunk.embedding = embedding;
    }
    
    // Add to medium-term memory
    conversation.mediumTermMemory.push(chunk);
    
    // Prune short-term memory if needed
    if (conversation.shortTermMemory.length > config.maxShortTermSize) {
      // Keep the most recent messages
      const keepCount = Math.ceil(config.maxShortTermSize / 2);
      conversation.shortTermMemory = conversation.shortTermMemory.slice(-keepCount);
    }
    
    // Move important chunks to long-term memory
    if (chunk.importance >= 8) {
      conversation.longTermMemory.push(chunk);
    }
    
    // Prune medium-term memory based on importance
    conversation.mediumTermMemory = conversation.mediumTermMemory.filter(
      chunk => chunk.importance >= config.minImportanceThreshold
    );
    
    // Save updates
    saveConversation(sessionId);
    
    log(`Summarized conversation for ${sessionId}`, 'memory');
  } catch (error) {
    log(`Error summarizing conversation: ${error}`, 'memory');
  }
}

/**
 * Get relevant context for a new message
 */
export async function getRelevantContext(
  sessionId: string,
  query: string,
  maxTokens: number = 2000
): Promise<string> {
  const conversation = getConversation(sessionId);
  
  // Always include short-term memory (most recent messages)
  let context = conversation.shortTermMemory.map(entry => 
    `${entry.role}: ${entry.content}`
  ).join('\n\n');
  
  // Include relevant facts
  const relevantFacts = conversation.facts
    .sort((a, b) => b.timestamp - a.timestamp) // Most recent first
    .slice(0, 10) // Limit to 10 most recent facts
    .map(fact => fact.content);
  
  if (relevantFacts.length > 0) {
    context += '\n\nKey information:\n' + relevantFacts.map(f => `- ${f}`).join('\n');
  }
  
  // If we have OpenAI API, try to add semantically relevant chunks
  if (process.env.OPENAI_API_KEY && conversation.mediumTermMemory.length > 0) {
    try {
      // Generate embedding for the query
      const queryEmbedding = await createEmbedding(query);
      
      if (queryEmbedding) {
        // Find relevant chunks from medium and long term memory
        const allChunks = [
          ...conversation.mediumTermMemory,
          ...conversation.longTermMemory
        ];
        
        // Only include chunks with embeddings
        const chunksWithEmbeddings = allChunks.filter(chunk => chunk.embedding);
        
        if (chunksWithEmbeddings.length > 0) {
          // Calculate cosine similarity
          const scoredChunks = chunksWithEmbeddings.map(chunk => {
            const similarity = calculateCosineSimilarity(queryEmbedding, chunk.embedding!);
            return { chunk, similarity };
          });
          
          // Sort by similarity
          scoredChunks.sort((a, b) => b.similarity - a.similarity);
          
          // Add top 3 most relevant chunks
          const relevantChunks = scoredChunks.slice(0, 3)
            .filter(item => item.similarity > 0.7) // Only if reasonably similar
            .map(item => item.chunk.summary);
          
          if (relevantChunks.length > 0) {
            context += '\n\nRelevant past conversation:\n' + 
              relevantChunks.map(s => `"${s}"`).join('\n\n');
          }
        }
      }
    } catch (error) {
      log(`Error finding relevant context: ${error}`, 'memory');
    }
  }
  
  return context;
}

/**
 * Calculate cosine similarity between two vectors
 */
function calculateCosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);
  
  if (normA === 0 || normB === 0) {
    return 0;
  }
  
  return dotProduct / (normA * normB);
}

/**
 * Clean up inactive conversations to free memory
 */
export function cleanupInactiveConversations(maxAgeHours: number = 24): void {
  const now = Date.now();
  const maxAge = maxAgeHours * 60 * 60 * 1000;
  
  let cleanupCount = 0;
  
  activeConversations.forEach((conversation, sessionId) => {
    // Find the timestamp of the most recent message
    const lastActivity = conversation.shortTermMemory.length > 0
      ? Math.max(...conversation.shortTermMemory.map(m => m.timestamp))
      : conversation.lastSummarized;
    
    if (now - lastActivity > maxAge) {
      // Save before removing
      saveConversation(sessionId);
      
      // Remove from active conversations
      activeConversations.delete(sessionId);
      cleanupCount++;
    }
  });
  
  if (cleanupCount > 0) {
    log(`Cleaned up ${cleanupCount} inactive conversations`, 'memory');
  }
}

// Set up periodic cleanup
setInterval(() => cleanupInactiveConversations(), 3600000); // Every hour

// Initialize at startup
initialize();