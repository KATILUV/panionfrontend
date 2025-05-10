/**
 * ThinkingBubble Component
 * Displays an animated thinking indicator for the chat interface
 */

import React from 'react';
import { Loader2 } from 'lucide-react';

interface ThinkingBubbleProps {
  /**
   * Message to display
   */
  message?: string;
  
  /**
   * Optional CSS class names
   */
  className?: string;
}

export const ThinkingBubble: React.FC<ThinkingBubbleProps> = ({
  message = 'Thinking...',
  className = ''
}) => {
  return (
    <div 
      className={`thinking-bubble bg-card text-card-foreground 
                 rounded-r-lg rounded-tl-lg p-3 relative inline-flex 
                 items-center gap-2 max-w-[80%] ${className}`}
    >
      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      <span className="text-sm">{message}</span>
    </div>
  );
};

export default ThinkingBubble;