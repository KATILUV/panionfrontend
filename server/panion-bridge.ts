/**
 * Panion Bridge - Efficient communication between Node.js and Python
 * Reduces HTTP overhead by using WebSockets and request batching
 */

import { WebSocket } from 'ws';
import { log } from './vite';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

// Configuration
const PANION_API_PORT = process.env.PANION_API_PORT || 8000;
const PANION_API_URL = `http://localhost:${PANION_API_PORT}`;

// Set to true to enable WebSocket connection (now that Python side implements WebSockets)
// This enables more efficient bidirectional communication
const ENABLE_WEBSOCKET = true;

// Request tracking
interface PendingRequest {
  id: string;
  endpoint: string;
  data: any;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  timestamp: number;
  timeout: NodeJS.Timeout;
}

// WebSocket bridge for Python service
class PanionBridge {
  private ws: WebSocket | null = null;
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private connected = false;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private requestQueue: Array<{endpoint: string, data: any, resolve: (value: any) => void, reject: (error: any) => void}> = [];
  private batchTimerId: NodeJS.Timeout | null = null;
  
  // Statistics for performance monitoring
  private stats = {
    totalRequests: 0,
    failedRequests: 0,
    batchedRequests: 0,
    avgResponseTime: 0,
    wsReconnects: 0,
    lastReconnectTime: 0,
  };
  
  constructor() {
    // Initialize with HTTP fallback (will try WebSocket later if enabled)
    if (ENABLE_WEBSOCKET) {
      this.initWebSocket();
    } else {
      log('WebSocket connections disabled, using HTTP only', 'panion-bridge');
    }
    
    // Clean up old requests periodically
    setInterval(() => this.cleanupStaleRequests(), 30000);
    
    // Log statistics periodically
    setInterval(() => this.logStats(), 60000);
  }
  
  /**
   * Initialize WebSocket connection to Python service
   */
  private initWebSocket(): void {
    if (!ENABLE_WEBSOCKET) {
      return; // Skip WebSocket initialization if disabled
    }
    
    // Close existing connection if any
    if (this.ws) {
      try {
        this.ws.terminate();
      } catch (e) {
        // Ignore errors when terminating existing connection
      }
    }
    
    try {
      // Create new WebSocket connection
      // Connect directly to the WebSocket port, no path needed
      const PANION_API_WS_PORT = process.env.PANION_API_WS_PORT || 8001;
      this.ws = new WebSocket(`ws://localhost:${PANION_API_WS_PORT}`);
      
      // Set up event handlers
      this.ws.on('open', () => {
        log('WebSocket connection to Python service established', 'panion-bridge');
        this.connected = true;
        this.stats.wsReconnects++;
        this.stats.lastReconnectTime = Date.now();
        
        // Process any queued requests
        this.processQueue();
      });
      
      this.ws.on('message', (data: Buffer) => {
        try {
          const response = JSON.parse(data.toString());
          
          // Handle batched responses
          if (response.batch && Array.isArray(response.results)) {
            response.results.forEach((result: any) => {
              const { id, data, error } = result;
              const request = this.pendingRequests.get(id);
              
              if (request) {
                // Clear timeout for this request
                clearTimeout(request.timeout);
                
                // Calculate response time for statistics
                const responseTime = Date.now() - request.timestamp;
                this.stats.avgResponseTime = 
                  (this.stats.avgResponseTime * this.stats.totalRequests + responseTime) / 
                  (this.stats.totalRequests + 1);
                
                // Complete the request
                if (error) {
                  request.reject(new Error(error));
                } else {
                  request.resolve(data);
                }
                
                // Remove from pending requests
                this.pendingRequests.delete(id);
              }
            });
          } 
          // Handle individual response
          else if (response.id) {
            const request = this.pendingRequests.get(response.id);
            
            if (request) {
              // Clear timeout for this request
              clearTimeout(request.timeout);
              
              // Calculate response time for statistics
              const responseTime = Date.now() - request.timestamp;
              this.stats.avgResponseTime = 
                (this.stats.avgResponseTime * this.stats.totalRequests + responseTime) / 
                (this.stats.totalRequests + 1);
              
              // Complete the request
              if (response.error) {
                request.reject(new Error(response.error));
              } else {
                request.resolve(response.data);
              }
              
              // Remove from pending requests
              this.pendingRequests.delete(response.id);
            }
          }
        } catch (e) {
          log(`Error processing WebSocket message: ${e}`, 'panion-bridge');
        }
      });
      
      this.ws.on('error', (error) => {
        log(`WebSocket error: ${error}`, 'panion-bridge');
        this.connected = false;
        this.scheduleReconnect();
      });
      
      this.ws.on('close', () => {
        log('WebSocket connection closed', 'panion-bridge');
        this.connected = false;
        this.scheduleReconnect();
      });
    } catch (e) {
      log(`Error initializing WebSocket: ${e}`, 'panion-bridge');
      this.connected = false;
      this.scheduleReconnect();
    }
  }
  
