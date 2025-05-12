import { Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { handleChatRequest } from './openai';
import { log } from './vite';

// WebSocket client connection types
interface BaseConnection {
  ws: WebSocket;
  lastActivity: number;
  type: 'task' | 'chat';
}

interface TaskConnection extends BaseConnection {
  type: 'task';
  subscriptions: Set<string>; // Task IDs
}

interface ChatConnection extends BaseConnection {
  type: 'chat';
  sessionId: string;
  isTyping: boolean;
}

type WebSocketConnection = TaskConnection | ChatConnection;

// WebSocket message types
export type MessageType = 
  // Task types
  | 'subscribe' 
  | 'unsubscribe' 
  | 'heartbeat'
  | 'task_update'
  | 'step_update'
  // Chat types
  | 'message' 
  | 'typing_indicator' 
  | 'read_receipt'
  | 'error'
  | 'history_request'
  | 'conversation_mode'
  | 'system'
  | 'welcome'
  | 'reconnect'
  | 'pong';

export type ConversationMode = 'casual' | 'deep' | 'strategic' | 'logical';

export interface WebSocketMessage {
  type: MessageType;
  taskId?: string;
  message?: string;
  sender?: 'user' | 'assistant';
  conversationMode?: ConversationMode;
  timestamp?: number;
  sessionId?: string;
  client_id?: string;
  data?: any;
}

// Store for active connections
const clients = new Map<WebSocket, WebSocketConnection>();

// Reference to the unified WebSocket server instance
let webSocketServer: WebSocketServer | null = null;

/**
 * Initialize the unified WebSocket server
 */
export function initializeWebSocketServer(httpServer: Server): WebSocketServer {
  // Create WebSocket server for task connections
  const taskWss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws',
    // Fix for missing headers
    verifyClient: (info, cb) => {
      const headers = info.req.headers;
      // Force connection upgrade header to be present
      if (!headers['connection']) {
        info.req.headers['connection'] = 'Upgrade';
      }
      if (!headers['upgrade']) {
        info.req.headers['upgrade'] = 'websocket';
      }
      cb(true);
    }
  });
  
  // Create WebSocket server for chat connections
  const chatWss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws-chat',
    // Fix for missing headers
    verifyClient: (info, cb) => {
      const headers = info.req.headers;
      // Force connection upgrade header to be present
      if (!headers['connection']) {
        info.req.headers['connection'] = 'Upgrade';
      }
      if (!headers['upgrade']) {
        info.req.headers['upgrade'] = 'websocket';
      }
      cb(true);
    }
  });
  
  log('[websocket] Unified WebSocket server initialized');
  
  // Set up task connections
  taskWss.on('connection', (ws: WebSocket) => {
    log('[websocket] Task client connected');
    
    // Initialize client state
    clients.set(ws, {
      ws,
      type: 'task',
      subscriptions: new Set<string>(),
      lastActivity: Date.now()
    });
    
    // Handle messages from task clients
    ws.on('message', (message: string) => {
      try {
        const data: WebSocketMessage = JSON.parse(message.toString());
        const client = clients.get(ws) as TaskConnection | undefined;
        
        if (!client || client.type !== 'task') {
          log('[websocket] Received message from unregistered task client', 'error');
          return;
        }
        
        // Update last activity time for heartbeat tracking
        client.lastActivity = Date.now();
        
        // Handle subscription requests
        if (data.type === 'subscribe' && data.taskId) {
          log(`[websocket] Client subscribed to task: ${data.taskId}`);
          client.subscriptions.add(data.taskId);
        }
        
        // Handle unsubscribe requests
        if (data.type === 'unsubscribe' && data.taskId) {
          log(`[websocket] Client unsubscribed from task: ${data.taskId}`);
          client.subscriptions.delete(data.taskId);
        }
        
        // Handle heartbeat (just update last activity time, already done above)
        if (data.type === 'heartbeat') {
          // Pong back to client to confirm connection is still alive
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        }
      } catch (error) {
        log('[websocket] Error processing task message:', 'error');
        console.error(error);
      }
    });
    
    // Handle client disconnection
    ws.on('close', () => {
      log('[websocket] Task client disconnected');
      clients.delete(ws);
    });
    
    // Handle errors
    ws.on('error', (error) => {
      log('[websocket] Task client connection error:', 'error');
      console.error(error);
      clients.delete(ws);
    });
  });
  
  // Set up chat connections
  chatWss.on('connection', (ws: WebSocket, req: any) => {
    log('[websocket] Chat client connected');
    
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
      type: 'chat',
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
        const message: WebSocketMessage = JSON.parse(data.toString());
        const client = clients.get(ws) as ChatConnection | undefined;
        
        if (!client || client.type !== 'chat') {
          log('[websocket] Received message from unregistered chat client', 'error');
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
                log(`[websocket] Error processing chat message: ${error}`, 'error');
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
            log(`[websocket] Unknown message type: ${message.type}`, 'warning');
        }
      } catch (error) {
        log(`[websocket] Error parsing WebSocket message: ${error}`, 'error');
      }
    });
    
    // Handle disconnection
    ws.on('close', () => {
      log('[websocket] Chat client disconnected');
      clients.delete(ws);
    });
    
    // Handle errors
    ws.on('error', (error) => {
      log(`[websocket] Chat client error: ${error}`, 'error');
      clients.delete(ws);
    });
  });
  
  // Set up heartbeat interval to detect stale connections
  const HEARTBEAT_INTERVAL = 30000; // 30 seconds
  const TASK_INACTIVE_TIMEOUT = 120000; // 2 minutes
  const CHAT_INACTIVE_TIMEOUT = 180000; // 3 minutes
  
  // Efficient memory management by periodically checking for stale connections
  const interval = setInterval(() => {
    const now = Date.now();
    let closedCount = 0;
    
    clients.forEach((client, ws) => {
      try {
        // Set timeout based on client type
        const timeout = client.type === 'task' ? TASK_INACTIVE_TIMEOUT : CHAT_INACTIVE_TIMEOUT;
        
        if (now - client.lastActivity > timeout) {
          log(`[websocket] Terminating inactive ${client.type} connection`);
          ws.terminate();
          clients.delete(ws);
          closedCount++;
        }
      } catch (error) {
        // Clean up any connections that throw errors
        log(`[websocket] Error processing connection: ${error}`, 'error');
        try {
          ws.terminate();
        } catch {
          // Ignore errors when terminating
        }
        clients.delete(ws);
        closedCount++;
      }
    });
    
    // Log total connection counts when we've cleaned something up
    if (closedCount > 0) {
      log(`[websocket] Connection cleanup: removed ${closedCount} stale connections, remaining: ${clients.size}`);
    }
    
    // Run garbage collector if available (only in development)
    if (process.env.NODE_ENV === 'development' && global.gc) {
      try {
        global.gc();
        log('[websocket] Manual garbage collection triggered');
      } catch (error) {
        // Ignore errors during GC
      }
    }
  }, HEARTBEAT_INTERVAL);
  
  // Clean up the interval on process exit to prevent memory leaks
  process.on('exit', () => {
    if (interval) {
      clearInterval(interval);
    }
  });
  
  // Store reference to task WebSocket server
  webSocketServer = taskWss;
  
  // Return the task WebSocket server for backward compatibility
  return taskWss;
}

