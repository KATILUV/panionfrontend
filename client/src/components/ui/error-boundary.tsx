import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon-provider';
import { ICONS } from '@/lib/icon-map';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary component that catches JavaScript errors in its child component tree
 * and displays a fallback UI instead of crashing the whole app
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // You can log the error to an error reporting service
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
  }

  resetErrorBoundary = (): void => {
    this.props.onReset?.();
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Render custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center animate-fade-in">
          <div className="flex flex-col items-center max-w-md space-y-4 text-primary-foreground">
            <div className="flex items-center justify-center w-16 h-16 mb-4 bg-red-500/20 rounded-full">
              <Icon name={ICONS.ALERT_TRIANGLE} size="lg" className="text-red-500" />
            </div>
            
            <h2 className="text-xl font-bold">Something went wrong</h2>
            
            <p className="text-sm text-white/70">
              An unexpected error occurred. We've recorded this issue and will work to fix it.
            </p>
            
            <div className="p-3 mt-2 overflow-auto text-xs text-left bg-black/30 rounded max-h-32 text-white/60 font-mono w-full">
              {this.state.error?.toString() || 'Unknown error'}
            </div>
            
            <div className="flex gap-3 mt-4">
              <Button 
                variant="destructive" 
                onClick={this.resetErrorBoundary}
                className="gap-2"
              >
                <Icon name={ICONS.REFRESH_CW} size="sm" />
                Try Again
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;