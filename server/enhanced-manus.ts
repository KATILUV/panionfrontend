/**
 * Enhanced Manus-like Capabilities
 * Provides advanced autonomous reasoning and proactive abilities
 */

import { log } from './vite';
import * as conversationMemory from './conversation-memory';
import OpenAI from 'openai';
import { Message } from './utils/memory-types';
import { v4 as uuidv4 } from 'uuid';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Insight priority levels
enum InsightPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

// Types of insights
enum InsightType {
  OPPORTUNITY = 'opportunity',
  DATA_PATTERN = 'data_pattern',
  CLARIFICATION_NEEDED = 'clarification_needed',
  POTENTIAL_ERROR = 'potential_error',
  SUGGESTION = 'suggestion',
  INFORMATION = 'information'
}

// Interface for insight objects
interface Insight {
  id: string;
  type: InsightType;
  priority: InsightPriority;
  title: string;
  description: string;
  suggestedAction?: string;
  relatedMessages?: string[];
  timestamp: number;
  sessionId: string;
  confidence: number;
  isAcknowledged: boolean;
}

// Reasoning paths for multi-path thinking
interface ReasoningPath {
  id: string;
  approach: string;
  reasoning: string;
  confidence: number;
  pros: string[];
  cons: string[];
  estimatedEffort: number; // 1-10 scale
  estimatedSuccess: number; // 0-1 probability
}

// Subtask for complex task decomposition
interface Subtask {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  dependencies: string[]; // IDs of tasks this depends on
  estimatedComplexity: number; // 1-10 scale
  priority: number; // 1-10 scale
  notes?: string;
}

// Complex task with subtasks
interface ComplexTask {
  id: string;
  description: string;
  goal: string;
  subtasks: Subtask[];
  sessionId: string;
  createdAt: number;
  updatedAt: number;
  status: 'planning' | 'in_progress' | 'completed' | 'cancelled';
}

// Storage for insights and tasks
const insights: Insight[] = [];
const complexTasks: ComplexTask[] = [];
const recentReasoningPaths: Record<string, ReasoningPath[]> = {};

// Queue for background processing
interface BackgroundTask {
  id: string;
  type: 'generate_insights' | 'analyze_conversation' | 'strategic_planning';
  sessionId: string;
  priority: number;
  data?: any;
}

const backgroundTaskQueue: BackgroundTask[] = [];
let isProcessingQueue = false;

/**
 * Generate proactive insights based on conversation history
 */
export async function generateInsights(sessionId: string): Promise<Insight[]> {
  try {
    log(`Generating proactive insights for session ${sessionId}`, 'manus');
    
    // Get relevant conversation context
    const context = await conversationMemory.getRelevantContext(sessionId);
    if (!context || !context.messages || context.messages.length === 0) {
      log(`No conversation context found for session ${sessionId}`, 'manus');
      return [];
    }
    
    // Format conversation for analysis
    const conversationText = context.messages.map((msg: Message) => 
      `${msg.role.toUpperCase()}: ${msg.content}`
    ).join('\n');
    
    // Analyze conversation with GPT-4o for insights
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: 
            "You are an expert insight generator for an AI agent system called Manus. " +
            "Analyze the conversation and generate 1-3 proactive insights that would be valuable for the user. " +
            "These insights should identify patterns, opportunities, potential issues, or suggest useful next steps. " +
            "For each insight, determine its priority (low/medium/high/urgent), confidence (0-1), " +
            "and type (opportunity/data_pattern/clarification_needed/potential_error/suggestion/information). " +
            "Format as JSON array with objects containing: type, priority, title, description, suggestedAction, confidence."
        },
        {
          role: "user",
          content: `Analyze this conversation for insights:\n\n${conversationText}`
        }
      ],
      response_format: { type: "json_object" }
    });
    
    // Parse insights from response
    try {
      const content = response.choices[0].message.content;
      if (!content) {
        log(`Empty response from GPT-4o for insight generation`, 'manus-error');
        return [];
      }
      
      const result = JSON.parse(content);
      if (!result.insights || !Array.isArray(result.insights)) {
        log(`Invalid response format from GPT-4o for insights: ${content}`, 'manus-error');
        return [];
      }
      
      // Convert to our insight format
      const newInsights: Insight[] = result.insights.map((insight: any) => ({
        id: uuidv4(),
        type: insight.type as InsightType,
        priority: insight.priority as InsightPriority,
        title: insight.title,
        description: insight.description,
        suggestedAction: insight.suggestedAction,
        timestamp: Date.now(),
        sessionId,
        confidence: insight.confidence || 0.7,
        isAcknowledged: false
      }));
      
      // Add to our insights collection
      newInsights.forEach(insight => insights.push(insight));
      
      log(`Generated ${newInsights.length} insights for session ${sessionId}`, 'manus');
      return newInsights;
      
    } catch (parseError) {
      log(`Error parsing insights response: ${parseError}`, 'manus-error');
      return [];
    }
    
  } catch (error) {
    log(`Error generating insights: ${error}`, 'manus-error');
    return [];
  }
}

