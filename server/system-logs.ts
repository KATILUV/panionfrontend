/**
 * System Logs Module
 * Provides centralized logging for system-wide events
 */

import { log } from './vite';

// Maximum number of logs to keep in memory
const MAX_LOGS = 500;

// In-memory log storage for system events
const systemLogs: Array<{
  timestamp: number;
  message: string;
  category: string;
  level: 'info' | 'error' | 'warning' | 'debug';
}> = [];

/**
 * Log an informational message to the system logs
 */
export function info(message: string, category: string = 'system') {
  const logEntry = {
    timestamp: Date.now(),
    message,
    category,
    level: 'info' as const
  };
  
  systemLogs.push(logEntry);
  
  // Trim logs if they exceed the maximum
  if (systemLogs.length > MAX_LOGS) {
    systemLogs.shift();
  }
  
  // Also send to console
  log(`[${category}] INFO: ${message}`, 'system');
}

/**
 * Log an error message to the system logs
 */
export function error(message: string, category: string = 'system') {
  const logEntry = {
    timestamp: Date.now(),
    message,
    category,
    level: 'error' as const
  };
  
  systemLogs.push(logEntry);
  
  // Trim logs if they exceed the maximum
  if (systemLogs.length > MAX_LOGS) {
    systemLogs.shift();
  }
  
  // Also send to console
  log(`[${category}] ERROR: ${message}`, 'system-error');
}

/**
 * Log a warning message to the system logs
 */
export function warning(message: string, category: string = 'system') {
  const logEntry = {
    timestamp: Date.now(),
    message,
    category,
    level: 'warning' as const
  };
  
  systemLogs.push(logEntry);
  
  // Trim logs if they exceed the maximum
  if (systemLogs.length > MAX_LOGS) {
    systemLogs.shift();
  }
  
  // Also send to console
  log(`[${category}] WARNING: ${message}`, 'system-warning');
}

/**
 * Log a debug message to the system logs
 */
export function debug(message: string, category: string = 'system') {
  const logEntry = {
    timestamp: Date.now(),
    message,
    category,
    level: 'debug' as const
  };
  
  systemLogs.push(logEntry);
  
  // Trim logs if they exceed the maximum
  if (systemLogs.length > MAX_LOGS) {
    systemLogs.shift();
  }
  
  // Also send to console
  log(`[${category}] DEBUG: ${message}`, 'system-debug');
}

/**
 * Get recent system logs
 * @param count Number of logs to retrieve (default: all)
 * @param filter Optional filter for log category
 * @param level Optional filter for log level
 */
export function getSystemLog(count: number = 0, filter?: string, level?: 'info' | 'error' | 'warning' | 'debug') {
  let filteredLogs = [...systemLogs];
  
  // Apply category filter if provided
  if (filter) {
    filteredLogs = filteredLogs.filter(log => log.category === filter);
  }
  
  // Apply level filter if provided
  if (level) {
    filteredLogs = filteredLogs.filter(log => log.level === level);
  }
  
  // Sort by timestamp (newest first)
  filteredLogs.sort((a, b) => b.timestamp - a.timestamp);
  
  // Return requested number of logs or all if count is 0
  return count > 0 ? filteredLogs.slice(0, count) : filteredLogs;
}

export const systemLog = {
  info,
  error,
  warning,
  debug
};

export default {
  info,
  error,
  warning,
  debug,
  getSystemLog
};