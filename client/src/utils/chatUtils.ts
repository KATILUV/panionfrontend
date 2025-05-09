// Common utilities for chat functionality
import { ChatMessage } from '../types/chat';

/**
 * Check if a message is a simple greeting or basic query
 * that doesn't require complex processing
 */
export const isSimpleMessage = (message: string): boolean => {
  const lowerMessage = message.trim().toLowerCase();
  
  // Single word greetings - these should absolutely be handled locally
  if (['hi', 'hello', 'hey', 'sup', 'yo', 'hola', 'howdy', 'greetings', 'hi!', 'hello!', 'hey!'].includes(lowerMessage)) {
    console.log('Single word greeting detected:', lowerMessage);
    return true;
  }
  
  // Short simple greetings and common phrases
  const simplePatterns = [
    /^(hi|hey|hello|sup)( there)?( panion| clara)?[!.?]?$/i,
    /^(good|great) (morning|afternoon|evening|day)[!.?]?$/i,
    /^how are you( today| doing)?[?]?$/i,
    /^what'?s up[?]?$/i,
    /^how'?s it going[?]?$/i,
    /^nice to (meet|see) you[!.?]?$/i,
    /^thanks?( you)?[!.?]?$/i,
    /^who are you[?]?$/i,
    /^what can you do[?]?$/i,
    /^(could|can) you help( me)?[?]?$/i,
    /^hello( there)?[!.?]?$/i,
    /^(morning|afternoon|evening)[!.?]?$/i,
    /^(hi|hey|hello).*panion.*$/i,
    /^(hi|hey|hello).*clara.*$/i
  ];
  
  const isPattern = simplePatterns.some(pattern => pattern.test(lowerMessage));
  if (isPattern) {
    console.log('Pattern-matched simple greeting:', lowerMessage);
  }
  
  return isPattern;
};

/**
 * Generate quick responses for simple messages without using the API
 */
export const getSimpleMessageResponse = (message: string): string => {
  const lowerMessage = message.trim().toLowerCase();
  const currentHour = new Date().getHours();
  
  // Handle different greeting types
  if (['hi', 'hello', 'hey', 'sup', 'yo', 'hola', 'howdy', 'greetings', 'hi!', 'hello!', 'hey!'].includes(lowerMessage) || 
      /^(hi|hey|hello).*$/i.test(lowerMessage)) {
    const responses = [
      "Hello! How can I help you today?",
      "Hi there! What can I assist you with?",
      "Hey! What would you like to work on?",
      "Greetings! How may I assist you today?",
      "Hi! I'm ready to help with whatever you need."
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
  
  // Time-specific greetings
  if (/^good (morning|afternoon|evening)[!.?]?$/i.test(lowerMessage)) {
    if (currentHour < 12) {
      return "Good morning! How can I help you today?";
    } else if (currentHour < 17) {
      return "Good afternoon! What can I do for you?";
    } else {
      return "Good evening! How may I assist you tonight?";
    }
  }
  
  // How are you variations
  if (/^how are you( today)?[?]?$/i.test(lowerMessage) || /^how'?s it going[?]?$/i.test(lowerMessage)) {
    return "I'm doing well, thank you for asking! How can I assist you today?";
  }
  
  // Thank you variations
  if (/^thanks?( you)?[!.?]?$/i.test(lowerMessage)) {
    return "You're welcome! Is there anything else I can help you with?";
  }
  
  // Identity and capability questions
  if (/^who are you[?]?$/i.test(lowerMessage)) {
    return "I'm Panion, your intelligent assistant. I can help with a wide range of tasks, from answering questions to helping you gather and analyze data. What would you like to know?";
  }
  
  if (/^what can you do[?]?$/i.test(lowerMessage) || /^(could|can) you help( me)?[?]?$/i.test(lowerMessage)) {
    return "I can help with many tasks including answering questions, gathering information from the web, analyzing data, and connecting you with specialized agents for specific tasks. What would you like help with today?";
  }
  
  // Fallback for other simple messages
  return "How can I assist you today?";
};

/**
 * Generates a random string ID for chat messages
 */
export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9);
};

