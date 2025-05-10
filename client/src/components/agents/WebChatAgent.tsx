import React from 'react';
import { WebSocketChat } from './WebSocketChat';

/**
 * WebChatAgent Component
 * Real-time AI chat component using WebSockets
 */
const WebChatAgent: React.FC = () => {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <WebSocketChat
        title="Real-time AI Chat" 
        className="h-full border-none shadow-none" 
        defaultMode="casual"
      />
    </div>
  );
};

export default WebChatAgent;