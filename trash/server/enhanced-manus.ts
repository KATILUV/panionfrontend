/**
 * Enhanced Manus Intelligence Features
 * Implements advanced AI capabilities similar to Manus agent
 */

import OpenAI from "openai";
import { systemLog } from "./system-logs";
import { v4 as uuidv4 } from 'uuid';

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define types
export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface Insight {
  id: string;
  sessionId: string;
  title: string;
  description: string;
  importance: number;  // 1-10 scale
  timestamp: number;
  source: 'pattern' | 'reflection' | 'proactive';
  category: string;
  relatedInsights?: string[];
}

export interface ReasoningPath {
  id: string;
  approach: string;
  reasoning: string;
  pros: string[];
  cons: string[];
  estimatedEffort: number;  // 1-10 scale
  estimatedSuccess: number; // 0-1 probability
}

export interface Subtask {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  estimatedComplexity: number; // 1-10 scale
  priority: number; // 1-10 scale
  dependencies: string[];
  notes?: string;
}

export interface ComplexTask {
  id: string;
  goal: string;
  description: string;
  subtasks: Subtask[];
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  created: number;
  updated: number;
}

export interface Verification {
  isValid: boolean;
  confidence: number; // 0-1
  reasoning: string;
  correctedResult?: string;
}

// Store active insights per session
const sessionInsights: Record<string, Insight[]> = {};

// Cache for generated reasoning paths
const reasoningPathsCache: Record<string, ReasoningPath[]> = {};

// Cache for task decompositions
const taskDecompositionsCache: Record<string, ComplexTask> = {};

// Cache for verifications
const verificationsCache: Record<string, Verification> = {};

/**
 * Generate proactive insights based on session information
 */
export async function generateInsights(sessionId: string): Promise<Insight[]> {
  try {
    // In a real implementation, we would fetch conversation history
    // Since we don't have access to the actual history, we'll create sample insights
    
    const prompt = `
You are an advanced AI assistant with proactive insight capabilities.
Generate 2-3 proactive insights that might be helpful for a user working with an AI system.
Each insight should include a title, description, importance score (1-10), and category.

Format your response as a JSON array of insights with these properties:
- title: A short, descriptive title
- description: A detailed explanation of the insight
- importance: A number from 1-10 indicating how important this insight is
- category: One of "observation", "suggestion", "warning", "opportunity"

Response:
    `;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 1000,
    });
    
    const content = response.choices[0]?.message?.content;
    if (!content) {
      return [];
    }
    
    // Extract JSON from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return [];
    }
    
    let insights: Partial<Insight>[] = [];
    try {
      insights = JSON.parse(jsonMatch[0]);
    } catch (error) {
      systemLog.error(`Failed to parse insights JSON: ${error}`, 'manus');
      return [];
    }
    
    // Transform into full insights with IDs
    const fullInsights: Insight[] = insights.map(insight => ({
      id: uuidv4(),
      sessionId,
      title: insight.title || "Untitled Insight",
      description: insight.description || "",
      importance: insight.importance || 5,
      timestamp: Date.now(),
      source: "proactive",
      category: insight.category || "observation",
      relatedInsights: [],
    }));
    
    // Store insights for this session
    if (!sessionInsights[sessionId]) {
      sessionInsights[sessionId] = [];
    }
    
    // Add new insights
    sessionInsights[sessionId] = [...sessionInsights[sessionId], ...fullInsights];
    
    return fullInsights;
  } catch (error) {
    systemLog.error(`Error generating insights: ${error}`, 'manus');
    return [];
  }
}

/**
 * Get insights for a specific session
 */
export function getInsights(sessionId: string): Insight[] {
  return sessionInsights[sessionId] || [];
}

/**
 * Generate multiple reasoning paths for problem-solving
 */