  /**
   * Schedule reconnection attempt with exponential backoff
   */
  private scheduleReconnect(): void {
    if (!this.reconnectTimeout) {
      // Use exponential backoff for reconnection
      const minBackoff = 1000; // 1 second
      const maxBackoff = 30000; // 30 seconds
      const retryAttempt = Math.min(10, this.stats.wsReconnects || 0);
      
      // Calculate delay with some randomness to prevent all clients reconnecting at once
      const delay = Math.min(
        minBackoff * Math.pow(1.5, retryAttempt) + Math.random() * 1000,
        maxBackoff
      );
      
      log(`Scheduling WebSocket reconnection in ${Math.round(delay)}ms (attempt ${this.stats.wsReconnects + 1})`, 'panion-bridge');
      
      this.reconnectTimeout = setTimeout(() => {
        this.reconnectTimeout = null;
        this.initWebSocket();
      }, delay);
    }
  }
  
  /**
   * Send a request to the Python service
   */
  public async request<T = any>(endpoint: string, data: any = {}): Promise<T> {
    this.stats.totalRequests++;
    
    return new Promise<T>((resolve, reject) => {
      // Add to queue for batching
      this.requestQueue.push({
        endpoint,
        data,
        resolve: resolve as (value: any) => void,
        reject: reject as (error: any) => void
      });
      
      // Schedule batch processing if not already scheduled
      if (!this.batchTimerId) {
        this.batchTimerId = setTimeout(() => this.processBatch(), 20); // 20ms batching window
      }
    });
  }
  
  /**
   * Process a batch of requests
   */
  private processBatch(): void {
    this.batchTimerId = null;
    
    // Nothing to process
    if (this.requestQueue.length === 0) {
      return;
    }
    
    const batchSize = this.requestQueue.length;
    this.stats.batchedRequests += batchSize;
    
    // If WebSocket is enabled and connected, send via WebSocket
    if (ENABLE_WEBSOCKET && this.connected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      // Process all queued requests at once
      const batch = this.requestQueue.map(item => {
        const requestId = uuidv4();
        
        // Create a timeout for this request
        const timeout = setTimeout(() => {
          const req = this.pendingRequests.get(requestId);
          if (req) {
            log(`Request timeout for ${req.endpoint}`, 'panion-bridge');
            req.reject(new Error('Request timeout'));
            this.pendingRequests.delete(requestId);
            this.stats.failedRequests++;
          }
        }, 30000); // 30 second timeout
        
        // Store the request
        this.pendingRequests.set(requestId, {
          id: requestId,
          endpoint: item.endpoint,
          data: item.data,
          resolve: item.resolve,
          reject: item.reject,
          timestamp: Date.now(),
          timeout
        });
        
        // Return request data for batch
        return {
          id: requestId,
          endpoint: item.endpoint,
          data: item.data
        };
      });
      
      // Send batch as single WebSocket message
      this.ws.send(JSON.stringify({
        type: 'batch',
        requests: batch
      }));
      
      // Clear the queue
      this.requestQueue = [];
    } 
    // Otherwise, process with HTTP fallback
    else {
      this.processQueueWithHTTP();
    }
  }
  
  /**
   * Process queue with HTTP fallback
   */
  private processQueueWithHTTP(): void {
    const queue = [...this.requestQueue];
    this.requestQueue = [];
    
    // Process each request individually via HTTP
    queue.forEach(async req => {
      try {
        const startTime = Date.now();
        const response = await axios.post(`${PANION_API_URL}${req.endpoint}`, req.data);
        
        // Update average response time
        const responseTime = Date.now() - startTime;
        this.stats.avgResponseTime = 
          (this.stats.avgResponseTime * this.stats.totalRequests + responseTime) / 
          (this.stats.totalRequests + 1);
        
        req.resolve(response.data);
      } catch (error) {
        this.stats.failedRequests++;
        req.reject(error);
      }
    });
  }
  
  /**
   * Process any queued requests immediately
   */
  private processQueue(): void {
    if (this.batchTimerId) {
      clearTimeout(this.batchTimerId);
      this.batchTimerId = null;
    }
    
    if (this.requestQueue.length > 0) {
      this.processBatch();
    }
  }
  
  /**
   * Clean up stale requests that might have been lost
   */
  private cleanupStaleRequests(): void {
    const now = Date.now();
    let staleCount = 0;
    
    this.pendingRequests.forEach((request, id) => {
      // If request is older than 2 minutes, consider it stale
      if (now - request.timestamp > 120000) {
        staleCount++;
        
        // Clear the timeout
        clearTimeout(request.timeout);
        
        // Reject the request
        request.reject(new Error('Request timed out (stale cleanup)'));
        
        // Remove from pending requests
        this.pendingRequests.delete(id);
      }
    });
    
    if (staleCount > 0) {
      log(`Cleaned up ${staleCount} stale requests`, 'panion-bridge');
      this.stats.failedRequests += staleCount;
    }
  }
  
  /**
   * Log performance statistics
   */
  private logStats(): void {
    log(`Performance stats - Total: ${this.stats.totalRequests}, Failed: ${this.stats.failedRequests}, Batched: ${this.stats.batchedRequests}, Avg Response: ${Math.round(this.stats.avgResponseTime)}ms, WS Reconnects: ${this.stats.wsReconnects}`, 'panion-bridge');
  }
  
  /**
   * Check if the Python service is available
   */
  public async checkHealth(): Promise<boolean> {
    try {
      const response = await axios.get(`${PANION_API_URL}/health`);
      return response.status === 200;
    } catch (e) {
      return false;
    }
  }
}

// Singleton instance
const panionBridge = new PanionBridge();

export default panionBridge;