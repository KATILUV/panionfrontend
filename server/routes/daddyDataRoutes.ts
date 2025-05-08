import { Router, Request, Response } from 'express';
import axios from 'axios';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const router = Router();

// Create a directory for uploads if it doesn't exist
const dataDir = path.join(process.cwd(), 'data', 'daddy_data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Mock data for development (will be replaced by actual agent calls)
let tasks: any[] = [];
let taskCounter = 0;

// Helper to run the Daddy Data agent Python script
async function runDaddyDataAgent(action: string, params: any): Promise<any> {
  return new Promise((resolve, reject) => {
    // In a production environment, this would properly interact with the Python agent
    // For now, we'll simulate the agent's behavior
    
    setTimeout(() => {
      const taskId = `task_${++taskCounter}_${Date.now()}`;

      switch (action) {
        case 'search':
          const searchResults = {
            task_id: taskId,
            status: 'completed',
            query: params.query,
            location: params.location,
            count: Math.floor(Math.random() * 20) + 5,
            results: Array.from({ length: Math.floor(Math.random() * 20) + 5 }, (_, i) => ({
              name: `${params.query} Business ${i + 1}`,
              phone: `555-${String(i).padStart(3, '0')}-${String(1000 + i).padStart(4, '0')}`,
              address: `${i * 100 + 100} Main St, ${params.location || 'New York'}`,
              website: `https://example${i}.com`,
              sources: ['google_maps', 'yelp'].slice(0, Math.floor(Math.random() * 2) + 1)
            }))
          };
          
          tasks.push({
            id: taskId,
            type: 'search',
            params,
            result: searchResults,
            created_at: new Date().toISOString()
          });
          
          resolve(searchResults);
          break;

        case 'verify':
          const verifyResults = {
            task_id: taskId,
            status: 'completed',
            total_verified: params.data.length,
            high_confidence_count: Math.floor(params.data.length * 0.8),
            threshold: 0.7,
            results: params.data.map((item: any) => ({
              original: item,
              verified_fields: {
                name: item.name,
                phone: item.phone,
                address: item.address,
                website: item.website
              },
              confidence_scores: {
                name: Math.random() * 0.3 + 0.7,
                phone: Math.random() * 0.3 + 0.7,
                address: Math.random() * 0.3 + 0.7,
                website: Math.random() * 0.3 + 0.7
              },
              overall_confidence: Math.random() * 0.3 + 0.7
            }))
          };
          
          tasks.push({
            id: taskId,
            type: 'verify',
            params,
            result: verifyResults,
            created_at: new Date().toISOString()
          });
          
          resolve(verifyResults);
          break;

        case 'organize':
          const filename = `data_${Date.now()}.${params.format || 'json'}`;
          const filePath = path.join(dataDir, filename);
          
          let data: any;
          if (params.data[0] && params.data[0].verified_fields) {
            // Process verified data format
            data = params.data.map((item: any) => ({
              ...item.verified_fields,
              overall_confidence: item.overall_confidence
            }));
          } else {
            data = params.data;
          }
          
          // Create dummy file
          if (params.format === 'json' || !params.format) {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
          } else {
            // For other formats, just create an empty file
            fs.writeFileSync(filePath, '');
          }
          
          const organizeResults = {
            task_id: taskId,
            status: 'completed',
            format: params.format || 'json',
            file_path: filePath,
            row_count: data.length
          };
          
          tasks.push({
            id: taskId,
            type: 'organize',
            params,
            result: organizeResults,
            created_at: new Date().toISOString()
          });
          
          resolve(organizeResults);
          break;

        default:
          reject(new Error(`Unknown action: ${action}`));
      }
    }, 1500); // Simulate processing time
  });
}

// Search for businesses
router.post('/api/daddy-data/search', async (req: Request, res: Response) => {
  try {
    const { query, location, limit = 100 } = req.body;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter is required'
      });
    }
    
    const result = await runDaddyDataAgent('search', { query, location, limit });
    
    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error in /api/daddy-data/search:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

// Verify data
router.post('/api/daddy-data/verify', async (req: Request, res: Response) => {
  try {
    const { data, fields_to_verify } = req.body;
    
    if (!data || !Array.isArray(data) || data.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Data array is required and must not be empty'
      });
    }
    
    const result = await runDaddyDataAgent('verify', { data, fields_to_verify });
    
    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error in /api/daddy-data/verify:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

// Organize data
router.post('/api/daddy-data/organize', async (req: Request, res: Response) => {
  try {
    const { data, format = 'excel', structure } = req.body;
    
    if (!data || !Array.isArray(data) || data.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Data array is required and must not be empty'
      });
    }
    
    const result = await runDaddyDataAgent('organize', { data, format, structure });
    
    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error in /api/daddy-data/organize:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

// Get task status
router.get('/api/daddy-data/task/:taskId', async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    
    const task = tasks.find(t => t.id === taskId);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        error: `Task ${taskId} not found`
      });
    }
    
    return res.status(200).json({
      success: true,
      task
    });
  } catch (error) {
    console.error('Error in /api/daddy-data/task/:taskId:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

// Download file
router.get('/api/daddy-data/download/:filename', (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(dataDir, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: `File ${filename} not found`
      });
    }
    
    return res.download(filePath);
  } catch (error) {
    console.error('Error in /api/daddy-data/download/:filename:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

// Get all tasks
router.get('/api/daddy-data/tasks', (req: Request, res: Response) => {
  return res.status(200).json({
    success: true,
    tasks
  });
});

export default router;