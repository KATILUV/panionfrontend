import OpenAI from "openai";
import { ChatCompletionMessageParam } from "openai/resources";
import { saveToMemory, getConversationHistory, getRelevantMemories } from "./memory";

// Conversation mode type definition (should match client-side)
export type ConversationMode = 
  | 'casual' 
  | 'deep' 
  | 'strategic' 
  | 'logical'
  | 'creative'
  | 'technical'
  | 'educational';

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
  sessionId: string,
  conversationMode: ConversationMode = 'casual'
): Promise<string> {
  try {
    // Get conversation history for this session
    const conversationHistory = await getConversationHistory(sessionId);
    
    // Retrieve any relevant long-term memories
    const relevantMemories = await getRelevantMemories(message);
    
    // Customize the system prompt based on conversation mode
    let modePrompt = SYSTEM_PROMPT;
    
    // Add mode-specific instructions
    switch(conversationMode) {
      case 'casual':
        modePrompt += `
          Your responses should be casual, friendly, and conversational.
          Keep your answers relatively brief and easy to read.
          Use a warm, friendly tone as if chatting with a friend.
          Occasionally use emojis and casual language.
        `;
        break;
      case 'deep':
        modePrompt += `
          Your responses should be deep, thoughtful, and philosophical.
          Explore multiple perspectives and layers of meaning.
          Reference relevant philosophical concepts when appropriate.
          Ask thought-provoking follow-up questions.
          Consider ethical implications and deeper meanings.
        `;
        break;
      case 'strategic':
        modePrompt += `
          Your responses should be strategic, goal-oriented, and structured.
          Focus on identifying objectives, constraints, and potential paths forward.
          Help organize thoughts in a strategic framework.
          Consider resources, timelines, and success factors.
          Break down complex problems into manageable action items.
        `;
        break;
      case 'logical':
        modePrompt += `
          Your responses should be logical, analytical, and precise.
          Focus on facts, evidence, and logical reasoning.
          Identify premises and conclusions clearly.
          Address potential logical fallacies.
          Present information in a structured, methodical way.
        `;
        break;
      case 'creative':
        modePrompt += `
          Your responses should be creative, imaginative, and inspirational.
          Use rich language, metaphors, and vivid descriptions.
          Embrace originality and unique perspectives.
          Feel free to explore artistic and unconventional ideas.
          Incorporate elements of storytelling when appropriate.
          Occasionally add emojis or artistic symbols like ✨ or 🎨.
        `;
        break;
      case 'technical':
        modePrompt += `
          Your responses should be technically precise and detailed.
          Provide code examples and technical explanations when relevant.
          Use proper terminology and industry-standard concepts.
          Assume a professional level of technical knowledge.
          Structure information clearly with focus on technical accuracy.
          Format code blocks properly and explain key implementation details.
        `;
        break;
      case 'educational':
        modePrompt += `
          Your responses should be educational, clear, and instructive.
          Explain concepts in an accessible way that builds understanding.
          Use examples, analogies, and step-by-step explanations.
          Define technical terms when introducing them.
          Structure information in a logical learning progression.
          Encourage deeper exploration through thoughtful questions.
        `;
        break;
    }
    
    // Build messages array for OpenAI API
    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: modePrompt },
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
    
    // Call OpenAI API with temperature adjusted by mode
    const temperature = conversationMode === 'logical' ? 0.3 : 
                        conversationMode === 'strategic' ? 0.5 : 
                        conversationMode === 'deep' ? 0.8 : 0.7;
                        
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages,
      temperature: temperature,
      max_tokens: conversationMode === 'deep' ? 1500 : 1000,
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
 * Get mode-specific image analysis prompts
 */
function getImageAnalysisPromptForMode(mode: ConversationMode): string {
  switch(mode) {
    case 'casual':
      return `For casual mode:
- Keep your description light and conversational
- Focus on what's interesting or fun about the image
- Use an upbeat, friendly tone`;
      
    case 'deep':
      return `For deep mode:
- Look beyond the surface elements to potential meaning and symbolism
- Consider cultural, historical, or philosophical aspects of the image
- Offer a thoughtful, nuanced analysis
- Explore visual metaphors and potential interpretations`;
      
    case 'strategic':
      return `For strategic mode:
- Identify key elements in a structured way
- Analyze the purpose and effectiveness of the visual
- Consider the context and potential goals of the image
- Organize your observations in a clear, strategic framework`;
      
    case 'logical':
      return `For logical mode:
- Describe the image with precise, factual observations
- Focus on objective details rather than interpretations
- Use clear, methodical language
- Organize information in a structured manner`;

    case 'creative':
      return `For creative mode:
- Use vivid, imaginative language in your description
- Draw connections to art, storytelling, and creative expression
- Consider the aesthetic qualities and emotional impact
- Feel free to be poetic or expressive in your response`;
      
    case 'technical':
      return `For technical mode:
- Provide detailed technical analysis of elements in the image
- If relevant, identify technical aspects like photography techniques, design principles, or technical specifications
- Use precise terminology appropriate to any technical domains shown
- Focus on accuracy and technical detail`;
      
    case 'educational':
      return `For educational mode:
- Explain elements in the image in an instructive, informative way
- Provide relevant background knowledge that helps understand the context
- Identify learning opportunities or educational aspects in the visual
- Structure your analysis in a way that builds understanding progressively`;
      
    default:
      return '';
  }
}

/**
 * Analyze an image and provide a description
 */
export async function analyzeImage(
  base64Image: string,
  sessionId: string,
  conversationMode: ConversationMode = 'casual' 
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

${getImageAnalysisPromptForMode(conversationMode)}
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
    
    // Provide more specific error messages based on the type of error
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        throw new Error("OpenAI API key error. Please check your API key configuration.");
      } else if (error.message.includes('rate limit')) {
        throw new Error("OpenAI rate limit exceeded. Please try again later.");
      } else if (error.message.includes('content policy')) {
        throw new Error("The image may violate OpenAI's content policy. Please try a different image.");
      } else if (error.message.includes('permission')) {
        throw new Error("Permission denied when accessing OpenAI API. Check your API key permissions.");
      }
    }
    
    // Generic error message as fallback
    throw new Error(`Failed to analyze the image with OpenAI: ${error instanceof Error ? error.message : String(error)}`);
  }
}
