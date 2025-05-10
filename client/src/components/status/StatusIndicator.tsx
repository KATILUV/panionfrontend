/**
 * StatusIndicator Component
 * Visual indicator of system status with clear feedback
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, XCircle, Clock, Info } from 'lucide-react';
import log from '@/utils/logger';

// Types of status messages
export type StatusType = 'success' | 'error' | 'warning' | 'info' | 'loading';

// Status message interface
export interface StatusMessage {
  id: string;
  type: StatusType;
  message: string;
  duration?: number; // How long to show in ms, default is 3000
  timestamp: number;
  autoClose?: boolean; // Whether to automatically close
}

// Component props
interface StatusIndicatorProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  maxMessages?: number; // Maximum number of messages to show at once
}

// Global status queue and management
let messageQueue: StatusMessage[] = [];
let messageListeners: ((messages: StatusMessage[]) => void)[] = [];

// Add a message to the queue
export function addStatusMessage(message: Omit<StatusMessage, 'id' | 'timestamp'>) {
  const id = `status-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const newMessage: StatusMessage = {
    ...message,
    id,
    timestamp: Date.now(),
    autoClose: message.autoClose !== false
  };
  
  messageQueue = [...messageQueue, newMessage];
  notifyListeners();
  
  log.debug(`Status message added: ${message.type}`, { message: message.message });
  
  return id;
}

// Remove a message from the queue
export function removeStatusMessage(id: string) {
  messageQueue = messageQueue.filter(msg => msg.id !== id);
  notifyListeners();
  
  log.debug(`Status message removed: ${id}`);
}

// Clear all messages
export function clearStatusMessages() {
  messageQueue = [];
  notifyListeners();
  
  log.debug('All status messages cleared');
}

// Notify all listeners of queue changes
function notifyListeners() {
  messageListeners.forEach(listener => listener([...messageQueue]));
}

// Shorthand helper functions
export const showSuccess = (message: string, duration = 3000) => 
  addStatusMessage({ type: 'success', message, duration });

export const showError = (message: string, duration = 5000) => 
  addStatusMessage({ type: 'error', message, duration });

export const showWarning = (message: string, duration = 4000) => 
  addStatusMessage({ type: 'warning', message, duration });

export const showInfo = (message: string, duration = 3000) => 
  addStatusMessage({ type: 'info', message, duration });

export const showLoading = (message: string, autoClose = false) => 
  addStatusMessage({ type: 'loading', message, autoClose });

/**
 * StatusIndicator component shows status messages in a toast-like UI
 */
const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  position = 'bottom-right',
  maxMessages = 5
}) => {
  const [messages, setMessages] = useState<StatusMessage[]>([]);
  
  // Subscribe to message queue changes
  useEffect(() => {
    const handleMessages = (newMessages: StatusMessage[]) => {
      setMessages(newMessages.slice(-maxMessages));
    };
    
    messageListeners.push(handleMessages);
    
    // Initial state
    handleMessages(messageQueue);
    
    // Cleanup
    return () => {
      messageListeners = messageListeners.filter(listener => listener !== handleMessages);
    };
  }, [maxMessages]);
  
  // Auto-close messages after their duration
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    
    messages.forEach(message => {
      if (message.autoClose && message.duration) {
        const timer = setTimeout(() => {
          removeStatusMessage(message.id);
        }, message.duration);
        
        timers.push(timer);
      }
    });
    
    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [messages]);
  
  // Get position classes
  const getPositionClasses = () => {
    switch (position) {
      case 'top-right':
        return 'top-4 right-4';
      case 'top-left':
        return 'top-4 left-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'top-center':
        return 'top-4 left-1/2 -translate-x-1/2';
      case 'bottom-center':
        return 'bottom-4 left-1/2 -translate-x-1/2';
      default:
        return 'bottom-4 right-4';
    }
  };
  
  // Get icon for message type
  const getIcon = (type: StatusType) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="text-green-500" size={18} />;
      case 'error':
        return <XCircle className="text-red-500" size={18} />;
      case 'warning':
        return <AlertCircle className="text-amber-500" size={18} />;
      case 'info':
        return <Info className="text-blue-500" size={18} />;
      case 'loading':
        return (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          >
            <Clock className="text-muted-foreground" size={18} />
          </motion.div>
        );
    }
  };
  
  // Get background color based on type
  const getBackgroundClass = (type: StatusType) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800';
      case 'error':
        return 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800';
      case 'warning':
        return 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800';
      case 'info':
        return 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800';
      case 'loading':
        return 'bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700';
    }
  };

  return (
    <div className={`fixed z-50 flex flex-col gap-2 ${getPositionClasses()}`}>
      <AnimatePresence>
        {messages.map(message => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`status-indicator flex items-start p-3 rounded-md shadow-md border ${getBackgroundClass(message.type)} max-w-xs`}
          >
            <div className="mr-3 mt-0.5">
              {getIcon(message.type)}
            </div>
            <div className="flex-1 mr-2">
              <p className="text-sm font-medium text-foreground">
                {message.message}
              </p>
            </div>
            {message.autoClose && (
              <button
                onClick={() => removeStatusMessage(message.id)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default StatusIndicator;