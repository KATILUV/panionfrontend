/**
 * Simplified WebSocket Handler
 * This implementation addresses the 1006 connection issues
 */

import { Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { log } from './vite';

// Connection tracking
const clients = new Map<string, WebSocket>();
let wsServer: WebSocketServer | null = null;

/**
 * Initialize WebSocket server with more robust error handling
 */
export function initializeWebSocketServer(httpServer: Server): WebSocketServer {
  // Clean up any existing server
  if (wsServer) {
    try {
      wsServer.close();
    } catch (err) {
      log('[websocket] Error closing existing server', 'error');
    }
  }

  // Create new WebSocket server with improved settings
  wsServer = new WebSocketServer({
    server: httpServer,
    path: '/ws',
    // Increase timeout and backlog size
    clientTracking: true,
    perMessageDeflate: {
      zlibDeflateOptions: {
        // Tune for lower latency and better compression
        chunkSize: 1024,
        memLevel: 7,
        level: 3
      },
      zlibInflateOptions: {
        chunkSize: 10 * 1024
      },
      // Don't compress small messages
      threshold: 1024
    },
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

  // Handle new connections with improved error handling
  wsServer.on('connection', (ws: WebSocket, req: any) => {
    try {
      // Generate client ID
      const clientId = `client_${Date.now()}`;
      const clientIp = req.socket.remoteAddress || 'unknown';
      
      log(`[websocket] New connection: ${clientId} from ${clientIp}`);
      
      // Store client in our map
      clients.set(clientId, ws);
      
      // Send welcome message
      ws.send(JSON.stringify({
        type: 'welcome',
        message: 'Connected to WebSocket server',
        clientId,
        timestamp: Date.now()
      }));
      
      // Handle messages
      ws.on('message', (message: Buffer) => {
        try {
          const data = JSON.parse(message.toString());
          log(`[websocket] Received message: ${data.type || 'unknown'}`);
          
          // Basic echo for now, extend with real handlers
          ws.send(JSON.stringify({
            type: 'echo',
            message: data,
            timestamp: Date.now()
          }));
          
        } catch (err) {
          log(`[websocket] Error processing message: ${err}`, 'error');
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Error processing your message',
            timestamp: Date.now()
          }));
        }
      });
      
      // Handle disconnection
      ws.on('close', (code: number, reason: string) => {
        log(`[websocket] Client ${clientId} disconnected: ${code} - ${reason || 'No reason'}`);
        clients.delete(clientId);
      });
      
      // Handle errors
      ws.on('error', (err: Error) => {
        log(`[websocket] Client ${clientId} error: ${err.message}`, 'error');
        // Don't remove client yet, let close handler do it
      });
      
      // Set up ping interval specific to this connection
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          try {
            // Use ping/pong protocol instead of application-level messaging
            ws.ping();
          } catch (err) {
            log(`[websocket] Error pinging client ${clientId}: ${err}`, 'error');
            clearInterval(pingInterval);
            if (ws.readyState === WebSocket.OPEN) {
              ws.terminate(); // Force close if ping fails
            }
          }
        } else {
          clearInterval(pingInterval);
        }
      }, 15000); // 15 second ping interval
      
      // Clean up ping interval when connection closes
      ws.on('close', () => {
        clearInterval(pingInterval);
      });
      
    } catch (err) {
      log(`[websocket] Error handling new connection: ${err}`, 'error');
      if (ws.readyState === WebSocket.OPEN) {
        ws.close(1011, 'Internal server error');
      }
    }
  });

  // Handle server errors
  wsServer.on('error', (err: Error) => {
    log(`[websocket] Server error: ${err.message}`, 'error');
  });

  log('[websocket] WebSocket server initialized with enhanced settings');
  return wsServer;
}

/**
 * Get active WebSocket server
 */
export function getWebSocketServer(): WebSocketServer | null {
  return wsServer;
}

/**
 * Broadcast message to all connected clients
 */
export function broadcastMessage(message: any): void {
  if (!wsServer) return;
  
  wsServer.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify(message));
      } catch (err) {
        log(`[websocket] Error broadcasting message: ${err}`, 'error');
      }
    }
  });
}

/**
 * Send message to specific client
 */
export function sendToClient(clientId: string, message: any): boolean {
  const client = clients.get(clientId);
  if (client && client.readyState === WebSocket.OPEN) {
    try {
      client.send(JSON.stringify(message));
      return true;
    } catch (err) {
      log(`[websocket] Error sending to client ${clientId}: ${err}`, 'error');
      return false;
    }
  }
  return false;
}

/**
 * Get count of connected clients
 */
export function getClientCount(): number {
  return clients.size;
}

/**
 * Cleanly shutdown WebSocket server
 */
export function shutdownWebSocketServer(): void {
  if (!wsServer) return;
  
  log('[websocket] Shutting down WebSocket server...');
  
  // Send disconnect message to all clients
  clients.forEach((client, id) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify({
          type: 'server_shutdown',
          message: 'Server is shutting down',
          timestamp: Date.now()
        }));
      } catch (err) {
        // Ignore errors during shutdown
      }
    }
  });
  
  // Close all connections
  clients.forEach((client) => {
    try {
      client.close(1001, 'Server shutting down');
    } catch (err) {
      // Ignore errors during shutdown
    }
  });
  
  // Clear clients map
  clients.clear();
  
  // Close the server
  wsServer.close(() => {
    log('[websocket] WebSocket server closed successfully');
  });
}