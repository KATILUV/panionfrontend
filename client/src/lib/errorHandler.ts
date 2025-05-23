import { ErrorType } from '@/components/ui/error-message';

/**
 * Maps HTTP status codes to error types for consistent UI treatment
 */
export function mapErrorTypeFromStatus(status: number): ErrorType {
  if (status >= 500) return 'server';
  if (status === 404) return 'notFound';
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 422 || status === 400) return 'validation';
  if (status === 408) return 'timeout';
  return 'unknown';
}

/**
 * Determine error type from various error objects
 */
export function getErrorTypeFromError(error: unknown): { type: ErrorType; message: string } {
  // Network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      type: 'network',
      message: 'Unable to connect to the server. Please check your internet connection.'
    };
  }
  
  // Timeout errors
  if (error instanceof Error && (
    error.message.includes('timeout') || 
    error.message.includes('timed out')
  )) {
    return {
      type: 'timeout',
      message: 'The request timed out. Please try again later.'
    };
  }
  
  // Response errors with status codes
  if (error instanceof Response || (error instanceof Error && 'status' in error)) {
    const status = (error as Response).status || (error as any).status;
    const type = mapErrorTypeFromStatus(status);
    
    let message = 'An error occurred while processing your request.';
    if (type === 'notFound') message = 'The requested resource could not be found.';
    if (type === 'unauthorized') message = 'Authentication is required to access this resource.';
    if (type === 'forbidden') message = 'You do not have permission to access this resource.';
    if (type === 'validation') message = 'The provided data is invalid or incomplete.';
    
    return { type, message };
  }
  
  // String errors
  if (typeof error === 'string') {
    if (error.toLowerCase().includes('network')) {
      return {
        type: 'network',
        message: error
      };
    }
    
    if (error.toLowerCase().includes('permission')) {
      return {
        type: 'forbidden',
        message: error
      };
    }
    
    if (error.toLowerCase().includes('not found') || error.toLowerCase().includes('404')) {
      return {
        type: 'notFound',
        message: error
      };
    }
    
    return {
      type: 'unknown',
      message: error
    };
  }
  
  // Handle simulated errors (for testing in development)
  if (error instanceof Error && error.message.includes('Simulated')) {
    if (error.message.includes('network')) {
      return {
        type: 'network',
        message: 'Simulated network error. This error was generated for testing purposes.'
      };
    }
    
    if (error.message.includes('server')) {
      return {
        type: 'server',
        message: 'Simulated server error. This error was generated for testing purposes.'
      };
    }
    
    if (error.message.includes('timeout')) {
      return {
        type: 'timeout',
        message: 'Simulated timeout error. This error was generated for testing purposes.'
      };
    }
    
    if (error.message.includes('notFound')) {
      return {
        type: 'notFound',
        message: 'Simulated not found error. This error was generated for testing purposes.'
      };
    }
    
    return {
      type: 'unknown',
      message: 'Simulated unknown error. This error was generated for testing purposes.'
    };
  }
  
  // Default fallback
  return {
    type: 'unknown',
    message: error instanceof Error ? error.message : 'An unexpected error occurred.'
  };
}

/**
 * Process error from try/catch blocks and API responses
 */
export function handleError(error: unknown): { type: ErrorType; message: string } {
  // Special handling for fetch responses
  if (error instanceof Response) {
    return {
      type: mapErrorTypeFromStatus(error.status),
      message: `Error ${error.status}: ${error.statusText}`
    };
  }
  
  return getErrorTypeFromError(error);
}

/**
 * Retry a function with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: {
    maxRetries?: number;
    initialDelay?: number;
    onRetry?: (attempt: number, maxRetries: number, delay: number) => void;
  }
): Promise<T> {
  const maxRetries = options?.maxRetries ?? 3;
  const initialDelay = options?.initialDelay ?? 1000;
  const onRetry = options?.onRetry;
  
  let retries = 0;
  let delay = initialDelay;
  let lastError: unknown;
  
  while (true) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry for certain error types
      const { type } = getErrorTypeFromError(error);
      if (
        type === 'unauthorized' || 
        type === 'forbidden' || 
        type === 'validation'
      ) {
        throw error;
      }
      
      // Check if we've reached max retries
      retries++;
      if (retries >= maxRetries) {
        // Enhance error message with retry information
        if (error instanceof Error) {
          error.message = `${error.message} (Failed after ${retries} retries)`;
        }
        throw error;
      }
      
      // Call the retry callback if provided
      if (onRetry) {
        onRetry(retries, maxRetries, delay);
      }
      
      // Wait with exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }
}