// Common utilities for chat functionality
import { ChatMessage } from '../types/chat';

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