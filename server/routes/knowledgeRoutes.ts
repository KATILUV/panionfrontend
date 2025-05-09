import express, { Request, Response } from 'express';
import * as knowledgeGraph from '../knowledge-graph';

const router = express.Router();

// Get knowledge graph statistics
router.get('/api/knowledge/stats', async (req: Request, res: Response) => {
  try {
    const stats = knowledgeGraph.getKnowledgeGraphStats();
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error getting knowledge graph stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get knowledge graph statistics',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Add new knowledge to the graph
router.post('/api/knowledge/add', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    
    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'Text is required and must be a string'
      });
    }
    
    const success = await knowledgeGraph.addKnowledge(text);
    
    if (success) {
      res.json({
        success: true,
        message: 'Knowledge added successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to add knowledge',
        message: 'An error occurred while adding knowledge'
      });
    }
  } catch (error) {
    console.error('Error adding knowledge:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add knowledge',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Query the knowledge graph
router.post('/api/knowledge/query', async (req: Request, res: Response) => {
  try {
    const { query } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'Query is required and must be a string'
      });
    }
    
    const results = await knowledgeGraph.queryKnowledge(query);
    
    res.json({
      success: true,
      results
    });
  } catch (error) {
    console.error('Error querying knowledge graph:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to query knowledge graph',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get all entities
router.get('/api/knowledge/entities', (req: Request, res: Response) => {
  try {
    const entities = knowledgeGraph.getAllEntities();
    res.json({
      success: true,
      count: entities.length,
      entities
    });
  } catch (error) {
    console.error('Error getting all entities:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get entities',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get all relationships
router.get('/api/knowledge/relationships', (req: Request, res: Response) => {
  try {
    const relationships = knowledgeGraph.getAllRelationships();
    res.json({
      success: true,
      count: relationships.length,
      relationships
    });
  } catch (error) {
    console.error('Error getting all relationships:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get relationships',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get entity by ID
router.get('/api/knowledge/entity/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'Entity ID is required'
      });
    }
    
    const entity = knowledgeGraph.getEntity(id);
    
    if (!entity) {
      return res.status(404).json({
        success: false,
        error: 'Entity not found',
        message: `No entity found with ID: ${id}`
      });
    }
    
    res.json({
      success: true,
      entity
    });
  } catch (error) {
    console.error('Error getting entity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get entity',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get relationship by ID
router.get('/api/knowledge/relationship/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'Relationship ID is required'
      });
    }
    
    const relationship = knowledgeGraph.getRelationship(id);
    
    if (!relationship) {
      return res.status(404).json({
        success: false,
        error: 'Relationship not found',
        message: `No relationship found with ID: ${id}`
      });
    }
    
    res.json({
      success: true,
      relationship
    });
  } catch (error) {
    console.error('Error getting relationship:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get relationship',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;