/**
 * Generate multiple reasoning paths for approaching a problem
 */
export async function generateReasoningPaths(
  problem: string, 
  sessionId: string, 
  numPaths: number = 3
): Promise<ReasoningPath[]> {
  try {
    log(`Generating ${numPaths} reasoning paths for problem: ${problem}`, 'manus');
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: 
            "You are a strategic thinking engine for Manus AI. " +
            "Generate multiple approaches to solve the presented problem. " +
            "For each approach, provide detailed reasoning, confidence score (0-1), " +
            "pros, cons, estimated effort (1-10), and probability of success (0-1). " +
            "Think creatively and present diverse strategies. " +
            "Format as JSON array with objects containing: approach, reasoning, confidence, pros, cons, estimatedEffort, estimatedSuccess."
        },
        {
          role: "user",
          content: `Generate ${numPaths} different approaches to solve this problem: ${problem}`
        }
      ],
      response_format: { type: "json_object" }
    });
    
    try {
      const content = response.choices[0].message.content;
      if (!content) {
        log(`Empty response from GPT-4o for reasoning paths`, 'manus-error');
        return [];
      }
      
      const result = JSON.parse(content);
      if (!result.approaches || !Array.isArray(result.approaches)) {
        log(`Invalid response format from GPT-4o for reasoning paths: ${content}`, 'manus-error');
        return [];
      }
      
      // Convert to our format
      const paths: ReasoningPath[] = result.approaches.map((path: any) => ({
        id: uuidv4(),
        approach: path.approach,
        reasoning: path.reasoning,
        confidence: path.confidence || 0.5,
        pros: path.pros || [],
        cons: path.cons || [],
        estimatedEffort: path.estimatedEffort || 5,
        estimatedSuccess: path.estimatedSuccess || 0.5
      }));
      
      // Store for this session
      recentReasoningPaths[sessionId] = paths;
      
      log(`Generated ${paths.length} reasoning paths for problem`, 'manus');
      return paths;
      
    } catch (parseError) {
      log(`Error parsing reasoning paths response: ${parseError}`, 'manus-error');
      return [];
    }
    
  } catch (error) {
    log(`Error generating reasoning paths: ${error}`, 'manus-error');
    return [];
  }
}

/**
 * Decompose a complex task into subtasks
 */