/**
 * Formats a timestamp for display in chat messages
 */
export const formatTime = (date: Date): string => {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

/**
 * Creates a new chat message object
 */
export const createChatMessage = (
  content: string,
  isUser: boolean,
  thinking?: string,
  component?: React.ReactNode
): ChatMessage => {
  return {
    id: generateId(),
    content,
    isUser,
    timestamp: formatTime(new Date()),
    thinking,
    component,
  };
};

/**
 * Determines if a message is complex enough to use strategic mode
 */
export const shouldUseStrategicMode = (message: string): boolean => {
  const lowerMessage = message.toLowerCase();
  
  // Task complexity indicators
  const hasComplexityIndicators = [
    'compare', 'multi', 'complex', 'comprehensive', 'thorough', 'detailed', 'in-depth',
    'analyze', 'research', 'evaluate', 'assess', 'investigate',
    'different sources', 'multiple perspectives', 'alternative approach', 'various methods',
    'accurate', 'validate', 'verify', 'confirm', 'ensure',
    'strategy', 'strategic', 'optimize', 'plan', 'step by step',
    'market', 'competitor', 'industry', 'business',
    'smart', 'intelligent', 'advanced', 'multi-step', 'planning', 'structured', 'organized'
  ].some(indicator => lowerMessage.includes(indicator));
  
  // Calculate complexity based on message length and indicators
  const isLongMessage = message.length > 100;
  const isVeryLongMessage = message.length > 200;
  
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
  
  // Return true if we have complexity indicators and long message, or direct trigger
  return (hasComplexityIndicators && isLongMessage) || hasDirectTrigger || isVeryLongMessage;
};

/**
 * Determines if a message needs more information before processing
 */
export const checkIfNeedsMoreInfo = (message: string): string | null => {
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

/**
 * Determines if a question is complex enough to use the debate system
 */
export const isComplexQuestion = (text: string): boolean => {
  // Don't use debate for very short queries
  if (text.length < 15) return false;
  
  // Check for patterns that indicate complex questions
  const complexPatterns = [
    // Questions with multiple parts
    /\band\b|\bor\b|\bas well as\b|\balso\b/i,
    // Comparing/contrasting
    /\bcompare\b|\bversus\b|\bvs\b|\bdifference\b|\bsimilar\b/i,
    // Seeking explanation or reasoning
    /\bwhy\b|\bhow\b|\bexplain\b|\bunderstand\b|\breason\b/i,
    // Analysis requests
    /\banalyze\b|\banalysis\b|\bassess\b|\bevaluate\b/i,
    // Open-ended questions requiring judgment
    /\bbest\b|\bworst\b|\bmost\b|\bleast\b|\bshould\b|\bwould\b|\bcould\b/i,
    // Questions about implications
    /\bimplication\b|\bconsequence\b|\bimpact\b|\beffect\b|\baffect\b/i,
    // Questions seeking recommendations
    /\brecommend\b|\bsuggestion\b|\badvice\b/i,
    // Questions about future predictions
    /\bprediction\b|\bforecast\b|\bfuture\b|\bexpect\b/i
  ];
  
  // Consider it complex if it matches any complex pattern
  return complexPatterns.some(pattern => pattern.test(text));
};

/**
 * Starts an animated progress tracker
 * @returns A function to stop the animation
 */
export const startProgressAnimation = (
  setProgress: (progress: number) => void
): () => void => {
  let progress = 0;
  setProgress(0);
  
  const interval = setInterval(() => {
    progress += Math.random() * 5;
    if (progress > 90) progress = 90; // Cap at 90% until complete
    setProgress(progress);
  }, 300);
  
  return () => clearInterval(interval);
};