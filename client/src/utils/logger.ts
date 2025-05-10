/**
 * Enhanced Logger Utility
 * Provides standardized logging with support for different log levels and contexts
 */

// Log levels
type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'action' | 'thinking' | 'memory';

// Logger configuration
interface LoggerConfig {
  minLevel: LogLevel;
  enableConsole: boolean;
  enableRemote: boolean;
  context?: string;
  userIdentifier?: string;
}

// Log entry format
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  data?: any;
  userId?: string;
}

// Default configuration
const defaultConfig: LoggerConfig = {
  minLevel: 'debug',
  enableConsole: true,
  enableRemote: false,
  context: 'app'
};

// Log level priority (lower number = higher priority)
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  action: 3,
  thinking: 4,
  memory: 5,
  debug: 6
};

// Current configuration
let currentConfig: LoggerConfig = { ...defaultConfig };

// In-memory log storage (recent logs)
const recentLogs: LogEntry[] = [];
const MAX_RECENT_LOGS = 1000;

// Main logger function
function logMessage(level: LogLevel, message: string | Error, data?: any): void {
  // Check if we should log based on minimum level
  if (LOG_LEVEL_PRIORITY[level] > LOG_LEVEL_PRIORITY[currentConfig.minLevel]) {
    return;
  }

  // Format message if it's an error
  const formattedMessage = message instanceof Error ? 
    `${message.name}: ${message.message}` : 
    message;

  // Create log entry
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message: formattedMessage,
    context: currentConfig.context,
    data,
    userId: currentConfig.userIdentifier
  };

  // Store in recent logs
  recentLogs.push(entry);
  if (recentLogs.length > MAX_RECENT_LOGS) {
    recentLogs.shift();
  }

  // Console logging
  if (currentConfig.enableConsole) {
    const consoleMessage = `[${entry.level.toUpperCase()}] ${
      entry.context ? `[${entry.context}] ` : ''
    }${entry.message}`;

    switch (level) {
      case 'debug':
        console.debug(consoleMessage, data || '');
        break;
      case 'info':
        console.info(consoleMessage, data || '');
        break;
      case 'warn':
        console.warn(consoleMessage, data || '');
        break;
      case 'error':
        console.error(consoleMessage, data || '');
        break;
      case 'action':
      case 'thinking':
      case 'memory':
      default:
        console.log(`%c${consoleMessage}`, getLogStyling(level), data || '');
        break;
    }
  }

  // Remote logging would go here
  if (currentConfig.enableRemote) {
    // Implementation for remote logging would be added here
    // Example: sendToAnalyticsService(entry);
  }
}

// Get styling for console logs
function getLogStyling(level: LogLevel): string {
  switch (level) {
    case 'debug':
      return 'color: gray; font-style: italic;';
    case 'info':
      return 'color: blue;';
    case 'warn':
      return 'color: orange; font-weight: bold;';
    case 'error':
      return 'color: red; font-weight: bold;';
    case 'action':
      return 'color: green; font-weight: bold;';
    case 'thinking':
      return 'color: purple; font-style: italic;';
    case 'memory':
      return 'color: teal;';
    default:
      return '';
  }
}

// Configure the logger
function configure(config: Partial<LoggerConfig>): void {
  currentConfig = { ...currentConfig, ...config };
  debug(`Logger configured: ${JSON.stringify(currentConfig)}`);
}

// Set context for logs
function setContext(context: string): void {
  currentConfig.context = context;
}

// Set user identifier
function setUser(userId: string): void {
  currentConfig.userIdentifier = userId;
}

// Get recent logs
function getRecentLogs(count: number = MAX_RECENT_LOGS): LogEntry[] {
  return recentLogs.slice(-count);
}

// Clear recent logs
function clearLogs(): void {
  recentLogs.length = 0;
  debug('Log storage cleared');
}

// Log level specific methods
function debug(message: string | Error, data?: any): void {
  logMessage('debug', message, data);
}

function info(message: string | Error, data?: any): void {
  logMessage('info', message, data);
}

function warn(message: string | Error, data?: any): void {
  logMessage('warn', message, data);
}

function error(message: string | Error, data?: any): void {
  logMessage('error', message, data);
}

function action(message: string, data?: any): void {
  logMessage('action', message, data);
}

function thinking(message: string, data?: any): void {
  logMessage('thinking', message, data);
}

function memory(message: string, data?: any): void {
  logMessage('memory', message, data);
}

// Create a context-specific logger
function createContextLogger(context: string) {
  return {
    debug: (message: string | Error, data?: any) => {
      const prevContext = currentConfig.context;
      currentConfig.context = context;
      debug(message, data);
      currentConfig.context = prevContext;
    },
    info: (message: string | Error, data?: any) => {
      const prevContext = currentConfig.context;
      currentConfig.context = context;
      info(message, data);
      currentConfig.context = prevContext;
    },
    warn: (message: string | Error, data?: any) => {
      const prevContext = currentConfig.context;
      currentConfig.context = context;
      warn(message, data);
      currentConfig.context = prevContext;
    },
    error: (message: string | Error, data?: any) => {
      const prevContext = currentConfig.context;
      currentConfig.context = context;
      error(message, data);
      currentConfig.context = prevContext;
    },
    action: (message: string, data?: any) => {
      const prevContext = currentConfig.context;
      currentConfig.context = context;
      action(message, data);
      currentConfig.context = prevContext;
    },
    thinking: (message: string, data?: any) => {
      const prevContext = currentConfig.context;
      currentConfig.context = context;
      thinking(message, data);
      currentConfig.context = prevContext;
    },
    memory: (message: string, data?: any) => {
      const prevContext = currentConfig.context;
      currentConfig.context = context;
      memory(message, data);
      currentConfig.context = prevContext;
    }
  };
}

// Export the logger
const log = {
  debug,
  info,
  warn,
  error,
  action,
  thinking,
  memory,
  configure,
  setContext,
  setUser,
  getRecentLogs,
  clearLogs,
  createContextLogger
};

export default log;