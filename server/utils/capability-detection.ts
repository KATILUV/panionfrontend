import OpenAI from 'openai';
import { log } from '../vite';

// Initialize OpenAI client
// the newest OpenAI model is "gpt-4o" which was released May 13, 2024
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || "" 
});

// LRU Cache for capability detection results
// This will significantly reduce API calls for similar queries
type CacheEntry = {
  capabilities: string[];
  timestamp: number;
};

const CACHE_SIZE = 100; // Maximum entries in cache
const CACHE_TTL = 1000 * 60 * 60; // 1 hour cache lifetime
const capabilityCache: Record<string, CacheEntry> = {};

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

import * as knowledgeGraph from '../knowledge-graph';

/**
 * Get a cache key for capability detection
 */
function getCacheKey(message: string): string {
  // Create a normalized form of the message to improve cache hits
  return message.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Check if a message is in the capability cache
 */
function checkCapabilityCache(message: string): string[] | null {
  const cacheKey = getCacheKey(message);
  const entry = capabilityCache[cacheKey];
  
  // Return null if not in cache or entry is expired
  if (!entry || (Date.now() - entry.timestamp > CACHE_TTL)) {
    if (entry) {
      delete capabilityCache[cacheKey]; // Clean up expired entry
    }
    return null;
  }
  
  log(`Using cached capabilities for message: "${message.substring(0, 30)}..."`, 'capability-detection');
  return entry.capabilities;
}

/**
 * Save capabilities to cache
 */
function saveToCapabilityCache(message: string, capabilities: string[]): void {
  const cacheKey = getCacheKey(message);
  
  // Check if cache is full and remove oldest entry if needed
  const cacheSize = Object.keys(capabilityCache).length;
  if (cacheSize >= CACHE_SIZE) {
    // Get the oldest entry to remove
    let oldestKey = '';
    let oldestTime = Infinity;
    
    for (const key in capabilityCache) {
      if (capabilityCache[key].timestamp < oldestTime) {
        oldestTime = capabilityCache[key].timestamp;
        oldestKey = key;
      }
    }
    
    // Remove the oldest entry
    if (oldestKey) {
      delete capabilityCache[oldestKey];
    }
  }
  
  // Add new entry
  capabilityCache[cacheKey] = {
    capabilities,
    timestamp: Date.now()
  };
  
  log(`Saved capabilities to cache for message: "${message.substring(0, 30)}..."`, 'capability-detection');
}

/**
 * Extract capabilities needed based on the message content
 */
export async function extractCapabilities(message: string): Promise<string[]> {
  // Normalize message for better caching and matching
  const normalizedMessage = message.toLowerCase().trim().replace(/\s+/g, ' ');
  
  // Early exit for very short messages (likely greetings) - optimization
  if (normalizedMessage.length < 5) {
    log(`Extremely short message detected, treating as basic conversation`, 'capability-detection');
    return [];
  }
  
  // For basic conversational messages, don't trigger any special capabilities
  if (isBasicConversation(normalizedMessage)) {
    log(`Basic conversational message detected, no special capabilities needed`, 'capability-detection');
    return [];
  }
  
  // For messages about the system's own capabilities, use self-reflection only
  if (isCapabilityQuestion(normalizedMessage)) {
    log(`System capability question detected, using self_reflection only`, 'capability-detection');
    return ['self_reflection'];
  }
  
  // Check cache first to avoid expensive processing
  const cachedCapabilities = checkCapabilityCache(normalizedMessage);
  if (cachedCapabilities !== null) {
    return cachedCapabilities;
  }
  
  // Check some common keywords for specific capabilities
  const keywordCapabilities = extractCapabilitiesFromKeywords(normalizedMessage);
  if (keywordCapabilities.length > 0) {
    log(`Detected capabilities from keywords: ${keywordCapabilities.join(', ')}`, 'capability-detection');
    // Save to cache
    saveToCapabilityCache(normalizedMessage, keywordCapabilities);
    // If we have capabilities from keywords, return them immediately to avoid API call
    return keywordCapabilities;
  }
  
  // Check for similar past messages to avoid repeated API calls for similar inputs
  // This is an additional optimization to prevent similar questions causing new API calls
  try {
    // Convert all cache entries into array of key strings
    const cacheEntries = Object.entries(capabilityCache);
    for (const [key, entry] of cacheEntries) {
      // Skip very short cache entries (not enough data for meaningful comparison)
      if (key.length < 15) continue;
      
      // Simple similarity check based on word overlap
      const keyWords = key.split(' ');
      const messageWords = normalizedMessage.split(' ');
      const commonWords = keyWords.filter(word => messageWords.includes(word));
      
      // If more than 70% of words match between the messages, reuse the cached capabilities
      if (commonWords.length >= 3 && 
          (commonWords.length / Math.max(keyWords.length, messageWords.length)) > 0.7) {
        log(`Using capabilities from similar message: "${key.substring(0, 30)}..."`, 'capability-detection');
        // Also cache for the current message to speed up future identical requests
        saveToCapabilityCache(normalizedMessage, entry.capabilities);
        return entry.capabilities;
      }
    }
  } catch (error) {
    log(`Error in similarity check: ${error}`, 'capability-detection');
    // Continue with normal processing if similarity check fails
  }
  
  // Query knowledge graph for relevant entities and relationships
  let relevantCapabilities: string[] = [];
  
  try {
    const knowledgeResults = await knowledgeGraph.queryKnowledge(message);
    
    // Extract relevant capabilities from knowledge graph results
    if (knowledgeResults.relevantEntities.length > 0) {
      // Get capabilities from Panion entity if found
      const panionEntity = knowledgeResults.relevantEntities.find(
        entity => entity.name.toLowerCase() === 'panion'
      );
      
      if (panionEntity && 
          panionEntity.attributes.capabilities && 
          Array.isArray(panionEntity.attributes.capabilities)) {
        
        // Map capabilities from knowledge graph to our capability categories
        const mappedCapabilities = panionEntity.attributes.capabilities
          .map(cap => {
            if (typeof cap !== 'string') return null;
            const normalizedCap = cap.toLowerCase();
            
            // Map from knowledge graph capabilities to our capability categories
            if (normalizedCap.includes('multi-agent') || normalizedCap.includes('collaboration'))
              return 'coordination';
            if (normalizedCap.includes('strategic'))
              return 'strategic_thinking';
            if (normalizedCap.includes('browser') || normalizedCap.includes('web'))
              return 'web_scraping';
            if (normalizedCap.includes('knowledge graph'))
              return 'knowledge_retrieval';
            if (normalizedCap.includes('business intelligence'))
              return 'data_analysis';
            if (normalizedCap.includes('autonomous'))
              return 'planning';
            return null;
          })
          .filter(Boolean) as string[];
        
        // Add relevant capabilities from knowledge graph
        relevantCapabilities = mappedCapabilities;
        log(`Capabilities extracted from knowledge graph: ${relevantCapabilities.join(', ')}`, 'capability-detection');
      }
    }
    
    // If we got capabilities from knowledge graph, return them
    if (relevantCapabilities.length > 0) {
      return relevantCapabilities;
    }
  } catch (error) {
    log(`Error querying knowledge graph for capabilities: ${error}`, 'capability-detection');
    // Continue without knowledge graph insights
  }
  
  // If we reach here, we need to try the AI-based extraction as a last resort
  try {
    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      log(`OPENAI_API_KEY is not available, skipping AI capability detection`, 'capability-detection');
      // Return a reasonable default for common tasks
      return determineDefaultCapabilities(message);
    }
    
    // Create knowledge insights for AI prompt
    let knowledgeInsights = '';
    if (relevantCapabilities.length > 0) {
      knowledgeInsights = `\nBased on knowledge graph analysis, these capabilities may be relevant: ${relevantCapabilities.join(', ')}`;
    }
    
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
          6. Consider any capabilities suggested by the knowledge graph.
          
          Respond with a JSON object like {"capabilities": []} containing ONLY the minimum necessary capabilities.`
        },
        {
          role: "user",
          content: `User message: "${message}"
          ${knowledgeInsights}
          
          What capabilities would be needed to address this request? Respond with a JSON array of capability strings.`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3
    });
    
    try {
      const result = JSON.parse(response.choices[0].message.content || '{"capabilities": []}');
      
      // Extract capabilities and validate
      const aiCapabilities = Array.isArray(result.capabilities) 
        ? result.capabilities
        : [];
      
      // Combine AI capabilities with knowledge graph capabilities
      const combinedSet = new Set([...aiCapabilities, ...relevantCapabilities]);
      const combinedCapabilities = Array.from(combinedSet);
      
      // Filter to only include valid capabilities
      const validCapabilities = combinedCapabilities.filter(c => 
        typeof c === 'string' && CAPABILITY_CATEGORIES.includes(c)
      );
      
      log(`Detected capabilities (combined): ${validCapabilities.join(', ')}`, 'capability-detection');
      return validCapabilities;
    } catch (parseError) {
      log(`Error parsing capability detection response: ${parseError}`, 'capability-detection');
      // Fallback to knowledge graph capabilities or heuristic detection
      if (relevantCapabilities.length > 0) {
        return relevantCapabilities;
      }
      return determineDefaultCapabilities(message);
    }
  } catch (error) {
    log(`Error detecting capabilities with AI: ${error}`, 'capability-detection');
    // Fallback to knowledge graph capabilities or heuristic detection
    if (relevantCapabilities.length > 0) {
      return relevantCapabilities;
    }
    return determineDefaultCapabilities(message);
  }
}

/**
 * Determine default capabilities based on message content using heuristics
 */
function determineDefaultCapabilities(message: string): string[] {
  const lowerMessage = message.toLowerCase();
  const capabilities: string[] = [];
  
  // Check for common tasks
  if (lowerMessage.includes('summarize') || lowerMessage.includes('summary')) {
    capabilities.push('summarization');
  }
  
  if (lowerMessage.includes('analyze') || lowerMessage.includes('analysis')) {
    capabilities.push('data_analysis');
  }
  
  if (lowerMessage.includes('plan') || lowerMessage.includes('steps')) {
    capabilities.push('planning');
  }
  
  if (lowerMessage.includes('search') || lowerMessage.includes('find information')) {
    capabilities.push('search');
  }
  
  if (lowerMessage.includes('write') || lowerMessage.includes('create content')) {
    capabilities.push('creative_writing');
  }
  
  // If no specific capabilities detected, leave empty for general conversation
  log(`Determined default capabilities: ${capabilities.join(', ') || 'none'}`, 'capability-detection');
  return capabilities;
}

/**
 * Extract capabilities based on keywords in the message
 */
function extractCapabilitiesFromKeywords(message: string): string[] {
  const lowerMessage = message.toLowerCase();
  const capabilities: string[] = [];
  
  // Smokeshop specific keywords
  if (lowerMessage.includes('smoke') && lowerMessage.includes('shop') ||
      lowerMessage.includes('smokeshop')) {
    capabilities.push('smokeshop_data');
  }
  
  // Data analysis related keywords
  if ((lowerMessage.includes('analyze') || lowerMessage.includes('analysis')) && 
      (lowerMessage.includes('data') || lowerMessage.includes('information'))) {
    capabilities.push('data_analysis');
  }
  
  // Web scraping related keywords
  if ((lowerMessage.includes('scrape') || lowerMessage.includes('extract')) && 
      (lowerMessage.includes('website') || lowerMessage.includes('web') || 
       lowerMessage.includes('online') || lowerMessage.includes('page'))) {
    capabilities.push('web_scraping');
  }
  
  // Search related keywords
  if (lowerMessage.includes('search for') || lowerMessage.includes('find information about') ||
      lowerMessage.includes('look up') || lowerMessage.includes('google')) {
    capabilities.push('search');
  }
  
  // Document processing
  if (lowerMessage.includes('document') || lowerMessage.includes('pdf') || 
      lowerMessage.includes('spreadsheet') || lowerMessage.includes('excel')) {
    capabilities.push('document_processing');
  }
  
  // Code related
  if (lowerMessage.includes('code') || lowerMessage.includes('program') || 
      lowerMessage.includes('script') || lowerMessage.includes('function')) {
    capabilities.push('coding');
  }
  
  // Strategic thinking
  if (lowerMessage.includes('strategy') || lowerMessage.includes('strategic') || 
      lowerMessage.includes('plan') || lowerMessage.includes('approach')) {
    capabilities.push('strategic_thinking');
  }
  
  // Remove duplicates and return
  const uniqueSet = new Set(capabilities);
  return Array.from(uniqueSet);
}

/**
 * Check if the message is a basic conversational message
 */
function isBasicConversation(message: string): boolean {
  const normalizedMessage = message.toLowerCase().trim();
  
  // Super simple single-word greetings (highest priority fast path)
  if (/^(hi|hello|hey|yo|sup)$/.test(normalizedMessage)) {
    log('Detected single-word greeting for fastest response path', 'capability-detection');
    return true;
  }
  
  // Simple greetings with additional words
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