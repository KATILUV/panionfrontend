/**
 * System Logs Utility
 * Centralized logging for system-wide events with timestamp and categories
 */

interface SystemLogEntry {
  timestamp: number;
  message: string;
  category: string;
  level: 'info' | 'warning' | 'error' | 'success';
}

// In-memory buffer for system logs
const systemLogs: SystemLogEntry[] = [];
const MAX_LOGS = 1000; // Keep at most 1000 logs in memory

/**
 * Add a log entry to the system logs
 */
export function addSystemLog(
  message: string, 
  category: string = 'system',
  level: 'info' | 'warning' | 'error' | 'success' = 'info'
): void {
  // Add log to the front of the array
  systemLogs.unshift({
    timestamp: Date.now(),
    message,
    category,
    level
  });
  
  // Trim logs if we exceed the maximum
  if (systemLogs.length > MAX_LOGS) {
    systemLogs.length = MAX_LOGS;
  }
}

/**
 * Get recent system logs
 * @param count Number of recent logs to retrieve
 * @param category Optional category filter
 * @param level Optional level filter
 */
export function getSystemLog(
  count: number = 10, 
  category?: string,
  level?: 'info' | 'warning' | 'error' | 'success'
): SystemLogEntry[] {
  let filteredLogs = systemLogs;
  
  // Apply filters if provided
  if (category) {
    filteredLogs = filteredLogs.filter(log => log.category === category);
  }
  
  if (level) {
    filteredLogs = filteredLogs.filter(log => log.level === level);
  }
  
  // Return the requested number of logs
  return filteredLogs.slice(0, count);
}

// Convenience methods for different log levels
export const systemLog = {
  info: (message: string, category: string = 'system') => 
    addSystemLog(message, category, 'info'),
    
  warning: (message: string, category: string = 'system') => 
    addSystemLog(message, category, 'warning'),
    
  error: (message: string, category: string = 'system') => 
    addSystemLog(message, category, 'error'),
    
  success: (message: string, category: string = 'system') => 
    addSystemLog(message, category, 'success')
};

// Initialize with a startup log
systemLog.info('System logging initialized', 'startup');