export async function decomposeTask(taskDescription: string, sessionId: string): Promise<ComplexTask | null> {
  try {
    log(`Decomposing complex task: ${taskDescription}`, 'manus');
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: 
            "You are a task decomposition expert for Manus AI. " +
            "Break down complex tasks into logical subtasks with dependencies. " +
            "For each subtask, assess its complexity (1-10), priority (1-10), and identify any dependencies. " +
            "Create a structured plan that can be executed systematically. " +
            "Format as JSON with: goal, description, and subtasks array with objects containing: " +
            "description, estimatedComplexity, priority, dependencies (array of subtask indices), and notes."
        },
        {
          role: "user",
          content: `Decompose this complex task into subtasks: ${taskDescription}`
        }
      ],
      response_format: { type: "json_object" }
    });
    
    try {
      const content = response.choices[0].message.content;
      if (!content) {
        log(`Empty response from GPT-4o for task decomposition`, 'manus-error');
        return null;
      }
      
      const result = JSON.parse(content);
      if (!result.subtasks || !Array.isArray(result.subtasks)) {
        log(`Invalid response format from GPT-4o for task decomposition: ${content}`, 'manus-error');
        return null;
      }
      
      // Process dependencies - handle them as indices and convert to IDs
      const subtaskIds: string[] = result.subtasks.map(() => uuidv4());
      
      // Convert to our format
      const subtasks: Subtask[] = result.subtasks.map((task: any, index: number) => {
        // Convert dependency indices to actual IDs
        const dependencies: string[] = (task.dependencies || [])
          .filter((depIndex: number) => depIndex >= 0 && depIndex < subtaskIds.length)
          .map((depIndex: number) => subtaskIds[depIndex]);
        
        return {
          id: subtaskIds[index],
          description: task.description,
          status: 'pending',
          dependencies,
          estimatedComplexity: task.estimatedComplexity || 5,
          priority: task.priority || 5,
          notes: task.notes
        };
      });
      
      // Create the complex task
      const complexTask: ComplexTask = {
        id: uuidv4(),
        description: taskDescription,
        goal: result.goal || taskDescription,
        subtasks,
        sessionId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        status: 'planning'
      };
      
      // Store it
      complexTasks.push(complexTask);
      
      log(`Decomposed task into ${subtasks.length} subtasks`, 'manus');
      return complexTask;
      
    } catch (parseError) {
      log(`Error parsing task decomposition response: ${parseError}`, 'manus-error');
      return null;
    }
    
  } catch (error) {
    log(`Error decomposing task: ${error}`, 'manus-error');
    return null;
  }
}

/**
 * Get pending insights for a session
 */
export function getPendingInsights(sessionId: string): Insight[] {
  return insights
    .filter(insight => insight.sessionId === sessionId && !insight.isAcknowledged)
    .sort((a, b) => {
      // Sort by priority first
      const priorityOrder = { 
        [InsightPriority.URGENT]: 0, 
        [InsightPriority.HIGH]: 1, 
        [InsightPriority.MEDIUM]: 2, 
        [InsightPriority.LOW]: 3 
      };
      
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      
      // Then by confidence
      return b.confidence - a.confidence;
    });
}

/**
 * Acknowledge an insight
 */
export function acknowledgeInsight(insightId: string): boolean {
  const insight = insights.find(i => i.id === insightId);
  if (insight) {
    insight.isAcknowledged = true;
    return true;
  }
  return false;
}

/**
 * Add insight to existing collection (e.g., from other sources)
 */
export function addInsight(insight: Omit<Insight, 'id' | 'timestamp' | 'isAcknowledged'>): Insight {
  const newInsight: Insight = {
    ...insight,
    id: uuidv4(),
    timestamp: Date.now(),
    isAcknowledged: false
  };
  
  insights.push(newInsight);
  return newInsight;
}

/**
 * Get a complex task by ID
 */
export function getComplexTask(taskId: string): ComplexTask | null {
  return complexTasks.find(task => task.id === taskId) || null;
}

/**
 * Update subtask status
 */
export function updateSubtaskStatus(
  taskId: string, 
  subtaskId: string, 
  status: 'pending' | 'in_progress' | 'completed' | 'blocked'
): boolean {
  const task = complexTasks.find(t => t.id === taskId);
  if (!task) return false;
  
  const subtask = task.subtasks.find(s => s.id === subtaskId);
  if (!subtask) return false;
  
  subtask.status = status;
  task.updatedAt = Date.now();
  
  // Check if all subtasks are completed
  if (status === 'completed' && task.subtasks.every(s => s.status === 'completed')) {
    task.status = 'completed';
  }
  
  return true;
}

/**
 * Evaluate a processing result with metacognitive verification
 * This is a "thinking about thinking" layer that checks if the result seems reasonable
 */
