import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema (keeping original schema)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Chat message schema
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  role: text("role").notNull(), // 'user', 'assistant', or 'system'
  timestamp: text("timestamp").notNull(),
  sessionId: text("session_id").notNull(),
  important: boolean("important").default(false),
  conversationMode: text("conversation_mode"), // 'casual', 'deep', 'strategic', 'logical', etc.
  imageUrl: text("image_url"), // URL for image attachments
  imageAnalysis: text("image_analysis"), // AI analysis of the image
  mediaType: text("media_type"), // 'text', 'image', 'mixed'
  isUser: boolean("is_user").default(true), // Whether this is a user message or AI response
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  content: true,
  role: true,
  timestamp: true,
  sessionId: true,
  important: true,
  conversationMode: true,
  imageUrl: true,
  imageAnalysis: true,
  mediaType: true,
  isUser: true,
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// Conversations schema for tracking conversation sessions
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  title: text("title").notNull(),
  createdAt: text("created_at").notNull(),
  lastUpdatedAt: text("last_updated_at").notNull(),
  messageCount: integer("message_count").default(0),
});

export const insertConversationSchema = createInsertSchema(conversations).pick({
  sessionId: true,
  title: true,
  createdAt: true,
  lastUpdatedAt: true,
  messageCount: true,
});

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;
