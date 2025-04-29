import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import OpenAI from "openai";
import { ChatCompletionMessageParam } from "openai/resources";

// Memory file locations
const MEMORIES_DIR = path.join(process.cwd(), 'clara_memory');
const MEMORIES_FILE = path.join(MEMORIES_DIR, 'memories.json');
const CONVERSATIONS_DIR = path.join(process.cwd(), 'clara_conversations');
const SESSION_MEMORY_LIMIT = 20; // Maximum messages to keep in session memory

// Memory structures
interface Memory {
  sessionId: string;  // Session identifier
  content: string;    // Content of the memory
  isUser: boolean;    // Whether this is a user message or Clara's response
  timestamp: string;  // When the memory was created
  important?: boolean; // Whether this is an important memory
  date?: string;      // Date in YYYY-MM-DD format (for long-term storage)
}

interface MemoryStore {
  memories: Memory[];
}

// Initialize OpenAI client for memory operations
// the newest OpenAI model is "gpt-4o" which was released May 13, 2024
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || "" 
});

// In-memory storage for sessions (short-term memory)
const sessionMemories: Record<string, Memory[]> = {};

// Initialize memory directories and files if they don't exist
async function initializeMemorySystem() {
  // Create directories if they don't exist
  if (!fsSync.existsSync(MEMORIES_DIR)) {
    await fs.mkdir(MEMORIES_DIR, { recursive: true });
  }
  
  if (!fsSync.existsSync(CONVERSATIONS_DIR)) {
    await fs.mkdir(CONVERSATIONS_DIR, { recursive: true });
  }
  
  // Initialize memories file if it doesn't exist
  try {
    await fs.access(MEMORIES_FILE);
  } catch (error) {
    // File doesn't exist, create it
    await fs.writeFile(MEMORIES_FILE, JSON.stringify({ memories: [] }, null, 2));
  }
}

// Load long-term memories from file
async function loadLongTermMemories(): Promise<Memory[]> {
  await initializeMemorySystem();
  
  try {
    const fileContent = await fs.readFile(MEMORIES_FILE, 'utf-8');
    const memoryStore = JSON.parse(fileContent) as MemoryStore;
    return memoryStore.memories || [];
  } catch (error) {
    console.error('Error loading memories:', error);
    return [];
  }
}

// Save to long-term memory file
async function saveLongTermMemory(memory: Memory) {
  // Only save important memories long-term
  if (!memory.important) return;
  
  try {
    await initializeMemorySystem();
    const fileContent = await fs.readFile(MEMORIES_FILE, 'utf-8');
    const memoryStore = JSON.parse(fileContent) as MemoryStore;
    
    // Add date field in YYYY-MM-DD format if not present
    if (!memory.date) {
      memory.date = new Date().toISOString().slice(0, 10);
    }
    
    memoryStore.memories.push(memory);
    await fs.writeFile(MEMORIES_FILE, JSON.stringify(memoryStore, null, 2));
  } catch (error) {
    console.error('Error saving to long-term memory:', error);
  }
}

// Save current conversation to a file
export async function saveConversation(sessionId: string): Promise<void> {
  try {
    await initializeMemorySystem();
    
    const conversation = sessionMemories[sessionId] || [];
    if (conversation.length === 0) return; // Don't save empty conversations
    
    const timestamp = new Date().toISOString().replace(/:/g, '-').slice(0, 19);
    const filePath = path.join(CONVERSATIONS_DIR, `conversation_${timestamp}.json`);
    
    await fs.writeFile(filePath, JSON.stringify(conversation, null, 2));
  } catch (error) {
    console.error('Error saving conversation:', error);
  }
}

