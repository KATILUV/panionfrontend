import OpenAI from 'openai';
import { log } from '../vite';

// Initialize OpenAI client
// the newest OpenAI model is "gpt-4o" which was released May 13, 2024
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || "" 
});

/**
 * Available capability categories
 */
const CAPABILITY_CATEGORIES = [
  'web_scraping',        // Data extraction from websites
  'data_analysis',       // Statistical analysis and data processing
  'knowledge_retrieval', // Looking up facts and information
  'planning',            // Breaking down goals into steps
  'strategic_thinking',  // Higher-level problem solving
  'creative_writing',    // Content generation and creative tasks
  'coding',              // Programming and technical development
  'visual_processing',   // Image analysis or generation
  'document_processing', // Working with PDFs, spreadsheets, etc.
  'research',            // Deep information gathering and synthesis
  'memory_recall',       // Using historical conversation context
  'coordination',        // Delegating tasks to specialized agents
  'self_reflection',     // Evaluating and improving responses
  'clarification',       // Asking for more details when needed
  'summarization',       // Condensing information
  'personalization',     // Adapting to user preferences
  'classification',      // Categorizing information
  'content_transformation', // Converting between formats
  'search',              // Finding specific information
  'verification',        // Fact checking and validation
  'smokeshop_data',      // Special capability for smoke shop research
];

/**
 * Extract capabilities needed based on the message content
 */
export async function extractCapabilities(message: string): Promise<string[]> {
  // For basic conversational messages, don't trigger any special capabilities
  if (isBasicConversation(message)) {
    log(`Basic conversational message detected, no special capabilities needed`, 'capability-detection');
    return [];
  }
  
  // For messages about the system's own capabilities, use self-reflection only
  if (isCapabilityQuestion(message)) {
    log(`System capability question detected, using self_reflection only`, 'capability-detection');
    return ['self_reflection'];
  }
  
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You analyze user messages to determine what AI capabilities would be required to fully address the request.
          The possible capabilities are:
          ${CAPABILITY_CATEGORIES.map(c => `- ${c}`).join('\n')}
          
          Important rules:
          1. ONLY select capabilities that are DIRECTLY needed to address the user's specific request.
          2. DO NOT select 'search' or 'web_scraping' unless the user explicitly asks to search the web or find current information.
          3. DO NOT select 'research' unless the request clearly requires gathering extensive information from multiple sources.
          4. For simple conversational questions, explanations, or opinions, return an EMPTY array [].
          5. For questions about your own capabilities, select ONLY 'self_reflection'.
          
          Respond with a JSON object like {"capabilities": []} containing ONLY the minimum necessary capabilities.`
        },
        {
          role: "user",
          content: `User message: "${message}"
          
          What capabilities would be needed to address this request? Respond with a JSON array of capability strings.`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3
    });
    
    try {
      const result = JSON.parse(response.choices[0].message.content || '{"capabilities": []}');
      
      // Extract capabilities and validate
      const capabilities = Array.isArray(result.capabilities) 
        ? result.capabilities
        : [];
      
      // Filter to only include valid capabilities
      const validCapabilities = capabilities.filter(c => 
        typeof c === 'string' && CAPABILITY_CATEGORIES.includes(c)
      );
      
      log(`Detected capabilities: ${validCapabilities.join(', ')}`, 'capability-detection');
      return validCapabilities;
    } catch (parseError) {
      log(`Error parsing capability detection response: ${parseError}`, 'capability-detection');
      return [];
    }
  } catch (error) {
    log(`Error detecting capabilities: ${error}`, 'capability-detection');
    return [];
  }
}

/**
 * Check if the message is a basic conversational message
 */
function isBasicConversation(message: string): boolean {
  const normalizedMessage = message.toLowerCase().trim();
  
  // Simple greetings
  if (/^(hi|hello|hey|greetings|howdy|hi there|hey there)(\s.*)?$/.test(normalizedMessage)) {
    return true;
  }
  
  // Simple questions that don't require special capabilities
  if (/^(how are you|what('s| is) up|how('s| is) it going)(\?)?$/.test(normalizedMessage)) {
    return true;
  }
  
  // Simple thank you messages
  if (/^(thanks|thank you|thx|ty)(\s.*)?$/.test(normalizedMessage)) {
    return true;
  }
  
  // Very short messages (likely conversational)
  if (normalizedMessage.split(/\s+/).length < 4 && normalizedMessage.length < 20) {
    return true;
  }
  
  return false;
}

/**
 * Check if the message is asking about the system's capabilities
 */
function isCapabilityQuestion(message: string): boolean {
  const normalizedMessage = message.toLowerCase().trim();
  
  // Questions about capabilities or what the system can do
  return /what (can|are) you (do|capable of|abilities|features|capabilities)/i.test(normalizedMessage) ||
         /tell me (about )?your (capabilities|functions|features|abilities)/i.test(normalizedMessage) ||
         /what (features|capabilities|functions) (do you have|are available)/i.test(normalizedMessage) ||
         normalizedMessage === "what are your capabilities?" ||
         normalizedMessage === "what can you do?";
}

/**
 * Determine if a set of capabilities requires enhanced processing
 */
export function requiresEnhancedProcessing(capabilities: string[]): boolean {
  // These capabilities indicate complex requests that benefit from enhanced processing
  const enhancedCapabilities = [
    'planning',
    'strategic_thinking',
    'research',
    'self_reflection',
    'coordination',
    'memory_recall'
  ];
  
  // Check if any enhanced capabilities are required
  return capabilities.some(capability => 
    enhancedCapabilities.includes(capability)
  );
}

/**
 * Identify missing capabilities that would be needed for a request
 */
export function identifyMissingCapabilities(
  requiredCapabilities: string[],
  availableCapabilities: string[]
): string[] {
  return requiredCapabilities.filter(capability => 
    !availableCapabilities.includes(capability)
  );
}

/**
 * Get the confidence level for handling a request with given capabilities
 */
export function getConfidenceLevel(
  requiredCapabilities: string[],
  availableCapabilities: string[]
): number {
  if (requiredCapabilities.length === 0) {
    return 1.0; // Full confidence for requests with no special capabilities
  }
  
  // Count how many required capabilities are available
  const matchedCapabilities = requiredCapabilities.filter(capability => 
    availableCapabilities.includes(capability)
  );
  
  // Calculate confidence as the ratio of matched to required capabilities
  return matchedCapabilities.length / requiredCapabilities.length;
}