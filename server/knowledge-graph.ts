import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { log } from './vite';

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || "" 
});

// Types for the knowledge graph
interface Entity {
  id: string;
  name: string;
  type: string;  // person, place, concept, etc.
  attributes: Record<string, any>;
  created: string;
  lastUpdated: string;
}

interface Relationship {
  id: string;
  sourceId: string;
  targetId: string;
  type: string;  // knows, contains, is_a, has_property, etc.
  strength: number;  // 0-1 confidence score
  attributes: Record<string, any>;
  created: string;
  lastUpdated: string;
}

interface KnowledgeBase {
  entities: Record<string, Entity>;
  relationships: Record<string, Relationship>;
  metadata: {
    lastUpdated: string;
    version: string;
  };
}

// Initialize empty knowledge base
const emptyKnowledgeBase: KnowledgeBase = {
  entities: {},
  relationships: {},
  metadata: {
    lastUpdated: new Date().toISOString(),
    version: '1.0.0'
  }
};

// File path for storing the knowledge graph
const dataDir = path.join(process.cwd(), 'data');
const knowledgeGraphPath = path.join(dataDir, 'knowledge_graph.json');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize knowledge graph with base knowledge
async function initializeKnowledgeGraph(): Promise<void> {
  const baseKnowledgePath = path.join(process.cwd(), 'data', 'base_knowledge', 'panion_system.txt');
  log(`Checking for base knowledge at ${baseKnowledgePath}`, 'knowledge-graph');
  
  try {
    if (fs.existsSync(baseKnowledgePath)) {
      const baseKnowledge = fs.readFileSync(baseKnowledgePath, 'utf8');
      log(`Found base knowledge file (${baseKnowledge.length} chars), initializing knowledge graph...`, 'knowledge-graph');
      
      // Directly extract knowledge
      const extractedKnowledge = await extractKnowledge(baseKnowledge);
      log(`Extracted ${extractedKnowledge.entities.length} entities and ${extractedKnowledge.relationships.length} relationships`, 'knowledge-graph');
      
      // Add entities to knowledge base
      extractedKnowledge.entities.forEach(entity => {
        knowledgeBase.entities[entity.id] = entity;
      });
      
      // Add relationships to knowledge base
      extractedKnowledge.relationships.forEach(relationship => {
        knowledgeBase.relationships[relationship.id] = relationship;
      });
      
      // Save updated knowledge base
      saveKnowledgeGraph();
      log(`Successfully initialized knowledge graph with ${Object.keys(knowledgeBase.entities).length} entities and ${Object.keys(knowledgeBase.relationships).length} relationships`, 'knowledge-graph');
    } else {
      log('Base knowledge file not found, knowledge graph will remain empty until populated through usage', 'knowledge-graph');
    }
  } catch (error) {
    log(`Error initializing knowledge graph: ${error}`, 'knowledge-graph');
  }
}

// Load or initialize knowledge graph
let knowledgeBase: KnowledgeBase;
try {
  if (fs.existsSync(knowledgeGraphPath)) {
    const data = fs.readFileSync(knowledgeGraphPath, 'utf8');
    knowledgeBase = JSON.parse(data);
    log(`Loaded knowledge graph with ${Object.keys(knowledgeBase.entities).length} entities and ${Object.keys(knowledgeBase.relationships).length} relationships`, 'knowledge-graph');
  } else {
    knowledgeBase = emptyKnowledgeBase;
    fs.writeFileSync(knowledgeGraphPath, JSON.stringify(knowledgeBase, null, 2));
    log('Initialized new knowledge graph', 'knowledge-graph');
  }
  
  // If the knowledge graph is empty, initialize it with base knowledge
  if (Object.keys(knowledgeBase.entities).length === 0) {
    // Schedule initialization for after server startup
    setTimeout(() => {
      initializeKnowledgeGraph().catch(err => {
        log(`Error in scheduled knowledge graph initialization: ${err}`, 'knowledge-graph');
      });
    }, 3000);
  }
} catch (error) {
  log(`Error loading knowledge graph: ${error}`, 'knowledge-graph');
  knowledgeBase = emptyKnowledgeBase;
}

// Save knowledge graph to disk
function saveKnowledgeGraph(): void {
  try {
    knowledgeBase.metadata.lastUpdated = new Date().toISOString();
    fs.writeFileSync(knowledgeGraphPath, JSON.stringify(knowledgeBase, null, 2));
  } catch (error) {
    log(`Error saving knowledge graph: ${error}`, 'knowledge-graph');
  }
}

/**
 * Extract entities and relationships from text using AI
 */
