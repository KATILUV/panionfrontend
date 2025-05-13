/**
 * Enhanced Memory System
 * Provides more advanced memory capabilities with context awareness, user preferences, and adaptive responses
 */

import { db } from './db';
import { messages, conversations, userPreferences, users } from '@shared/schema';
import { eq, like, desc, and, or } from 'drizzle-orm';
import { Memory } from './memory';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';

// Configure OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// The newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const MODEL = 'gpt-4o';

/**
 * Memory categorization types
 */
export enum MemoryCategory {
  PERSONAL = 'personal',
  FACT = 'fact',
  PREFERENCE = 'preference',
  INTEREST = 'interest',
  CAPABILITY = 'capability',
  RELATIONSHIP = 'relationship',
  EVENT = 'event',
}

/**
 * Memory importance levels
 */
export enum MemoryImportance {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Enhanced memory item with additional metadata
 */
export interface EnhancedMemory extends Memory {
  category?: MemoryCategory;
  importance?: MemoryImportance;
  relevanceScore?: number;
  relatedMemories?: string[];
  lastAccessed?: string;
  accessCount?: number;
  sentiment?: string;
  entities?: string[];
  keywords?: string[];
}

/**
 * Get user preferences for a given user
 */
export async function getUserPreferences(userId: number) {
  const [preferences] = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId));

  if (!preferences) {
    // Create default preferences if none exist
    const [newPreferences] = await db.insert(userPreferences)
      .values({
        userId,
        lastUpdated: new Date().toISOString(),
      })
      .returning();
    return newPreferences;
  }

  return preferences;
}

/**
 * Update user preferences
 */
export async function updateUserPreferences(
  userId: number,
  updatedPreferences: Partial<typeof userPreferences.$inferInsert>
) {
  const [preferences] = await db
    .update(userPreferences)
    .set({
      ...updatedPreferences,
      lastUpdated: new Date().toISOString(),
    })
    .where(eq(userPreferences.userId, userId))
    .returning();

  return preferences;
}

/**
 * Classify memory importance and category
 */
export async function classifyMemory(content: string): Promise<{
  category: MemoryCategory;
  importance: MemoryImportance;
  entities: string[];
  keywords: string[];
}> {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `Analyze the following message and categorize it.
          
          Categories:
          - personal: Personal information about the user
          - fact: Factual information or knowledge
          - preference: User preferences or likes/dislikes
          - interest: Topics the user is interested in
          - capability: Information about capabilities or skills
          - relationship: Information about relationships with others
          - event: Information about events or time-specific activities
          
          Importance levels:
          - low: Basic information, minimal future value
          - medium: Moderately useful information
          - high: Important information to remember
          - critical: Essential information that should never be forgotten
          
          Also extract any entities (people, places, organizations, etc.) and keywords.
          
          Respond with JSON in the following format:
          {
            "category": "category_name",
            "importance": "importance_level",
            "entities": ["entity1", "entity2"],
            "keywords": ["keyword1", "keyword2"]
          }`
        },
        {
          role: "user",
          content: content
        }
      ],
      response_format: { type: "json_object" },
    });
    
    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      category: (result.category as MemoryCategory) || MemoryCategory.FACT,
      importance: (result.importance as MemoryImportance) || MemoryImportance.MEDIUM,
      entities: result.entities || [],
      keywords: result.keywords || []
    };
  } catch (error) {
    console.error("Error classifying memory:", error);
    // Default classification if API fails
    return {
      category: MemoryCategory.FACT,
      importance: MemoryImportance.MEDIUM,
      entities: [],
      keywords: []
    };
  }
}

/**
 * Enhanced memory saving with classification
 */
