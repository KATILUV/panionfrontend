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
  | 'hello'  // Client-initiated hello message
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
  taskIds?: string[]; // Added support for array of task IDs for batch subscription
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
  
  // Connection rate limiting for task WebSocket connections
  const connectionRateLimiter = new Map<string, { lastAttempt: number, attemptCount: number }>();
  
  // Function to check if a connection should be rate limited
  const shouldRateLimit = (ip: string): boolean => {
    const now = Date.now();
    const clientData = connectionRateLimiter.get(ip);
    
    if (!clientData) {
      // First connection from this IP
      connectionRateLimiter.set(ip, { lastAttempt: now, attemptCount: 1 });
      return false;
    }
    
    // Check if connection attempts are too frequent
    const timeSinceLastAttempt = now - clientData.lastAttempt;
    
    if (timeSinceLastAttempt < 1000) { // Less than 1 second between attempts
      clientData.attemptCount++;
      clientData.lastAttempt = now;
      
      // Rate limit if too many rapid connections
      if (clientData.attemptCount > 5) {
        log(`[websocket] Rate limiting connection from ${ip}: ${clientData.attemptCount} attempts in rapid succession`);
        return true;
      }
    } else if (timeSinceLastAttempt > 10000) { // Reset count after 10 seconds of inactivity
      clientData.attemptCount = 1;
    } else {
      // Update last attempt time
      clientData.attemptCount++;
    }
    
    clientData.lastAttempt = now;
    connectionRateLimiter.set(ip, clientData);
    return false;
  };
  
  // Set up task connections with improved stability
  taskWss.on('connection', (ws: WebSocket, req: any) => {
    // Track connection attempt frequency to prevent rapid reconnection
    const clientIp = req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    
    // Rate limit connections if necessary
    if (shouldRateLimit(clientIp)) {
      log(`[websocket] Rate limited connection from ${clientIp}`);
      ws.close(1008, 'Connection rate limit exceeded');
      return;
    }
    
    try {
      // Send welcome message immediately to establish the connection
      ws.send(JSON.stringify({
        type: 'welcome',
        message: 'Connected to task server',
        timestamp: Date.now()
      }));
    
      log(`[websocket] Task client connected from ${clientIp}`);
      
      // Initialize client state
      clients.set(ws, {
        ws,
        type: 'task',
        subscriptions: new Set<string>(),
        lastActivity: Date.now()
      });
      
      // Handle messages from task clients with improved error handling
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
          
          // Handle hello message
          if (data.type === 'hello') {
            log(`[websocket] Client hello received`);
            ws.send(JSON.stringify({
              type: 'welcome',
              message: 'Connected to task server',
              timestamp: Date.now()
            }));
          }
            
          // Handle subscription requests
          if (data.type === 'subscribe') {
            
            // Handle array of task IDs
            const taskIds = data.taskIds as string[] | undefined;
            if (Array.isArray(taskIds)) {
              taskIds.forEach((taskId: string) => {
                log(`[websocket] Client subscribed to task: ${taskId}`);
                client.subscriptions.add(taskId);
              });
  
              // Confirm subscription
              ws.send(JSON.stringify({
                type: 'system',
                message: `Subscribed to ${taskIds.length} tasks`,
                timestamp: Date.now()
              }));
            } 
            // Handle single task ID
            else if (data.taskId) {
              log(`[websocket] Client subscribed to task: ${data.taskId}`);
              client.subscriptions.add(data.taskId);
              
              // Confirm subscription
              ws.send(JSON.stringify({
                type: 'system',
                message: `Subscribed to task ${data.taskId}`,
                timestamp: Date.now()
              }));
            }
          }
          
          // Handle unsubscribe requests
          if (data.type === 'unsubscribe') {
            // Handle array of task IDs
            const taskIds = data.taskIds as string[] | undefined;
            if (Array.isArray(taskIds)) {
              taskIds.forEach((taskId: string) => {
                log(`[websocket] Client unsubscribed from task: ${taskId}`);
                client.subscriptions.delete(taskId);
              });
  
              // Confirm unsubscription
              ws.send(JSON.stringify({
                type: 'system',
                message: `Unsubscribed from ${taskIds.length} tasks`,
                timestamp: Date.now()
              }));
            }
            // Handle single task ID 
            else if (data.taskId) {
              log(`[websocket] Client unsubscribed from task: ${data.taskId}`);
              client.subscriptions.delete(data.taskId);
              
              // Confirm unsubscription
              ws.send(JSON.stringify({
                type: 'system',
                message: `Unsubscribed from task ${data.taskId}`,
                timestamp: Date.now()
              }));
            }
          }
          
          // Handle heartbeat (just update last activity time, already done above)
          if (data.type === 'heartbeat') {
            // Pong back to client to confirm connection is still alive
            ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          }
          
        } catch (error) {
          log('[websocket] Error processing task message:', 'error');
          console.error(error);
          
          // If the message parsing fails, send an error message back
          try {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Failed to process your message',
              timestamp: Date.now()
            }));
          } catch (sendError) {
            // Ignore send errors
          }
        }
      });
      
      // Handle client disconnection
      ws.on('close', (code, reason) => {
        log(`[websocket] Task client disconnected. Code: ${code}, Reason: ${reason || 'No reason provided'}`);
        clients.delete(ws);
      });
      
      // Handle errors
      ws.on('error', (error) => {
        log('[websocket] Task client connection error:', 'error');
        console.error(error);
        
        // Don't delete the client here, let the close handler do it
        // as it will be called automatically after error
      });
    } catch (setupError) {
      log('[websocket] Error during task client setup:', 'error');
      console.error(setupError);
      
      // Attempt to cleanly close with error message
      try {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Error establishing connection',
          timestamp: Date.now()
        }));
        
        // Use close() instead of terminate() for a cleaner shutdown
        ws.close(1011, 'Internal server error during setup');
      } catch (closeError) {
        // If sending fails, force terminate
        try {
          ws.terminate();
        } catch {
          // Ignore termination errors
        }
      }
      
      // Ensure client is removed from tracking
      clients.delete(ws);
    }
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
  
  // Send periodic ping to keep connections alive
  const pingInterval = setInterval(() => {
    clients.forEach((client, ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          // Send a ping message to verify connection
          ws.send(JSON.stringify({
            type: 'heartbeat',
            timestamp: Date.now()
          }));
        } catch (error) {
          // If ping fails, close the connection
          log(`[websocket] Error sending heartbeat: ${error}`, 'error');
          cleanupConnection(ws, 1011, 'Heartbeat failed');
        }
      }
    });
  }, 25000); // Send ping every 25 seconds to prevent timeout
  
  // Efficient memory management by periodically checking for stale connections
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    let closedCount = 0;
    
    clients.forEach((client, ws) => {
      try {
        // Set timeout based on client type
        const timeout = client.type === 'task' ? TASK_INACTIVE_TIMEOUT : CHAT_INACTIVE_TIMEOUT;
        
        // Check if connection is stale (no activity for too long)
        if (now - client.lastActivity > timeout) {
          log(`[websocket] Closing inactive ${client.type} connection (${Math.round((now - client.lastActivity)/1000)}s idle)`);
          cleanupConnection(ws, 1000, 'Connection timeout due to inactivity');
          closedCount++;
        }
        // Also check for sockets in weird states
        else if (ws.readyState !== WebSocket.OPEN && ws.readyState !== WebSocket.CONNECTING) {
          log(`[websocket] Cleaning up ${client.type} connection in ${ws.readyState === WebSocket.CLOSING ? 'CLOSING' : 'CLOSED'} state`);
          cleanupConnection(ws);
          closedCount++;
        }
      } catch (error) {
        // Clean up any connections that throw errors
        log(`[websocket] Error processing connection: ${error}`, 'error');
        cleanupConnection(ws, 1011, 'Error during connection processing');
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
  
  // Clean up all intervals on process exit to prevent memory leaks
  process.on('exit', () => {
    if (pingInterval) clearInterval(pingInterval);
    if (cleanupInterval) clearInterval(cleanupInterval);
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
    // Only OPEN readyState (1) is valid for sending messages
    if (ws.readyState !== WebSocket.OPEN) {
      // If the socket is in CLOSING or CLOSED state, remove it from clients
      if (ws.readyState === WebSocket.CLOSING || ws.readyState === WebSocket.CLOSED) {
        log('[websocket] Removing stale client connection');
        clients.delete(ws);
      }
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
        // Close problematic connections with appropriate close code
        try {
          // Use code 1011 (Internal Error) for send failures
          ws.close(1011, 'Failed to send message');
        } catch (closeError) {
          // For connections that can't even be closed normally, force terminate
          try {
            ws.terminate();
          } catch {
            // Last resort - just remove from clients
          }
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
 * Helper function to safely terminate connections and clean up resources
 * Used by shutdown and cleanup functions
 */
function cleanupConnection(ws: WebSocket, code = 1000, reason = 'Normal closure'): void {
  try {
    // First try to close normally
    if (ws.readyState === WebSocket.OPEN) {
      ws.close(code, reason);
    } else {
      // If already closing/closed, force terminate
      ws.terminate();
    }
  } catch (error) {
    log(`[websocket] Error during connection cleanup: ${error}`, 'error');
  } finally {
    // Always remove from clients map
    clients.delete(ws);
  }
}

/**
 * Get the WebSocket server instance
 */
export function getWebSocketServer(): WebSocketServer | null {
  return webSocketServer;
}