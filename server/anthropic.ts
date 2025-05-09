import Anthropic from '@anthropic-ai/sdk';
import { log } from './vite';
import { Request, Response } from 'express';
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';

// Initialize Anthropic client
// the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

/**
 * Process a text message from the user using Claude model
 */
export async function handleAnthropicChatRequest(
  message: string,
  systemPrompt: string,
  conversationHistory: Array<{ role: string, content: string }> = []
): Promise<string> {
  try {
    // Default system prompt if none provided
    const defaultSystemPrompt = `You are Panion, an advanced AI assistant designed to support users with a wide range of requests. You're especially skilled at:

1. Helping users find information and research topics thoroughly
2. Analyzing data and providing insights
3. Finding business contacts and managing business information
4. Coordinating multiple AI agents to accomplish complex tasks
5. Breaking down complex goals into actionable steps

Your responses should be:
- Direct and concise while being complete
- Helpful and user-focused
- Conversational but professional
- Specific rather than generic
- Honest about limitations

You have access to memory systems and can reference past conversations.`;

    const finalSystemPrompt = systemPrompt || defaultSystemPrompt;

    // Prepare messages for the API request, ensuring correct role types
    let fixedMessages = conversationHistory.map(msg => {
      // Ensure roles are strictly 'user' or 'assistant' as required by Anthropic API
      const role = msg.role === 'user' ? 'user' : 'assistant';
      return { role, content: msg.content };
    });
    
    // Add the user's message
    fixedMessages.push({ role: 'user', content: message });

    // Adding logging for debugging
    log(`Sending request to Anthropic API with ${fixedMessages.length} messages`, 'panion');

    // Make request to Anthropic API
    // Explicitly cast the messages to ensure they're valid for the Anthropic API
    const typedMessages: MessageParam[] = fixedMessages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));
    
    const response = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      system: finalSystemPrompt,
      messages: typedMessages,
      max_tokens: 1024,
      temperature: 0.7,
    });

    // Extract response text from content blocks
    let responseText = "";
    if (response.content && response.content.length > 0 && response.content[0].type === 'text') {
      responseText = response.content[0].text;
    } else {
      // Fallback for any unexpected response format
      responseText = "I processed your request but had trouble formatting my response. Please try again.";
      log("Unexpected response format from Anthropic API", "panion");
    }

    // Success! Return the response text only
    return responseText;
  } catch (error) {
    // Log the error for debugging
    log(`Error in Anthropic API request: ${error}`, 'panion');
    
    // Return a friendly error message
    throw new Error(`Error processing your request: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Analyze an image and provide a description
 */
export async function analyzeImageWithClaude(
  base64Image: string, 
  prompt: string = "Analyze this image and describe it in detail."
): Promise<string> {
  try {
    const response = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt
            },
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/jpeg",
                data: base64Image
              }
            }
          ]
        }
      ],
    });

    // Extract response text from content blocks
    let responseText = "";
    if (response.content && response.content.length > 0 && response.content[0].type === 'text') {
      responseText = response.content[0].text;
    } else {
      // Fallback for any unexpected response format
      responseText = "I processed the image but had trouble formatting my analysis.";
      log("Unexpected response format from Anthropic API in image analysis", "panion");
    }
    
    return responseText;
  } catch (error) {
    log(`Error in Anthropic image analysis: ${error}`, 'panion');
    throw new Error(`Failed to analyze image: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Express handler for Anthropic-based chat
 */
export async function handleAnthropicChat(req: Request, res: Response): Promise<void> {
  try {
    // Extract request data
    const { 
      message, 
      content,
      sessionId = 'default',
      conversationHistory = []
    } = req.body;
    
    // Support both 'message' and 'content' parameters for flexibility
    const messageContent = content || message;
    
    if (!messageContent || typeof messageContent !== 'string') {
      res.status(400).json({ 
        error: 'Invalid request',
        message: 'Message content is required and must be a string' 
      });
      return;
    }

    // Create a default system prompt
    const defaultSystemPrompt = `You are Panion, an advanced AI assistant designed to support users with a wide range of requests. You're especially skilled at:

1. Helping users find information and research topics thoroughly
2. Analyzing data and providing insights
3. Finding business contacts and managing business information
4. Coordinating multiple AI agents to accomplish complex tasks
5. Breaking down complex goals into actionable steps

Your responses should be:
- Direct and concise while being complete
- Helpful and user-focused
- Conversational but professional
- Specific rather than generic
- Honest about limitations`;

    // Process with Anthropic
    const responseText = await handleAnthropicChatRequest(
      messageContent,
      defaultSystemPrompt,
      conversationHistory
    );
    
    // Return the response with Panion-compatible structure
    res.json({
      response: responseText,
      thinking: "Processing via Claude model: analyzing context, generating cohesive and natural response.",
      additional_info: {
        model: "claude-3-7-sonnet-20250219",
        timestamp: new Date().toISOString(),
        session_id: sessionId
      }
    });
  } catch (error) {
    log(`Error in Anthropic chat handler: ${error}`, 'panion');
    res.status(500).json({ 
      error: 'Anthropic API error',
      message: 'Error processing chat request',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}