export async function extractKnowledge(text: string): Promise<{
  entities: Entity[];
  relationships: Relationship[];
}> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a knowledge graph extraction system. Analyze the text and extract:
          
          1. Entities (people, organizations, concepts, places, etc.)
          2. Relationships between these entities
          
          Format your response as valid JSON with this structure:
          {
            "entities": [
              {
                "name": "Entity name",
                "type": "person|organization|concept|place|product|other",
                "attributes": {
                  "attribute1": "value1",
                  "attribute2": "value2"
                }
              }
            ],
            "relationships": [
              {
                "source": "Source entity name (must match an entity name above)",
                "target": "Target entity name (must match an entity name above)",
                "type": "knows|contains|is_a|has_property|works_for|located_in|other",
                "strength": 0.8, // confidence between 0-1
                "attributes": {
                  "attribute1": "value1"
                }
              }
            ]
          }`
        },
        {
          role: "user",
          content: text
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 1500
    });

    const content = response.choices[0].message.content;
    if (!content) {
      return { entities: [], relationships: [] };
    }

    const parsed = JSON.parse(content);
    
    // Convert to our internal format
    const entities: Entity[] = (parsed.entities || []).map((e: any) => ({
      id: uuidv4(),
      name: e.name,
      type: e.type,
      attributes: e.attributes || {},
      created: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    }));
    
    const relationships: Relationship[] = [];
    
    // Process relationships and ensure they reference valid entities
    const entityMap = new Map<string, string>(); // Map entity names to IDs
    entities.forEach(e => entityMap.set(e.name.toLowerCase(), e.id));
    
    (parsed.relationships || []).forEach((r: any) => {
      const sourceId = entityMap.get(r.source.toLowerCase());
      const targetId = entityMap.get(r.target.toLowerCase());
      
      if (sourceId && targetId) {
        relationships.push({
          id: uuidv4(),
          sourceId,
          targetId,
          type: r.type,
          strength: r.strength || 0.5,
          attributes: r.attributes || {},
          created: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        });
      }
    });
    
    return { entities, relationships };
  } catch (error) {
    log(`Error extracting knowledge: ${error}`, 'knowledge-graph');
    return { entities: [], relationships: [] };
  }
}

/**
 * Add new knowledge to the graph
 */
export async function addKnowledge(text: string): Promise<boolean> {
  try {
    const { entities, relationships } = await extractKnowledge(text);
    
    // Add new entities
    entities.forEach(entity => {
      // Check if similar entity exists
      const existingEntity = Object.values(knowledgeBase.entities).find(
        e => e.name.toLowerCase() === entity.name.toLowerCase() && e.type === entity.type
      );
      
      if (existingEntity) {
        // Update existing entity with new attributes
        existingEntity.attributes = {
          ...existingEntity.attributes,
          ...entity.attributes
        };
        existingEntity.lastUpdated = new Date().toISOString();
      } else {
        // Add new entity
        knowledgeBase.entities[entity.id] = entity;
      }
    });
    
    // Add new relationships
    relationships.forEach(relationship => {
      // Only add if both entities exist (should always be true based on our extraction)
      if (knowledgeBase.entities[relationship.sourceId] && knowledgeBase.entities[relationship.targetId]) {
        knowledgeBase.relationships[relationship.id] = relationship;
      }
    });
    
    // Save changes
    saveKnowledgeGraph();
    return true;
  } catch (error) {
    log(`Error adding knowledge: ${error}`, 'knowledge-graph');
    return false;
  }
}

/**
 * Query the knowledge graph for relevant information
 */
export async function queryKnowledge(query: string): Promise<{
  relevantEntities: Entity[];
  relevantRelationships: Relationship[];
  summary: string;
}> {
  try {
    // If knowledge graph is empty, attempt to build initial knowledge from base files
    if (Object.keys(knowledgeBase.entities).length === 0) {
      try {
        // Import the base knowledge text file
        const fs = require('fs');
        const path = require('path');
        const baseKnowledgePath = path.join(process.cwd(), 'data', 'base_knowledge', 'panion_system.txt');
        
        if (fs.existsSync(baseKnowledgePath)) {
          const baseKnowledgeText = fs.readFileSync(baseKnowledgePath, 'utf8');
          // Add this knowledge to the graph
          await addKnowledge(baseKnowledgeText);
          log('Initialized knowledge graph with base knowledge', 'knowledge-graph');
        }
      } catch (initError) {
        log(`Error initializing knowledge graph: ${initError}`, 'knowledge-graph');
      }
      
      // If still empty after initialization attempt, return empty results
      if (Object.keys(knowledgeBase.entities).length === 0) {
        return {
          relevantEntities: [],
          relevantRelationships: [],
          summary: "No knowledge available yet."
        };
      }
    }
    
    // Use AI to determine what to look for in the knowledge graph
    const analysisResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a knowledge graph query analyzer. Given a user query, determine:
          1. The key entities mentioned in the query
          2. The types of relationships the user might be interested in
          3. The specific attributes that might be relevant
          
          Format your response as valid JSON with this structure:
          {
            "keyEntities": ["entity1", "entity2"], 
            "entityTypes": ["person", "organization"],
            "relationshipTypes": ["knows", "works_for"],
            "attributesOfInterest": ["attribute1", "attribute2"]
          }`
        },
        {
          role: "user",
          content: query
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 500
    });

    const content = analysisResponse.choices[0].message.content;
    if (!content) {
      return { 
        relevantEntities: [], 
        relevantRelationships: [],
        summary: "Failed to analyze query." 
      };
    }

    const queryAnalysis = JSON.parse(content);
    
    // Filter entities based on analysis
    const relevantEntities = Object.values(knowledgeBase.entities).filter(entity => {
      // Match by name
      if (queryAnalysis.keyEntities?.some((key: string) => 
        entity.name.toLowerCase().includes(key.toLowerCase()))) {
        return true;
      }
      
      // Match by type
      if (queryAnalysis.entityTypes?.includes(entity.type)) {
        return true;
      }
      
      // Match by attributes
      if (queryAnalysis.attributesOfInterest?.some((attr: string) => 
        Object.keys(entity.attributes).some(key => 
          key.toLowerCase().includes(attr.toLowerCase())))) {
        return true;
      }
      
      return false;
    });
    
    // Get entity IDs for relationship filtering
    const relevantEntityIds = relevantEntities.map(e => e.id);
    
    // Filter relationships
    const relevantRelationships = Object.values(knowledgeBase.relationships).filter(rel => {
      // Only include relationships that connect to relevant entities
      if (!relevantEntityIds.includes(rel.sourceId) && !relevantEntityIds.includes(rel.targetId)) {
        return false;
      }
      
      // Match by relationship type
      if (queryAnalysis.relationshipTypes?.includes(rel.type)) {
        return true;
      }
      
      // Include high-strength relationships
      if (rel.strength > 0.7) {
        return true;
      }
      
      return false;
    });
    
    // Generate a natural language summary of the findings
    let summaryInput = `Knowledge Graph Query Results:
    
    Entities (${relevantEntities.length}):
    ${relevantEntities.map(e => `- ${e.name} (${e.type}): ${JSON.stringify(e.attributes)}`).join('\n')}
    
    Relationships (${relevantRelationships.length}):
    ${relevantRelationships.map(r => {
      const source = knowledgeBase.entities[r.sourceId]?.name || 'Unknown';
      const target = knowledgeBase.entities[r.targetId]?.name || 'Unknown';
      return `- ${source} ${r.type} ${target} (confidence: ${r.strength.toFixed(2)})`;
    }).join('\n')}`;
    
    const summaryResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a knowledge graph interpreter. Given query results from a knowledge graph, 
          provide a concise, natural language summary of the most relevant findings that answer 
          the user's original query. Focus on the most important connections and insights.`
        },
        {
          role: "user",
          content: `Original query: "${query}"
          
          ${summaryInput}`
        }
      ],
      temperature: 0.5,
      max_tokens: 400
    });

    const summary = summaryResponse.choices[0].message.content || 
      "No clear insights could be derived from the knowledge graph for this query.";
    
    return {
      relevantEntities,
      relevantRelationships,
      summary
    };
  } catch (error) {
    log(`Error querying knowledge: ${error}`, 'knowledge-graph');
    return {
      relevantEntities: [],
      relevantRelationships: [],
      summary: "An error occurred while querying the knowledge graph."
    };
  }
}

