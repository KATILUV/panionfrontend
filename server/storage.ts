import { 
  users, type User, type InsertUser,
  conversations, type Conversation, type InsertConversation,
  messages, type Message, type InsertMessage
} from "@shared/schema";
import fs from 'fs';
import path from 'path';
import { log } from './vite';
import { systemLog } from './system-logs';

// modify the interface with any CRUD methods
// you might need
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Conversation methods
  getConversation(sessionId: string): Promise<Conversation | undefined>;
  getAllConversations(): Promise<Conversation[]>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(sessionId: string, updates: Partial<Conversation>): Promise<Conversation | undefined>;
  deleteConversation(sessionId: string): Promise<boolean>;
  
  // Message methods
  getMessages(sessionId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  deleteMessages(sessionId: string): Promise<boolean>;
  
  // Persistence methods
  saveToFile(): Promise<void>;
  loadFromFile(): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private conversations: Map<string, Conversation>;
  private messages: Map<string, Message[]>;
  private userCurrentId: number;
  private conversationCurrentId: number;
  private messageCurrentId: number;
  private dataDirectory: string;
  
  constructor() {
    this.users = new Map();
    this.conversations = new Map();
    this.messages = new Map();
    this.userCurrentId = 1;
    this.conversationCurrentId = 1;
    this.messageCurrentId = 1;
    
    // Set the data directory for conversation persistence
    this.dataDirectory = path.join(process.cwd(), 'panion_conversations');
    
    // Ensure directory exists
    if (!fs.existsSync(this.dataDirectory)) {
      fs.mkdirSync(this.dataDirectory, { recursive: true });
    }
    
    // Load data from file on startup
    this.loadFromFile().catch(err => {
      systemLog.error(`Failed to load conversations from file: ${err.message}`, 'storage');
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Conversation methods
  async getConversation(sessionId: string): Promise<Conversation | undefined> {
    return this.conversations.get(sessionId);
  }
  
  async getAllConversations(): Promise<Conversation[]> {
    return Array.from(this.conversations.values()).sort((a, b) => {
      // Sort by last updated, most recent first
      const dateA = new Date(a.lastUpdatedAt);
      const dateB = new Date(b.lastUpdatedAt);
      return dateB.getTime() - dateA.getTime();
    });
  }
  
  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const id = this.conversationCurrentId++;
    
    // Ensure messageCount is not undefined
    const messageCount = insertConversation.messageCount === undefined 
      ? 0 
      : insertConversation.messageCount;
    
    const conversation: Conversation = { 
      ...insertConversation, 
      id,
      messageCount 
    };
    
    this.conversations.set(conversation.sessionId, conversation);
    
    // Save changes to file
    await this.saveToFile();
    return conversation;
  }
  
  async updateConversation(sessionId: string, updates: Partial<Conversation>): Promise<Conversation | undefined> {
    const conversation = this.conversations.get(sessionId);
    if (!conversation) return undefined;
    
    const updatedConversation = { ...conversation, ...updates };
    this.conversations.set(sessionId, updatedConversation);
    
    // Save changes to file
    await this.saveToFile();
    return updatedConversation;
  }
  
  async deleteConversation(sessionId: string): Promise<boolean> {
    const result = this.conversations.delete(sessionId);
    
    // Also delete associated messages
    this.messages.delete(sessionId);
    
    // Save changes to file
    await this.saveToFile();
    return result;
  }
  
  // Message methods
  async getMessages(sessionId: string): Promise<Message[]> {
    return this.messages.get(sessionId) || [];
  }
  
  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.messageCurrentId++;
    
    // Ensure required fields have values
    const important = insertMessage.important === undefined 
      ? false 
      : insertMessage.important;
    
    const conversationMode = insertMessage.conversationMode === undefined 
      ? null 
      : insertMessage.conversationMode;
    
    const message: Message = { 
      ...insertMessage, 
      id,
      important,
      conversationMode
    };
    
    // Get existing messages for this session
    const sessionMessages = this.messages.get(message.sessionId) || [];
    sessionMessages.push(message);
    this.messages.set(message.sessionId, sessionMessages);
    
    // Update conversation details
    const conversation = this.conversations.get(message.sessionId);
    if (conversation) {
      this.updateConversation(message.sessionId, {
        lastUpdatedAt: message.timestamp,
        messageCount: sessionMessages.length,
      });
    }
    
    // Save changes to file
    await this.saveToFile();
    return message;
  }
  
  async deleteMessages(sessionId: string): Promise<boolean> {
    const result = this.messages.delete(sessionId);
    
    // Save changes to file
    await this.saveToFile();
    return result;
  }
  
  // Persistence methods
  async saveToFile(): Promise<void> {
    try {
      const data = {
        conversations: Array.from(this.conversations.values()),
        messages: Array.from(this.messages.entries()).map(([sessionId, messages]) => ({
          sessionId,
          messages,
        })),
      };
      
      const filePath = path.join(this.dataDirectory, 'conversations.json');
      await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2));
      log('Conversations saved to file', 'storage');
    } catch (error: any) {
      systemLog.error(`Failed to save conversations to file: ${error.message}`, 'storage');
    }
  }
  
  async loadFromFile(): Promise<void> {
    try {
      const filePath = path.join(this.dataDirectory, 'conversations.json');
      
      if (!fs.existsSync(filePath)) {
        log('No conversation file found, starting with empty state', 'storage');
        return;
      }
      
      const fileData = await fs.promises.readFile(filePath, 'utf-8');
      const data = JSON.parse(fileData);
      
      // Load conversations
      if (data.conversations && Array.isArray(data.conversations)) {
        data.conversations.forEach((conversation: Conversation) => {
          this.conversations.set(conversation.sessionId, conversation);
          // Update the ID counter to be greater than any existing ID
          this.conversationCurrentId = Math.max(this.conversationCurrentId, conversation.id + 1);
        });
      }
      
      // Load messages
      if (data.messages && Array.isArray(data.messages)) {
        data.messages.forEach((item: { sessionId: string, messages: Message[] }) => {
          this.messages.set(item.sessionId, item.messages);
          
          // Update the ID counter
          if (item.messages.length > 0) {
            const maxId = Math.max(...item.messages.map(m => m.id));
            this.messageCurrentId = Math.max(this.messageCurrentId, maxId + 1);
          }
        });
      }
      
      log(`Loaded ${this.conversations.size} conversations and ${this.messages.size} message threads`, 'storage');
    } catch (error: any) {
      systemLog.error(`Failed to load conversations from file: ${error.message}`, 'storage');
    }
  }
}

export const storage = new MemStorage();