export async function generateReasoningPaths(
  problem: string, 
  sessionId: string, 
  numPaths: number = 3
): Promise<ReasoningPath[]> {
  try {
    const cacheKey = `${sessionId}-${problem}-${numPaths}`;
    
    // Check cache
    if (reasoningPathsCache[cacheKey]) {
      return reasoningPathsCache[cacheKey];
    }
    
    const prompt = `
You are Manus, an advanced AI assistant with exceptional problem-solving capabilities.
Generate ${numPaths} different approaches to solving this problem:

${problem}

For each approach, provide:
1. A concise name/title for the approach
2. A detailed explanation of the reasoning
3. List of pros (advantages)
4. List of cons (disadvantages)
5. Estimated effort required (1-10 scale)
6. Estimated probability of success (0-1 scale)

Format your response as a JSON array of approaches with these properties:
- approach: The name/title of the approach
- reasoning: Detailed explanation
- pros: Array of strings, each listing an advantage
- cons: Array of strings, each listing a disadvantage
- estimatedEffort: Number from 1-10
- estimatedSuccess: Number from 0 to 1

Response:
    `;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
      max_tokens: 2000,
    });
    
    const content = response.choices[0]?.message?.content;
    if (!content) {
      return [];
    }
    
    // Extract JSON from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return [];
    }
    
    let paths: Partial<ReasoningPath>[] = [];
    try {
      paths = JSON.parse(jsonMatch[0]);
    } catch (error) {
      systemLog.error(`Failed to parse reasoning paths JSON: ${error}`, 'manus');
      return [];
    }
    
    // Transform into full reasoning paths with IDs
    const fullPaths: ReasoningPath[] = paths.map(path => ({
      id: uuidv4(),
      approach: path.approach || "Untitled Approach",
      reasoning: path.reasoning || "",
      pros: path.pros || [],
      cons: path.cons || [],
      estimatedEffort: path.estimatedEffort || 5,
      estimatedSuccess: path.estimatedSuccess || 0.5,
    }));
    
    // Store in cache
    reasoningPathsCache[cacheKey] = fullPaths;
    
    return fullPaths;
  } catch (error) {
    systemLog.error(`Error generating reasoning paths: ${error}`, 'manus');
    return [];
  }
}

/**
 * Break down a complex task into subtasks with dependencies
 */
export async function decomposeTask(
  taskDescription: string,
  sessionId: string
): Promise<ComplexTask> {
  try {
    const cacheKey = `${sessionId}-${taskDescription}`;
    
    // Check cache
    if (taskDecompositionsCache[cacheKey]) {
      return taskDecompositionsCache[cacheKey];
    }
    
    const prompt = `
You are Manus, an advanced AI assistant with exceptional task management capabilities.
Break down this complex task into a set of smaller, manageable subtasks:

${taskDescription}

For each subtask:
1. Provide a clear description
2. Assign an estimated complexity (1-10 scale)
3. Assign a priority (1-10 scale)
4. List any dependencies (IDs of subtasks that must be completed first)

Format your response as a JSON object with:
- goal: A short goal statement
- description: Detailed description of the overall task
- subtasks: Array of subtask objects with:
  - description: What needs to be done
  - estimatedComplexity: Number from 1-10
  - priority: Number from 1-10
  - dependencies: Array of subtask indices (0-based) that must be completed first
  - notes: Optional additional information

Ensure dependencies make logical sense and don't create circular references.

Response:
    `;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 2000,
    });
    
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Failed to generate task decomposition");
    }
    
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to extract JSON from response");
    }
    
    let taskData: any;
    try {
      taskData = JSON.parse(jsonMatch[0]);
    } catch (error) {
      systemLog.error(`Failed to parse task decomposition JSON: ${error}`, 'manus');
      throw new Error("Failed to parse task data");
    }
    
    // Transform subtasks to have proper IDs and convert index-based dependencies to ID-based
    const subtaskIds = taskData.subtasks.map(() => uuidv4());
    
    const subtasks: Subtask[] = taskData.subtasks.map((subtask: any, index: number) => {
      // Convert index-based dependencies to ID-based
      const dependencies = (subtask.dependencies || [])
        .filter((depIndex: number) => depIndex >= 0 && depIndex < subtaskIds.length)
        .map((depIndex: number) => subtaskIds[depIndex]);
      
      return {
        id: subtaskIds[index],
        description: subtask.description || "Untitled Subtask",
        status: 'pending',
        estimatedComplexity: subtask.estimatedComplexity || 5,
        priority: subtask.priority || 5,
        dependencies,
        notes: subtask.notes
      };
    });
    
    // Create the full task
    const task: ComplexTask = {
      id: uuidv4(),
      goal: taskData.goal || "Untitled Task",
      description: taskData.description || "",
      subtasks,
      status: 'pending',
      created: Date.now(),
      updated: Date.now()
    };
    
    // Store in cache
    taskDecompositionsCache[cacheKey] = task;
    
    return task;
  } catch (error) {
    systemLog.error(`Error decomposing task: ${error}`, 'manus');
    throw error;
  }
}

