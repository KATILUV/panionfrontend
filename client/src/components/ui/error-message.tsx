import React from 'react';
import { AlertTriangle, WifiOff, ServerOff, XOctagon, FileBadge, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export type ErrorType = 
  | 'network' 
  | 'server' 
  | 'notFound' 
  | 'unauthorized' 
  | 'forbidden' 
  | 'validation' 
  | 'timeout'
  | 'unknown';

interface ErrorMessageProps {
  type?: ErrorType;
  message?: string;
  retryFn?: () => void;
  dismissable?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'card' | 'inline' | 'toast';
}

/**
 * Get friendly error title and message based on error type
 */
const getErrorContent = (type: ErrorType, customMessage?: string) => {
  switch (type) {
    case 'network':
      return {
        title: 'Network Error',
        message: customMessage || 'Unable to connect to the network. Please check your internet connection.',
        icon: <WifiOff />
      };
    case 'server':
      return {
        title: 'Server Error',
        message: customMessage || 'The server encountered an error while processing your request.',
        icon: <ServerOff />
      };
    case 'notFound':
      return {
        title: 'Not Found',
        message: customMessage || 'The requested resource could not be found.',
        icon: <FileBadge />
      };
    case 'unauthorized':
      return {
        title: 'Authentication Required',
        message: customMessage || 'You need to be logged in to access this resource.',
        icon: <XOctagon />
      };
    case 'forbidden':
      return {
        title: 'Access Denied',
        message: customMessage || 'You do not have permission to access this resource.',
        icon: <XOctagon />
      };
    case 'validation':
      return {
        title: 'Validation Error',
        message: customMessage || 'The provided data is invalid or incomplete.',
        icon: <AlertTriangle />
      };
    case 'timeout':
      return {
        title: 'Request Timeout',
        message: customMessage || 'The request took too long to complete.',
        icon: <AlertTriangle />
      };
    default:
      return {
        title: 'Error',
        message: customMessage || 'An unexpected error occurred.',
        icon: <HelpCircle />
      };
  }
};

/**
 * Enhanced error message component with multiple presentation options
 */
export function ErrorMessage({
  type = 'unknown',
  message,
  retryFn,
  dismissable = true,
  className,
  size = 'md',
  variant = 'card'
}: ErrorMessageProps) {
  const errorContent = getErrorContent(type, message);
  const { toast } = useToast();

  // For the toast variant, we render nothing here and show a toast instead
  if (variant === 'toast') {
    React.useEffect(() => {
      toast({
        variant: 'destructive',
        title: errorContent.title,
        description: errorContent.message,
        action: retryFn ? (
          <Button size="sm" variant="outline" onClick={retryFn}>
            Retry
          </Button>
        ) : undefined
      });
    }, []);
    return null;
  }

  // States for managing the visibility of the error message
  const [isDismissed, setIsDismissed] = React.useState(false);
  
  // Handle dismissing the error (used for inline/card variants)
  const handleDismiss = () => {
    setIsDismissed(true);
    toast({
      title: "Error dismissed",
      description: "You can retry the operation if needed.",
      variant: "default"
    });
  };

  // Different sizes for the icon
  const iconSize = size === 'sm' ? 16 : size === 'md' ? 20 : 24;
  const iconClass = cn(
    'flex-shrink-0',
    type === 'network' && 'text-blue-500',
    type === 'server' && 'text-red-500',
    type === 'notFound' && 'text-purple-500',
    type === 'unauthorized' && 'text-yellow-500',
    type === 'forbidden' && 'text-yellow-500',
    type === 'validation' && 'text-orange-500',
    type === 'timeout' && 'text-orange-500',
    type === 'unknown' && 'text-gray-500'
  );

  // If dismissed, don't show anything
  if (isDismissed) {
    return null;
  }

  // Inline variant - simpler, more compact
  if (variant === 'inline') {
    return (
      <div className={cn(
        "flex items-center gap-2 text-sm p-2 rounded-md bg-red-500/10 text-red-400 border border-red-500/20",
        size === 'sm' && 'text-xs',
        size === 'lg' && 'text-base',
        className
      )}>
        <span className={iconClass}>
          {React.cloneElement(errorContent.icon, { size: iconSize })}
        </span>
        <span className="flex-1">{errorContent.message}</span>
        {dismissable && (
          <Button 
            size="sm" 
            variant="ghost" 
            className="ml-auto h-7 px-2 text-xs opacity-70 hover:opacity-100"
            onClick={handleDismiss}
          >
            ✕
          </Button>
        )}
        {retryFn && (
          <Button 
            size="sm" 
            variant="ghost" 
            className="h-7 px-2 text-xs"
            onClick={retryFn}
          >
            Retry
          </Button>
        )}
      </div>
    );
  }

  // Card variant - more detailed, with title and buttons
  return (
    <div className={cn(
      "flex flex-col p-4 rounded-lg border bg-card/30 backdrop-blur-sm shadow-sm",
      type === 'network' && 'border-blue-500/20',
      type === 'server' && 'border-red-500/20',
      type === 'notFound' && 'border-purple-500/20',
      type === 'unauthorized' && 'border-yellow-500/20',
      type === 'forbidden' && 'border-yellow-500/20',
      type === 'validation' && 'border-orange-500/20',
      type === 'timeout' && 'border-orange-500/20',
      type === 'unknown' && 'border-gray-500/20',
      className
    )}>
      <div className="flex items-start gap-3">
        <div className={cn(
          "p-2 rounded-full",
          type === 'network' && 'bg-blue-500/10',
          type === 'server' && 'bg-red-500/10',
          type === 'notFound' && 'bg-purple-500/10',
          type === 'unauthorized' && 'bg-yellow-500/10',
          type === 'forbidden' && 'bg-yellow-500/10',
          type === 'validation' && 'bg-orange-500/10',
          type === 'timeout' && 'bg-orange-500/10',
          type === 'unknown' && 'bg-gray-500/10',
        )}>
          <span className={iconClass}>
            {React.cloneElement(errorContent.icon, { size: iconSize })}
          </span>
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-foreground">{errorContent.title}</h4>
          <p className="text-sm text-muted-foreground mt-1">{errorContent.message}</p>
        </div>
      </div>
      
      {(retryFn || dismissable) && (
        <div className="flex justify-end gap-2 mt-4">
          {dismissable && (
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={handleDismiss}
            >
              Dismiss
            </Button>
          )}
          {retryFn && (
            <Button 
              size="sm" 
              variant="default" 
              onClick={retryFn}
            >
              Retry
            </Button>
          )}
        </div>
      )}
    </div>
  );
}