/**
 * Error Handler Utility
 * Provides structured error handling and formatting for the application
 */

export enum ErrorCategory {
  CONNECTION = "connection",
  AUTHENTICATION = "authentication",
  SERVER = "server",
  CLIENT = "client",
  WEBSOCKET = "websocket",
  UNKNOWN = "unknown"
}

export interface FormattedError {
  title: string;
  message: string;
  category: ErrorCategory;
  actionable: boolean;
  suggestedAction?: string;
  technical?: string; // Technical details for logging
}

/**
 * Format an error into a standardized structure for display and logging
 */
export const formatError = (error: any): FormattedError => {
  // WebSocket connection issues
  if (error.message?.includes('WebSocket') || 
      error.message?.includes('ECONNREFUSED') ||
      error.code === 'ECONNREFUSED') {
    return {
      title: 'Connection Issue',
      message: 'Unable to connect to Panion services. Your work is saved locally.',
      category: ErrorCategory.WEBSOCKET,
      actionable: true,
      suggestedAction: 'Check your internet connection or try again later.',
      technical: `WebSocket error: ${error.message || 'Unknown WebSocket error'}`
    };
  }
  
  // Network connection issues
  if (error.message?.includes('network') || 
      error.message?.includes('fetch') || 
      error.name === 'NetworkError') {
    return {
      title: 'Network Connection Issue',
      message: 'Unable to connect to the server. Please check your connection.',
      category: ErrorCategory.CONNECTION,
      actionable: true,
      suggestedAction: 'Check your internet connection and try again.',
      technical: `Network error: ${error.message || 'Unknown network error'}`
    };
  }
  
  // Server errors (5xx)
  if (error.status >= 500 || error.statusCode >= 500) {
    return {
      title: 'Server Error',
      message: 'Panion is experiencing technical difficulties.',
      category: ErrorCategory.SERVER,
      actionable: false,
      technical: `Server error ${error.status || error.statusCode}: ${error.message || 'Unknown server error'}`
    };
  }
  
  // Authentication errors
  if (error.status === 401 || error.statusCode === 401 || 
      error.message?.includes('unauthorized') || 
      error.message?.includes('authentication')) {
    return {
      title: 'Authentication Error',
      message: 'Your session has expired or you are not authorized.',
      category: ErrorCategory.AUTHENTICATION,
      actionable: true,
      suggestedAction: 'Please sign in again.',
      technical: `Auth error: ${error.message || 'Unknown authentication error'}`
    };
  }
  
  // Client errors (4xx)
  if ((error.status && error.status < 500 && error.status >= 400) || 
      (error.statusCode && error.statusCode < 500 && error.statusCode >= 400)) {
    return {
      title: 'Request Error',
      message: 'There was a problem with your request.',
      category: ErrorCategory.CLIENT,
      actionable: false,
      technical: `Client error ${error.status || error.statusCode}: ${error.message || 'Unknown client error'}`
    };
  }
  
  // Default unknown error
  return {
    title: 'Unexpected Error',
    message: error.message || 'Something went wrong.',
    category: ErrorCategory.UNKNOWN,
    actionable: false,
    technical: error.stack || error.message || 'Unknown error'
  };
};

/**
 * Display an error to the user with appropriate context and formatting
 * This is a helper function to use with the toast system
 */
export const displayError = (error: any, toast: any): void => {
  const formattedError = formatError(error);
  
  toast({
    title: formattedError.title,
    description: formattedError.actionable 
      ? `${formattedError.message} ${formattedError.suggestedAction}`
      : formattedError.message,
    variant: 'destructive',
    duration: formattedError.actionable ? 8000 : 5000, // Give more time for actionable errors
  });
  
  // Log the technical error details to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('[Error]', formattedError.technical || error);
  }
};