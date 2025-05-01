// Define chat-related types

export interface Message {
  content: string;
  isUser: boolean;
  timestamp: string;
  imageUrl?: string;
}

export interface ChatResponse {
  response: string;
  conversationId?: string;
  imageUrl?: string;
}