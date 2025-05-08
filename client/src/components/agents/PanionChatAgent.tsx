import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Settings, BrainCircuit, RotateCcw, Activity, HelpCircle, Search, Database, ZapIcon, Lightbulb, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AgentStatus } from './AgentStatus';
import { useAgentStore, Agent } from '../../state/agentStore';
import { Spinner } from '@/components/ui/spinner';
import { useIntelligence } from '@/hooks/use-intelligence';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: string;
  thinking?: string;
}

// Helper function to generate a random ID
const generateId = () => Math.random().toString(36).substring(2, 9);

// Helper function to format timestamp
const formatTime = (date: Date) => {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Define common capability types for better organization
const CAPABILITIES = {
  WEB_RESEARCH: 'web_research',
  DATA_ANALYSIS: 'data_analysis',
  CONTACT_FINDER: 'contact_finder',
  BUSINESS_RESEARCH: 'business_research',
  SMOKESHOP_DATA: 'smokeshop_data',
};

const PanionChatAgent: React.FC = () => {
  // Access agent store for capability checking and dynamic agent creation
  const hasCapability = useAgentStore(state => state.hasCapability);
  const createDynamicAgent = useAgentStore(state => state.createDynamicAgent);
  const dynamicAgentCreationInProgress = useAgentStore(state => state.dynamicAgentCreationInProgress);
  const findBestAgentForCapabilities = useAgentStore(state => state.findBestAgentForCapabilities);
  const openAgent = useAgentStore(state => state.openAgent);
  const focusAgent = useAgentStore(state => state.focusAgent);
  const registry = useAgentStore(state => state.registry);
  const isStrategicModeEnabled = useAgentStore(state => state.isStrategicModeEnabled);
  const toggleStrategicMode = useAgentStore(state => state.toggleStrategicMode);
  
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: generateId(),
      content: "Hello! I'm your Panion assistant. I can help with your tasks directly or delegate to specialized agents when needed. I work closely with Clara for personal assistance. How can I help you today?",
      isUser: false,
      timestamp: formatTime(new Date()),
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(`session_${Date.now()}`);
  const [agentStatus, setAgentStatus] = useState<'idle' | 'thinking' | 'active' | 'error'>('idle');
  const [processingStage, setProcessingStage] = useState<string | null>(null); // Shows what Panion is currently doing
  const [needsMoreInfo, setNeedsMoreInfo] = useState<string | null>(null); // For asking clarifying questions
  const [showThinking, setShowThinking] = useState(false); // Toggle for thinking process display
  const [processingProgress, setProcessingProgress] = useState(0); // Progress indicator
  // Tasks tracking
  const [activeTasks, setActiveTasks] = useState<Array<{
    id: string;
    type: string;
    status: string;
    progress: number;
    description: string;
    location?: string;
    created: string;
  }>>([]);
  const [taskPollingEnabled, setTaskPollingEnabled] = useState(false);
  
  // Strategic mode is now controlled by the global store
  const strategicMode = isStrategicModeEnabled;
  
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Initialize intelligence hook with automatic resource optimization
  const intelligence = useIntelligence({
    defaultStrategicThreshold: 65,  // Slightly lower threshold to activate strategic mode
    enableAutomaticResourceOptimization: true,
    enableInternalDebate: true
  });

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Task polling effect
  useEffect(() => {
    let pollingInterval: NodeJS.Timeout | null = null;
    
    if (taskPollingEnabled && activeTasks.length > 0) {
      pollingInterval = setInterval(async () => {
        try {
          // For each active task, check its status
          const updatedTasks = [...activeTasks];
          let tasksChanged = false;
          
          for (let i = 0; i < updatedTasks.length; i++) {
            const task = updatedTasks[i];
            if (task.status === 'completed' || task.status === 'failed') continue;
            
            const response = await fetch(`/api/panion/tasks/${task.id}`, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
              const taskData = await response.json();
              
              // Update task with latest data
              if (taskData.status !== updatedTasks[i].status || 
                  taskData.progress !== updatedTasks[i].progress) {
                updatedTasks[i] = { ...updatedTasks[i], ...taskData };
                tasksChanged = true;
                
                // If task completed, add a message to the chat
                if (taskData.status === 'completed' && updatedTasks[i].status !== 'completed') {
                  const completionMessage: ChatMessage = {
                    id: generateId(),
                    content: `Task "${task.description}" has completed. ${taskData.result || ''}`,
                    isUser: false,
                    timestamp: formatTime(new Date()),
                  };
                  setMessages(prev => [...prev, completionMessage]);
                  
                  // If this is a smoke shop search, format the results nicely
                  if (task.type === 'smokeshop_search' && taskData.data) {
                    try {
                      // Add data to messages in a readable format
                      let formattedData = "Here's what I found:\n\n";
                      const shopData = Array.isArray(taskData.data) ? taskData.data : [taskData.data];
                      
                      shopData.forEach((shop: any, idx: number) => {
                        formattedData += `📍 **${shop.name || 'Smoke Shop'}**\n`;
                        if (shop.address) formattedData += `Address: ${shop.address}\n`;
                        if (shop.phone) formattedData += `Phone: ${shop.phone}\n`;
                        if (shop.website) formattedData += `Website: ${shop.website}\n`;
                        if (shop.hours) formattedData += `Hours: ${shop.hours}\n`;
                        if (idx < shopData.length - 1) formattedData += '\n';
                      });
                      
                      const dataMessage: ChatMessage = {
                        id: generateId(),
                        content: formattedData,
                        isUser: false,
                        timestamp: formatTime(new Date()),
                      };
                      setMessages(prev => [...prev, dataMessage]);
                    } catch (err) {
                      console.error('Error formatting shop data:', err);
                    }
                  }
                }
                
                // If task failed, also add a message
                if (taskData.status === 'failed' && updatedTasks[i].status !== 'failed') {
                  const failureMessage: ChatMessage = {
                    id: generateId(),
                    content: `Unfortunately, task "${task.description}" has failed. ${taskData.error || 'Please try again or modify your request.'}`,
                    isUser: false,
                    timestamp: formatTime(new Date()),
                  };
                  setMessages(prev => [...prev, failureMessage]);
                }
              }
            }
          }
          
          if (tasksChanged) {
            setActiveTasks(updatedTasks);
          }
          
          // If all tasks are complete or failed, stop polling
          const allTasksFinished = updatedTasks.every(task => 
            task.status === 'completed' || task.status === 'failed'
          );
          
          if (allTasksFinished) {
            setTaskPollingEnabled(false);
          }
        } catch (error) {
          console.error('Error polling tasks:', error);
        }
      }, 3000); // Poll every 3 seconds
    }
    
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [taskPollingEnabled, activeTasks]);

  // Focus input on load
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  
  // Function to detect missing capabilities based on user input
  const detectRequiredCapabilities = (message: string): string[] => {
    const requiredCapabilities: string[] = [];
    const lowerMessage = message.toLowerCase();
    
    // Detect web research capability requirement
    if (
      lowerMessage.includes('search') || 
      lowerMessage.includes('find information') || 
      lowerMessage.includes('look up') ||
      lowerMessage.includes('research')
    ) {
      requiredCapabilities.push(CAPABILITIES.WEB_RESEARCH);
    }
    
    // Detect data analysis capability requirement
    if (
      lowerMessage.includes('analyze') || 
      lowerMessage.includes('data analysis') || 
      lowerMessage.includes('statistics') ||
      lowerMessage.includes('trends')
    ) {
      requiredCapabilities.push(CAPABILITIES.DATA_ANALYSIS);
    }
    
    // Detect business research capability needs
    if (
      lowerMessage.includes('business') || 
      lowerMessage.includes('company') || 
      lowerMessage.includes('industry') ||
      lowerMessage.includes('market')
    ) {
      requiredCapabilities.push(CAPABILITIES.BUSINESS_RESEARCH);
    }
    
    // Detect smokeshop related queries (specific use case)
    if (
      lowerMessage.includes('smokeshop') || 
      lowerMessage.includes('smoke shop') || 
      lowerMessage.includes('dispensary') ||
      lowerMessage.includes('tobacco') ||
      lowerMessage.includes('vape')
    ) {
      requiredCapabilities.push(CAPABILITIES.SMOKESHOP_DATA);
    }
    
    // Detect contact finding requirements
    if (
      lowerMessage.includes('contact') || 
      lowerMessage.includes('email') || 
      lowerMessage.includes('phone') ||
      lowerMessage.includes('buyer')
    ) {
      requiredCapabilities.push(CAPABILITIES.CONTACT_FINDER);
    }
    
    return requiredCapabilities;
  };
  
  // Function to handle missing capabilities using a hybrid approach
  const handleMissingCapabilities = async (requiredCapabilities: string[]): Promise<boolean> => {
    // Filter out capabilities that we already have
    const missingCapabilities = requiredCapabilities.filter(cap => !hasCapability(cap));
    
    if (missingCapabilities.length === 0) {
      return false; // No missing capabilities
    }
    
    // First, check if there's an existing agent that has most of the required capabilities
    const bestMatchingAgent = findBestAgentForCapabilities(requiredCapabilities);
    
    if (bestMatchingAgent) {
      // Calculate what capabilities this agent provides and what's still missing
      const coveredCapabilities = requiredCapabilities.filter(cap => 
        bestMatchingAgent.capabilities?.includes(cap)
      );
      
      const stillMissingCapabilities = requiredCapabilities.filter(cap => 
        !bestMatchingAgent.capabilities?.includes(cap)
      );
      
      // If agent covers at least 70% of the required capabilities, use it
      if (coveredCapabilities.length / requiredCapabilities.length >= 0.7) {
        // Notify the user we're using an existing agent
        const agentMessage: ChatMessage = {
          id: generateId(),
          content: `I'll use ${bestMatchingAgent.title} to help with this request, as it has the capabilities you need: ${coveredCapabilities.join(', ')}.`,
          isUser: false,
          timestamp: formatTime(new Date()),
        };
        
        setMessages(prev => [...prev, agentMessage]);
        
        // Open the existing agent
        openAgent(bestMatchingAgent.id);
        
        // If there are still some missing capabilities but not enough to warrant a new agent,
        // we'll just note it but proceed with the existing agent
        if (stillMissingCapabilities.length > 0) {
          const capabilitiesNote: ChatMessage = {
            id: generateId(),
            content: `Note: For additional capabilities like ${stillMissingCapabilities.join(', ')}, I might need to create specialized plugins later if needed.`,
            isUser: false,
            timestamp: formatTime(new Date()),
          };
          
          setMessages(prev => [...prev, capabilitiesNote]);
        }
        
        return false; // No new agents created, using existing one
      }
    }
    
    // If we didn't find a suitable existing agent, we need to create a new one
    // Notify the user about creating specialized agents
    const botMessage: ChatMessage = {
      id: generateId(),
      content: `I need to create specialized agent(s) with the following capabilities to help with your request: ${missingCapabilities.join(', ')}. Please wait a moment...`,
      isUser: false,
      timestamp: formatTime(new Date()),
    };
    
    setMessages(prev => [...prev, botMessage]);
    
    try {
      // Determine which kind of specialized agent to create based on capabilities
      let agentCreated = false;
      
      // Create specialized agents based on the specific capabilities needed
      if (missingCapabilities.includes(CAPABILITIES.SMOKESHOP_DATA) || 
          missingCapabilities.includes(CAPABILITIES.BUSINESS_RESEARCH)) {
        // Use existing Daddy Data agent instead of creating new ones
        const confirmMessage: ChatMessage = {
          id: generateId(),
          content: 'I\'ll use the Daddy Data agent to help find the business information you need. Opening it now in your workspace.',
          isUser: false,
          timestamp: formatTime(new Date()),
        };
        
        setMessages(prev => [...prev, confirmMessage]);
        
        // Open the Daddy Data agent instead of creating a new one
        useAgentStore.getState().openAgent('daddy-data');
        agentCreated = true;
      } else if (missingCapabilities.includes(CAPABILITIES.DATA_ANALYSIS)) {
        // Create a data analysis agent
        await createDynamicAgent({
          name: 'Data Analysis Agent',
          description: 'Specialized agent for analyzing data sets and extracting insights.',
          capabilities: [CAPABILITIES.DATA_ANALYSIS],
          icon: 'BarChart'
        });
        
        // Add confirmation message
        const confirmMessage: ChatMessage = {
          id: generateId(),
          content: 'I\'ve created a Data Analysis Agent to help analyze the information you need. It\'s now available in your workspace.',
          isUser: false,
          timestamp: formatTime(new Date()),
        };
        
        setMessages(prev => [...prev, confirmMessage]);
        agentCreated = true;
      } else if (missingCapabilities.includes(CAPABILITIES.WEB_RESEARCH)) {
        // Create a web research agent
        await createDynamicAgent({
          name: 'Web Research Agent',
          description: 'Specialized agent for finding and organizing information from the web.',
          capabilities: [CAPABILITIES.WEB_RESEARCH],
          icon: 'Globe'
        });
        
        // Add confirmation message
        const confirmMessage: ChatMessage = {
          id: generateId(),
          content: 'I\'ve created a Web Research Agent to help find the information you need. It\'s now available in your workspace.',
          isUser: false,
          timestamp: formatTime(new Date()),
        };
        
        setMessages(prev => [...prev, confirmMessage]);
        agentCreated = true;
      }
      
      // If we didn't create any specific agent but have missing capabilities,
      // create a general purpose plugin/agent
      if (!agentCreated && missingCapabilities.length > 0) {
        await createDynamicAgent({
          name: `Specialized ${missingCapabilities[0]} Plugin`,
          description: `Plugin to handle ${missingCapabilities.join(', ')} capabilities.`,
          capabilities: missingCapabilities,
          icon: 'Puzzle'
        });
        
        // Add confirmation message
        const confirmMessage: ChatMessage = {
          id: generateId(),
          content: `I've created a specialized plugin to handle ${missingCapabilities.join(', ')}. It's now available in your workspace.`,
          isUser: false,
          timestamp: formatTime(new Date()),
        };
        
        setMessages(prev => [...prev, confirmMessage]);
      }
      
      return true; // Successfully created needed agents
    } catch (error) {
      // Add error message
      const errorMessage: ChatMessage = {
        id: generateId(),
        content: 'I encountered a problem while creating the specialized agent. Let me try to help you directly instead.',
        isUser: false,
        timestamp: formatTime(new Date()),
      };
      
      setMessages(prev => [...prev, errorMessage]);
      console.error('Error creating dynamic agent:', error);
      return false;
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    
    // Create user message
    const userMessage: ChatMessage = {
      id: generateId(),
      content: inputValue,
      isUser: true,
      timestamp: formatTime(new Date()),
    };
    
    // Clear input and update messages
    setInputValue('');
    setMessages(prev => [...prev, userMessage]);
    setAgentStatus('thinking');
    setIsLoading(true);
    setProcessingProgress(0);
    
    // Reset processing stages
    setProcessingStage("Analyzing your request...");
    
    // Automatically detect if strategic mode should be enabled based on the complexity of the request
    const shouldEnableStrategicMode = shouldUseStrategicMode(userMessage.content);
    
    // If strategic mode should be enabled and it's not already enabled, turn it on
    if (shouldEnableStrategicMode && !strategicMode) {
      toggleStrategicMode();
      
      // Let the user know that strategic mode was automatically enabled
      const strategicModeMessage: ChatMessage = {
        id: generateId(),
        content: "I've enabled strategic mode for this complex request. I'll use multiple approaches and provide a more thorough response.",
        isUser: false,
        timestamp: formatTime(new Date()),
      };
      
      setMessages(prev => [...prev, strategicModeMessage]);
    }
    
    // This simulates progress updates during processing
    const progressInterval = setInterval(() => {
      setProcessingProgress(prev => {
        // Don't go to 100% automatically, leave that for when done
        return prev < 90 ? prev + 5 : prev;
      });
    }, 600);
    
    try {
      // Check for required capabilities
      setProcessingStage("Checking required capabilities...");
      setProcessingProgress(10);
      const requiredCapabilities = detectRequiredCapabilities(inputValue);
      
      // Handle missing capabilities if any are detected
      if (requiredCapabilities.length > 0) {
        setProcessingStage("Determining optimal agent for your request...");
        setProcessingProgress(20);
      }
      
      const createdNewAgents = requiredCapabilities.length > 0 ? 
        await handleMissingCapabilities(requiredCapabilities) : false;
      
      // If we're creating new agents and they're in progress, show a loading message
      if (createdNewAgents && dynamicAgentCreationInProgress) {
        setProcessingStage("Setting up specialized agents...");
        setProcessingProgress(40);
        
        const loadingMessage: ChatMessage = {
          id: generateId(),
          content: "I'm still setting up the specialized agent(s). This should only take a moment...",
          isUser: false,
          timestamp: formatTime(new Date()),
        };
        
        setMessages(prev => [...prev, loadingMessage]);
        
        // Wait a bit for agent creation to complete
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
      
      // Check if we need more information from the user
      const needsMoreInfo = checkIfNeedsMoreInfo(inputValue);
      if (needsMoreInfo) {
        setProcessingStage("Requesting additional information...");
        setProcessingProgress(95);
        clearInterval(progressInterval);
        
        // Ask user for more information
        const infoRequestMessage: ChatMessage = {
          id: generateId(),
          content: needsMoreInfo,
          isUser: false,
          timestamp: formatTime(new Date()),
        };
        
        setMessages(prev => [...prev, infoRequestMessage]);
        setNeedsMoreInfo(needsMoreInfo);
        setAgentStatus('idle');
        setIsLoading(false);
        setProcessingProgress(100);
        return;
      }
      
      // Send message to Panion API - use strategic mode if enabled
      if (strategicMode) {
        setProcessingStage("Strategically evaluating approaches...");
      } else {
        setProcessingStage("Processing with Panion API...");
      }
      setProcessingProgress(60);
      
      // Determine which endpoint to use based on strategic mode
      const endpoint = strategicMode ? '/api/panion/strategic' : '/api/panion/chat';
      
      // Prepare request body based on endpoint type
      let requestBody;
      if (strategicMode) {
        requestBody = {
          goal: inputValue,
          parameters: {
            sessionId,
            hasRequiredCapabilities: requiredCapabilities.length === 0 || !createdNewAgents,
            capabilities: requiredCapabilities,
            compare_strategies: true,
            use_reflection: true,
            max_attempts: 3
          }
        };
      } else {
        requestBody = {
          content: inputValue,  // changed from message to content to match backend
          sessionId,  // backend handles both sessionId and session_id formats now
          hasRequiredCapabilities: requiredCapabilities.length === 0 || !createdNewAgents,
          capabilities: requiredCapabilities,
          metadata: {  // also include metadata for compatibility
            capabilities: requiredCapabilities,
            hasRequiredCapabilities: requiredCapabilities.length === 0 || !createdNewAgents
          }
        };
      }
      
      // Check if this is a smoke shop search request
      let response;
      if (requiredCapabilities.includes(CAPABILITIES.SMOKESHOP_DATA) && 
          (inputValue.toLowerCase().includes('smoke shop') || 
           inputValue.toLowerCase().includes('smokeshop') ||
           inputValue.toLowerCase().includes('vape') ||
           inputValue.toLowerCase().includes('tobacco') ||
           inputValue.toLowerCase().includes('dispensary'))) {
        
        // Extract location from message if present
        let location = 'New York';  // Default location
        const locationRegex = /\b(?:in|near|around|at)\s+([A-Za-z\s,]+?)(?:\.|,|\s+and|\s+or|\s+with|\s+that|\s+for|\s+$)/i;
        const locationMatch = inputValue.match(locationRegex);
        
        if (locationMatch && locationMatch[1]) {
          location = locationMatch[1].trim();
        }
        
        // Create a task for this search
        const taskId = generateId();
        const taskDescription = `Finding smoke shops in ${location}`;
        
        // Add a message that we're starting a background task
        const taskMessage: ChatMessage = {
          id: generateId(),
          content: `I'm starting a background task to search for smoke shops in ${location}. This will continue running even if you close this window. You'll be notified when results are ready.`,
          isUser: false,
          timestamp: formatTime(new Date()),
        };
        
        setMessages(prev => [...prev, taskMessage]);
        
        // Create the task through a special endpoint
        response = await fetch('/api/panion/smokeshop/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            location: location,
            task_id: taskId,
            query: inputValue
          })
        });
        
        if (response.ok) {
          const taskData = await response.json();
          
          // Start tracking this task
          const newTask = {
            id: taskId,
            type: 'smokeshop_search',
            status: 'in_progress',
            progress: 0,
            description: taskDescription,
            location: location,
            created: formatTime(new Date())
          };
          
          setActiveTasks(prevTasks => [...prevTasks, newTask]);
          setTaskPollingEnabled(true);
          
          // Add a specific progress message
          const progressMessage: ChatMessage = {
            id: generateId(),
            content: `I've started gathering information on smoke shops in ${location}. This process will run in the background and may take a few minutes. I'll notify you when results are available.`,
            isUser: false,
            timestamp: formatTime(new Date()),
          };
          
          setMessages(prev => [...prev, progressMessage]);
        }
      } else {
        // For regular requests, use the standard endpoint
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });
      }
      
      if (!response.ok) {
        throw new Error(`Failed to send message to Panion using ${strategicMode ? 'strategic' : 'standard'} mode`);
      }
      
      setProcessingStage("Formatting response...");
      setProcessingProgress(80);
      
      const data = await response.json();
      
      console.log("Panion API response:", data); // Add logging to see what we get
      
      // Process strategic information if available
      let thinkingContent = data.thinking || '';
      
      // Check for additional_info which may include capabilities information
      if (data.additional_info && !thinkingContent) {
        // If we have additional info but no thinking content, use that information
        const info = data.additional_info;
        thinkingContent = `Processing request with session: ${info.session_id || 'unknown'}\n`;
        if (info.intent_detected) {
          thinkingContent += `Detected intent: ${info.intent_detected}\n`;
        }
        if (info.capabilities && Array.isArray(info.capabilities)) {
          thinkingContent += `Required capabilities: ${info.capabilities.join(', ')}\n`;
        }
      }
      
      if (strategicMode && data.strategies && Array.isArray(data.strategies)) {
        // Format strategies information as part of the thinking process
        thinkingContent += '\n\n**Strategy Evaluation:**\n';
        
        data.strategies.forEach((strategy: any, index: number) => {
          thinkingContent += `\n**Strategy ${index + 1}: ${strategy.name}**\n`;
          thinkingContent += `- Approach: ${strategy.approach || 'Not specified'}\n`;
          thinkingContent += `- Success: ${strategy.success ? '✓' : '✗'}\n`;
          if (strategy.reasoning) {
            thinkingContent += `- Reasoning: ${strategy.reasoning}\n`;
          }
          if (strategy.execution_time) {
            thinkingContent += `- Execution time: ${strategy.execution_time.toFixed(2)}s\n`;
          }
        });
        
        if (data.selected_strategy) {
          thinkingContent += `\n**Selected Strategy:** ${data.selected_strategy.name} - ${data.selected_strategy.reasoning || 'Best overall performance'}\n`;
        }
      }
      
      // Check if this might be a request better handled by Clara
      if (data.additional_info && data.additional_info.clara_context) {
        const claraInfo = data.additional_info.clara_context;
        
        // Add Clara's context information to thinking
        if (claraInfo.personal_context) {
          thinkingContent += '\n\n**Clara Context:**\n';
          thinkingContent += `${claraInfo.personal_context}\n`;
        }
        
        // If Clara would be better for this query, suggest forwarding
        if (claraInfo.clara_recommended) {
          setNeedsMoreInfo(`This seems like a request Clara might handle better. Would you like me to forward this to Clara?`);
        }
      }
      
      // Create bot message
      const botMessage: ChatMessage = {
        id: generateId(),
        content: data.response,
        isUser: false,
        timestamp: formatTime(new Date()),
        thinking: thinkingContent,
      };
      
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
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive',
      });
      setAgentStatus('error');
    } finally {
      clearInterval(progressInterval);
      setIsLoading(false);
    }
  };
  
  // Helper function to check if we need more information from the user
  const checkIfNeedsMoreInfo = (message: string): string | null => {
    const lowerMessage = message.toLowerCase();
    
    // Check for vague queries that need more details
    if (lowerMessage.includes('find') && lowerMessage.length < 15) {
      return "I'd like to help you find that. Could you provide more details about what specific information you're looking for?";
    }
    
    // For smoke shop research, ask for specific location if not provided
    if ((lowerMessage.includes('smoke shop') || lowerMessage.includes('smokeshop')) && 
        !lowerMessage.includes('in ') && !lowerMessage.includes('near') && !lowerMessage.includes('around')) {
      return "I can help research smoke shops. Could you specify which city or location you're interested in?";
    }
    
    // For data analysis, check if data source is specified
    if (lowerMessage.includes('analyze') && !lowerMessage.includes('data from') && !lowerMessage.includes('dataset')) {
      return "I'd be happy to help with data analysis. Could you specify which dataset or data source you'd like me to analyze?";
    }
    
    return null;
  };
  
  // Function to detect tasks that would benefit from strategic mode
  const shouldUseStrategicMode = (message: string): boolean => {
    const lowerMessage = message.toLowerCase();
    
    // Indicators of complex tasks that need strategic thinking and multiple approaches
    const complexityIndicators = [
      // Task complexity indicators
      { pattern: 'compare', weight: 0.7 },
      { pattern: 'multi', weight: 0.6 },
      { pattern: 'complex', weight: 0.8 },
      { pattern: 'comprehensive', weight: 0.7 },
      { pattern: 'thorough', weight: 0.6 },
      { pattern: 'detailed', weight: 0.5 },
      { pattern: 'in-depth', weight: 0.7 },
      
      // Analytical requirements
      { pattern: 'analyze', weight: 0.6 },
      { pattern: 'research', weight: 0.5 },
      { pattern: 'evaluate', weight: 0.6 },
      { pattern: 'assess', weight: 0.6 },
      { pattern: 'investigate', weight: 0.6 },
      
      // Multiple sources/strategies
      { pattern: 'different sources', weight: 0.8 },
      { pattern: 'multiple perspectives', weight: 0.8 },
      { pattern: 'alternative approach', weight: 0.7 },
      { pattern: 'various methods', weight: 0.7 },
      
      // Data and quality indicators
      { pattern: 'accurate', weight: 0.6 },
      { pattern: 'validate', weight: 0.7 },
      { pattern: 'verify', weight: 0.7 },
      { pattern: 'confirm', weight: 0.5 },
      { pattern: 'ensure', weight: 0.5 },
      
      // Strategic keywords
      { pattern: 'strategy', weight: 0.8 },
      { pattern: 'strategic', weight: 0.9 },
      { pattern: 'optimize', weight: 0.7 },
      { pattern: 'plan', weight: 0.5 },
      
      // Business and competitive analysis
      { pattern: 'market', weight: 0.6 },
      { pattern: 'competitor', weight: 0.7 },
      { pattern: 'industry', weight: 0.6 },
      { pattern: 'business', weight: 0.5 },
    ];
    
    // Calculate complexity score based on indicators
    let complexityScore = 0;
    let matchedIndicators = 0;
    
    complexityIndicators.forEach(indicator => {
      if (lowerMessage.includes(indicator.pattern)) {
        complexityScore += indicator.weight;
        matchedIndicators++;
      }
    });
    
    // Message length is also an indicator of complexity
    if (message.length > 100) {
      complexityScore += 0.3;
    }
    if (message.length > 200) {
      complexityScore += 0.2;
    }
    
    // Normalize based on number of matched indicators (to prevent long messages with
    // many indicators from always triggering strategic mode)
    const normalizedScore = matchedIndicators > 0 
      ? complexityScore / Math.sqrt(matchedIndicators) 
      : complexityScore;
    
    // Decision threshold - tune this value as needed
    const strategicModeThreshold = 1.0;
    
    return normalizedScore >= strategicModeThreshold;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSendMessage();
    }
  };

  return (
    <Card className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-3">
        <div className="flex items-center">
          <BrainCircuit className="h-5 w-5 mr-2 text-purple-500" />
          <div>
            <h3 className="font-medium">Panion Chat</h3>
            <p className="text-xs text-muted-foreground">Multi-agent assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AgentStatus status={agentStatus} showLabel={false} size="sm" />
          <Button variant="ghost" size="icon" title="Settings">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Messages */}
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`
                  max-w-[80%] rounded-lg p-3
                  ${message.isUser 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted'}
                `}
              >
                {showThinking && message.thinking && !message.isUser && (
                  <div className="text-xs border-l-2 border-primary/30 pl-2 text-muted-foreground mb-2 py-1">
                    <div className="font-medium mb-1 flex items-center">
                      <Search className="h-3 w-3 mr-1" /> 
                      <span>Thinking Process</span>
                    </div>
                    <div className="italic">{message.thinking}</div>
                  </div>
                )}
                <div className="whitespace-pre-wrap">{message.content}</div>
                <div className="text-xs mt-1 opacity-70 text-right">
                  {message.timestamp}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      
      {/* Processing Indicator */}
      {isLoading && (
        <div className="mx-3 mb-3">
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs text-muted-foreground flex items-center">
              <Spinner variant="dots" size="xs" className="mr-2 text-primary" />
              {processingStage && <span>{processingStage}</span>}
            </div>
            <div className="text-xs text-muted-foreground">
              {processingProgress}%
            </div>
          </div>
          <div className="w-full bg-muted rounded-full h-1.5">
            <div 
              className="bg-primary h-1.5 rounded-full transition-all duration-300 ease-in-out" 
              style={{ width: `${processingProgress}%` }}
            />
          </div>
        </div>
      )}
      
      {/* Input */}
      <div className="border-t p-3">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your message..."
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            className="flex-1"
          />
          <Button 
            onClick={handleSendMessage} 
            disabled={isLoading || !inputValue.trim()}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex flex-wrap justify-between items-center mt-2 text-xs text-muted-foreground">
          <div className="flex items-center flex-wrap space-x-4">
            <div className="flex items-center">
              <Activity className="h-3 w-3 mr-1" />
              <span>Connected to Panion API</span>
            </div>
            
            {/* Thinking Toggle Switch */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="thinking-toggle"
                checked={showThinking}
                onChange={() => setShowThinking(!showThinking)}
                className="sr-only peer"
              />
              <label 
                htmlFor="thinking-toggle" 
                className="relative inline-flex items-center h-4 w-7 rounded-full bg-muted peer-checked:bg-primary cursor-pointer transition-colors"
              >
                <span className="inline-block h-3 w-3 transform translate-x-0.5 rounded-full bg-background peer-checked:translate-x-3.5 transition-transform"></span>
              </label>
              <span className="ml-1">Show thinking</span>
            </div>
            
            {/* Strategic Mode Toggle */}
            <div className="flex items-center mt-1 sm:mt-0">
              <input
                type="checkbox"
                id="strategic-toggle"
                checked={strategicMode}
                onChange={() => toggleStrategicMode()}
                className="sr-only peer"
              />
              <label 
                htmlFor="strategic-toggle" 
                className="relative inline-flex items-center h-4 w-7 rounded-full bg-muted peer-checked:bg-purple-500 cursor-pointer transition-colors"
              >
                <span className="inline-block h-3 w-3 transform translate-x-0.5 rounded-full bg-background peer-checked:translate-x-3.5 transition-transform"></span>
              </label>
              <span className="ml-1 flex items-center">
                <Database className="h-3 w-3 mr-1" /> 
                Strategic mode
                <span className="ml-1 px-1 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded text-[10px]">
                  {strategicMode ? 'ON' : 'OFF'}
                </span>
              </span>
            </div>
          </div>
          
          <button 
            className="flex items-center hover:text-foreground transition-colors mt-1 sm:mt-0" 
            onClick={() => {
              setMessages([{
                id: generateId(),
                content: "Hello! I'm your Panion assistant. I can help with your tasks directly or delegate to specialized agents when needed. I work closely with Clara for personal assistance. How can I help you today?",
                isUser: false,
                timestamp: formatTime(new Date()),
              }]);
              setSessionId(`session_${Date.now()}`);
              setProcessingStage(null);
              setProcessingProgress(0);
              setNeedsMoreInfo(null);
              
              // Reset strategic mode on new chat - if it was enabled
              if (strategicMode) {
                toggleStrategicMode();
              }
            }}
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            <span>Reset chat</span>
          </button>
        </div>
      </div>
    </Card>
  );
};

export default PanionChatAgent;