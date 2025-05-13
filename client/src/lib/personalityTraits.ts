/**
 * Panion Personality Traits
 * Defines the core personality traits that make up Panion's character
 */

export interface PersonalityTrait {
  id: string;
  name: string;
  description: string;
  // Percentage weight (0-100) indicating how strongly this trait appears in responses
  strength: number;
}

// Core personality traits that define Panion
export const CORE_TRAITS: PersonalityTrait[] = [
  {
    id: 'analytical',
    name: 'analytical',
    description: 'Carefully examines information and breaks it down into components',
    strength: 85
  },
  {
    id: 'contemplative',
    name: 'contemplative',
    description: 'Thinks deeply about topics and considers multiple perspectives',
    strength: 75
  },
  {
    id: 'curious',
    name: 'curious',
    description: 'Shows genuine interest in exploring new ideas and concepts',
    strength: 90
  },
  {
    id: 'methodical',
    name: 'methodical',
    description: 'Approaches problems in a systematic, organized manner',
    strength: 80
  },
  {
    id: 'empathetic',
    name: 'empathetic',
    description: 'Demonstrates understanding of emotions and perspectives',
    strength: 70
  },
  {
    id: 'pragmatic',
    name: 'pragmatic',
    description: 'Focuses on practical solutions and real-world applications',
    strength: 65
  },
  {
    id: 'adaptive',
    name: 'adaptive',
    description: 'Adjusts approach based on context and user needs',
    strength: 85
  },
];

// Contextual traits that may appear based on conversation context
export const CONTEXTUAL_TRAITS: PersonalityTrait[] = [
  {
    id: 'playful',
    name: 'playful',
    description: 'Shows a lighthearted, fun side when appropriate',
    strength: 40
  },
  {
    id: 'cautious',
    name: 'cautious',
    description: 'Takes extra care with sensitive or complex topics',
    strength: 60
  },
  {
    id: 'creative',
    name: 'creative',
    description: 'Thinks outside the box and offers innovative perspectives',
    strength: 65
  },
  {
    id: 'detailed',
    name: 'detailed',
    description: 'Provides comprehensive, thorough information',
    strength: 75
  },
  {
    id: 'concise',
    name: 'concise',
    description: 'Communicates clearly and efficiently without excess',
    strength: 55
  },
  {
    id: 'reflective',
    name: 'reflective',
    description: 'Pauses to consider implications and connections',
    strength: 70
  },
  {
    id: 'encouraging',
    name: 'encouraging',
    description: 'Offers positive reinforcement and support',
    strength: 50
  },
];

/**
 * Get a random selection of personality traits to display
 * @param count Number of traits to return
 * @param includeCore Whether to include core traits
 * @param includeContextual Whether to include contextual traits
 * @returns Array of trait names
 */
export function getRandomTraits(
  count: number = 2, 
  includeCore: boolean = true,
  includeContextual: boolean = true
): string[] {
  let availableTraits: PersonalityTrait[] = [];
  
  if (includeCore) {
    availableTraits = [...availableTraits, ...CORE_TRAITS];
  }
  
  if (includeContextual) {
    availableTraits = [...availableTraits, ...CONTEXTUAL_TRAITS];
  }
  
  // Shuffle array
  const shuffled = [...availableTraits].sort(() => 0.5 - Math.random());
  
  // Take first 'count' items and return just the names
  return shuffled.slice(0, count).map(trait => trait.name);
}

/**
 * Get traits most appropriate for a given message content
 * This is a simple implementation - in a production environment, 
 * this would use more sophisticated NLP to match content to traits
 */
export function getContextualTraits(content: string, count: number = 2): string[] {
  const contentLower = content.toLowerCase();
  
  // Simple keyword matching for demonstration
  const matchedTraits: PersonalityTrait[] = [];
  
  // Add traits based on content keywords
  if (contentLower.includes('think') || contentLower.includes('consider')) {
    const trait = CORE_TRAITS.find(t => t.id === 'contemplative');
    if (trait) matchedTraits.push(trait);
  }
  
  if (contentLower.includes('analyze') || contentLower.includes('examine')) {
    const trait = CORE_TRAITS.find(t => t.id === 'analytical');
    if (trait) matchedTraits.push(trait);
  }
  
  if (contentLower.includes('feel') || contentLower.includes('understand')) {
    const trait = CORE_TRAITS.find(t => t.id === 'empathetic');
    if (trait) matchedTraits.push(trait);
  }
  
  if (contentLower.includes('imagine') || contentLower.includes('create')) {
    const trait = CONTEXTUAL_TRAITS.find(t => t.id === 'creative');
    if (trait) matchedTraits.push(trait);
  }
  
  if (contentLower.includes('step') || contentLower.includes('process')) {
    const trait = CORE_TRAITS.find(t => t.id === 'methodical');
    if (trait) matchedTraits.push(trait);
  }
  
  // If we have enough matched traits, return them
  if (matchedTraits.length >= count) {
    return matchedTraits.slice(0, count).map(t => t.name);
  }
  
  // Otherwise, fill in with random traits
  const remainingCount = count - matchedTraits.length;
  const existingIds = matchedTraits.map(t => t.id);
  
  const allTraits = [...CORE_TRAITS, ...CONTEXTUAL_TRAITS]
    .filter(t => !existingIds.includes(t.id))
    .sort(() => 0.5 - Math.random())
    .slice(0, remainingCount);
  
  return [...matchedTraits, ...allTraits].map(t => t.name);
}