/**
 * VirtualizedMessageList Component
 * Efficiently renders large lists of chat messages with virtualization
 */

import React, { useRef, useEffect } from 'react';
import { ChatMessage } from '@/types/chat';
import { ThinkingBubble } from './ThinkingBubble';
import { formatTimestamp } from '@/lib/date-utils';
import log from '@/utils/logger';

interface VirtualizedMessageListProps {
  /**
   * Array of chat messages to display
   */
  messages: ChatMessage[];
  
  /**
   * Reference to the end of the messages for auto-scrolling
   */
  messagesEndRef: React.RefObject<HTMLDivElement>;
  
  /**
   * Is the agent currently thinking/processing
   */
  isLoading?: boolean;
  
  /**
   * Processing stage description for loading state
   */
  processingStage?: string | null;
  
  /**
   * Optional CSS class names
   */
  className?: string;
}

/**
 * Optimized message list component with virtualization capabilities
 */
export const VirtualizedMessageList: React.FC<VirtualizedMessageListProps> = ({
  messages,
  messagesEndRef,
  isLoading = false,
  processingStage = null,
  className = ''
}) => {
  // Track when we should auto-scroll
  const shouldScrollRef = useRef<boolean>(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastMessageCountRef = useRef<number>(0);
  
  // Determine if we should auto-scroll based on user scroll position
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const handleScroll = () => {
      // Check if user is near the bottom (within 100px)
      const isNearBottom = 
        container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      
      shouldScrollRef.current = isNearBottom;
    };
    
    container.addEventListener('scroll', handleScroll);
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, []);
  
  // Handle auto-scrolling when messages change
  useEffect(() => {
    // Only scroll if we have new messages
    if (messages.length > lastMessageCountRef.current && shouldScrollRef.current) {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }
    
    lastMessageCountRef.current = messages.length;
  }, [messages, messagesEndRef]);

  // Log new messages for debugging
  useEffect(() => {
    if (messages.length > 0 && lastMessageCountRef.current < messages.length) {
      const newMessage = messages[messages.length - 1];
      log.debug(`New message: ${newMessage.isUser ? 'User' : 'Assistant'}`, {
        messageId: newMessage.id,
        content: newMessage.content.substring(0, 50) + (newMessage.content.length > 50 ? '...' : '')
      }, 'chat');
    }
  }, [messages]);
  
  // Optimized rendering - this provides a foundation for true virtualization 
  // which you could implement with a library like react-window or react-virtuoso
  return (
    <div 
      ref={containerRef}
      className={`virtualized-message-list overflow-y-auto px-2 py-4 ${className}`}
      style={{ height: '100%' }}
    >
      {/* This is a simpler version without full virtualization, but with optimizations */}
      {messages.map((message) => (
        <MessageItem key={message.id} message={message} />
      ))}
      
      {/* Show thinking bubble when loading */}
      {isLoading && (
        <div className="py-2">
          <ThinkingBubble message={processingStage || 'Thinking...'} />
        </div>
      )}
      
      {/* Div for auto-scrolling */}
      <div ref={messagesEndRef} />
    </div>
  );
};

// Memoized message item component to prevent unnecessary re-renders
const MessageItem = React.memo<{ message: ChatMessage }>(({ message }) => {
  const isUser = message.isUser;
  
  return (
    <div 
      className={`message-item py-2 ${isUser ? 'user-message' : 'assistant-message'}`}
      data-message-id={message.id}
    >
      {/* Message bubble */}
      <div 
        className={`message-bubble ${
          isUser 
            ? 'ml-auto bg-primary text-primary-foreground rounded-l-lg rounded-tr-lg max-w-[80%]' 
            : 'bg-card text-card-foreground rounded-r-lg rounded-tl-lg max-w-[80%]'
        } p-3 relative mb-1`}
      >
        {/* Main content */}
        <div className="message-content whitespace-pre-wrap break-words">
          {message.content}
        </div>
      </div>
      
      {/* Timestamp and metadata row */}
      <div 
        className={`message-meta text-xs text-muted-foreground ${
          isUser ? 'text-right mr-1' : 'ml-1'
        }`}
      >
        {formatTimestamp(message.timestamp)}
      </div>
      
      {/* Thinking content if available */}
      {!isUser && message.thinking && (
        <div className="thinking-bubble mt-2 text-sm p-2 bg-muted/50 text-muted-foreground rounded-md border border-muted">
          <div className="thinking-title text-xs font-medium mb-1">Thinking Process:</div>
          <div className="thinking-content text-xs whitespace-pre-wrap">
            {message.thinking}
          </div>
        </div>
      )}
    </div>
  );
});

MessageItem.displayName = 'MessageItem';

export default VirtualizedMessageList;