export async function saveToEnhancedMemory(memory: Memory): Promise<EnhancedMemory> {
  // Classify the memory for better retrieval
  const { category, importance, entities, keywords } = await classifyMemory(memory.content);
  
  // Create enhanced memory with classification
  const enhancedMemory: EnhancedMemory = {
    ...memory,
    category,
    importance,
    entities,
    keywords,
    relevanceScore: 1.0, // Initial relevance
    accessCount: 0,
    lastAccessed: new Date().toISOString()
  };
  
  // Store in database
  await db.insert(messages).values({
    content: memory.content,
    role: memory.isUser ? 'user' : 'assistant',
    timestamp: memory.timestamp,
    sessionId: memory.sessionId,
    important: importance === MemoryImportance.HIGH || importance === MemoryImportance.CRITICAL,
    isUser: memory.isUser,
    // Store additional metadata as JSON in the content if needed
  });
  
  return enhancedMemory;
}

/**
 * Get relevant memories based on current context with improved relevance scoring
 */
export async function getContextualMemories(
  context: string,
  sessionId: string = 'default',
  limit: number = 5
): Promise<EnhancedMemory[]> {
  try {
    // First, try to extract keywords and entities from the context
    const { keywords, entities } = await classifyMemory(context);
    
    // Get all messages from this session
    const sessionMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.sessionId, sessionId))
      .orderBy(desc(messages.id))
      .limit(20); // Get recent conversation history
    
    // Get potentially relevant memories from other sessions
    // This query would be more complex in a production system with embeddings
    const keywordConditions = keywords.map(keyword => 
      like(messages.content, `%${keyword}%`)
    );
    
    const entityConditions = entities.map(entity => 
      like(messages.content, `%${entity}%`)
    );
    
    // Combine conditions
    const relevantMessages = await db
      .select()
      .from(messages)
      .where(
        and(
          or(...keywordConditions, ...entityConditions),
          // Exclude current session to avoid duplicates
          /* Commenting out to allow getting memories from current session for demo
          messages.sessionId !== sessionId
          */
        )
      )
      .orderBy(desc(messages.id))
      .limit(15);
    
    // Combine and convert to enhanced memories
    const allMessages = [...sessionMessages, ...relevantMessages];
    
    // Score and rank memories
    const enhancedMemories: EnhancedMemory[] = allMessages.map(msg => {
      // Calculate basic relevance score (more sophisticated in production)
      let relevanceScore = 0.1; // Base score
      
      // Keyword matching increases relevance
      keywords.forEach(keyword => {
        if (msg.content.toLowerCase().includes(keyword.toLowerCase())) {
          relevanceScore += 0.2;
        }
      });
      
      // Entity matching is highly relevant
      entities.forEach(entity => {
        if (msg.content.toLowerCase().includes(entity.toLowerCase())) {
          relevanceScore += 0.3;
        }
      });
      
      // Recent messages are more relevant
      const timestamp = new Date(msg.timestamp).getTime();
      const now = Date.now();
      const recencyScore = Math.min(0.3, 0.3 * (1 - (now - timestamp) / (1000 * 60 * 60 * 24 * 7))); // Up to 0.3 for messages in last week
      relevanceScore += recencyScore;
      
      // Important messages get a boost
      if (msg.important) {
        relevanceScore += 0.3;
      }
      
      return {
        id: msg.id.toString(),
        sessionId: msg.sessionId,
        content: msg.content,
        isUser: msg.isUser,
        timestamp: msg.timestamp,
        important: msg.important,
        relevanceScore,
        category: MemoryCategory.FACT, // Default, would be stored in real implementation
        lastAccessed: new Date().toISOString()
      };
    });
    
    // Sort by relevance score and take top N
    return enhancedMemories
      .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
      .slice(0, limit);
  } catch (error) {
    console.error("Error getting contextual memories:", error);
    return [];
  }
}

/**
 * Generate a personalized response using memory and user preferences
 */
