// WebSocket Service - Handles connection to unified WebSocket server
import { useState, useEffect, useRef, useCallback } from 'react';

export type ConnectionStatus = 
  | 'connecting' 
  | 'connected' 
  | 'disconnected' 
  | 'reconnecting' 
  | 'failed';

export type MessageType = 
  | 'message' 
  | 'task_update'
  | 'step_update'
  | 'typing_indicator' 
  | 'heartbeat'
  | 'error'
  | 'system'
  | 'welcome'
  | 'conversation_mode';

export interface WebSocketMessage {
  type: MessageType;
  message?: string;
  taskId?: string;
  timestamp?: number;
  [key: string]: any;
}

interface WebSocketServiceOptions {
  path: string;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  connectionTimeout?: number;
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: any) => void;
  onReconnect?: (attempt: number) => void;
  debug?: boolean;
}

export const useWebSocketService = ({
  path,
  autoReconnect = true,
  reconnectInterval = 3000,
  maxReconnectAttempts = 10,
  heartbeatInterval = 30000,
  connectionTimeout = 10000,
  onMessage,
  onConnect,
  onDisconnect,
  onError,
  onReconnect,
  debug = false
}: WebSocketServiceOptions) => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [isServerHealthy, setIsServerHealthy] = useState<boolean>(true);
  
  const socket = useRef<WebSocket | null>(null);
  const reconnectCount = useRef(0);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingMessagesRef = useRef<WebSocketMessage[]>([]);
  const lastHeartbeatRef = useRef<number>(Date.now());
  const healthCheckTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Debug logging function
  const logDebug = useCallback((message: string, ...args: any[]) => {
    if (debug) {
      console.log(`[WebSocketService] ${message}`, ...args);
    }
  }, [debug]);
  
  // Connection cleanup function
  const cleanupConnection = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
    
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
    
    if (healthCheckTimerRef.current) {
      clearInterval(healthCheckTimerRef.current);
      healthCheckTimerRef.current = null;
    }
    
    if (socket.current) {
      // Remove all event listeners to prevent memory leaks
      socket.current.onopen = null;
      socket.current.onmessage = null;
      socket.current.onclose = null;
      socket.current.onerror = null;
      
      // Only close if not already closed
      if (socket.current.readyState !== WebSocket.CLOSED && 
          socket.current.readyState !== WebSocket.CLOSING) {
        socket.current.close();
      }
      
      socket.current = null;
    }
  }, []);
  
  // Health check function
  const checkConnectionHealth = useCallback(() => {
    const now = Date.now();
    const timeSinceLastHeartbeat = now - lastHeartbeatRef.current;
    
    // If we haven't received a heartbeat in twice the interval, connection might be dead
    if (timeSinceLastHeartbeat > heartbeatInterval * 2) {
      logDebug(`Connection health check failed: No heartbeat for ${timeSinceLastHeartbeat}ms`);
      setIsServerHealthy(false);
      
      // Force reconnection if socket is still technically open
      if (socket.current?.readyState === WebSocket.OPEN) {
        logDebug('Force closing stale WebSocket connection');
        socket.current.close();
      }
    } else {
      setIsServerHealthy(true);
    }
  }, [heartbeatInterval, logDebug]);
  
  // Connect to WebSocket
  const connect = useCallback(() => {
    // Don't try to connect if already connecting or connected
    if (connectionStatus === 'connecting' || 
        connectionStatus === 'reconnecting' || 
        socket.current?.readyState === WebSocket.OPEN ||
        socket.current?.readyState === WebSocket.CONNECTING) {
      logDebug(`Already ${connectionStatus}, not creating new connection`);
      return;
    }
    
    // Clean up any existing connection
    cleanupConnection();
    
    try {
      // Set status before creating socket
      setConnectionStatus(reconnectCount.current > 0 ? 'reconnecting' : 'connecting');
      
      // Create WebSocket connection
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}${path}`;
      
      logDebug(`Connecting to WebSocket: ${wsUrl}`);
      
      socket.current = new WebSocket(wsUrl);
      
      // Set connection timeout
      connectionTimeoutRef.current = setTimeout(() => {
        if (socket.current?.readyState !== WebSocket.OPEN) {
          logDebug('Connection timeout reached');
          if (socket.current) {
            socket.current.close();
          }
        }
      }, connectionTimeout);
      
      // Set up event handlers
      socket.current.onopen = () => {
        logDebug('WebSocket connection established');
        setConnectionStatus('connected');
        setError(null);
        
        // Clear connection timeout
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }
        
        // Reset reconnect counter if this was a successful reconnect
        if (reconnectCount.current > 0) {
          logDebug(`Successfully reconnected after ${reconnectCount.current} attempts`);
          onReconnect?.(reconnectCount.current);
        }
        reconnectCount.current = 0;
        
        // Initialize heartbeat
        lastHeartbeatRef.current = Date.now();
        
        // Start heartbeat
        if (heartbeatTimerRef.current) {
          clearInterval(heartbeatTimerRef.current);
        }
        
        heartbeatTimerRef.current = setInterval(() => {
          if (socket.current?.readyState === WebSocket.OPEN) {
            socket.current.send(JSON.stringify({
              type: 'heartbeat',
              timestamp: Date.now()
            }));
          }
        }, heartbeatInterval);
        
        // Start health checks
        if (healthCheckTimerRef.current) {
          clearInterval(healthCheckTimerRef.current);
        }
        
        healthCheckTimerRef.current = setInterval(checkConnectionHealth, heartbeatInterval);
        
        // Send any pending messages
        if (pendingMessagesRef.current.length > 0) {
          logDebug(`Sending ${pendingMessagesRef.current.length} pending messages`);
          
          [...pendingMessagesRef.current].forEach(message => {
            sendMessage(message);
          });
          
          pendingMessagesRef.current = [];
        }
        
        // Call onConnect callback
        onConnect?.();
      };
      
      socket.current.onmessage = (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data);
          
          // Update last heartbeat time
          lastHeartbeatRef.current = Date.now();
          
          // Call the message handler
          onMessage?.(data);
          
        } catch (error) {
          console.error('Error parsing WebSocket message:', error, event.data);
        }
      };
      
      socket.current.onclose = (event) => {
        logDebug(`WebSocket connection closed: Code=${event.code}, Reason=${event.reason}`);
        setConnectionStatus('disconnected');
        
        // Clear all timers
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }
        
        if (heartbeatTimerRef.current) {
          clearInterval(heartbeatTimerRef.current);
          heartbeatTimerRef.current = null;
        }
        
        if (healthCheckTimerRef.current) {
          clearInterval(healthCheckTimerRef.current);
          healthCheckTimerRef.current = null;
        }
        
        // Attempt reconnection if enabled and not a normal closure (1000)
        if (autoReconnect && event.code !== 1000) {
          // Exponential backoff with jitter
          const baseDelay = reconnectInterval;
          const attempt = reconnectCount.current + 1;
          const maxDelay = Math.min(30000, baseDelay * Math.pow(2, attempt)); // Cap at 30 seconds
          const jitter = Math.random() * 0.3 + 0.85; // 0.85-1.15 randomization factor
          const delay = Math.floor(maxDelay * jitter);
          
          if (attempt <= maxReconnectAttempts) {
            reconnectCount.current = attempt;
            logDebug(`Scheduling reconnect attempt ${attempt}/${maxReconnectAttempts} in ${delay}ms`);
            
            // Set status to reconnecting
            setConnectionStatus('reconnecting');
            
            reconnectTimerRef.current = setTimeout(() => {
              logDebug(`Attempting reconnect (${attempt}/${maxReconnectAttempts})...`);
              connect();
            }, delay);
          } else {
            logDebug(`Maximum reconnection attempts (${maxReconnectAttempts}) reached`);
            setConnectionStatus('failed');
            setError(`Failed to reconnect after ${maxReconnectAttempts} attempts`);
          }
        } else if (event.code !== 1000) {
          setConnectionStatus('failed');
        }
        
        // Call onDisconnect callback
        onDisconnect?.();
      };
      
      socket.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('Connection error');
        onError?.(error);
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnectionStatus('failed');
      setError('Failed to connect');
      onError?.(error);
    }
  }, [
    connectionStatus, 
    autoReconnect, 
    maxReconnectAttempts, 
    reconnectInterval, 
    heartbeatInterval, 
    connectionTimeout,
    onConnect, 
    onDisconnect, 
    onError, 
    onReconnect,
    onMessage,
    cleanupConnection,
    checkConnectionHealth,
    logDebug,
    path
  ]);
  
  // Send a message
  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (!socket.current || socket.current.readyState !== WebSocket.OPEN) {
      logDebug('Socket not open, adding message to pending queue', message);
      pendingMessagesRef.current.push(message);
      
      // Try to reconnect if not already connecting
      if (connectionStatus !== 'connecting' && connectionStatus !== 'reconnecting') {
        connect();
      }
      return false;
    }
    
    try {
      // Update timestamp before sending
      const messageWithTimestamp = {
        ...message,
        timestamp: Date.now()
      };
      
      socket.current.send(JSON.stringify(messageWithTimestamp));
      logDebug('Message sent successfully', messageWithTimestamp);
      return true;
    } catch (error) {
      logDebug('Error sending message', error);
      pendingMessagesRef.current.push(message);
      return false;
    }
  }, [connect, connectionStatus, logDebug]);
  
  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    logDebug('Manually disconnecting');
    cleanupConnection();
    setConnectionStatus('disconnected');
  }, [cleanupConnection, logDebug]);
  
  // Effect: Connect on mount, disconnect on unmount
  useEffect(() => {
    connect();
    
    return () => {
      cleanupConnection();
    };
  }, [connect, cleanupConnection]);
  
  return {
    connectionStatus,
    isServerHealthy,
    error,
    connect,
    disconnect,
    sendMessage,
    pendingMessages: pendingMessagesRef.current.length
  };
};