/**
 * Update a subtask's status
 */
export function updateSubtaskStatus(
  taskId: string,
  subtaskId: string,
  status: 'pending' | 'in_progress' | 'completed' | 'blocked'
): boolean {
  // Find the task in all session caches
  for (const key in taskDecompositionsCache) {
    const task = taskDecompositionsCache[key];
    
    if (task.id === taskId) {
      // Find and update the subtask
      const subtaskIndex = task.subtasks.findIndex(st => st.id === subtaskId);
      
      if (subtaskIndex >= 0) {
        task.subtasks[subtaskIndex].status = status;
        task.updated = Date.now();
        
        // Update task status if needed
        if (task.subtasks.every(st => st.status === 'completed')) {
          task.status = 'completed';
        } else if (task.subtasks.some(st => st.status === 'in_progress')) {
          task.status = 'in_progress';
        }
        
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Get task by ID
 */
export function getTaskById(taskId: string): ComplexTask | null {
  for (const key in taskDecompositionsCache) {
    if (taskDecompositionsCache[key].id === taskId) {
      return taskDecompositionsCache[key];
    }
  }
  
  return null;
}

/**
 * Verify a result against an original query
 */
export async function verifyResult(
  originalQuery: string,
  result: string,
  sessionId: string
): Promise<Verification> {
  try {
    const cacheKey = `${sessionId}-${originalQuery}-${result}`;
    
    // Check cache
    if (verificationsCache[cacheKey]) {
      return verificationsCache[cacheKey];
    }
    
    const prompt = `
You are Manus, an advanced AI assistant with metacognitive verification capabilities.
Carefully evaluate whether this result correctly addresses the original query:

Original Query: ${originalQuery}

Result to Verify: ${result}

Perform a detailed analysis:
1. Is the result factually accurate?
2. Does it fully address the query?
3. Are there any logical errors or omissions?
4. Is it sufficiently comprehensive?

Format your response as a JSON object with:
- isValid: Boolean indicating whether the result is valid
- confidence: Number from 0 to 1 indicating your confidence in this assessment
- reasoning: Detailed explanation of your verification process
- correctedResult: If the result is not valid, provide a corrected version

Response:
    `;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      max_tokens: 2000,
    });
    
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Failed to generate verification");
    }
    
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to extract JSON from response");
    }
    
    let verificationData: Verification;
    try {
      verificationData = JSON.parse(jsonMatch[0]);
    } catch (error) {
      systemLog.error(`Failed to parse verification JSON: ${error}`, 'manus');
      throw new Error("Failed to parse verification data");
    }
    
    // Store in cache
    verificationsCache[cacheKey] = verificationData;
    
    return verificationData;
  } catch (error) {
    systemLog.error(`Error verifying result: ${error}`, 'manus');
    throw error;
  }
}

/**
 * Get active sessions with Manus
 */
export function getActiveSessions(): string[] {
  const sessionSet = new Set<string>();
  
  // Collect sessions from insights
  Object.keys(sessionInsights).forEach(session => sessionSet.add(session));
  
  // Collect sessions from reasoning paths
  Object.keys(reasoningPathsCache).forEach(key => {
    const sessionId = key.split('-')[0];
    if (sessionId) sessionSet.add(sessionId);
  });
  
  // Collect sessions from task decompositions
  Object.keys(taskDecompositionsCache).forEach(key => {
    const sessionId = key.split('-')[0];
    if (sessionId) sessionSet.add(sessionId);
  });
  
  return Array.from(sessionSet);
}

/**
 * Clear session data for a specific session
 */
export function clearSessionData(sessionId: string): void {
  // Clear insights
  if (sessionInsights[sessionId]) {
    delete sessionInsights[sessionId];
  }
  
  // Clear reasoning paths
  Object.keys(reasoningPathsCache).forEach(key => {
    if (key.startsWith(`${sessionId}-`)) {
      delete reasoningPathsCache[key];
    }
  });
  
  // Clear task decompositions
  Object.keys(taskDecompositionsCache).forEach(key => {
    if (key.startsWith(`${sessionId}-`)) {
      delete taskDecompositionsCache[key];
    }
  });
  
  // Clear verifications
  Object.keys(verificationsCache).forEach(key => {
    if (key.startsWith(`${sessionId}-`)) {
      delete verificationsCache[key];
    }
  });
}