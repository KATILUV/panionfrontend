import React, { useRef, useCallback } from 'react';
import { ChatInterface } from '@/components/chat/ChatInterface';
import usePanionChat from '@/hooks/usePanionChat';
import { AgentStatusType } from '@/types/chat';
import BaseAgent from './BaseAgent';
import log from '@/utils/logger';
import { useToast } from '@/hooks/use-toast';
import { displayError } from '@/utils/errorHandler';

const EnhancedChatAgent: React.FC = () => {
  // Create input ref that matches ChatInterface's expectations
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
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
    clearMessages,
  } = usePanionChat({
    useEnhancedMode: true,
    autoDetectStrategicMode: true
  });
  
  // Custom initialization for this agent
  const handleInitialize = useCallback(async () => {
    try {
      log.info('Initializing Panion Enhanced Chat agent', undefined, 'panion');
      // Potential future initialization steps:
      // - Check WebSocket connection status
      // - Load user preferences
      // - Initialize plugins
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      log.error(`Failed to initialize Panion agent: ${err.message}`, { error }, 'panion');
      displayError(err, toast);
      throw err;
    }
  }, [toast]);
  
  // Handle cleanup
  const handleCleanup = useCallback(async () => {
    log.info('Cleaning up Panion Enhanced Chat agent', undefined, 'panion');
    // Add any cleanup tasks here
  }, []);
  
  // Handle form submission
  const handleSubmit = () => {
    if (inputValue.trim() && !isLoading) {
      sendMessage(inputValue);
    }
  };
  
  // Define agent status - convert from string to AgentStatusType
  const agentStatus: AgentStatusType = isLoading ? 'thinking' : 'idle';
  
  return (
    <BaseAgent
      agentId="panion"
      title="Panion"
      subtitle="Enhanced Chat"
      description="An advanced AI assistant with enhanced capabilities"
      onInitialize={handleInitialize}
      onCleanup={handleCleanup}
    >
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
    </BaseAgent>
  );
};

export default EnhancedChatAgent;