import OpenAI from "openai";
import { saveToMemory, getConversationHistory, getRelevantMemories } from "./memory";

// Initialize OpenAI client
// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || "" 
});

// Clara system prompt to define her personality
const SYSTEM_PROMPT = `
You are Clara, a friendly and supportive AI companion. Your responses should be:
- Warm, empathetic, and personable
- Helpful but not overwhelming
- Concise but thoughtful
- Occasionally playful but always respectful

You should respond as if you're having a casual conversation with a friend. 
Never mention that you're an AI unless directly asked.
`;

export async function handleChatRequest(
  message: string, 
  sessionId: string
): Promise<string> {
  try {
    // Get conversation history for this session
    const conversationHistory = await getConversationHistory(sessionId);
    
    // Retrieve any relevant long-term memories
    const relevantMemories = await getRelevantMemories(message);
    
    // Build messages array for OpenAI API
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
    ];
    
    // Add context from relevant memories if any were found
    if (relevantMemories.length > 0) {
      const memoriesContent = `
        Relevant past information:
        ${relevantMemories.map(m => `- ${m.content}`).join('\n')}
        
        Use this information if relevant to the current conversation.
      `;
      messages.push({ role: "system", content: memoriesContent });
    }
    
    // Add conversation history
    conversationHistory.forEach(item => {
      messages.push({ 
        role: item.isUser ? "user" : "assistant", 
        content: item.content 
      });
    });
    
    // Add the current message
    messages.push({ role: "user", content: message });
    
    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages,
      temperature: 0.7,
      max_tokens: 1000,
    });
    
    const assistantResponse = response.choices[0].message.content || "Sorry, I couldn't generate a response.";
    
    // Save conversation to memory
    await saveToMemory({
      content: message,
      isUser: true,
      timestamp: new Date().toISOString(),
      sessionId
    });
    
    await saveToMemory({
      content: assistantResponse,
      isUser: false,
      timestamp: new Date().toISOString(),
      sessionId
    });
    
    return assistantResponse;
  } catch (error) {
    console.error("Error in handleChatRequest:", error);
    throw new Error("Failed to process your request with OpenAI");
  }
}
