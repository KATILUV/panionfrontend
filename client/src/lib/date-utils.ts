/**
 * Date Utility Functions
 * Common date formatting and manipulation functions
 */

/**
 * Format a timestamp for display in the UI
 * Shows time for today, date for older messages
 */
export function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  
  // Check if invalid date
  if (isNaN(date.getTime())) {
    return 'Invalid date';
  }
  
  // Check if it's today
  const isToday = 
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() && 
    date.getFullYear() === now.getFullYear();
  
  if (isToday) {
    // For today, just show the time
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else {
    // For other dates, show date and time
    return date.toLocaleDateString([], { 
      month: 'short', 
      day: 'numeric' 
    }) + ' ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }
}

/**
 * Format a duration from milliseconds
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  } else if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  } else {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }
}

/**
 * Get relative time string (e.g., "2 hours ago", "yesterday")
 */
export function getRelativeTimeString(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  
  // Invalid date
  if (isNaN(date.getTime())) {
    return 'Invalid date';
  }
  
  // Less than a minute
  if (diffMs < 60000) {
    return 'just now';
  }
  
  // Less than an hour
  if (diffMs < 3600000) {
    const minutes = Math.floor(diffMs / 60000);
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  }
  
  // Less than a day
  if (diffMs < 86400000) {
    const hours = Math.floor(diffMs / 3600000);
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  }
  
  // Less than a week
  if (diffMs < 604800000) {
    const days = Math.floor(diffMs / 86400000);
    if (days === 1) return 'yesterday';
    return `${days} days ago`;
  }
  
  // Less than a month
  if (diffMs < 2592000000) {
    const weeks = Math.floor(diffMs / 604800000);
    return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
  }
  
  // More than a month
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short', 
    day: 'numeric'
  });
}