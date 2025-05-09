import { Router, Request, Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { fetchUrl, search, exportData } from '../browser-service';

const router = Router();

// Endpoint to fetch a URL
router.post('/api/browser/fetch', async (req: Request, res: Response) => {
  try {
    const { url, sessionState } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    const result = await fetchUrl(url, sessionState);
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching URL:', error);
    res.status(500).json({ 
      error: 'Failed to fetch URL', 
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Endpoint to search
router.get('/api/browser/search', async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    const results = await search(q);
    
    // Format search results as HTML for display in the browser component
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Search Results for "${q}"</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
          h1 { font-size: 24px; margin-bottom: 20px; }
          .search-item { margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #eee; }
          .search-item:last-child { border-bottom: none; }
          .search-item a { color: #1a0dab; text-decoration: none; font-size: 18px; }
          .search-item a:hover { text-decoration: underline; }
          .search-item .url { color: #006621; font-size: 14px; margin: 4px 0; }
          .search-item .description { color: #545454; font-size: 14px; }
        </style>
      </head>
      <body>
        <h1>Search Results for "${q}"</h1>
        <div class="search-results">
          ${results.map(result => `
            <div class="search-item">
              <a href="${result.url}">${result.title}</a>
              <div class="url">${result.url}</div>
              <div class="description">${result.description}</div>
            </div>
          `).join('')}
        </div>
      </body>
      </html>
    `;
    
    res.json({
      content: htmlContent,
      title: `Search Results for "${q}"`,
      url: `/api/browser/search?q=${encodeURIComponent(q)}`,
      extractedData: results.map(result => ({
        type: 'link',
        title: result.title,
        url: result.url,
        description: result.description
      }))
    });
  } catch (error) {
    console.error('Error searching:', error);
    res.status(500).json({ 
      error: 'Search failed', 
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Endpoint to export data
router.post('/api/browser/export', async (req: Request, res: Response) => {
  try {
    const { data, format } = req.body;
    
    if (!data || !Array.isArray(data)) {
      return res.status(400).json({ error: 'Data array is required' });
    }
    
    if (!format || !['json', 'csv', 'xlsx'].includes(format)) {
      return res.status(400).json({ error: 'Valid format (json, csv, xlsx) is required' });
    }
    
    const { filePath, fileName } = await exportData({ data, format });
    
    // Set appropriate content type
    let contentType = 'application/octet-stream';
    if (format === 'json') contentType = 'application/json';
    else if (format === 'csv') contentType = 'text/csv';
    else if (format === 'xlsx') contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    
    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    // Clean up the file after sending
    fileStream.on('end', () => {
      fs.unlink(filePath, (err) => {
        if (err) console.error(`Error deleting temporary file ${filePath}:`, err);
      });
    });
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ 
      error: 'Export failed', 
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Endpoint to save extracted data
router.post('/api/browser/save', async (req: Request, res: Response) => {
  try {
    const { items, collectionName } = req.body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'At least one data item is required' });
    }
    
    // In a real application, you would save these items to a database
    // For this example, we'll save them to a JSON file
    const collectionFileName = `${collectionName || 'browser_extracted_data'}.json`;
    const filePath = path.join('data', collectionFileName);
    
    // Create the data directory if it doesn't exist
    if (!fs.existsSync('data')) {
      fs.mkdirSync('data', { recursive: true });
    }
    
    // Load existing data or create new array
    let existingData = [];
    try {
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        existingData = JSON.parse(fileContent);
      }
    } catch (err) {
      console.error(`Error reading existing data file ${filePath}:`, err);
    }
    
    // Add new items
    const updatedData = [...existingData, ...items.map(item => ({
      ...item,
      id: item.id || `item_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      savedAt: new Date().toISOString()
    }))];
    
    // Save the updated data
    fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 2));
    
    res.json({ 
      success: true, 
      message: `Saved ${items.length} item(s) to ${collectionFileName}`,
      count: items.length,
      totalItems: updatedData.length
    });
  } catch (error) {
    console.error('Error saving data:', error);
    res.status(500).json({ 
      error: 'Save failed', 
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;