/**
 * Structured Logger
 * Provides consistent logging across the application with levels,
 * context, and persistence for system analysis.
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  THINKING = 'thinking',
  MEMORY = 'memory',
  SYSTEM = 'system'
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  tag?: string;
}

/**
 * Logger singleton class
 */
class Logger {
  private static instance: Logger;
  private logs: LogEntry[] = [];
  private maxLogs: number = 500;
  private subscribers: Array<(entry: LogEntry) => void> = [];
  private persistenceEnabled: boolean = true;
  
  /**
   * Get singleton instance
   */
  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }
  
  /**
   * Core log method
   */
  log(level: LogLevel, message: string, context?: Record<string, any>, tag?: string): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      tag
    };
    
    // Add to internal logs if persistence is enabled
    if (this.persistenceEnabled) {
      this.logs.push(entry);
      
      // Trim log history if needed
      if (this.logs.length > this.maxLogs) {
        this.logs.shift();
      }
    }
    
    // Notify subscribers
    this.notifySubscribers(entry);
    
    // Console output for development
    if (process.env.NODE_ENV === 'development') {
      // Format based on level
      switch (level) {
        case LogLevel.ERROR:
          console.error(`[${tag || level}]`, message, context || '');
          break;
        case LogLevel.WARN:
          console.warn(`[${tag || level}]`, message, context || '');
          break;
        case LogLevel.DEBUG:
          console.debug(`[${tag || level}]`, message, context || '');
          break;
        case LogLevel.THINKING:
          console.log(`%c[${tag || 'thinking'}] ${message}`, 'color: purple', context || '');
          break;
        case LogLevel.MEMORY:
          console.log(`%c[${tag || 'memory'}] ${message}`, 'color: blue', context || '');
          break;
        case LogLevel.SYSTEM:
          console.log(`%c[${tag || 'system'}] ${message}`, 'color: green', context || '');
          break;
        default:
          console.log(`[${tag || level}]`, message, context || '');
      }
    }
  }
  
  /**
   * Subscribe to log events
   */
  subscribe(callback: (entry: LogEntry) => void): () => void {
    this.subscribers.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== callback);
    };
  }
  
  /**
   * Notify all subscribers
   */
  private notifySubscribers(entry: LogEntry): void {
    this.subscribers.forEach(callback => {
      try {
        callback(entry);
      } catch (error) {
        console.error('Error in log subscriber:', error);
      }
    });
  }
  
  /**
   * Level-specific log methods
   */
  debug(message: string, context?: Record<string, any>, tag?: string): void {
    this.log(LogLevel.DEBUG, message, context, tag);
  }
  
  info(message: string, context?: Record<string, any>, tag?: string): void {
    this.log(LogLevel.INFO, message, context, tag);
  }
  
  warn(message: string, context?: Record<string, any>, tag?: string): void {
    this.log(LogLevel.WARN, message, context, tag);
  }
  
  error(message: string, context?: Record<string, any>, tag?: string): void {
    this.log(LogLevel.ERROR, message, context, tag);
  }
  
  thinking(message: string, context?: Record<string, any>, tag?: string): void {
    this.log(LogLevel.THINKING, message, context, tag);
  }
  
  memory(message: string, context?: Record<string, any>, tag?: string): void {
    this.log(LogLevel.MEMORY, message, context, tag);
  }
  
  system(message: string, context?: Record<string, any>, tag?: string): void {
    this.log(LogLevel.SYSTEM, message, context, tag);
  }
  
  /**
   * Get all logs
   */
  getLogs(filter?: { level?: LogLevel, tag?: string }): LogEntry[] {
    if (!filter) {
      return [...this.logs];
    }
    
    return this.logs.filter(log => {
      if (filter.level && log.level !== filter.level) {
        return false;
      }
      if (filter.tag && log.tag !== filter.tag) {
        return false;
      }
      return true;
    });
  }
  
  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
  }
  
  /**
   * Enable or disable persistence
   */
  setPersistence(enabled: boolean): void {
    this.persistenceEnabled = enabled;
  }
  
  /**
   * Set maximum number of logs to keep
   */
  setMaxLogs(max: number): void {
    this.maxLogs = max;
  }
  
  /**
   * Export logs to JSON
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

// Export the singleton instance
export const logger = Logger.getInstance();

// Export as default log for convenience
const log = {
  debug: logger.debug.bind(logger),
  info: logger.info.bind(logger),
  warn: logger.warn.bind(logger),
  error: logger.error.bind(logger),
  thinking: logger.thinking.bind(logger),
  memory: logger.memory.bind(logger),
  system: logger.system.bind(logger),
};

export default log;