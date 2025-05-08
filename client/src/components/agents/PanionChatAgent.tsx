import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Settings, BrainCircuit, RotateCcw, Activity, HelpCircle, Search, Database, ZapIcon, Lightbulb, Sparkles, Check, X, AlertCircle, Globe, Puzzle, BarChart } from 'lucide-react';
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
  BUSINESS_DIRECTORY: 'business_directory',
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
  const [pendingAction, setPendingAction] = useState<{ type: string, data: any } | null>(null); // For actions requiring approval
  // Tasks tracking
  const [activeTasks, setActiveTasks] = useState<Array<{
    id: string;
    type: string;
    status: string;
    progress: number;
    description: string;
    location?: string;
    created: string;
    isPolling?: boolean;
    errorCount?: number;
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
  
  // Start task polling function for individual tasks
  const startTaskPolling = (taskId: string) => {
    console.log('Starting individual task polling for task:', taskId);
    
    // Set this task as being polled
    setActiveTasks((prevTasks) => {
      return prevTasks.map(task => 
        task.id === taskId 
          ? { ...task, isPolling: true } 
          : task
      );
    });
    
    // Start polling interval
    const pollingInterval = setInterval(async () => {
      // Find the task
      const task = activeTasks.find(t => t.id === taskId);
      
      if (!task) {
        clearInterval(pollingInterval);
        return;
      }
      
      try {
        // Determine the endpoint based on task type
        let endpoint = `/api/panion/task/${taskId}`;
        if (task.type === 'strategic_plan') {
          endpoint = `/api/strategic/plans/${taskId}`;
        }
        
        // Poll for task status
        const response = await fetch(endpoint);
        
        if (!response.ok) {
          throw new Error('Failed to poll task status');
        }
        
        const data = await response.json();
        
        // Update task status based on response
        let isCompleted = false;
        let progress = 0;
        let result = null;
        
        if (task.type === 'strategic_plan') {
          progress = data.progress * 100;
          isCompleted = data.status === 'completed';
          result = data.results;
          
          // Update progress in our active tasks list
          setActiveTasks(prevTasks => 
            prevTasks.map(t => 
              t.id === taskId 
                ? { ...t, progress, status: data.status } 
                : t
            )
          );
        } else {
          // Standard task status handling
          isCompleted = data.status === 'completed' || data.status === 'failed';
          progress = data.progress || 0;
          result = data.result;
          
          // Update progress in our active tasks list
          setActiveTasks(prevTasks => 
            prevTasks.map(t => 
              t.id === taskId 
                ? { ...t, progress, status: data.status } 
                : t
            )
          );
        }
        
        // If task is completed, stop polling and handle completion
        if (isCompleted) {
          clearInterval(pollingInterval);
          
          // Create and dispatch task completion event
          const taskCompletionEvent = new CustomEvent('taskCompleted', {
            detail: {
              taskId,
              result,
              error: data.status === 'failed' ? data.error : null
            }
          });
          
          window.dispatchEvent(taskCompletionEvent);
        }
      } catch (error) {
        console.error('Error polling task status:', error);
        
        // After several consecutive errors, stop polling
        const task = activeTasks.find(t => t.id === taskId);
        if (task) {
          const updatedTask = { 
            ...task, 
            errorCount: (task.errorCount || 0) + 1 
          };
          
          setActiveTasks(prevTasks => 
            prevTasks.map(t => t.id === taskId ? updatedTask : t)
          );
          
          if (updatedTask.errorCount > 5) {
            clearInterval(pollingInterval);
            console.error('Stopped polling due to consecutive errors');
          }
        }
      }
    }, 2000); // Poll every 2 seconds
    
    // Store the interval ID for cleanup on component unmount
    return pollingInterval;
  };

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
            
            const response = await fetch(`/api/panion/task/${task.id}`, {
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
                  if ((task.type === 'smokeshop_search' || task.type === 'smokeshop_research') && taskData.data) {
                    try {
                      // Check if we're displaying owner information
                      const hasOwnerInfo = taskData.params?.includeOwnerInfo || false;
                      
                      // Add data to messages in a readable format with appropriate heading
                      let formattedData = hasOwnerInfo 
                        ? "📋 **SMOKE SHOP OWNER CONTACT INFORMATION**\n\n" 
                        : "📋 **SMOKE SHOP DIRECTORY RESULTS**\n\n";
                        
                      const shopData = Array.isArray(taskData.data) ? taskData.data : [taskData.data];
                      
                      shopData.forEach((shop: any, idx: number) => {
                        formattedData += `📍 **${shop.name || 'Smoke Shop'}**\n`;
                        if (shop.address) formattedData += `Address: ${shop.address}\n`;
                        if (shop.phone) formattedData += `Phone: ${shop.phone}\n`;
                        if (shop.website) formattedData += `Website: ${shop.website}\n`;
                        if (shop.hours) formattedData += `Hours: ${shop.hours}\n`;
                        
                        // Include owner information when available and requested
                        if (hasOwnerInfo) {
                          if (shop.owner_name) formattedData += `Owner: ${shop.owner_name}\n`;
                          if (shop.owner_email) formattedData += `Owner Email: ${shop.owner_email}\n`;
                          if (shop.owner_phone && shop.owner_phone !== shop.phone) {
                            formattedData += `Owner Phone: ${shop.owner_phone}\n`;
                          }
                          if (shop.contact_person && shop.contact_person !== shop.owner_name) {
                            formattedData += `Contact Person: ${shop.contact_person}\n`;
                          }
                          if (shop.business_type) formattedData += `Business Type: ${shop.business_type}\n`;
                          if (shop.year_established) formattedData += `Established: ${shop.year_established}\n`;
                        }
                        
                        if (idx < shopData.length - 1) formattedData += '\n---\n\n';
                      });
                      
                      const dataMessage: ChatMessage = {
                        id: generateId(),
                        content: formattedData,
                        isUser: false,
                        timestamp: formatTime(new Date()),
                      };
                      setMessages(prev => [...prev, dataMessage]);
                      
                      // If we searched for owner info but didn't find much, add a follow-up message
                      if (hasOwnerInfo) {
                        const hasCompleteOwnerInfo = shopData.some((shop: any) => 
                          shop.owner_name || shop.owner_email || 
                          (shop.owner_phone && shop.owner_phone !== shop.phone)
                        );
                        
                        if (!hasCompleteOwnerInfo) {
                          const followUpMessage: ChatMessage = {
                            id: generateId(),
                            content: "I've found basic business information, but complete owner details may require additional research. Would you like me to suggest other methods to find this information?",
                            isUser: false,
                            timestamp: formatTime(new Date()),
                          };
                          setMessages(prev => [...prev, followUpMessage]);
                        }
                      }
                      
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

  // Handle task completion events
  useEffect(() => {
    const handleTaskCompletion = (event: CustomEvent) => {
      const { taskId, result, error } = event.detail;
      
      console.log('Task completed:', taskId, result, error);
      
      if (error) {
        const errorMessage: ChatMessage = {
          id: generateId(),
          content: `Task error: ${error}`,
          isUser: false,
          timestamp: formatTime(new Date()),
        };
        setMessages(prev => [...prev, errorMessage]);
        return;
      }
      
      // Format result based on task type
      const task = activeTasks.find(t => t.id === taskId);
      
      if (!task) return;
      
      let messageContent = '';
      
      if (task.type === 'smokeshop_research') {
        const shops = result.data || [];
        const location = task.location;
        
        if (shops.length === 0) {
          messageContent = `I couldn't find any smoke shops in ${location}. Would you like me to try with a different search term or location?`;
        } else {
          messageContent = `I found ${shops.length} smoke shops in ${location}.\n\n`;
          
          shops.slice(0, 5).forEach((shop: any, index: number) => {
            messageContent += `${index + 1}. **${shop.name || 'Unnamed Shop'}**\n`;
            if (shop.address) messageContent += `   Address: ${shop.address}\n`;
            if (shop.phone) messageContent += `   Phone: ${shop.phone}\n`;
            if (shop.website) messageContent += `   Website: ${shop.website}\n`;
            if (shop.owner) messageContent += `   Owner: ${shop.owner}\n`;
            if (shop.email) messageContent += `   Email: ${shop.email}\n`;
            messageContent += '\n';
          });
          
          if (shops.length > 5) {
            messageContent += `... and ${shops.length - 5} more results. Would you like me to show more?`;
          }
        }
      } else if (task.type === 'strategic_plan') {
        // Format strategic plan results
        const planResult = result || {};
        
        messageContent = `I've completed the strategic plan: "${task.description}"\n\n`;
        
        if (planResult.summary) {
          messageContent += `**Summary:** ${planResult.summary}\n\n`;
        }
        
        if (planResult.steps && Array.isArray(planResult.steps)) {
          messageContent += `**Executed Steps:**\n`;
          planResult.steps.forEach((step: any, index: number) => {
            const status = step.status === 'completed' ? '✓' : step.status === 'failed' ? '✗' : '⧖';
            messageContent += `${index + 1}. ${status} ${step.description}\n`;
            if (step.result) {
              messageContent += `   Result: ${typeof step.result === 'object' ? JSON.stringify(step.result) : step.result}\n`;
            }
          });
        }
        
        if (planResult.conclusions && Array.isArray(planResult.conclusions)) {
          messageContent += `\n**Conclusions:**\n`;
          planResult.conclusions.forEach((conclusion: string, index: number) => {
            messageContent += `${index + 1}. ${conclusion}\n`;
          });
        }
        
        if (planResult.next_steps && Array.isArray(planResult.next_steps)) {
          messageContent += `\n**Recommended Next Steps:**\n`;
          planResult.next_steps.forEach((step: string, index: number) => {
            messageContent += `${index + 1}. ${step}\n`;
          });
        }
      } else {
        // Default task result formatting
        messageContent = `Task "${task.description}" completed. Result: ${JSON.stringify(result)}`;
      }
      
      const completionMessage: ChatMessage = {
        id: generateId(),
        content: messageContent,
        isUser: false,
        timestamp: formatTime(new Date()),
        thinking: result.thinking || result.thought_process || '',
      };
      
      setMessages(prev => [...prev, completionMessage]);
      
      // Remove task from active tasks
      setActiveTasks(prevTasks => prevTasks.filter(t => t.id !== taskId));
    };
    
    // Listen for task completion events
    window.addEventListener('taskCompleted', handleTaskCompletion as EventListener);
    
    return () => {
      window.removeEventListener('taskCompleted', handleTaskCompletion as EventListener);
    };
  }, [activeTasks]);

  // Focus input on load
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  
  // Function to detect missing capabilities based on user input with advanced context inference
  const detectRequiredCapabilities = (message: string): string[] => {
    const requiredCapabilities: string[] = [];
    const lowerMessage = message.toLowerCase();
    
    // ADVANCED CONTEXT INFERENCE
    // First, identify key semantic patterns that indicate user intent
    
    // Detect business entities
    const businessEntities = [
      'business', 'shop', 'store', 'company', 'enterprise', 'firm',
      'restaurant', 'cafe', 'coffee shop', 'smoke shop', 'smokeshop', 
      'vape shop', 'dispensary', 'tobacco', 'vape', 'retail', 
      'establishment', 'outlet', 'boutique', 'market', 'vendor'
    ];
    
    const hasBusiness = businessEntities.some(entity => lowerMessage.includes(entity));
    
    // Detect ownership and contact intent
    const ownershipTerms = [
      'owner', 'own', 'owns', 'owned by', 'proprietor', 'ceo', 
      'founder', 'manager', 'management', 'executive', 'director', 
      'who runs', 'who started', 'who founded', 'who operates'
    ];
    
    const contactTerms = [
      'contact', 'email', 'phone', 'number', 'reach', 'call',
      'connect', 'get in touch', 'speak with', 'talk to', 
      'details', 'information about', 'direct line', 'name',
      'how can i reach', 'how to contact'
    ];
    
    const hasOwnershipIntent = ownershipTerms.some(term => lowerMessage.includes(term));
    const hasContactIntent = contactTerms.some(term => lowerMessage.includes(term));
    
    // Detect implicit contact request based on verbs that suggest contact action
    const implicitContactVerbs = [
      'find', 'get', 'obtain', 'gather', 'collect', 'acquire',
      'need', 'want', 'looking for', 'searching for', 'seeking'
    ];
    
    const hasImplicitContactIntent = 
      businessEntities.some(entity => lowerMessage.includes(entity)) &&
      implicitContactVerbs.some(verb => lowerMessage.includes(verb));
      
    // CAPABILITY ASSIGNMENT LOGIC WITH SMART INFERENCE
    
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
    
    // Enhanced business directory detection
    if (hasBusiness) {
      // Always add business directory for business queries
      requiredCapabilities.push(CAPABILITIES.BUSINESS_DIRECTORY);
      
      // If there are explicit or implicit contact/ownership requirements, add CONTACT_FINDER and BUSINESS_RESEARCH
      if (hasOwnershipIntent || hasContactIntent || hasImplicitContactIntent) {
        requiredCapabilities.push(CAPABILITIES.CONTACT_FINDER);
        requiredCapabilities.push(CAPABILITIES.BUSINESS_RESEARCH);
        
        // Log the contextual inference for debugging
        console.log('Detected owner/contact request from context:', {
          hasOwnershipIntent,
          hasContactIntent,
          hasImplicitContactIntent,
          message: lowerMessage
        });
      }
    }
    
    // Explicit contact finding requirements (if not already added)
    if (!requiredCapabilities.includes(CAPABILITIES.CONTACT_FINDER) && 
        (hasContactIntent || hasOwnershipIntent)) {
      requiredCapabilities.push(CAPABILITIES.CONTACT_FINDER);
    }
    
    // Additional business research detection
    if (!requiredCapabilities.includes(CAPABILITIES.BUSINESS_RESEARCH) && 
        (lowerMessage.includes('business') || 
         lowerMessage.includes('company') || 
         lowerMessage.includes('industry') ||
         lowerMessage.includes('market'))) {
      requiredCapabilities.push(CAPABILITIES.BUSINESS_RESEARCH);
    }
    
    // Log capabilities for debugging
    console.log('Detected capabilities:', requiredCapabilities);
    
    return requiredCapabilities;
  };
  
  // Function to handle action acceptance
  const handleActionAcceptance = async () => {
    if (!pendingAction) return;
    
    try {
      switch (pendingAction.type) {
        case 'use_agent':
          // Open the agent specified in pendingAction.data
          const agent = pendingAction.data.agent;
          openAgent(agent.id);
          
          const confirmMessage: ChatMessage = {
            id: generateId(),
            content: `Using ${agent.title} to help with your request.`,
            isUser: false,
            timestamp: formatTime(new Date()),
          };
          setMessages(prev => [...prev, confirmMessage]);
          break;
          
        case 'create_agent':
          // Create a new agent with the specified capabilities
          const capabilities = pendingAction.data.capabilities;
          const agentInfo = pendingAction.data.agentInfo;
          
          await createDynamicAgent({
            name: agentInfo.name,
            description: agentInfo.description,
            capabilities: capabilities,
            icon: agentInfo.icon
          });
          
          const newAgentMessage: ChatMessage = {
            id: generateId(),
            content: `Created a new ${agentInfo.name} to help with your request.`,
            isUser: false,
            timestamp: formatTime(new Date()),
          };
          setMessages(prev => [...prev, newAgentMessage]);
          break;
          
        case 'start_task':
          // Start a background task
          const taskData = pendingAction.data;
          
          // Make the API call to start the task
          const response = await fetch(taskData.endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(taskData.params)
          });
          
          if (response.ok) {
            const responseData = await response.json();
            const taskId = responseData.taskId || responseData.id || `task-${Date.now()}`;
            
            // Add the task to our tracking
            if (taskId) {
              const location = taskData.params.location || '';
              
              const newTask = {
                id: taskId,
                type: taskData.taskType,
                status: 'in_progress',
                progress: 0,
                description: taskData.description,
                location: location,
                created: formatTime(new Date())
              };
              
              const taskObj = {
                id: taskId,
                type: taskData.taskType,
                status: 'in_progress',
                progress: 0,
                description: taskData.description,
                location: location,
                created: formatTime(new Date()),
                isPolling: false,
                errorCount: 0
              };
              
              setActiveTasks(prevTasks => [...prevTasks, taskObj]);
              setTaskPollingEnabled(true);
              
              // Start individual task polling for strategic plans
              if (taskData.taskType === 'strategic_plan') {
                startTaskPolling(taskId);
              }
              
              // Prepare confirmation message based on task type
              let confirmationContent = '';
              
              if (taskData.taskType === 'strategic_plan') {
                confirmationContent = `I'm executing the strategic plan now. This will involve multiple steps that I'll work through systematically. I'll update you as I make progress.`;
                
                // For strategic plans, we'll also add information about the steps if available
                if (responseData.steps && Array.isArray(responseData.steps)) {
                  confirmationContent += `\n\nThe plan has ${responseData.steps.length} steps:`;
                  responseData.steps.slice(0, 3).forEach((step: any, index: number) => {
                    confirmationContent += `\n${index + 1}. ${step.description}`;
                  });
                  
                  if (responseData.steps.length > 3) {
                    confirmationContent += `\n... and ${responseData.steps.length - 3} more steps`;
                  }
                }
                
                // Set processing stage to reflect strategic plan execution
                setProcessingStage("Executing strategic plan...");
                setProcessingProgress(0);
                
                // Simulate progress updates for complex plans
                let currentStep = 0;
                const totalSteps = responseData.steps ? responseData.steps.length : 5;
                
                const progressInterval = setInterval(() => {
                  if (currentStep < totalSteps) {
                    currentStep++;
                    const progress = Math.floor((currentStep / totalSteps) * 100);
                    setProcessingProgress(progress);
                    
                    if (responseData.steps && responseData.steps[currentStep - 1]) {
                      setProcessingStage(`Step ${currentStep}/${totalSteps}: ${responseData.steps[currentStep - 1].description}`);
                    } else {
                      setProcessingStage(`Executing plan step ${currentStep}/${totalSteps}...`);
                    }
                    
                    // When we reach the last step, clear the interval
                    if (currentStep === totalSteps) {
                      clearInterval(progressInterval);
                      setTimeout(() => {
                        setAgentStatus('idle');
                        setProcessingStage(null);
                      }, 2000);
                    }
                  }
                }, 2000); // Update every 2 seconds
              } else {
                confirmationContent = `Started task: ${taskData.description}. I'll notify you when results are available.`;
              }
              
              // Confirmation message
              const taskStartMessage: ChatMessage = {
                id: generateId(),
                content: confirmationContent,
                isUser: false,
                timestamp: formatTime(new Date()),
              };
              setMessages(prev => [...prev, taskStartMessage]);
            }
          } else {
            throw new Error('Failed to start task');
          }
          break;
          
        default:
          console.error('Unknown pending action type:', pendingAction.type);
      }
    } catch (error) {
      console.error('Error handling action acceptance:', error);
      const errorMessage: ChatMessage = {
        id: generateId(),
        content: `I encountered an error while trying to process your request. Please try again or provide more details.`,
        isUser: false,
        timestamp: formatTime(new Date()),
      };
      setMessages(prev => [...prev, errorMessage]);
    }
    
    // Clear the pending action
    setPendingAction(null);
  };
  
  // Function to handle action rejection
  const handleActionRejection = () => {
    if (!pendingAction) return;
    
    const rejectionMessage: ChatMessage = {
      id: generateId(),
      content: `Understood. I won't proceed with the ${pendingAction.type.replace('_', ' ')}. Is there something else I can help with?`,
      isUser: false,
      timestamp: formatTime(new Date()),
    };
    setMessages(prev => [...prev, rejectionMessage]);
    
    // Clear the pending action
    setPendingAction(null);
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
      
      // If agent covers at least 70% of the required capabilities, propose it to the user
      if (coveredCapabilities.length / requiredCapabilities.length >= 0.7) {
        // Ask user if they want to use this agent
        const agentMessage: ChatMessage = {
          id: generateId(),
          content: `I recommend using ${bestMatchingAgent.title} to help with this request, as it has the capabilities you need: ${coveredCapabilities.join(', ')}. Would you like me to proceed?`,
          isUser: false,
          timestamp: formatTime(new Date()),
        };
        
        setMessages(prev => [...prev, agentMessage]);
        
        // Create a pending action for the user to approve
        setPendingAction({
          type: 'use_agent',
          data: {
            agent: bestMatchingAgent,
            coveredCapabilities,
            stillMissingCapabilities
          }
        });
        
        // If there are still some missing capabilities, mention them
        if (stillMissingCapabilities.length > 0) {
          const capabilitiesNote: ChatMessage = {
            id: generateId(),
            content: `Note: For additional capabilities like ${stillMissingCapabilities.join(', ')}, I might need to create specialized plugins later if needed.`,
            isUser: false,
            timestamp: formatTime(new Date()),
          };
          
          setMessages(prev => [...prev, capabilitiesNote]);
        }
        
        return false; // No new agents created yet, waiting for user approval
      }
    }
    
    // If we didn't find a suitable existing agent, we need to create a new one
    // Notify the user about creating specialized agents
    const botMessage: ChatMessage = {
      id: generateId(),
      content: `I need specialized capabilities to help with your request: ${missingCapabilities.join(', ')}. Would you like me to assist with this?`,
      isUser: false,
      timestamp: formatTime(new Date()),
    };
    
    setMessages(prev => [...prev, botMessage]);
    
    try {
      // Determine which kind of specialized agent to create or use based on capabilities
      if (missingCapabilities.includes(CAPABILITIES.BUSINESS_DIRECTORY) || 
          missingCapabilities.includes(CAPABILITIES.BUSINESS_RESEARCH)) {
        // Use existing Daddy Data agent instead of creating new ones
        const suggestMessage: ChatMessage = {
          id: generateId(),
          content: 'I can use the Daddy Data agent to help find the business information you need. Would you like me to open it in your workspace?',
          isUser: false,
          timestamp: formatTime(new Date()),
        };
        
        setMessages(prev => [...prev, suggestMessage]);
        
        // Create a pending action for user approval
        setPendingAction({
          type: 'use_agent',
          data: {
            agent: registry.find(a => a.id === 'daddy-data'),
            coveredCapabilities: [CAPABILITIES.BUSINESS_DIRECTORY, CAPABILITIES.BUSINESS_RESEARCH],
            stillMissingCapabilities: []
          }
        });
        
        return false; // No new agents created, waiting for user approval
      } else if (missingCapabilities.includes(CAPABILITIES.DATA_ANALYSIS)) {
        // Ask to create a data analysis agent
        const suggestMessage: ChatMessage = {
          id: generateId(),
          content: 'I recommend creating a Data Analysis Agent to help with this task. Would you like me to create this specialized agent?',
          isUser: false,
          timestamp: formatTime(new Date()),
        };
        
        setMessages(prev => [...prev, suggestMessage]);
        
        // Create a pending action for user approval
        setPendingAction({
          type: 'create_agent',
          data: {
            capabilities: [CAPABILITIES.DATA_ANALYSIS],
            agentInfo: {
              name: 'Data Analysis Agent',
              description: 'Specialized agent for analyzing data sets and extracting insights.',
              icon: 'BarChart'
            }
          }
        });
        
        return false; // No new agents created, waiting for user approval
      } else if (missingCapabilities.includes(CAPABILITIES.WEB_RESEARCH)) {
        // Ask to create a web research agent
        const suggestMessage: ChatMessage = {
          id: generateId(),
          content: 'I recommend creating a Web Research Agent to help find the information you need. Would you like me to create this specialized agent?',
          isUser: false,
          timestamp: formatTime(new Date()),
        };
        
        setMessages(prev => [...prev, suggestMessage]);
        
        // Create a pending action for user approval
        setPendingAction({
          type: 'create_agent',
          data: {
            capabilities: [CAPABILITIES.WEB_RESEARCH],
            agentInfo: {
              name: 'Web Research Agent',
              description: 'Specialized agent for finding and organizing information from the web.',
              icon: 'Globe'
            }
          }
        });
        
        return false; // No new agents created, waiting for user approval
      } else if (missingCapabilities.length > 0) {
        // Ask to create a general purpose plugin/agent
        const suggestMessage: ChatMessage = {
          id: generateId(),
          content: `I recommend creating a specialized agent to handle ${missingCapabilities.join(', ')}. Would you like me to create this agent?`,
          isUser: false,
          timestamp: formatTime(new Date()),
        };
        
        setMessages(prev => [...prev, suggestMessage]);
        
        // Create a pending action for user approval
        setPendingAction({
          type: 'create_agent',
          data: {
            capabilities: missingCapabilities,
            agentInfo: {
              name: `Specialized ${missingCapabilities[0]} Plugin`,
              description: `Plugin to handle ${missingCapabilities.join(', ')} capabilities.`,
              icon: 'Puzzle'
            }
          }
        });
        
        return false; // No new agents created, waiting for user approval
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
    
    // Check if we have a pending action and this is a response to it
    if (pendingAction) {
      const message = userMessage.content.toLowerCase();
      
      // Check for affirmative/confirmatory responses
      if (
        message.includes('yes') || 
        message.includes('sure') || 
        message.includes('okay') || 
        message.includes('ok') || 
        message.includes('go ahead') || 
        message.includes('proceed') || 
        message.includes('confirm') || 
        message.includes('do it') ||
        message.includes('approved') ||
        message.includes('fine') ||
        message.includes('sounds good')
      ) {
        // User has confirmed the action
        await handleActionAcceptance();
        return;
      }
      
      // Check for negative/rejecting responses
      if (
        message.includes('no') || 
        message.includes('don\'t') || 
        message.includes('do not') || 
        message.includes('stop') || 
        message.includes('cancel') || 
        message.includes('wait') ||
        message.includes('hold on') ||
        message.includes('nope') ||
        message.includes('decline')
      ) {
        // User has rejected the action
        handleActionRejection();
        return;
      }
      
      // If the message doesn't clearly accept or reject, but we have a pending action,
      // ask the user for a clearer response
      const clarificationMessage: ChatMessage = {
        id: generateId(),
        content: "I'm not sure if you want me to proceed with the suggested action. Could you please respond with 'yes' to approve or 'no' to cancel?",
        isUser: false,
        timestamp: formatTime(new Date()),
      };
      
      setMessages(prev => [...prev, clarificationMessage]);
      return;
    }
    
    setAgentStatus('thinking');
    setIsLoading(true);
    setProcessingProgress(0);
    
    // Reset processing stages
    setProcessingStage("Analyzing your request...");
    
    // Automatically detect if strategic mode should be enabled based on the complexity of the request
    const shouldEnableStrategicMode = shouldUseStrategicMode(userMessage.content);
    
    // Check if we should use the advanced strategic planner
    const shouldUseAdvancedPlannerMode = shouldUseAdvancedPlanner(userMessage.content);
    
    // If strategic mode should be enabled and it's not already enabled, turn it on
    if (shouldEnableStrategicMode && !strategicMode) {
      toggleStrategicMode();
      
      // Let the user know that strategic mode was automatically enabled
      const strategicModeMessage: ChatMessage = {
        id: generateId(),
        content: shouldUseAdvancedPlannerMode
          ? "I've enabled advanced strategic planning for this complex request. I'll create a multi-step plan and execute it systematically."
          : "I've enabled strategic mode for this complex request. I'll use multiple approaches and provide a more thorough response.",
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
      
      // Send message to Panion API - use appropriate mode based on complexity
      if (strategicMode && shouldUseAdvancedPlannerMode) {
        setProcessingStage("Creating advanced strategic plan...");
      } else if (strategicMode) {
        setProcessingStage("Strategically evaluating approaches...");
      } else {
        setProcessingStage("Processing with Panion API...");
      }
      setProcessingProgress(60);
      
      // Determine which endpoint to use based on mode
      let endpoint;
      if (strategicMode && shouldUseAdvancedPlannerMode) {
        endpoint = '/api/strategic/plans';
      } else if (strategicMode) {
        endpoint = '/api/panion/strategic';
      } else {
        endpoint = '/api/panion/chat';
      }
      
      // Prepare request body based on endpoint type
      let requestBody;
      if (strategicMode && shouldUseAdvancedPlannerMode) {
        // Use the advanced strategic planner for complex requests
        requestBody = {
          goal: inputValue,
          context: {
            sessionId,
            hasRequiredCapabilities: requiredCapabilities.length === 0 || !createdNewAgents,
            capabilities: requiredCapabilities,
            strategicMode: true,
            advancedPlanning: true
          }
        };
      } else if (strategicMode) {
        // Use regular strategic mode
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
        // Use standard mode
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
      
      // Check if this is a business directory search request (including smoke shops)
      let response;
      if (requiredCapabilities.includes(CAPABILITIES.BUSINESS_DIRECTORY) && 
          (inputValue.toLowerCase().includes('smoke shop') || 
           inputValue.toLowerCase().includes('smokeshop') ||
           inputValue.toLowerCase().includes('vape') ||
           inputValue.toLowerCase().includes('tobacco') ||
           inputValue.toLowerCase().includes('dispensary'))) {
        
        // Extract location from message with improved pattern matching
        let location = '';  // No default location - we'll determine it more intelligently
        
        // Try multiple patterns to capture location with higher accuracy
        // Pattern 1: Standard preposition-based location detection
        const standardLocationRegex = /\b(?:in|near|around|at)\s+([A-Za-z\s,]+?)(?:\.|,|\s+and|\s+or|\s+with|\s+that|\s+for|\s+$)/i;
        // Pattern 2: Direct city/state mention
        const directLocationRegex = /\b(Chicago|Seattle|New York|Los Angeles|Boston|Philadelphia|Miami|Houston|Detroit|Denver|Portland|Austin|Atlanta|San Francisco|Dallas|Washington DC|Nashville|Phoenix|San Diego|Las Vegas)(?:\s+area)?(?:\.|,|\s|$)/i;
        // Pattern 3: More general format for any location mention
        const generalLocationRegex = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)(?:,\s*[A-Z]{2})?(?:\.|,|\s|$)/;
        
        // Try the most specific pattern first, then fall back to more general ones
        const locationMatch1 = inputValue.match(standardLocationRegex);
        const locationMatch2 = inputValue.match(directLocationRegex);
        const locationMatch3 = inputValue.match(generalLocationRegex);
        
        if (locationMatch1 && locationMatch1[1]) {
          location = locationMatch1[1].trim();
          console.log('Location detected with standard pattern:', location);
        } else if (locationMatch2 && locationMatch2[1]) {
          location = locationMatch2[1].trim();
          console.log('Location detected with direct city pattern:', location);
        } else if (locationMatch3 && locationMatch3[1]) {
          location = locationMatch3[1].trim();
          console.log('Location detected with general pattern:', location);
        }
        
        // If still no location detected, ask the user directly
        if (!location) {
          const locationRequestMessage: ChatMessage = {
            id: generateId(),
            content: `I'd be happy to find smoke shop information for you, but I need to know which location you're interested in. Could you please specify a city or area?`,
            isUser: false,
            timestamp: formatTime(new Date()),
          };
          
          setMessages(prev => [...prev, locationRequestMessage]);
          setAgentStatus('idle');
          setIsLoading(false);
          clearInterval(progressInterval);
          setProcessingProgress(100);
          return;
        }
        
        // Determine if we need owner information (contact details) based on capabilities
        const needsOwnerInfo = requiredCapabilities.includes(CAPABILITIES.CONTACT_FINDER);
        
        const taskDescription = needsOwnerInfo 
          ? `Finding smoke shop owner contact information in ${location}` 
          : `Finding smoke shops in ${location}`;
        
        // Instead of immediately executing the task, ask for user confirmation with appropriate message
        const confirmationMessage: ChatMessage = {
          id: generateId(),
          content: needsOwnerInfo
            ? `I can search for smoke shop owner contact information in ${location} for you. This will run as a background task and may take a few minutes to gather owner details. Would you like me to start this search now?`
            : `I can search for smoke shops in ${location} for you. This will run as a background task and may take a few minutes. Would you like me to start this search now?`,
          isUser: false,
          timestamp: formatTime(new Date()),
        };
        
        setMessages(prev => [...prev, confirmationMessage]);
        
        // Create a pending action for user approval with appropriate parameters
        setPendingAction({
          type: 'start_task',
          data: {
            endpoint: '/api/panion/smokeshop/search',
            taskType: 'smokeshop_research',
            description: taskDescription,
            params: {
              location: location,
              limit: 20,
              includeOwnerInfo: needsOwnerInfo,   // Add parameter to include owner info
              deepSearch: needsOwnerInfo,         // Deep search when owner info is requested
              additionalKeywords: inputValue.toLowerCase().includes('vape') ? ['vape'] : []
            }
          }
        });
        
        // We'll wait for user confirmation before proceeding with the task
        setAgentStatus('idle');
        setIsLoading(false);
        clearInterval(progressInterval);
        setProcessingProgress(100);
        return;
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
      let responseContent = '';
      
      // Handle different response formats based on the endpoint used
      if (strategicMode && shouldUseAdvancedPlannerMode && data.id && data.steps) {
        // This is a strategic plan from the /api/strategic/plans endpoint
        thinkingContent = thinkingContent || 'Strategic Plan Analysis:\n\n';
        thinkingContent += `Plan ID: ${data.id}\n`;
        thinkingContent += `Goal: ${data.goal}\n`;
        thinkingContent += `Status: ${data.status}\n`;
        thinkingContent += `Overall Progress: ${data.progress * 100}%\n\n`;
        
        if (data.thought_process && Array.isArray(data.thought_process)) {
          thinkingContent += '**Thought Process:**\n';
          data.thought_process.forEach((thought: string) => {
            thinkingContent += `- ${thought}\n`;
          });
          thinkingContent += '\n';
        }
        
        thinkingContent += '**Strategic Plan Steps:**\n';
        data.steps.forEach((step: any, index: number) => {
          thinkingContent += `\n${index + 1}. ${step.description}\n`;
          thinkingContent += `   Status: ${step.status}\n`;
          if (step.metrics) {
            if (step.metrics.confidence) {
              thinkingContent += `   Confidence: ${step.metrics.confidence.toFixed(2)}\n`;
            }
            if (step.metrics.estimated_time) {
              thinkingContent += `   Estimated time: ${step.metrics.estimated_time}s\n`;
            }
          }
        });
        
        // Format the response message for the strategic plan
        responseContent = `I've created a strategic plan for: "${data.goal}"\n\n`;
        responseContent += `This plan has ${data.steps.length} steps to accomplish your goal efficiently.\n\n`;
        
        // Add a summary of the first few steps
        const initialSteps = data.steps.slice(0, 3);
        responseContent += `Initial steps:\n`;
        initialSteps.forEach((step: any, index: number) => {
          responseContent += `${index + 1}. ${step.description}\n`;
        });
        
        if (data.steps.length > 3) {
          responseContent += `... and ${data.steps.length - 3} more steps\n\n`;
        }
        
        responseContent += `Would you like me to execute this plan now?`;
        
        // Create a pending action for the plan execution
        setPendingAction({
          type: 'start_task',
          data: {
            endpoint: `/api/strategic/plans/${data.id}/execute`,
            taskType: 'strategic_plan',
            description: `Execute strategic plan: ${data.goal}`,
            params: {
              planId: data.id
            }
          }
        });
      } else {
        // Regular response from chat or strategic endpoints
        responseContent = data.response;
        
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
      }
      
      // Create bot message
      const botMessage: ChatMessage = {
        id: generateId(),
        content: responseContent,
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
      { pattern: 'step by step', weight: 0.8 },
      
      // Business and competitive analysis
      { pattern: 'market', weight: 0.6 },
      { pattern: 'competitor', weight: 0.7 },
      { pattern: 'industry', weight: 0.6 },
      { pattern: 'business', weight: 0.5 },
      
      // New advanced planner keywords
      { pattern: 'smart', weight: 0.7 },
      { pattern: 'intelligent', weight: 0.8 },
      { pattern: 'advanced', weight: 0.7 },
      { pattern: 'multi-step', weight: 0.8 },
      { pattern: 'planning', weight: 0.8 },
      { pattern: 'structured', weight: 0.7 },
      { pattern: 'organized', weight: 0.6 },
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
    
    // Normalize based on number of matched indicators
    const normalizedScore = matchedIndicators > 0 
      ? complexityScore / Math.sqrt(matchedIndicators) 
      : complexityScore;
    
    // Direct triggers for strategic planning
    const strategicPlanningTriggers = [
      'use strategic', 
      'strategic mode',
      'think strategically',
      'need multiple approaches',
      'compare different',
      'analyze in depth'
    ];
    
    // Check for direct triggers
    const hasDirectTrigger = strategicPlanningTriggers.some(trigger => 
      lowerMessage.includes(trigger)
    );
    
    // Decision threshold - tune this value as needed
    const strategicModeThreshold = 0.9;
    
    return hasDirectTrigger || normalizedScore >= strategicModeThreshold;
  };
  
  // Function to check if we should use the advanced strategic planner
  const shouldUseAdvancedPlanner = (message: string): boolean => {
    const lowerMessage = message.toLowerCase();
    
    // Direct triggers for advanced strategic planning
    const advancedPlannerTriggers = [
      'advanced planning',
      'advanced planner',
      'strategic planner',
      'multi-step planning',
      'complex planning',
      'use advanced planner',
      'smart planning',
      'intelligent planning',
      'structured planning',
      'create a comprehensive plan'
    ];
    
    // Check for direct triggers
    const hasDirectTrigger = advancedPlannerTriggers.some(trigger => 
      lowerMessage.includes(trigger)
    );
    
    // Also use advanced planner for certain complex tasks
    const complexTaskPatterns = [
      { type: 'business_research', patterns: ['research business', 'find business information', 'business details'] },
      { type: 'owner_contact', patterns: ['find owner', 'contact information', 'business owner', 'who owns'] },
      { type: 'data_analysis', patterns: ['analyze data', 'data analysis', 'statistical analysis', 'analyze statistics'] }
    ];
    
    const hasComplexTask = complexTaskPatterns.some(task => 
      task.patterns.some(pattern => lowerMessage.includes(pattern))
    );
    
    // If message is long and complex, consider using advanced planner
    const isLongComplex = message.length > 120 && shouldUseStrategicMode(message);
    
    return hasDirectTrigger || hasComplexTask || isLongComplex;
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
      
      {/* Action Confirmation */}
      {pendingAction && (
        <div className="mx-3 mb-3 p-3 border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 rounded-lg">
          <div className="flex items-center mb-2">
            <AlertCircle className="h-4 w-4 text-amber-500 mr-2" />
            <span className="font-medium text-sm">Confirm Action</span>
          </div>
          <div className="text-sm mb-3">
            {pendingAction.type === 'use_agent' && (
              <p>I'll use the {pendingAction.data.agent.title} to help with your request.</p>
            )}
            {pendingAction.type === 'create_agent' && (
              <p>I'll create a new {pendingAction.data.agentInfo.name} agent with specialized capabilities.</p>
            )}
            {pendingAction.type === 'start_task' && (
              <p>I'll start a background task: {pendingAction.data.description}</p>
            )}
          </div>
          <div className="flex justify-end space-x-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleActionRejection}
              className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
            >
              <X className="h-3 w-3 mr-1" /> Cancel
            </Button>
            <Button 
              size="sm" 
              variant="default" 
              onClick={handleActionAcceptance}
              className="bg-green-600 hover:bg-green-700 text-white border-none"
            >
              <Check className="h-3 w-3 mr-1" /> Confirm
            </Button>
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