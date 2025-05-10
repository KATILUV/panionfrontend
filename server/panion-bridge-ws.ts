/**
 * Panion WebSocket Bridge 
 * Optimized bidirectional communication between Node.js and Python
 * with Panion Intelligence autonomous capabilities.
 */

import { WebSocket } from 'ws';
import { log } from './vite';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { EventEmitter } from 'events';

// Configuration
const PANION_API_PORT = process.env.PANION_API_PORT || 8000;
const PANION_API_WS_PORT = process.env.PANION_API_WS_PORT || 8001;
const PANION_API_URL = `http://localhost:${PANION_API_PORT}`;
const PANION_API_WS_URL = `ws://localhost:${PANION_API_WS_PORT}`;

// Exponential backoff constants
const MAX_RECONNECT_DELAY = 30000; // 30 seconds
const INITIAL_RECONNECT_DELAY = 1000; // 1 second

class PanionBridgeWS extends EventEmitter {
  private ws: WebSocket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pendingRequests = new Map<string, {
    resolve: (value: any) => void;
    reject: (reason: any) => void;
    timestamp: number;
    timeout: NodeJS.Timeout;
  }>();
  
  // Performance metrics
  private metrics = {
    totalRequests: 0,
    failedRequests: 0, 
    batchedRequests: 0,
    totalResponseTime: 0,
    reconnects: 0
  };
  
  constructor() {
    super();
    this.connect();
    
    // Set up metrics reporting 
    setInterval(() => this.reportMetrics(), 60000);
  }
  