export async function verifyResult(
  result: string, 
  originalQuery: string, 
  sessionId: string
): Promise<{
  isValid: boolean;
  confidence: number;
  correctedResult?: string;
  reasoning: string;
}> {
  try {
    log(`Verifying result for query: ${originalQuery}`, 'manus');
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: 
            "You are a verification expert for Manus AI. " +
            "Carefully analyze whether the given result properly addresses the original query. " +
            "Check for accuracy, completeness, and relevance. " +
            "If the result has issues, propose a corrected version. " +
            "Format as JSON with: isValid (boolean), confidence (0-1), correctedResult (optional), reasoning."
        },
        {
          role: "user",
          content: `Original query: ${originalQuery}\n\nResult to verify: ${result}\n\nIs this result accurate, complete, and responsive to the query?`
        }
      ],
      response_format: { type: "json_object" }
    });
    
    try {
      const content = response.choices[0].message.content;
      if (!content) {
        log(`Empty response from GPT-4o for result verification`, 'manus-error');
        return { isValid: true, confidence: 0.5, reasoning: "Unable to verify" };
      }
      
      const verification = JSON.parse(content);
      log(`Verification result: ${verification.isValid ? 'Valid' : 'Invalid'} (${verification.confidence})`, 'manus');
      
      return {
        isValid: verification.isValid,
        confidence: verification.confidence || 0.5,
        correctedResult: verification.correctedResult,
        reasoning: verification.reasoning || "No reasoning provided"
      };
      
    } catch (parseError) {
      log(`Error parsing verification response: ${parseError}`, 'manus-error');
      return { isValid: true, confidence: 0.5, reasoning: "Parsing error during verification" };
    }
    
  } catch (error) {
    log(`Error in verification process: ${error}`, 'manus-error');
    return { isValid: true, confidence: 0.5, reasoning: "Error during verification" };
  }
}

/**
 * Add a task to the background processing queue
 */
export function queueBackgroundTask(task: Omit<BackgroundTask, 'id'>): string {
  const id = uuidv4();
  const newTask: BackgroundTask = {
    ...task,
    id
  };
  
  backgroundTaskQueue.push(newTask);
  
  // Start processing queue if not already running
  if (!isProcessingQueue) {
    processBackgroundQueue();
  }
  
  return id;
}

/**
 * Process tasks in the background queue
 */
async function processBackgroundQueue(): Promise<void> {
  if (isProcessingQueue || backgroundTaskQueue.length === 0) return;
  
  isProcessingQueue = true;
  
  try {
    // Sort by priority (higher number = higher priority)
    backgroundTaskQueue.sort((a, b) => b.priority - a.priority);
    
    const task = backgroundTaskQueue.shift();
    if (!task) {
      isProcessingQueue = false;
      return;
    }
    
    log(`Processing background task: ${task.type} for session ${task.sessionId}`, 'manus');
    
    switch (task.type) {
      case 'generate_insights':
        await generateInsights(task.sessionId);
        break;
        
      case 'analyze_conversation':
        // Implementation for conversation analysis
        break;
        
      case 'strategic_planning':
        // Implementation for strategic planning
        break;
    }
    
  } catch (error) {
    log(`Error processing background task: ${error}`, 'manus-error');
  } finally {
    isProcessingQueue = false;
    
    // Continue processing if there are more tasks
    if (backgroundTaskQueue.length > 0) {
      setTimeout(processBackgroundQueue, 100);
    }
  }
}

// Auto-trigger insight generation periodically for active sessions
setInterval(async () => {
  // Get active sessions from conversation memory
  const activeSessions = await conversationMemory.getActiveSessions();
  
  // Generate insights for each active session
  for (const sessionId of activeSessions) {
    queueBackgroundTask({
      type: 'generate_insights',
      sessionId,
      priority: 5
    });
  }
}, 300000); // Every 5 minutes

// Export for API use
export const enhancedManus = {
  generateInsights,
  generateReasoningPaths,
  decomposeTask,
  getPendingInsights,
  acknowledgeInsight,
  addInsight,
  getComplexTask,
  updateSubtaskStatus,
  verifyResult,
  queueBackgroundTask
};

export default enhancedManus;