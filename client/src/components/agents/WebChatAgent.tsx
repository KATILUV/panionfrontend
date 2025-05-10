import React from 'react';
import { Smartphone, MessageSquare } from "lucide-react";
import { WebSocketChat } from './WebSocketChat';
import AgentWindow from '../common/AgentWindow';
import { useTaskbarStore } from '@/state/taskbarStore';

interface WebChatAgentProps {
  id: string;
  isActive?: boolean;
  onClose?: () => void;
}

const WebChatAgent: React.FC<WebChatAgentProps> = ({ id, isActive = false, onClose }) => {
  const pinTaskbarItem = useTaskbarStore(state => state.pinTaskbarItem);
  const unpinTaskbarItem = useTaskbarStore(state => state.unpinTaskbarItem);

  return (
    <AgentWindow
      id={id}
      title="AI Chat (WebSocket)"
      icon={<MessageSquare />}
      mobileIcon={<Smartphone />}
      isActive={isActive}
      onClose={onClose}
      onPin={() => pinTaskbarItem(id)}
      onUnpin={() => unpinTaskbarItem(id)}
      defaultWidth={550}
      defaultHeight={600}
      minWidth={300}
      minHeight={400}
      className="bg-background"
    >
      <WebSocketChat
        title="Real-time AI Chat"
        className="border-none shadow-none h-full" 
        defaultMode="casual"
      />
    </AgentWindow>
  );
};

// Default ID for this agent type
WebChatAgent.defaultProps = {
  id: 'webchat-agent'
};

export default WebChatAgent;