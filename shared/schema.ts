import { pgTable, text, serial, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema (keeping original schema)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  // New fields for user customization
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  bio: text("bio"),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  displayName: true,
  avatarUrl: true,
  bio: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// User preferences for personalization
export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  // Preferred conversation mode
  preferredMode: text("preferred_mode").default("casual"),
  // UI preferences
  theme: text("theme").default("system"),
  fontSize: text("font_size").default("medium"),
  // AI personality settings
  personalityTraits: jsonb("personality_traits").$type<string[]>(),
  // Notification preferences
  enableNotifications: boolean("enable_notifications").default(true),
  // System preferences
  showThinkingProcess: boolean("show_thinking_process").default(true),
  agentReactiveness: text("agent_reactiveness").default("balanced"),
  // Response preferences
  responseLength: text("response_length").default("balanced"),
  detailLevel: text("detail_level").default("balanced"),
  // Feature toggles
  multiAgentAnalysisEnabled: boolean("multi_agent_analysis_enabled").default(true),
  memoryUtilizationLevel: text("memory_utilization_level").default("medium"),
  // Customization data
  lastUpdated: text("last_updated").notNull().default(new Date().toISOString()),
  customSettings: jsonb("custom_settings").$type<Record<string, any>>(),
});

export const insertUserPreferencesSchema = createInsertSchema(userPreferences).pick({
  userId: true,
  preferredMode: true,
  theme: true,
  fontSize: true,
  personalityTraits: true,
  enableNotifications: true,
  showThinkingProcess: true,
  agentReactiveness: true,
  responseLength: true,
  detailLevel: true,
  multiAgentAnalysisEnabled: true,
  memoryUtilizationLevel: true,
  customSettings: true,
});

export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;
export type UserPreferences = typeof userPreferences.$inferSelect;

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
