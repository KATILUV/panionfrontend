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
  
  // Check if it's today
  const isToday = date.toDateString() === now.toDateString();
  
  if (isToday) {
    // Format as time only for today
    return date.toLocaleTimeString(undefined, { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  }
  
  // Check if it's yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  
  if (isYesterday) {
    return `Yesterday, ${date.toLocaleTimeString(undefined, { 
      hour: '2-digit', 
      minute: '2-digit'
    })}`;
  }
  
  // Check if it's this year
  const isThisYear = date.getFullYear() === now.getFullYear();
  
  if (isThisYear) {
    // Format without year for this year
    return date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric' 
    }) + ', ' + date.toLocaleTimeString(undefined, { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  }
  
  // Full date format for older dates
  return date.toLocaleDateString(undefined, { 
    year: 'numeric',
    month: 'short', 
    day: 'numeric' 
  }) + ', ' + date.toLocaleTimeString(undefined, { 
    hour: '2-digit', 
    minute: '2-digit'
  });
}

/**
 * Format a duration from milliseconds
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  return `${hours}h ${remainingMinutes}m ${remainingSeconds}s`;
}

/**
 * Get relative time string (e.g., "2 hours ago", "yesterday")
 */
export function getRelativeTimeString(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSeconds < 60) {
    return 'just now';
  }
  
  if (diffMinutes < 60) {
    return `${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'} ago`;
  }
  
  if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  }
  
  if (diffDays === 1) {
    return 'yesterday';
  }
  
  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }
  
  // For older dates, use the formatted date
  return date.toLocaleDateString();
}