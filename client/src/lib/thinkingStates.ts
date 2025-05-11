/**
 * Thinking States Utility
 * Provides utilities for generating and managing thinking states for chat messages
 */

import { ThinkingState, MessageSentiment } from '@/types/chat';

interface ThinkingStateSequence {
  states: ThinkingState[];
  durations: number[];  // in milliseconds
}

/**
 * Generate a sequence of thinking states for simulating Manus's thought process
 * @param complexity How complex the response needs to be (1-10)
 * @param needsMemory Whether the response requires accessing memory
 * @param messageLength Approximate expected response length
 * @returns A sequence of thinking states with timing
 */
export function generateThinkingSequence(
  complexity: number,
  needsMemory: boolean = false,
  messageLength: number = 200
): ThinkingStateSequence {
  const states: ThinkingState[] = ['listening'];
  const durations: number[] = [800]; // Start with listening

  // Always include processing
  states.push('processing');
  durations.push(complexity * 300); // More complex = longer processing
  
  // Add recalling state if memory is needed
  if (needsMemory) {
    states.push('recalling');
    durations.push(1200 + Math.random() * 800); // 1.2-2s for memory recall
  }
  
  // For complex responses, add analysis
  if (complexity > 3) {
    states.push('analyzing');
    durations.push(complexity * 250);
  }
  
  // For very complex responses, add deliberation
  if (complexity > 6) {
    states.push('deliberating');
    durations.push(complexity * 200);
  }
  
  // For all responses, add connection building
  states.push('connecting');
  durations.push(900 + (complexity * 100));
  
  // Finally, generate the response
  states.push('generating');
  // More time for longer messages
  durations.push(Math.max(1000, messageLength * 5));
  
  // And complete
  states.push('complete');
  durations.push(0); // No duration for complete state
  
  return { states, durations };
}

/**
 * Get an appropriate sentiment based on message content and context
 * @param content The message content to analyze
 * @param previousSentiment Previous message sentiment (for continuity)
 * @returns An appropriate sentiment for the message
 */
export function determineSentiment(
  content: string,
  previousSentiment?: MessageSentiment
): MessageSentiment {
  const contentLower = content.toLowerCase();
  
  // Simple keyword-based sentiment determination
  if (contentLower.includes('sorry') || 
      contentLower.includes('unfortunate') || 
      contentLower.includes('issue')) {
    return 'concerned';
  }
  
  if (contentLower.includes('interesting') || 
      contentLower.includes('curious') || 
      contentLower.includes('wonder')) {
    return 'curious';
  }
  
  if (contentLower.includes('definitely') || 
      contentLower.includes('certainly') || 
      contentLower.includes('absolutely')) {
    return 'confident';
  }
  
  if (contentLower.includes('feel') || 
      contentLower.includes('understand') || 
      contentLower.includes('perspective')) {
    return 'empathetic';
  }
  
  if (contentLower.includes('great') || 
      contentLower.includes('excellent') || 
      contentLower.includes('wonderful')) {
    return 'excited';
  }
  
  if (contentLower.includes('consider') || 
      contentLower.includes('reflect') || 
      contentLower.includes('perhaps')) {
    return 'thoughtful';
  }
  
  // If previous sentiment exists and no strong indicators in current message,
  // continue with the same sentiment for conversational continuity (70% chance)
  if (previousSentiment && Math.random() < 0.7) {
    return previousSentiment;
  }
  
  // Default sentiments with weighted probabilities
  const defaultSentiments: MessageSentiment[] = [
    'neutral', 'neutral', 'neutral', // 30% neutral (3/10)
    'thoughtful', 'thoughtful',      // 20% thoughtful (2/10)
    'curious', 'curious',            // 20% curious (2/10)
    'confident',                     // 10% confident (1/10)
    'empathetic',                    // 10% empathetic (1/10)
    'excited'                        // 10% excited (1/10)
  ];
  
  return defaultSentiments[Math.floor(Math.random() * defaultSentiments.length)];
}