/**
 * Broadcast a message to all clients in the same session
 */
function broadcastToSession(
  sessionId: string, 
  message: any, 
  excludeWs?: WebSocket
): void {
  let clientCount = 0;
  const messageString = JSON.stringify(message);
  
  clients.forEach((client, ws) => {
    if (
      client.type === 'chat' &&
      (client as ChatConnection).sessionId === sessionId && 
      ws !== excludeWs && 
      ws.readyState === WebSocket.OPEN
    ) {
      try {
        ws.send(messageString);
        clientCount++;
      } catch (error) {
        log(`[websocket] Error broadcasting to session ${sessionId}: ${error}`, 'error');
        // Close problematic connections
        try {
          ws.close();
        } catch {
          // Ignore errors when closing already problematic connections
        }
        clients.delete(ws);
      }
    }
  });
  
  if (clientCount > 0 && message.type !== 'typing_indicator') {
    log(`[websocket] Broadcast to session ${sessionId}: ${message.type || 'message'} to ${clientCount} clients`);
  }
}

/**
 * Broadcast a task event to all subscribed clients
 */
export function broadcastTaskEvent(
  taskId: string, 
  eventType: 'task_update' | 'step_update',
  eventData: Record<string, any>
): void {
  if (!webSocketServer) {
    log('[websocket] WebSocket server not initialized', 'error');
    return;
  }
  
  let clientCount = 0;
  const message = JSON.stringify({
    taskId,
    type: eventType,
    timestamp: Date.now(),
    ...eventData
  });
  
  // Send to all task clients with matching subscriptions
  clients.forEach((client, ws) => {
    // Check if client is still connected
    if (ws.readyState !== WebSocket.OPEN) {
      return;
    }
    
    // Only send to task clients with the right subscription
    if (
      client.type === 'task' && 
      (client as TaskConnection).subscriptions.has(taskId)
    ) {
      clientCount++;
      
      // Send the pre-stringified message to this client
      try {
        ws.send(message);
      } catch (error) {
        log(`[websocket] Error sending message to client: ${error}`, 'error');
        // Close problematic connections
        try {
          ws.close();
        } catch {
          // Ignore errors when closing already problematic connections
        }
        clients.delete(ws);
      }
    }
  });
  
  if (clientCount > 0) {
    log(`[websocket] Broadcast task event to ${clientCount} clients: ${taskId} (${eventType})`);
  }
}

/**
 * Get the WebSocket server instance
 */
export function getWebSocketServer(): WebSocketServer | null {
  return webSocketServer;
}