  private connect() {
    if (this.ws) {
      this.ws.terminate();
      this.ws = null;
    }
    
    log('Connecting to Panion WebSocket server...', 'panion-bridge');
    
    try {
      this.ws = new WebSocket(PANION_API_WS_URL);
      
      this.ws.on('open', () => {
        log('WebSocket connection established', 'panion-bridge');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.emit('connected');
        
        // Heartbeat to keep connection alive
        this.startHeartbeat();
      });
      
      this.ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          
          // Handle heartbeat response
          if (message.type === 'heartbeat_response') {
            return;
          }
          
          // Handle regular responses
          const requestId = message.id;
          const pendingRequest = this.pendingRequests.get(requestId);
          
          if (pendingRequest) {
            clearTimeout(pendingRequest.timeout);
            this.pendingRequests.delete(requestId);
            
            const responseTime = Date.now() - pendingRequest.timestamp;
            this.metrics.totalResponseTime += responseTime;
            
            if (message.type === 'error') {
              pendingRequest.reject(new Error(message.error));
              this.metrics.failedRequests++;
            } else {
              pendingRequest.resolve(message.data);
            }
          } else {
            // Proactive message from server (Panion Intelligence initiative)
            this.handleProactiveMessage(message);
          }
        } catch (error) {
          log(`Error parsing WebSocket message: ${error}`, 'panion-bridge');
        }
      });
      
      this.ws.on('error', (error) => {
        log(`WebSocket error: ${error}`, 'panion-bridge');
        this.reconnect();
      });
      
      this.ws.on('close', () => {
        log('WebSocket connection closed', 'panion-bridge');
        this.isConnected = false;
        this.reconnect();
      });
    } catch (error) {
      log(`Failed to connect to WebSocket server: ${error}`, 'panion-bridge');
      this.reconnect();
    }
  }
  
  private startHeartbeat() {
    setInterval(() => {
      if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
        this.sendMessage({
          type: 'heartbeat',
          timestamp: Date.now()
        }).catch(err => {
          log(`Heartbeat failed: ${err}`, 'panion-bridge');
        });
      }
    }, 30000); // 30 second heartbeat
  }
  
  private reconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    this.isConnected = false;
    this.metrics.reconnects++;
    
    // Calculate reconnect delay with exponential backoff
    const delay = Math.min(
      INITIAL_RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts),
      MAX_RECONNECT_DELAY
    );
    
    this.reconnectAttempts++;
    
    log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`, 'panion-bridge');
    
    // Reject all pending requests
    this.pendingRequests.forEach((request) => {
      clearTimeout(request.timeout);
      request.reject(new Error('WebSocket connection closed'));
    });
    this.pendingRequests.clear();
    
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }
  
  private handleProactiveMessage(message: any) {
    // Panion Intelligence proactive messaging
    if (message.type === 'insight') {
      // System has generated an insight without being asked
      log(`Received proactive insight: ${JSON.stringify(message.data)}`, 'panion-bridge');
      this.emit('insight', message.data);
    } else if (message.type === 'suggestion') {
      // System is suggesting an action
      log(`Received action suggestion: ${JSON.stringify(message.data)}`, 'panion-bridge');
      this.emit('suggestion', message.data);
    } else if (message.type === 'alert') {
      // System detected something important
      log(`Received alert: ${JSON.stringify(message.data)}`, 'panion-bridge');
      this.emit('alert', message.data);
    } else {
      log(`Received unknown proactive message type: ${message.type}`, 'panion-bridge');
    }
  }
  
  /**
   * Send a message to the Python server
   */
  public async sendMessage(message: any, timeout = 30000): Promise<any> {
    this.metrics.totalRequests++;
    
    // Always use HTTP fallback until WebSocket server is stable
    // WebSocket compatibility issues with the server - temporary solution
    return this.fallbackToHttp(message);
    
    /* Temporarily commented out WebSocket code
    if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      // Fall back to HTTP if WebSocket is not connected
      return this.fallbackToHttp(message);
    }
    
    return new Promise((resolve, reject) => {
      try {
        const messageId = message.id || uuidv4();
        const enhancedMessage = {
          ...message,
          id: messageId,
          timestamp: Date.now()
        };
        
        // Set up timeout for this request
        const timeoutId = setTimeout(() => {
          this.pendingRequests.delete(messageId);
          this.metrics.failedRequests++;
          reject(new Error(`Request timed out after ${timeout}ms`));
        }, timeout);
        
        // Store the pending request
        this.pendingRequests.set(messageId, {
          resolve,
          reject,
          timestamp: Date.now(),
          timeout: timeoutId
        });
        
        // Send the message
        this.ws!.send(JSON.stringify(enhancedMessage));
      } catch (error) {
        this.metrics.failedRequests++;
        reject(error);
      }
    });
    */
  }
  
  /**
   * Fall back to HTTP if WebSocket is not available
   */
  private async fallbackToHttp(message: any): Promise<any> {
    log('Falling back to HTTP', 'panion-bridge');
    
    try {
      // Map WebSocket message types to HTTP endpoints
      const endpoint = this.getEndpointForMessageType(message.type);
      
      // Send the HTTP request
      const response = await axios.post(`${PANION_API_URL}${endpoint}`, message, {
        timeout: 30000
      });
      
      return response.data;
    } catch (error) {
      this.metrics.failedRequests++;
      throw error;
    }
  }
  
  /**
   * Map WebSocket message types to HTTP endpoints
   */
  private getEndpointForMessageType(type: string): string {
    switch (type) {
      case 'chat':
        return '/chat';
      case 'capability_check':
        return '/capabilities';
      case 'heartbeat':
        return '/health';
      case 'enhanced_analysis':
        return '/enhanced_analysis';
      default:
        return '/generic';
    }
  }
  
  /**
   * Report performance metrics
   */
  private reportMetrics() {
    const avgResponseTime = this.metrics.totalRequests > 0
      ? this.metrics.totalResponseTime / this.metrics.totalRequests
      : 0;
    
    log(`Performance stats - Total: ${this.metrics.totalRequests}, ` +
        `Failed: ${this.metrics.failedRequests}, ` +
        `Batched: ${this.metrics.batchedRequests}, ` + 
        `Avg Response: ${Math.round(avgResponseTime)}ms, ` +
        `WS Reconnects: ${this.metrics.reconnects}`, 'panion-bridge');
  }
  
  /**
   * Check if the bridge is connected
   */
  public isActive(): boolean {
    return this.isConnected;
  }
  
  /**
   * High-level method for chat requests
   */
  public async chat(content: string, sessionId: string, context: any = {}): Promise<any> {
    return this.sendMessage({
      type: 'chat',
      content,
      session_id: sessionId,
      context
    });
  }
  
  /**
   * Check what capabilities are needed for a given message
   */
  public async checkCapabilities(content: string): Promise<string[]> {
    const response = await this.sendMessage({
      type: 'capability_check',
      content
    });
    
    return response.capabilities || [];
  }
  
  /**
   * Get enhanced Panion Intelligence analysis for a message
   */
  public async getEnhancedAnalysis(content: string, sessionId: string): Promise<any> {
    return this.sendMessage({
      type: 'enhanced_analysis',
      content,
      session_id: sessionId
    });
  }
}

const panionBridgeWS = new PanionBridgeWS();
export default panionBridgeWS;