import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';

// Simple logging function for WebSocket events
function wsLog(message: string): void {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [websocket] ${message}`);
}

// Subscription tracking
interface Client {
  ws: WebSocket;
  subscriptions: Set<string>; // taskIds
  lastPing: number;
}

// Store connected clients
const clients: Map<WebSocket, Client> = new Map();

// Event cache for late-joining clients (keyed by taskId)
const eventCache: Map<string, any[]> = new Map();
const MAX_CACHED_EVENTS = 50;

// Setup WebSocket server
export function setupWebsocketServer(server: Server): void {
  const wss = new WebSocketServer({ server, path: '/ws' });
  
  wsLog('WebSocket server initialized');

  wss.on('connection', (ws: WebSocket) => {
    wsLog('New WebSocket connection established');
    
    // Initialize client info
    clients.set(ws, {
      ws,
      subscriptions: new Set(),
      lastPing: Date.now()
    });

    // Handle incoming messages
    ws.on('message', (data: string) => {
      try {
        const message = JSON.parse(data);
        handleClientMessage(ws, message);
      } catch (error) {
        wsLog(`Error parsing WebSocket message: ${error}`);
      }
    });

    // Clean up on connection close
    ws.on('close', () => {
      wsLog('WebSocket connection closed');
      clients.delete(ws);
    });

    // Handle errors
    ws.on('error', (error) => {
      wsLog(`WebSocket error: ${error}`);
      clients.delete(ws);
    });

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'system',
      message: 'Connected to Panion WebSocket server',
      timestamp: new Date().toISOString()
    }));
  });

  // Set up periodic connection check
  setInterval(() => {
    const now = Date.now();
    clients.forEach((client, ws) => {
      // Check if client has sent a heartbeat in the last 2 minutes
      if (now - client.lastPing > 2 * 60 * 1000) {
        wsLog('Client connection timed out, closing');
        ws.terminate();
        clients.delete(ws);
      }
    });
  }, 60000);
}

// Handle client messages
function handleClientMessage(ws: WebSocket, message: any): void {
  const client = clients.get(ws);
  if (!client) return;

  // Update last ping time
  client.lastPing = Date.now();

  switch (message.type) {
    case 'subscribe':
      if (message.taskId) {
        wsLog(`Client subscribed to task: ${message.taskId}`);
        client.subscriptions.add(message.taskId);
        
        // Send cached events for this task
        const cachedEvents = eventCache.get(message.taskId) || [];
        if (cachedEvents.length > 0) {
          cachedEvents.forEach(event => {
            ws.send(JSON.stringify(event));
          });
          wsLog(`Sent ${cachedEvents.length} cached events for task: ${message.taskId}`);
        }
      }
      break;

    case 'unsubscribe':
      if (message.taskId) {
        wsLog(`Client unsubscribed from task: ${message.taskId}`);
        client.subscriptions.delete(message.taskId);
      }
      break;

    case 'heartbeat':
      // Just update the ping time, which we've already done
      break;

    default:
      wsLog(`Unknown message type: ${message.type}`);
  }
}

// Broadcast task event to subscribers
export function broadcastTaskEvent(taskId: string, event: any): void {
  // Ensure event has required fields
  const fullEvent = {
    ...event,
    taskId,
    id: event.id || `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    timestamp: event.timestamp || new Date().toISOString()
  };

  // Cache the event
  if (!eventCache.has(taskId)) {
    eventCache.set(taskId, []);
  }
  
  const taskEvents = eventCache.get(taskId)!;
  taskEvents.push(fullEvent);
  
  // Trim cache if needed
  if (taskEvents.length > MAX_CACHED_EVENTS) {
    eventCache.set(taskId, taskEvents.slice(-MAX_CACHED_EVENTS));
  }

  // Broadcast to subscribers
  let subscriberCount = 0;
  clients.forEach(client => {
    if (client.subscriptions.has(taskId) && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(fullEvent));
      subscriberCount++;
    }
  });

  if (subscriberCount > 0) {
    wsLog(`Broadcast task event to ${subscriberCount} subscribers for task: ${taskId}`);
  }
}

// Clear cached events for a task
export function clearTaskEvents(taskId: string): void {
  eventCache.delete(taskId);
  wsLog(`Cleared cached events for task: ${taskId}`);
}

// Get connected client count
export function getClientCount(): number {
  return clients.size;
}

// Get active subscription count for a task
export function getSubscriberCount(taskId: string): number {
  let count = 0;
  clients.forEach(client => {
    if (client.subscriptions.has(taskId)) {
      count++;
    }
  });
  return count;
}