import { useState, useRef, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAgentStore } from '@/state/agentStore';
import { useDebate } from '@/hooks/use-debate';
import { ChatMessage, AgentStatusType } from '@/types/chat';
import { 
  createChatMessage, 
  shouldUseStrategicMode, 
  checkIfNeedsMoreInfo, 
  startProgressAnimation,
  isSimpleMessage,
  getSimpleMessageResponse
} from '@/utils/chatUtils';

interface UsePanionChatOptions {
  initialMessages?: ChatMessage[];
  useEnhancedMode?: boolean;
  autoDetectStrategicMode?: boolean;
}

/**
 * Custom hook for Panion chat functionality with enhanced capabilities
 */
export const usePanionChat = ({
  initialMessages = [],
  useEnhancedMode = true,
  autoDetectStrategicMode = true
}: UsePanionChatOptions = {}) => {
  // Global state from agent store
  const isStrategicModeEnabled = useAgentStore(state => state.isStrategicModeEnabled);
  const toggleStrategicModeStore = useAgentStore(state => state.toggleStrategicMode);
  
  // Local state
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages.length > 0 ? 
    initialMessages : 
    [createChatMessage(
      "Hello! I'm your Panion assistant. I can help with your tasks directly or delegate to specialized agents when needed. How can I help you today?",
      false
    )]
  );
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(`session_${Date.now()}`);
  const [agentStatus, setAgentStatus] = useState<AgentStatusType>('idle');
  const [processingStage, setProcessingStage] = useState<string | null>(null);
  const [processingProgress, setProcessingProgress] = useState(0);
  
  // Hooks
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { checkAndProcessWithDebate } = useDebate();
  
  // Strategic mode is controlled by the global store
  const strategicMode = isStrategicModeEnabled;
  
  // Wrapper function for toggleStrategicMode that can accept a boolean value
  const toggleStrategicMode = (value?: boolean) => {
    toggleStrategicModeStore(value);
  };
  
  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Handler for sending a message
  const sendMessage = async (message: string) => {
    // Don't send empty messages
    if (!message.trim()) return;
    
    const userInput = message.trim();
    const stopProgress = startProgressAnimation(setProcessingProgress);
    
    setIsLoading(true);
    setAgentStatus('thinking');
    
    try {
      // Add user message to chat
      const userMessage = createChatMessage(userInput, true);
      setMessages(prev => [...prev, userMessage]);
      setInputValue(''); // Clear input
      
      // Check if this is a simple message that can be handled locally without an API call
      if (isSimpleMessage(userInput)) {
        console.log('FAST PATH DETECTED: Handling simple message locally:', userInput);
        const quickResponse = getSimpleMessageResponse(userInput);
        
        // Add the response with minimal delay to feel natural
        setTimeout(() => {
          const responseMessage = createChatMessage(
            quickResponse, 
            false,
            "Fast response path activated for simple greeting. No API call was made to generate this response."
          );
          setMessages(prev => [...prev, responseMessage]);
          setAgentStatus('idle');
          setIsLoading(false);
          stopProgress();
          setProcessingProgress(100);
          console.log('FAST PATH COMPLETE: Response generated locally');
        }, 300); // Reduce delay for faster response
        
        return;
      }
      
      // Check if the message requires more information before processing
      const moreInfoNeeded = checkIfNeedsMoreInfo(userInput);
      if (moreInfoNeeded) {
        const clarificationMessage = createChatMessage(moreInfoNeeded, false);
        setMessages(prev => [...prev, clarificationMessage]);
        setAgentStatus('idle');
        return;
      }
      
      // Check if we should use strategic mode
      const shouldUseStrategy = strategicMode || (autoDetectStrategicMode && shouldUseStrategicMode(userInput));
      
      if (strategicMode !== shouldUseStrategy && shouldUseStrategy) {
        // Update strategic mode state if auto-detection enabled it
        toggleStrategicMode(true);
        
        // Let user know we're switching to strategic mode
        const strategicModeMessage = createChatMessage(
          `I'll use strategic planning mode for this complex task to provide a more comprehensive analysis.`,
          false
        );
        
        setMessages(prev => [...prev, strategicModeMessage]);
      }
      
      setProcessingStage("Detecting capabilities...");
      setProcessingProgress(10);
      
      // Get the last few messages for context
      const recentMessages = messages
        .slice(-5)
        .map(m => m.content)
        .join("\\n");
      
      // Check if this is a complex question that should use the debate system
      let useDebate = false;
      let responseContent = '';
      let thinkingContent = '';
      
      if (useEnhancedMode && !shouldUseStrategy) {
        setProcessingStage("Analyzing query complexity...");
        
        // Try to use the debate system for enhanced responses
        const debateResult = await checkAndProcessWithDebate(userInput, recentMessages);
        
        if (debateResult.shouldUseDebate && debateResult.content) {
          useDebate = true;
          responseContent = debateResult.content;
          thinkingContent = debateResult.thinking || '';
          setProcessingStage("Using enhanced multi-agent debate system...");
        }
      }
      
      // Prepare for standard API call if not using debate system
      if (!useDebate) {
        setProcessingStage("Preparing standard request...");
        
        // Initialize with empty capabilities (fallback)
        let requiredCapabilities: string[] = [];
        
        try {
          // Determine required capabilities for the task
          const capabilitiesResponse = await fetch('/api/panion/detect-capabilities', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: userInput }),
          });
          
          if (capabilitiesResponse.ok) {
            const capabilitiesData = await capabilitiesResponse.json();
            requiredCapabilities = capabilitiesData.capabilities || [];
          } else {
            console.warn('Capability detection returned error status, using empty capabilities');
          }
        } catch (capabilityError) {
          console.warn('Capability detection failed, continuing with empty capabilities:', capabilityError);
          // Continue with empty capabilities
        }
        
        console.log('Detected capabilities:', requiredCapabilities);
        
        // Determine endpoint based on mode
        let endpoint = '/api/panion/chat';
        let requestBody = {};
        
        if (shouldUseStrategy) {
          endpoint = '/api/strategic/analyze';
          requestBody = {
            goal: userInput,
            parameters: {
              sessionId,
              compare_strategies: true,
              use_reflection: true,
              max_attempts: 3
            }
          };
        } else {
          requestBody = {
            content: userInput,
            sessionId,
            capabilities: requiredCapabilities,
          };
        }
        
        setProcessingStage("Processing your request...");
        setProcessingProgress(50);
        
        // Make the API call
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });
        
        if (!response.ok) {
          throw new Error(`Failed to process message: ${response.statusText}`);
        }
        
        setProcessingStage("Formatting response...");
        setProcessingProgress(80);
        
        const data = await response.json();
        
        // Extract the response content
        responseContent = data.response || data.message || "I received your message, but I'm not sure how to respond.";
        thinkingContent = data.thinking || '';
        
        // For strategic mode, add additional context to thinking content
        if (shouldUseStrategy && data.strategies) {
          thinkingContent += "\\n\\n**Strategic Analysis:**\\n";
          
          // Add strategies information
          data.strategies.forEach((strategy: any, index: number) => {
            thinkingContent += `\\n**Strategy ${index + 1}: ${strategy.name}**\\n`;
            thinkingContent += `- Approach: ${strategy.approach || 'Not specified'}\\n`;
            thinkingContent += `- Success: ${strategy.success ? '✓' : '✗'}\\n`;
            if (strategy.reasoning) {
              thinkingContent += `- Reasoning: ${strategy.reasoning}\\n`;
            }
          });
        }
      }
      
      // Create bot message with the response
      const botMessage: ChatMessage = createChatMessage(
        responseContent,
        false, 
        thinkingContent
      );
      
      // Update messages
      setMessages(prev => [...prev, botMessage]);
      setAgentStatus('active');
      setProcessingProgress(100);
      
      // Reset status after a short delay
      setTimeout(() => {
        setAgentStatus('idle');
        setProcessingStage(null);
      }, 2000);
      
    } catch (error) {
      // Handle error
      console.error('Error sending message:', error);
      
      let errorMessage = 'Failed to send message. Please try again.';
      
      if (error instanceof Error) {
        errorMessage = `Error: ${error.message}`;
      }
      
      // Show toast notification
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      
      // Create an error message in the chat
      const errorResponseMessage = createChatMessage(
        "I'm sorry, I encountered an error while processing your request. Technical team has been notified.",
        false,
        `Error occurred: ${errorMessage}`
      );
      
      setMessages(prev => [...prev, errorResponseMessage]);
      setAgentStatus('error');
    } finally {
      stopProgress();
      setIsLoading(false);
    }
  };
  
  return {
    messages,
    setMessages,
    inputValue,
    setInputValue,
    isLoading,
    agentStatus,
    processingStage,
    processingProgress,
    messagesEndRef,
    inputRef,
    sendMessage,
    sessionId,
    strategicMode,
    toggleStrategicMode,
  };
};