// Check if a memory is important enough to save long-term
async function isMemoryImportant(memory: Memory): Promise<boolean> {
  // Don't process system messages or empty content
  if (!memory.content.trim()) {
    return false;
  }
  
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Analyze the following message and determine if it contains important personal information, preferences, 
          facts, or context that would be valuable to remember for future conversations with this user. 
          Important information includes personal details, preferences, interests, facts about their life,
          significant events, or any context that would help personalize future interactions.
          Respond with JSON in the format: {"important": true/false, "reason": "brief explanation"}`
        },
        {
          role: "user",
          content: memory.content
        }
      ],
      response_format: { type: "json_object" }
    });
    
    const result = JSON.parse(response.choices[0].message.content || '{"important": false}');
    return result.important === true;
  } catch (error) {
    console.error('Error determining memory importance:', error);
    return false;
  }
}

// Save a memory (to both short-term and potentially long-term)
export async function saveToMemory(memory: Memory): Promise<void> {
  // Initialize session memory if it doesn't exist
  if (!sessionMemories[memory.sessionId]) {
    sessionMemories[memory.sessionId] = [];
  }
  
  // Add to session memory
  sessionMemories[memory.sessionId].push(memory);
  
  // Trim session memory if it exceeds the limit
  if (sessionMemories[memory.sessionId].length > SESSION_MEMORY_LIMIT) {
    sessionMemories[memory.sessionId].shift();
  }
  
  // Determine if memory should be saved long-term (only for user messages or important AI responses)
  if (memory.isUser || (memory.content.includes("I'll remember") || memory.content.includes("I've noted"))) {
    memory.important = await isMemoryImportant(memory);
    
    // Save important memories to long-term storage
    if (memory.important) {
      await saveLongTermMemory(memory);
    }
  }
}

// Get conversation history for a specific session
export async function getConversationHistory(sessionId: string): Promise<Memory[]> {
  return sessionMemories[sessionId] || [];
}

// Search through memories using a simple keyword approach
export async function searchMemories(query: string): Promise<Memory[]> {
  const memories = await loadLongTermMemories();
  
  if (memories.length === 0) {
    return [];
  }
  
  // Simple keyword search
  return memories.filter(memory => 
    memory.content.toLowerCase().includes(query.toLowerCase())
  );
}

// Get relevant memories from long-term storage based on current message
export async function getRelevantMemories(message: string): Promise<Memory[]> {
  const memories = await loadLongTermMemories();
  
  if (memories.length === 0) {
    return [];
  }
  
  try {
    // Use OpenAI to find relevant memories
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Given the following message and a list of memories, 
          identify the indices of memories that are most relevant to the message.
          Consider semantic meaning, not just keywords.
          Return at most 3 memories that would be helpful for understanding context.
          Respond with JSON in the format: {"relevantIndices": [array of indices]}`
        },
        {
          role: "user",
          content: `
          Message: ${message}
          
          Memories:
          ${memories.map((m, i) => `${i}: ${m.content}`).join('\n')}
          `
        }
      ],
      response_format: { type: "json_object" }
    });
    
    const result = JSON.parse(response.choices[0].message.content || '{"relevantIndices": []}');
    
    // Return relevant memories
    return result.relevantIndices.map((index: number) => memories[index]).filter(Boolean);
  } catch (error) {
    console.error('Error retrieving relevant memories:', error);
    return [];
  }
}

// Enhanced memory search that uses AI to find semantic matches
export async function smartMemorySearch(query: string): Promise<string> {
  const memories = await loadLongTermMemories();
  
  if (memories.length === 0) {
    return "🧠 Clara has no memories yet.";
  }
  
  try {
    // Format memories for the prompt
    const memoriesText = memories.map(m => {
      const date = m.date || m.timestamp.split('T')[0];
      return `${date}: ${m.content}`;
    }).join('\n');
    
    // Create a prompt for the AI to find relevant memories
    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: `You are Clara's intelligent memory search agent.
        Here are all her past memories:
        
        ${memoriesText}
        
        The user asked: '${query}'
        
        Find the 3 most relevant memories based on meaning, not just keywords.
        Summarize why they are relevant.
        Format the output as a readable bullet list with emoji indicators.`
      }
    ];
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages,
      temperature: 0.7,
      max_tokens: 500,
    });
    
    return response.choices[0].message.content || "No relevant memories found.";
  } catch (error) {
    console.error('Error in smart memory search:', error);
    return "Sorry, I had trouble searching through my memories.";
  }
}
