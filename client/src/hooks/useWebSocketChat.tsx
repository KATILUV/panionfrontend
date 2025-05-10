import { useEffect, useState, useRef, useCallback } from 'react';

export type ChatMessageType = 
  | 'message' 
  | 'typing_indicator' 
  | 'read_receipt'
  | 'heartbeat'
  | 'error'
  | 'history_request'
  | 'conversation_mode'
  | 'system';

export type ConversationMode = 'casual' | 'deep' | 'strategic' | 'logical';

export interface WebSocketChatMessage {
  type: ChatMessageType;
  message?: string;
  sender?: 'user' | 'assistant';
  conversationMode?: ConversationMode;
  timestamp?: number;
  sessionId?: string;
}

interface UseWebSocketChatProps {
  conversationMode?: ConversationMode;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: any) => void;
}

export const useWebSocketChat = ({
  conversationMode = 'casual',
  autoReconnect = true,
  reconnectInterval = 3000,
  maxReconnectAttempts = 5,
  onConnect,
  onDisconnect,
  onError
}: UseWebSocketChatProps = {}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<WebSocketChatMessage[]>([]);
  const [typingStatus, setTypingStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [currentMode, setCurrentMode] = useState<ConversationMode>(conversationMode);
  
  const socket = useRef<WebSocket | null>(null);
  const reconnectCount = useRef(0);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sessionIdRef = useRef<string>('');
  
  // Connect to WebSocket
  const connect = useCallback(() => {
    if (socket.current?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }
    
    try {
      // Create WebSocket connection
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws-chat`;
      
      // Append session ID if we have one
      const url = sessionIdRef.current 
        ? `${wsUrl}?sessionId=${sessionIdRef.current}`
        : wsUrl;
      
      console.log('Connecting to WebSocket:', url);
      
      socket.current = new WebSocket(url);
      
      // Set up event handlers
      socket.current.onopen = () => {
        console.log('WebSocket connection established');
        setIsConnected(true);
        reconnectCount.current = 0;
        
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
        }, 30000); // 30 seconds
        
        // Call onConnect callback
        onConnect?.();
      };
      
      socket.current.onmessage = (event) => {
        try {
          const data: WebSocketChatMessage = JSON.parse(event.data);
          
          // Save session ID if provided
          if (data.sessionId && !sessionIdRef.current) {
            sessionIdRef.current = data.sessionId;
          }
          
          // Handle different message types
          switch (data.type) {
            case 'message':
              setMessages(prev => [...prev, data]);
              break;
              
            case 'typing_indicator':
              setTypingStatus(data.message || '');
              break;
              
            case 'heartbeat':
              // Just acknowledge heartbeat, no UI action needed
              break;
              
            case 'error':
              setError(data.message || 'Unknown error');
              onError?.(data.message);
              break;
              
            case 'system':
              // System messages like connection status
              console.log('System message:', data.message);
              break;
              
            case 'conversation_mode':
              console.log('Conversation mode updated:', data.message);
              break;
              
            default:
              console.log('Unhandled message type:', data.type);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      socket.current.onclose = (event) => {
        console.log('WebSocket connection closed:', event.code, event.reason);
        setIsConnected(false);
        
        // Clear heartbeat timer
        if (heartbeatTimerRef.current) {
          clearInterval(heartbeatTimerRef.current);
          heartbeatTimerRef.current = null;
        }
        
        // Attempt reconnection if enabled
        if (autoReconnect && reconnectCount.current < maxReconnectAttempts) {
          reconnectCount.current += 1;
          reconnectTimerRef.current = setTimeout(() => {
            console.log(`Reconnecting (attempt ${reconnectCount.current}/${maxReconnectAttempts})...`);
            connect();
          }, reconnectInterval);
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
      setError('Failed to connect');
      onError?.(error);
    }
  }, [autoReconnect, maxReconnectAttempts, onConnect, onDisconnect, onError, reconnectInterval]);
  
  // Send a message
  const sendMessage = useCallback((message: string) => {
    if (!socket.current || socket.current.readyState !== WebSocket.OPEN) {
      setError('Not connected');
      return;
    }
    
    try {
      // Add message to local state immediately for better UX
      const userMessage: WebSocketChatMessage = {
        type: 'message',
        message,
        sender: 'user',
        timestamp: Date.now(),
        sessionId: sessionIdRef.current,
      };
      
      setMessages(prev => [...prev, userMessage]);
      
      // Send message to server
      socket.current.send(JSON.stringify({
        type: 'message',
        message,
        conversationMode: currentMode,
        timestamp: Date.now(),
        sessionId: sessionIdRef.current,
      }));
      
      // Clear any previous errors
      setError(null);
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message');
    }
  }, [currentMode]);
  
  // Send typing indicator
  const sendTypingStatus = useCallback((isTyping: boolean) => {
    if (!socket.current || socket.current.readyState !== WebSocket.OPEN) {
      return;
    }
    
    try {
      socket.current.send(JSON.stringify({
        type: 'typing_indicator',
        message: isTyping ? 'user' : '',
        timestamp: Date.now(),
        sessionId: sessionIdRef.current,
      }));
    } catch (error) {
      console.error('Error sending typing status:', error);
    }
  }, []);
  
  // Change conversation mode
  const changeConversationMode = useCallback((mode: ConversationMode) => {
    if (!socket.current || socket.current.readyState !== WebSocket.OPEN) {
      setError('Not connected');
      return;
    }
    
    try {
      socket.current.send(JSON.stringify({
        type: 'conversation_mode',
        conversationMode: mode,
        timestamp: Date.now(),
        sessionId: sessionIdRef.current,
      }));
      
      setCurrentMode(mode);
    } catch (error) {
      console.error('Error changing conversation mode:', error);
      setError('Failed to change mode');
    }
  }, []);
  
  // Connect on component mount
  useEffect(() => {
    connect();
    
    // Clean up on unmount
    return () => {
      if (socket.current) {
        socket.current.close();
        socket.current = null;
      }
      
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
      
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, [connect]);
  
  // Update mode if prop changes
  useEffect(() => {
    if (conversationMode !== currentMode) {
      setCurrentMode(conversationMode);
      
      if (isConnected) {
        changeConversationMode(conversationMode);
      }
    }
  }, [conversationMode, currentMode, isConnected, changeConversationMode]);
  
  return {
    isConnected,
    messages,
    sendMessage,
    typingStatus,
    error,
    sendTypingStatus,
    changeConversationMode,
    currentMode,
    reconnect: connect,
  };
};

export default useWebSocketChat;