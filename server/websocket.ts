import { Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

// Client connection type for tracking subscriptions
interface WebSocketConnection {
  ws: WebSocket;
  subscriptions: Set<string>; // Task IDs
  lastActivity: number;
}

// WebSocket event types
interface WebSocketMessage {
  type: 'subscribe' | 'unsubscribe' | 'heartbeat';
  taskId?: string;
}

// Initialize WebSocket Server
export function initializeWebSocketServer(httpServer: Server): WebSocketServer {
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: '/ws',
    // Add proper headers for WebSocket handshake
    handleProtocols: (protocols, request) => {
      // Accept the first protocol if one is provided or subprotocol-less connection
      return protocols[0] || '';
    }
  });
  
  // Verify headers for connection upgrade
  wss.on('headers', (headers, request) => {
    // Ensure proper WebSocket headers are present
    if (!headers.find(header => header.toLowerCase().includes('connection:'))) {
      headers.push('Connection: Upgrade');
    }
    if (!headers.find(header => header.toLowerCase().includes('upgrade:'))) {
      headers.push('Upgrade: websocket');
    }
    // Add CORS headers for browser clients
    headers.push('Access-Control-Allow-Origin: *');
    headers.push('Access-Control-Allow-Headers: *');
  });
  
  console.log('[websocket] WebSocket server initialized with enhanced headers');
  
  // Track client connections and their subscriptions
  const clients = new Map<WebSocket, WebSocketConnection>();
  
  // Handle new connections
  wss.on('connection', (ws: WebSocket) => {
    console.log('[websocket] Client connected');
    
    // Initialize client state
    clients.set(ws, {
      ws,
      subscriptions: new Set<string>(),
      lastActivity: Date.now()
    });
    
    // Handle messages from the client
    ws.on('message', (message: string) => {
      try {
        const data: WebSocketMessage = JSON.parse(message.toString());
        const client = clients.get(ws);
        
        if (!client) {
          console.error('[websocket] Received message from unregistered client');
          return;
        }
        
        // Update last activity time for heartbeat tracking
        client.lastActivity = Date.now();
        
        // Handle subscription requests
        if (data.type === 'subscribe' && data.taskId) {
          console.log(`[websocket] Client subscribed to task: ${data.taskId}`);
          client.subscriptions.add(data.taskId);
        }
        
        // Handle unsubscribe requests
        if (data.type === 'unsubscribe' && data.taskId) {
          console.log(`[websocket] Client unsubscribed from task: ${data.taskId}`);
          client.subscriptions.delete(data.taskId);
        }
        
        // Handle heartbeat (just update last activity time, already done above)
        if (data.type === 'heartbeat') {
          // Pong back to client to confirm connection is still alive
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        }
      } catch (error) {
        console.error('[websocket] Error processing message:', error);
      }
    });
    
    // Handle client disconnection
    ws.on('close', () => {
      console.log('[websocket] Client disconnected');
      clients.delete(ws);
    });
    
    // Handle errors
    ws.on('error', (error) => {
      console.error('[websocket] Client connection error:', error);
      clients.delete(ws);
    });
  });
  
  // Set up a heartbeat interval to detect and clean up stale connections
  const HEARTBEAT_INTERVAL = 30000; // 30 seconds
  const MAX_INACTIVITY = 120000; // 2 minutes
  
  setInterval(() => {
    const now = Date.now();
    
    clients.forEach((client, ws) => {
      // If client hasn't sent a message in MAX_INACTIVITY time
      if (now - client.lastActivity > MAX_INACTIVITY) {
        console.log('[websocket] Terminating inactive connection');
        ws.terminate();
        clients.delete(ws);
      }
    });
  }, HEARTBEAT_INTERVAL);
  
  return wss;
}

// Broadcast a message to all subscribed clients
export function broadcastTaskEvent(
  taskId: string, 
  eventType: 'task_update' | 'step_update',
  eventData: Record<string, any>
): void {
  const wss = getWebSocketServer();
  
  if (!wss) {
    console.error('[websocket] WebSocket server not initialized');
    return;
  }
  
  let clientCount = 0;
  
  // Get all clients from the WebSocketServer
  wss.clients.forEach((ws) => {
    // Check if client is still connected
    if (ws.readyState !== WebSocket.OPEN) {
      return;
    }
    
    // Get client info and check subscriptions
    const conn = getWebSocketConnection(ws);
    if (conn && conn.subscriptions.has(taskId)) {
      clientCount++;
      
      // Build the event message
      const message = {
        taskId,
        type: eventType,
        timestamp: Date.now(),
        ...eventData
      };
      
      // Send the event to this client
      ws.send(JSON.stringify(message));
    }
  });
  
  console.log(`[websocket] Broadcast task event to ${clientCount} clients: ${taskId} (${eventType})`);
}

// Reference to the WebSocket server instance
let webSocketServer: WebSocketServer | null = null;

// Store the WebSocket server instance
export function setWebSocketServer(wss: WebSocketServer): void {
  webSocketServer = wss;
}

// Get the WebSocket server instance
export function getWebSocketServer(): WebSocketServer | null {
  return webSocketServer;
}

// Helper to get client connection info
function getWebSocketConnection(ws: WebSocket): WebSocketConnection | undefined {
  // Custom implementation to retrieve client info
  // Since we can't directly access the clients Map from outside
  // This is just a placeholder implementation
  let connection: WebSocketConnection | undefined;
  
  webSocketServer?.clients.forEach((client, _key, _set) => {
    if (client === ws) {
      connection = (client as any)._connection as WebSocketConnection;
    }
  });
  
  return connection;
}