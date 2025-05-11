import { useEffect, useState, useRef, useCallback } from 'react';

export type ChatMessageType = 
  | 'message' 
  | 'typing_indicator' 
  | 'read_receipt'
  | 'heartbeat'
  | 'error'
  | 'history_request'
  | 'conversation_mode'
  | 'system'
  | 'welcome'
  | 'reconnect';

export type ConnectionStatus = 
  | 'connecting' 
  | 'connected' 
  | 'disconnected' 
  | 'reconnecting' 
  | 'failed';

export type ConversationMode = 'casual' | 'deep' | 'strategic' | 'logical';

export interface WebSocketChatMessage {
  type: ChatMessageType;
  message?: string;
  sender?: 'user' | 'assistant';
  conversationMode?: ConversationMode;
  timestamp?: number;
  sessionId?: string;
  client_id?: string;
}

interface UseWebSocketChatProps {
  conversationMode?: ConversationMode;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  connectionTimeout?: number;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: any) => void;
  onReconnect?: (attempt: number) => void;
  debug?: boolean;
}

const PENDING_MESSAGES_STORAGE_KEY = 'pending_websocket_messages';

export const useWebSocketChat = ({
  conversationMode = 'casual',
  autoReconnect = true,
  reconnectInterval = 3000,
  maxReconnectAttempts = 10,
  heartbeatInterval = 30000,
  connectionTimeout = 10000,
  onConnect,
  onDisconnect,
  onError,
  onReconnect,
  debug = false
}: UseWebSocketChatProps = {}) => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [messages, setMessages] = useState<WebSocketChatMessage[]>([]);
  const [typingStatus, setTypingStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [currentMode, setCurrentMode] = useState<ConversationMode>(conversationMode);
  const [isServerHealthy, setIsServerHealthy] = useState<boolean>(true);
  
  const socket = useRef<WebSocket | null>(null);
  const reconnectCount = useRef(0);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingMessagesRef = useRef<WebSocketChatMessage[]>([]);
  const sessionIdRef = useRef<string>('');
  const clientIdRef = useRef<string>('');
  const lastHeartbeatRef = useRef<number>(Date.now());
  const healthCheckTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Debug logging function
  const logDebug = useCallback((message: string, ...args: any[]) => {
    if (debug) {
      console.log(`[WebSocketChat] ${message}`, ...args);
    }
  }, [debug]);
  
  // Load pending messages from localStorage
  const loadPendingMessages = useCallback(() => {
    try {
      const storedMessages = localStorage.getItem(PENDING_MESSAGES_STORAGE_KEY);
      if (storedMessages) {
        pendingMessagesRef.current = JSON.parse(storedMessages);
        logDebug(`Loaded ${pendingMessagesRef.current.length} pending messages from storage`);
      }
    } catch (error) {
      console.error('Failed to load pending messages:', error);
    }
  }, [logDebug]);
  
  // Save pending messages to localStorage
  const savePendingMessages = useCallback(() => {
    try {
      if (pendingMessagesRef.current.length > 0) {
        localStorage.setItem(
          PENDING_MESSAGES_STORAGE_KEY, 
          JSON.stringify(pendingMessagesRef.current)
        );
        logDebug(`Saved ${pendingMessagesRef.current.length} pending messages to storage`);
      } else {
        localStorage.removeItem(PENDING_MESSAGES_STORAGE_KEY);
      }
    } catch (error) {
      console.error('Failed to save pending messages:', error);
    }
  }, [logDebug]);
  
  // Send pending messages
  const sendPendingMessages = useCallback(() => {
    if (socket.current?.readyState !== WebSocket.OPEN || pendingMessagesRef.current.length === 0) {
      return;
    }
    
    logDebug(`Attempting to send ${pendingMessagesRef.current.length} pending messages`);
    
    const messagesToSend = [...pendingMessagesRef.current];
    pendingMessagesRef.current = [];
    
    messagesToSend.forEach(message => {
      try {
        // Update session ID and timestamp before sending
        message.sessionId = sessionIdRef.current;
        message.timestamp = Date.now();
        
        socket.current?.send(JSON.stringify(message));
        logDebug('Sent pending message:', message);
      } catch (error) {
        console.error('Failed to send pending message:', error);
        pendingMessagesRef.current.push(message);
      }
    });
    
    savePendingMessages();
  }, [logDebug, savePendingMessages]);
  
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
      const wsUrl = `${protocol}//${window.location.host}/ws-chat`;
      
      // Append session ID if we have one
      const url = sessionIdRef.current 
        ? `${wsUrl}?sessionId=${sessionIdRef.current}`
        : wsUrl;
      
      logDebug(`Connecting to WebSocket: ${url}`);
      
      socket.current = new WebSocket(url);
      
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
              timestamp: Date.now(),
              sessionId: sessionIdRef.current,
              client_id: clientIdRef.current
            }));
          }
        }, heartbeatInterval);
        
        // Start health checks
        if (healthCheckTimerRef.current) {
          clearInterval(healthCheckTimerRef.current);
        }
        
        healthCheckTimerRef.current = setInterval(checkConnectionHealth, heartbeatInterval);
        
        // Send any pending messages
        sendPendingMessages();
        
        // Call onConnect callback
        onConnect?.();
      };
      
      socket.current.onmessage = (event) => {
        try {
          const data: WebSocketChatMessage = JSON.parse(event.data);
          
          // Update last heartbeat time
          lastHeartbeatRef.current = Date.now();
          
          // Save session ID if provided
          if (data.sessionId && !sessionIdRef.current) {
            sessionIdRef.current = data.sessionId;
            logDebug(`Received session ID: ${sessionIdRef.current}`);
          }
          
          // Save client ID if provided (from welcome message)
          if (data.client_id && !clientIdRef.current) {
            clientIdRef.current = data.client_id;
            logDebug(`Received client ID: ${clientIdRef.current}`);
          }
          
          // Handle different message types
          switch (data.type) {
            case 'welcome':
              logDebug('Received welcome message:', data);
              // The welcome message has been processed above (client_id)
              break;
              
            case 'message':
              logDebug('Received message:', data);
              setMessages(prev => [...prev, data]);
              break;
              
            case 'typing_indicator':
              setTypingStatus(data.message || '');
              break;
              
            case 'heartbeat':
              // Just acknowledge heartbeat
              logDebug('Received heartbeat');
              break;
              
            case 'error':
              logDebug('Received error:', data.message);
              setError(data.message || 'Unknown error');
              onError?.(data.message);
              break;
              
            case 'system':
              logDebug('System message:', data.message);
              break;
              
            case 'conversation_mode':
              logDebug('Conversation mode updated:', data.conversationMode);
              setCurrentMode(data.conversationMode as ConversationMode || currentMode);
              break;
              
            default:
              logDebug('Unhandled message type:', data.type);
          }
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
    cleanupConnection, 
    sendPendingMessages, 
    checkConnectionHealth,
    logDebug,
    currentMode
  ]);
  
  // Add message to pending queue
  const addPendingMessage = useCallback((message: WebSocketChatMessage) => {
    pendingMessagesRef.current.push(message);
    savePendingMessages();
    logDebug('Added message to pending queue', message);
  }, [logDebug, savePendingMessages]);
  
  // Send a message
  const sendMessage = useCallback((message: string) => {
    const userMessage: WebSocketChatMessage = {
      type: 'message',
      message,
      sender: 'user',
      timestamp: Date.now(),
      sessionId: sessionIdRef.current,
      client_id: clientIdRef.current,
      conversationMode: currentMode
    };
    
    // Add message to local state immediately for better UX
    setMessages(prev => [...prev, userMessage]);
    
    // Reset error state
    setError(null);
    
    if (!socket.current || socket.current.readyState !== WebSocket.OPEN) {
      logDebug('Socket not open, adding message to pending queue');
      addPendingMessage(userMessage);
      
      // Try to reconnect if not already connecting
      if (connectionStatus !== 'connecting' && connectionStatus !== 'reconnecting') {
        connect();
      }
      return;
    }
    
    try {
      // Send message to server
      socket.current.send(JSON.stringify(userMessage));
      logDebug('Sent message:', userMessage);
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message');
      
      // Add to pending messages for retry
      addPendingMessage(userMessage);
    }
  }, [currentMode, connectionStatus, connect, addPendingMessage, logDebug]);
  
  // Send typing indicator
  const sendTypingStatus = useCallback((isTyping: boolean) => {
    if (!socket.current || socket.current.readyState !== WebSocket.OPEN) {
      return;
    }
    
    try {
      const typingMessage = {
        type: 'typing_indicator' as ChatMessageType,
        message: isTyping ? 'user' : '',
        timestamp: Date.now(),
        sessionId: sessionIdRef.current,
        client_id: clientIdRef.current
      };
      
      socket.current.send(JSON.stringify(typingMessage));
      logDebug('Sent typing status:', isTyping);
    } catch (error) {
      console.error('Error sending typing status:', error);
    }
  }, [logDebug]);
  
  // Change conversation mode
  const changeConversationMode = useCallback((mode: ConversationMode) => {
    const modeMessage = {
      type: 'conversation_mode' as ChatMessageType,
      conversationMode: mode,
      timestamp: Date.now(),
      sessionId: sessionIdRef.current,
      client_id: clientIdRef.current
    };
    
    setCurrentMode(mode);
    
    if (!socket.current || socket.current.readyState !== WebSocket.OPEN) {
      // Store the mode change in pending messages
      addPendingMessage(modeMessage);
      return;
    }
    
    try {
      socket.current.send(JSON.stringify(modeMessage));
      logDebug('Sent conversation mode change:', mode);
    } catch (error) {
      console.error('Error changing conversation mode:', error);
      addPendingMessage(modeMessage);
    }
  }, [addPendingMessage, logDebug]);
  
  // Initialize by loading any pending messages
  useEffect(() => {
    loadPendingMessages();
  }, [loadPendingMessages]);
  
  // Connect on component mount
  useEffect(() => {
    connect();
    
    // Clean up on unmount
    return () => {
      cleanupConnection();
      
      // Save any pending messages
      savePendingMessages();
    };
  }, [connect, cleanupConnection, savePendingMessages]);
  
  // Update mode if prop changes
  useEffect(() => {
    if (conversationMode !== currentMode) {
      changeConversationMode(conversationMode);
    }
  }, [conversationMode, currentMode, changeConversationMode]);
  
  return {
    isConnected: connectionStatus === 'connected',
    connectionStatus,
    messages,
    sendMessage,
    typingStatus,
    error,
    sendTypingStatus,
    changeConversationMode,
    currentMode,
    reconnect: connect,
    isServerHealthy,
    pendingMessageCount: pendingMessagesRef.current.length
  };
};

export default useWebSocketChat;