import { WebSocketServer, WebSocket } from 'ws';
import { handleChatRequest } from './openai';
import { log } from './vite';

// Client connection type for chat WebSocket
interface ChatWebSocketConnection {
  ws: WebSocket;
  sessionId: string;
  lastActivity: number;
  isTyping: boolean;
}

// WebSocket message types
export type ChatMessageType = 
  | 'message' 
  | 'typing_indicator' 
  | 'read_receipt'
  | 'heartbeat'
  | 'error'
  | 'history_request'
  | 'conversation_mode';

export interface ChatWebSocketMessage {
  type: ChatMessageType;
  message?: string;
  conversationMode?: 'casual' | 'deep' | 'strategic' | 'logical';
  timestamp?: number;
  sessionId?: string;
}

// Store active connections
const clients = new Map<WebSocket, ChatWebSocketConnection>();

// Initialize WebSocket Server for Chat
export function initializeChatWebSocketServer(httpServer: any): WebSocketServer {
  // Create WebSocket server
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws-chat' 
  });
  
  log('[chat-ws] Chat WebSocket server initialized');
  
  // Handle new connections
  wss.on('connection', (ws: WebSocket, req: any) => {
    log('[chat-ws] Client connected');
    
    // Parse the session ID from cookies or query params
    let sessionId = '';
    
    // Try to get from URL query params
    const url = new URL(req.url, 'http://localhost');
    if (url.searchParams.has('sessionId')) {
      sessionId = url.searchParams.get('sessionId') || '';
    }
    
    // If no session ID, generate one
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    }
    
    // Register the new client
    clients.set(ws, {
      ws,
      sessionId,
      lastActivity: Date.now(),
      isTyping: false
    });
    
    // Send welcome message
    ws.send(JSON.stringify({
      type: 'system',
      message: 'Connected to chat server',
      sessionId,
      timestamp: Date.now()
    }));
    
    // Handle incoming messages
    ws.on('message', async (data: Buffer) => {
      try {
        const message: ChatWebSocketMessage = JSON.parse(data.toString());
        const client = clients.get(ws);
        
        if (!client) {
          log('[chat-ws] Received message from unregistered client', 'error');
          return;
        }
        
        // Update activity timestamp
        client.lastActivity = Date.now();
        
        // Process message based on type
        switch (message.type) {
          case 'message':
            if (message.message) {
              // Broadcast typing indicator
              broadcastToSession(client.sessionId, {
                type: 'typing_indicator',
                message: 'assistant',
                timestamp: Date.now(),
                sessionId: client.sessionId
              }, ws);
              
              // Process the message with OpenAI
              try {
                const response = await handleChatRequest(
                  message.message, 
                  client.sessionId,
                  message.conversationMode || 'casual'
                );
                
                // Send the AI response
                ws.send(JSON.stringify({
                  type: 'message',
                  message: response,
                  sender: 'assistant',
                  timestamp: Date.now(),
                  sessionId: client.sessionId
                }));
                
                // End typing indicator
                broadcastToSession(client.sessionId, {
                  type: 'typing_indicator',
                  message: '', // Empty means not typing
                  timestamp: Date.now(),
                  sessionId: client.sessionId
                }, ws);
              } catch (error) {
                log(`[chat-ws] Error processing chat message: ${error}`, 'error');
                ws.send(JSON.stringify({
                  type: 'error',
                  message: 'Failed to process your message',
                  timestamp: Date.now(),
                  sessionId: client.sessionId
                }));
              }
            }
            break;
            
          case 'typing_indicator':
            // Update typing status
            client.isTyping = !!message.message;
            
            // Broadcast typing status to all clients in the same session
            broadcastToSession(client.sessionId, {
              type: 'typing_indicator',
              message: message.message ? 'user' : '',
              timestamp: Date.now(),
              sessionId: client.sessionId
            }, ws);
            break;
            
          case 'heartbeat':
            // Send a pong to verify connection is alive
            ws.send(JSON.stringify({ 
              type: 'heartbeat', 
              timestamp: Date.now() 
            }));
            break;
            
          case 'conversation_mode':
            // Just acknowledge the mode change
            ws.send(JSON.stringify({
              type: 'conversation_mode',
              message: `Mode changed to ${message.conversationMode}`,
              timestamp: Date.now(),
              sessionId: client.sessionId
            }));
            break;
            
          default:
            log(`[chat-ws] Unknown message type: ${message.type}`, 'warning');
        }
      } catch (error) {
        log(`[chat-ws] Error parsing WebSocket message: ${error}`, 'error');
      }
    });
    
    // Handle disconnection
    ws.on('close', () => {
      log('[chat-ws] Client disconnected');
      clients.delete(ws);
    });
    
    // Handle errors
    ws.on('error', (error) => {
      log(`[chat-ws] Client error: ${error}`, 'error');
      clients.delete(ws);
    });
  });
  
  // Set up heartbeat interval to detect stale connections
  const HEARTBEAT_INTERVAL = 30000; // 30 seconds
  const INACTIVE_TIMEOUT = 180000; // 3 minutes
  
  setInterval(() => {
    const now = Date.now();
    
    clients.forEach((client, ws) => {
      if (now - client.lastActivity > INACTIVE_TIMEOUT) {
        log('[chat-ws] Terminating inactive connection');
        ws.terminate();
        clients.delete(ws);
      }
    });
  }, HEARTBEAT_INTERVAL);
  
  return wss;
}

// Broadcast a message to all clients in the same session
function broadcastToSession(
  sessionId: string, 
  message: any, 
  excludeWs?: WebSocket
): void {
  clients.forEach((client, ws) => {
    if (
      client.sessionId === sessionId && 
      ws !== excludeWs && 
      ws.readyState === WebSocket.OPEN
    ) {
      ws.send(JSON.stringify(message));
    }
  });
}