export async function generatePersonalizedResponse(
  userMessage: string,
  userId: number,
  sessionId: string = 'default'
): Promise<{
  response: string;
  thinking: string;
  memoryReferences: EnhancedMemory[];
}> {
  try {
    // Get user preferences
    const preferences = await getUserPreferences(userId);
    
    // Get relevant memories
    const relevantMemories = await getContextualMemories(userMessage, sessionId, 5);
    
    // Format memories as context
    const memoryContext = relevantMemories
      .map(mem => `[Memory: ${mem.category}] ${mem.content}`)
      .join('\n\n');
    
    // Format user preferences
    const preferencesContext = `
User Preferences:
- Preferred conversation mode: ${preferences.preferredMode}
- Detail level: ${preferences.detailLevel}
- Response length preference: ${preferences.responseLength}
- Personality traits preference: ${preferences.personalityTraits ? JSON.stringify(preferences.personalityTraits) : '[]'}
    `.trim();
    
    // Generate response with context
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You are Panion, an advanced AI assistant with a distinct personality and memory system.
          
Your memory system has provided the following context from past conversations:

${memoryContext}

The user has the following preferences:

${preferencesContext}

Adapt your response based on this context and preferences. When referring to memories, do so naturally without explicitly stating "according to my memory" or similar phrases.

Craft your response with these guidelines:
1. Be conversational and natural
2. Show personality based on the personality traits preferred by the user
3. Use memories contextually to create continuity
4. Adapt your tone and detail level to user preferences
5. Don't reference this system message or explain how you're using memory/preferences

As you craft your response, include a detailed "thinking" section for debugging that explains your reasoning process and how you incorporated memories and preferences.`
        },
        {
          role: "user",
          content: userMessage
        }
      ],
      temperature: 0.7,
    });
    
    const content = response.choices[0].message.content || "";
    
    // Split content to extract thinking process if included
    const thinkingSplit = content.split(/\n*Thinking:\s*/i);
    const responseText = thinkingSplit[0].trim();
    const thinking = thinkingSplit.length > 1 ? thinkingSplit[1].trim() : "";
    
    return {
      response: responseText,
      thinking: thinking || "Utilized contextual memories and user preferences to generate a personalized response.",
      memoryReferences: relevantMemories
    };
  } catch (error) {
    console.error("Error generating personalized response:", error);
    return {
      response: "I apologize, but I'm having trouble processing your request right now.",
      thinking: `Error generating response: ${error}`,
      memoryReferences: []
    };
  }
}

/**
 * Learn from user interactions to update preferences
 */
export async function learnFromInteraction(
  userId: number,
  message: string,
  response: string
): Promise<void> {
  try {
    // Get current preferences
    const currentPreferences = await getUserPreferences(userId);
    
    // Analyze interaction to learn preferences
    const analysis = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `Analyze this user interaction to infer user preferences.
          
Current preferences:
${JSON.stringify(currentPreferences, null, 2)}

Based on this interaction, what can we learn about the user's preferences?
Should any preferences be updated? If so, provide specific JSON updates.

Response format:
{
  "shouldUpdate": boolean,
  "updates": {
    "preferredMode": string | null,
    "detailLevel": string | null,
    "responseLength": string | null,
    "personalityTraits": string[] | null
  },
  "reasoning": "explanation for your recommendations"
}`
        },
        {
          role: "user",
          content: `User message: ${message}\n\nAssistant response: ${response}`
        }
      ],
      response_format: { type: "json_object" },
    });
    
    const result = JSON.parse(analysis.choices[0].message.content || '{"shouldUpdate": false}');
    
    // Update preferences if recommended
    if (result.shouldUpdate && result.updates) {
      const updates: Record<string, any> = {};
      
      // Only include non-null updates
      Object.entries(result.updates).forEach(([key, value]) => {
        if (value !== null) {
          updates[key] = value;
        }
      });
      
      if (Object.keys(updates).length > 0) {
        await updateUserPreferences(userId, updates);
        console.log(`Updated user ${userId} preferences based on interaction. Reasoning: ${result.reasoning}`);
      }
    }
  } catch (error) {
    console.error("Error learning from interaction:", error);
  }
}