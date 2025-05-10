import React from 'react';
import { ChatInterface } from '@/components/chat/ChatInterface';
import usePanionChat from '@/hooks/usePanionChat';

const EnhancedChatAgent: React.FC = () => {
  // Initialize our custom chat hook
  const {
    messages,
    inputValue,
    setInputValue,
    isLoading,
    agentStatus,
    processingStage,
    processingProgress,
    messagesEndRef,
    inputRef,
    sendMessage,
    strategicMode,
    toggleStrategicMode,
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