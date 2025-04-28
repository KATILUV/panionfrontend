import fs from 'fs/promises';
import path from 'path';
import OpenAI from "openai";

const MEMORIES_FILE = path.join(process.cwd(), 'memories.json');
const SESSION_MEMORY_LIMIT = 20; // Maximum messages to keep in session memory

// Memory structure
interface Memory {
  sessionId: string;
  content: string;
  isUser: boolean;
  timestamp: string;
  important?: boolean;
}

// Initialize OpenAI client for memory operations
// the newest OpenAI model is "gpt-4o" which was released May 13, 2024
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || "" 
});

// In-memory storage for sessions (short-term memory)
const sessionMemories: Record<string, Memory[]> = {};

// Initialize memory file if it doesn't exist
async function initializeMemoryFile() {
  try {
    await fs.access(MEMORIES_FILE);
  } catch (error) {
    // File doesn't exist, create it
    await fs.writeFile(MEMORIES_FILE, JSON.stringify([], null, 2));
  }
}

// Load long-term memories from file
async function loadLongTermMemories(): Promise<Memory[]> {
  await initializeMemoryFile();
  
  try {
    const fileContent = await fs.readFile(MEMORIES_FILE, 'utf-8');
    return JSON.parse(fileContent);
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
    const memories = await loadLongTermMemories();
    memories.push(memory);
    await fs.writeFile(MEMORIES_FILE, JSON.stringify(memories, null, 2));
  } catch (error) {
    console.error('Error saving to long-term memory:', error);
  }
}

// Check if a memory is important enough to save long-term
async function isMemoryImportant(memory: Memory): Promise<boolean> {
  // Don't process system messages
  if (!memory.isUser && !memory.content.trim()) {
    return false;
  }
  
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Analyze the following message and determine if it contains important personal information, preferences, 
          facts, or context that would be valuable to remember for future conversations. 
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
  
  // Determine if memory should be saved long-term
  memory.important = await isMemoryImportant(memory);
  
  // Save important memories to long-term storage
  if (memory.important) {
    await saveLongTermMemory(memory);
  }
}

// Get conversation history for a specific session
export async function getConversationHistory(sessionId: string): Promise<Memory[]> {
  return sessionMemories[sessionId] || [];
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
