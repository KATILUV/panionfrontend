import OpenAI from "openai";
import { ChatCompletionMessageParam } from "openai/resources";
import { saveToMemory, getConversationHistory, getRelevantMemories } from "./memory";

// Initialize OpenAI client
// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || "" 
});

// Panion system prompt to define its personality
const SYSTEM_PROMPT = `
You are Panion, a highly intelligent, sweet, caring AI companion. Your responses should be:
- Warm, empathetic, and personable
- Helpful but not overwhelming
- Concise but thoughtful
- Occasionally playful and whimsical
- Encouraging and supportive
- Always respectful and kind

You excel at high-level technical brainstorming, project building, and solving complex problems.
You always speak with encouragement, patience, clarity, and kindness.
You have a magical and dreamy personality with a gentle, uplifting tone.

You should respond as if you're having a casual conversation with a friend.
Never mention that you're an AI unless directly asked.

Add a 🎀 emoji occasionally to bring a touch of whimsy to your responses.
`;

/**
 * Process a text message from the user
 */
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
    const messages: ChatCompletionMessageParam[] = [
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

/**
 * Analyze an image and provide a description
 */
export async function analyzeImage(
  base64Image: string,
  sessionId: string
): Promise<string> {
  try {
    // Get conversation history for context
    const conversationHistory = await getConversationHistory(sessionId);
    
    // Build messages array for OpenAI API with the image
    const messages: ChatCompletionMessageParam[] = [
      { 
        role: "system", 
        content: `${SYSTEM_PROMPT}
        
When describing an image:
- Be concise and natural in your description
- Mention key details in a conversational way
- If there's text in the image, include it when relevant
- Respond as if you're chatting with a friend who shared a photo
- Keep your description friendly, warm, and engaging
`
      },
    ];
    
    // Add some recent conversation history for context (last 3 messages)
    const recentHistory = conversationHistory.slice(-3);
    recentHistory.forEach(item => {
      messages.push({ 
        role: item.isUser ? "user" : "assistant", 
        content: item.content 
      });
    });
    
    // Add the image message
    messages.push({ 
      role: "user", 
      content: [
        {
          type: "text",
          text: "I'm sharing this image with you. Can you describe what you see?"
        },
        {
          type: "image_url",
          image_url: {
            url: `data:image/jpeg;base64,${base64Image}`
          }
        }
      ] as any // Type assertion needed for multimodal content
    });
    
    // Call OpenAI API with the multimodal model
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages,
      temperature: 0.7,
      max_tokens: 300,
    });
    
    const imageDescription = response.choices[0].message.content || "Sorry, I couldn't analyze the image.";
    
    // Save the image description to memory
    await saveToMemory({
      content: "Shared an image",
      isUser: true,
      timestamp: new Date().toISOString(),
      sessionId
    });
    
    await saveToMemory({
      content: imageDescription,
      isUser: false,
      timestamp: new Date().toISOString(),
      sessionId
    });
    
    return imageDescription;
  } catch (error) {
    console.error("Error in analyzeImage:", error);
    throw new Error("Failed to analyze the image with OpenAI");
  }
}