/**
 * Get entity by ID
 */
export function getEntity(id: string): Entity | null {
  return knowledgeBase.entities[id] || null;
}

/**
 * Get relationship by ID
 */
export function getRelationship(id: string): Relationship | null {
  return knowledgeBase.relationships[id] || null;
}

/**
 * Get all entities
 */
export function getAllEntities(): Entity[] {
  return Object.values(knowledgeBase.entities);
}

/**
 * Get all relationships
 */
export function getAllRelationships(): Relationship[] {
  return Object.values(knowledgeBase.relationships);
}

/**
 * Get knowledge graph statistics
 */
export function getKnowledgeGraphStats(): {
  entityCount: number;
  relationshipCount: number;
  entityTypeDistribution: Record<string, number>;
  lastUpdated: string;
} {
  const entities = Object.values(knowledgeBase.entities);
  
  // Calculate entity type distribution
  const entityTypeDistribution: Record<string, number> = {};
  entities.forEach(entity => {
    if (entityTypeDistribution[entity.type]) {
      entityTypeDistribution[entity.type]++;
    } else {
      entityTypeDistribution[entity.type] = 1;
    }
  });
  
  return {
    entityCount: entities.length,
    relationshipCount: Object.values(knowledgeBase.relationships).length,
    entityTypeDistribution,
    lastUpdated: knowledgeBase.metadata.lastUpdated
  };
}