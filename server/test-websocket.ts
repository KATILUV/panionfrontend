import { WebSocketServer, WebSocket } from 'ws';
import { log } from './vite';
import { createServer } from 'http';

// Create a simple HTTP server
const httpServer = createServer();
const port = process.env.PORT || 3001;

// Create WebSocket server
const wss = new WebSocketServer({ 
  server: httpServer,
  path: '/test-ws',
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

// Store active connections
const clients = new Map<WebSocket, { lastActivity: number }>();

// Set up WebSocket server
wss.on('connection', (ws: WebSocket, req: any) => {
  log('[test-ws] Client connected');
  
  // Store client
  clients.set(ws, { lastActivity: Date.now() });
  
  // Send welcome message
  ws.send(JSON.stringify({
    type: 'welcome',
    message: 'Connected to test WebSocket server',
    timestamp: Date.now()
  }));
  
  // Handle messages
  ws.on('message', (data: Buffer) => {
    try {
      // Parse message
      const message = JSON.parse(data.toString());
      log(`[test-ws] Received message: ${JSON.stringify(message)}`);
      
      // Update activity timestamp
      const client = clients.get(ws);
      if (client) {
        client.lastActivity = Date.now();
      }
      
      // Echo the message back
      ws.send(JSON.stringify({
        type: 'echo',
        originalMessage: message,
        timestamp: Date.now()
      }));
      
      // If it's a chat message, simulate a response
      if (message.type === 'message' && message.message) {
        // Send typing indicator
        setTimeout(() => {
          ws.send(JSON.stringify({
            type: 'typing_indicator',
            message: true,
            timestamp: Date.now()
          }));
        }, 500);
        
        // Send response after a delay
        setTimeout(() => {
          ws.send(JSON.stringify({
            type: 'message',
            message: `Echo: ${message.message}`,
            sender: 'assistant',
            timestamp: Date.now()
          }));
          
          // Clear typing indicator
          ws.send(JSON.stringify({
            type: 'typing_indicator',
            message: false,
            timestamp: Date.now()
          }));
        }, 2000);
      }
    } catch (error) {
      log(`[test-ws] Error processing message: ${error}`, 'error');
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to process your message',
        timestamp: Date.now()
      }));
    }
  });
  
  // Handle disconnect
  ws.on('close', () => {
    log('[test-ws] Client disconnected');
    clients.delete(ws);
  });
  
  // Handle errors
  ws.on('error', (error) => {
    log(`[test-ws] Client error: ${error}`, 'error');
    clients.delete(ws);
  });
});

// Set up heartbeat to clean up stale connections
setInterval(() => {
  const now = Date.now();
  let closedCount = 0;
  
  clients.forEach((client, ws) => {
    try {
      if (now - client.lastActivity > 60000) { // 1 minute inactivity
        log('[test-ws] Terminating inactive connection');
        ws.terminate();
        clients.delete(ws);
        closedCount++;
      }
    } catch (error) {
      // Clean up any connections that throw errors
      log(`[test-ws] Error processing connection: ${error}`, 'error');
      try {
        ws.terminate();
      } catch {
        // Ignore errors when terminating
      }
      clients.delete(ws);
      closedCount++;
    }
  });
  
  if (closedCount > 0) {
    log(`[test-ws] Connection cleanup: removed ${closedCount} stale connections, remaining: ${clients.size}`);
  }
}, 30000);

// Start the server
httpServer.listen(port, () => {
  log(`[test-ws] WebSocket test server running on port ${port}`);
});