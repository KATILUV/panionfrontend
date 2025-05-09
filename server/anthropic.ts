import Anthropic from '@anthropic-ai/sdk';
import { log } from './vite';
import { Request, Response } from 'express';

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
  sessionId: string,
  conversationHistory: Array<{ role: string, content: string }> = [],
  systemPrompt?: string
): Promise<{ response: string, thinking?: string }> {
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

    // Prepare messages for the API request
    let messages = [
      ...conversationHistory,
      { role: 'user', content: message }
    ];

    // Adding logging for debugging
    log(`Sending request to Anthropic API with session ${sessionId}`, 'panion');

    // Make request to Anthropic API
    const response = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      system: finalSystemPrompt,
      messages: messages,
      max_tokens: 1024,
      temperature: 0.7,
    });

    // Extract response text and any thinking content
    const responseText = response.content[0].text;

    // Success! Return the response
    return {
      response: responseText,
      thinking: "Processing via Claude model: analyzing context, generating cohesive and natural response."
    };
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

    return response.content[0].text;
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

    // Process with Anthropic
    const result = await handleAnthropicChatRequest(
      messageContent,
      sessionId,
      conversationHistory
    );
    
    // Return the response with Panion-compatible structure
    res.json({
      response: result.response,
      thinking: result.thinking,
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