import React, { useRef } from 'react';
import { ChatInterface } from '@/components/chat/ChatInterface';
import usePanionChat from '@/hooks/usePanionChat';
import { AgentStatusType } from '@/types/chat';

const EnhancedChatAgent: React.FC = () => {
  // Create input ref that matches ChatInterface's expectations
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Initialize our custom chat hook
  const {
    messages,
    inputValue,
    setInputValue,
    isLoading,
    sendMessage,
    strategicMode,
    toggleStrategicMode,
    messagesEndRef,
    processingStage,
    processingProgress,
  } = usePanionChat({
    useEnhancedMode: true,
    autoDetectStrategicMode: true
  });
  
  // Handle form submission
  const handleSubmit = () => {
    if (inputValue.trim() && !isLoading) {
      sendMessage(inputValue);
    }
  };
  
  // Define agent status - convert from string to AgentStatusType
  const agentStatus: AgentStatusType = isLoading ? 'thinking' : 'idle';
  
  return (
    <ChatInterface
      messages={messages}
      inputValue={inputValue}
      setInputValue={setInputValue}
      isLoading={isLoading}
      agentStatus={agentStatus}
      processingStage={processingStage}
      processingProgress={processingProgress}
      strategicMode={strategicMode}
      toggleStrategicMode={toggleStrategicMode}
      sendMessage={handleSubmit}
      messagesEndRef={messagesEndRef}
      inputRef={inputRef}
      title="Panion"
      subtitle="Enhanced Chat"
      showSettings={true}
    />
  );
};

export default EnhancedChatAgent;