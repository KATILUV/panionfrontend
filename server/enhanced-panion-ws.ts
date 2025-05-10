/**
 * Enhanced Panion Chat Handler with Websocket Bridge
 * Provides Manus-like capabilities with improved performance through WebSockets
 */

import { Request, Response } from 'express';
import { log } from './vite';
import { v4 as uuidv4 } from 'uuid';
import { addMessage, getRelevantContext } from './conversation-memory';
import panionBridgeWS from './panion-bridge-ws';
import { getSystemLog, systemLog } from './system-logs';

/**
 * Enhanced chat request handler with WebSocket Bridge and Manus-like capabilities
 */
export async function handleEnhancedChatWithWS(req: Request, res: Response): Promise<void> {
  try {
    const startTime = Date.now();
    const { message, sessionId = 'default', requestMode = 'standard' } = req.body;
    const requestId = uuidv4();
    
    log(`[${requestId}] Chat request received for session ${sessionId}`, 'panion');
    
    if (!message) {
      res.status(400).json({ error: 'Message is required' });
      return;
    }
    
    // Start by getting memory context from the conversation
    log(`[${requestId}] Retrieving context from memory`, 'panion');
    const memoryContext = await getRelevantContext(message, sessionId);
    
    // Check if message is simple using WebSocket capability detection
    log(`[${requestId}] Checking message complexity`, 'panion');
    
    // First, detect capabilities needed for this message
    const capabilities = await panionBridgeWS.checkCapabilities(message);
    
    // For simple messages, we can use a fast path response
    const isSimpleMessage = capabilities.length === 0 || 
      (capabilities.length === 1 && capabilities[0] === 'basic_chat');
    
    // For Manus-like autonomous behavior, get enhanced analysis
    let enhancedAnalysis = null;
    if (requestMode === 'autonomous' || !isSimpleMessage) {
      log(`[${requestId}] Getting enhanced analysis`, 'panion');
      enhancedAnalysis = await panionBridgeWS.getEnhancedAnalysis(message, sessionId);
    }
    
    // Use the websocket bridge for the actual chat message
    log(`[${requestId}] Sending message to Panion via WebSocket bridge`, 'panion');
    const chatResponse = await panionBridgeWS.chat(message, sessionId, {
      context: memoryContext,
      enhancedAnalysis
    });
    
    // Add the message and response to memory for future context
    await addMessage('user', message, sessionId);
    await addMessage('assistant', chatResponse.response, sessionId);
    
    // Calculate response time 
    const responseTime = Date.now() - startTime;
    log(`[${requestId}] Chat response received in ${responseTime}ms`, 'panion');
    
    // Return the response with enhanced metadata for Manus-like capabilities
    const fullResponse = {
      response: chatResponse.response,
      thinking: chatResponse.thinking || null,
      manus_capabilities: {
        proactivity_score: enhancedAnalysis?.proactivity_score || 0,
        initiative_actions: enhancedAnalysis?.initiative_actions || [],
        decomposed_subtasks: enhancedAnalysis?.subtasks || []
      },
      metrics: {
        response_time_ms: responseTime,
        websocket_mode: panionBridgeWS.isActive() ? 'active' : 'fallback',
        system_logs: getSystemLog(5) // Get last 5 system logs for transparency
      }
    };
    
    res.json(fullResponse);
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    log(`Error in enhanced chat handler: ${errorMessage}`, 'panion');
    systemLog.error(`WebSocket chat processing error: ${errorMessage}`, 'panion-ws');
    res.status(500).json({ 
      error: 'Error processing chat request', 
      details: errorMessage 
    });
  }
}