export interface Message {
  content: string;
  isUser: boolean;
  timestamp: string;
}

export interface ChatResponse {
  response: string;
  conversationId?: string;
}
