export interface Message {
  content: string;
  isUser: boolean;
  timestamp: string;
  imageUrl?: string;  // Optional field for image URL
}

export interface ChatResponse {
  response: string;
  conversationId?: string;
}
