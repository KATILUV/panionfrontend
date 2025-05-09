import axios from 'axios';
import { JSDOM } from 'jsdom';
import * as cheerio from 'cheerio';
import * as ExcelJS from 'exceljs';
import { parse as parseCsv, stringify as stringifyCsv } from 'csv/sync';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { createObjectCsvWriter } from 'csv-writer';

// Types
interface ExtractedData {
  type: 'link' | 'business' | 'contact' | 'profile';
  title: string;
  url?: string;
  description?: string;
  data?: Record<string, any>;
}

interface FetchResult {
  content: string;
  title: string;
  url: string;
  extractedData: ExtractedData[];
  sessionData?: Record<string, any>;
}

interface SearchResult {
  title: string;
  url: string;
  description: string;
}

interface ExportOptions {
  data: ExtractedData[];
  format: 'json' | 'csv' | 'xlsx';
}

// Cache for storing pages and session state to avoid duplicate requests
const pageCache: Record<string, { 
  content: string, 
  timestamp: number, 
  extractedData: ExtractedData[] 
}> = {};

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0'
];

// Get a random user agent
const getRandomUserAgent = () => {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
};

// Main function to fetch a URL and extract data
export async function fetchUrl(url: string, sessionState?: Record<string, any>): Promise<FetchResult> {
  // Check cache first (expires after 5 minutes)
  const now = Date.now();
  const cacheKey = url + (sessionState ? JSON.stringify(sessionState) : '');
  
  if (pageCache[cacheKey] && now - pageCache[cacheKey].timestamp < 5 * 60 * 1000) {
    return {
      content: pageCache[cacheKey].content,
      title: extractTitle(pageCache[cacheKey].content) || url,
      url,
      extractedData: pageCache[cacheKey].extractedData,
      sessionData: sessionState
    };
  }

  try {
    // Make the request with a random user agent
    const response = await axios.get(url, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        // Add cookies from session state if available
        ...(sessionState?.cookies ? { 'Cookie': sessionState.cookies } : {})
      },
      maxRedirects: 5,
      timeout: 10000
    });

    // Extract cookies from response
    const cookies = response.headers['set-cookie'];
    const newSessionData = {
      ...sessionState,
      cookies: cookies ? cookies.join('; ') : (sessionState?.cookies || '')
    };

    // Get the HTML content
    const htmlContent = response.data;
    
    // Extract data from the page
    const extractedData = extractDataFromHtml(htmlContent, url);
    
    // Store in cache
    pageCache[cacheKey] = {
      content: htmlContent,
      timestamp: now,
      extractedData
    };
    
    return {
      content: htmlContent,
      title: extractTitle(htmlContent) || url,
      url,
      extractedData,
      sessionData: newSessionData
    };
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    throw new Error(`Failed to fetch ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Function to search using a search engine or API
export async function search(query: string): Promise<SearchResult[]> {
  try {
    // In a real implementation, you would use a search API like Google Custom Search or Bing Search API
    // For this example, we'll simulate search results
    const searchResults: SearchResult[] = [
      {
        title: `Search results for "${query}"`,
        url: `https://example.com/search?q=${encodeURIComponent(query)}`,
        description: 'Example search result page'
      },
      {
        title: `${query} - Wikipedia`,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(query.replace(/\\s+/g, '_'))}`,
        description: 'Wikipedia article'
      },
      {
        title: `Learn about ${query}`,
        url: `https://www.example.org/${encodeURIComponent(query.toLowerCase())}`,
        description: 'Educational resource'
      },
      {
        title: `${query} Latest News`,
        url: `https://news.example.com/topics/${encodeURIComponent(query.toLowerCase())}`,
        description: 'News articles and updates'
      }
    ];
    
    return searchResults;
  } catch (error) {
    console.error(`Error searching for ${query}:`, error);
    throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Function to export data in different formats
export async function exportData(options: ExportOptions): Promise<{ filePath: string, fileName: string }> {
  const { data, format } = options;
  const fileName = `exported-data-${Date.now()}.${format}`;
  const filePath = path.join('uploads', fileName);
  
  // Create the uploads directory if it doesn't exist
  if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads', { recursive: true });
  }
  
  try {
    if (format === 'json') {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } 
    else if (format === 'csv') {
      // Flatten the data for CSV
      const flattenedData = data.map(item => {
        const flattened = {
          type: item.type,
          title: item.title,
          url: item.url || '',
          description: item.description || ''
        };
        
        // Add flattened properties from the data object
        if (item.data) {
          Object.entries(item.data).forEach(([key, value]) => {
            flattened[key] = value;
          });
        }
        
        return flattened;
      });
      
      // Get all possible headers
      const headers = new Set<string>();
      flattenedData.forEach(item => {
        Object.keys(item).forEach(key => headers.add(key));
      });
      
      // Create CSV writer
      const csvWriter = createObjectCsvWriter({
        path: filePath,
        header: Array.from(headers).map(header => ({ id: header, title: header }))
      });
      
      await csvWriter.writeRecords(flattenedData);
    } 
    else if (format === 'xlsx') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Extracted Data');
      
      // Group data by type
      const groupedData = data.reduce((acc, item) => {
        if (!acc[item.type]) {
          acc[item.type] = [];
        }
        acc[item.type].push(item);
        return acc;
      }, {});
      
      // Create a worksheet for each data type
      Object.entries(groupedData).forEach(([type, items]) => {
        const sheet = workbook.addWorksheet(type.charAt(0).toUpperCase() + type.slice(1) + 's');
        
        // Get all possible columns for this type
        const columns = new Set<string>(['title', 'url', 'description']);
        items.forEach(item => {
          if (item.data) {
            Object.keys(item.data).forEach(key => columns.add(key));
          }
        });
        
        // Add headers
        sheet.columns = Array.from(columns).map(header => ({
          header,
          key: header,
          width: 20
        }));
        
        // Add rows
        items.forEach(item => {
          const row = {
            title: item.title,
            url: item.url || '',
            description: item.description || ''
          };
          
          if (item.data) {
            Object.entries(item.data).forEach(([key, value]) => {
              row[key] = value;
            });
          }
          
          sheet.addRow(row);
        });
        
        // Style the header row
        const headerRow = sheet.getRow(1);
        headerRow.font = { bold: true };
        headerRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' }
        };
      });
      
      // Create a summary worksheet
      const summarySheet = workbook.getWorksheet('Extracted Data');
      summarySheet.columns = [
        { header: 'Data Type', key: 'type', width: 20 },
        { header: 'Count', key: 'count', width: 10 }
      ];
      
      Object.entries(groupedData).forEach(([type, items]) => {
        summarySheet.addRow({
          type: type.charAt(0).toUpperCase() + type.slice(1) + 's',
          count: items.length
        });
      });
      
      // Style the header row
      const headerRow = summarySheet.getRow(1);
      headerRow.font = { bold: true };
      
      await workbook.xlsx.writeFile(filePath);
    }
    
    return { filePath, fileName };
  } catch (error) {
    console.error(`Error exporting data as ${format}:`, error);
    throw new Error(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper function to extract title from HTML
function extractTitle(html: string): string | null {
  try {
    const $ = cheerio.load(html);
    return $('title').text() || null;
  } catch (error) {
    console.error('Error extracting title:', error);
    return null;
  }
}

// Helper function to extract data from HTML
function extractDataFromHtml(html: string, sourceUrl: string): ExtractedData[] {
  const extractedData: ExtractedData[] = [];
  try {
    const $ = cheerio.load(html);
    
    // Extract links
    $('a[href]').each((_, element) => {
      const href = $(element).attr('href');
      if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
        // Normalize URL
        let url = href;
        if (url.startsWith('/')) {
          try {
            const baseUrl = new URL(sourceUrl);
            url = `${baseUrl.protocol}//${baseUrl.host}${url}`;
          } catch (e) {
            // Invalid URL, skip
            return;
          }
        } else if (!url.startsWith('http')) {
          try {
            url = new URL(url, sourceUrl).toString();
          } catch (e) {
            // Invalid URL, skip
            return;
          }
        }
        
        extractedData.push({
          type: 'link',
          title: $(element).text().trim() || url,
          url,
          description: $(element).attr('title')
        });
      }
    });
    
    // Extract business information
    // Look for common business page patterns
    const businessName = $('h1').first().text().trim() || 
                          $('meta[property="og:title"]').attr('content') || 
                          $('meta[name="title"]').attr('content');
    
    const addressElements = $('address, .address, [itemtype*="PostalAddress"]');
    const phoneElements = $('[href^="tel:"], .phone, .telephone, [itemtype*="ContactPoint"]');
    const emailElements = $('[href^="mailto:"], .email, [itemtype*="ContactPoint"]');
    
    if (addressElements.length > 0 || phoneElements.length > 0 || emailElements.length > 0) {
      const businessData: Record<string, string> = {};
      
      // Extract address
      if (addressElements.length > 0) {
        businessData.address = addressElements.first().text().trim();
      }
      
      // Extract phone
      if (phoneElements.length > 0) {
        const phoneHref = phoneElements.first().attr('href');
        businessData.phone = phoneHref 
          ? phoneHref.replace('tel:', '') 
          : phoneElements.first().text().trim();
      }
      
      // Extract email
      if (emailElements.length > 0) {
        const emailHref = emailElements.first().attr('href');
        businessData.email = emailHref 
          ? emailHref.replace('mailto:', '') 
          : emailElements.first().text().trim();
      }
      
      // Add website
      businessData.website = sourceUrl;
      
      // Add business hours if available
      const hoursElements = $('.hours, [itemtype*="OpeningHoursSpecification"]');
      if (hoursElements.length > 0) {
        businessData.hours = hoursElements.first().text().trim();
      }
      
      extractedData.push({
        type: 'business',
        title: businessName || 'Business Information',
        url: sourceUrl,
        data: businessData
      });
    }
    
    // Extract contact information (people)
    const contactElements = $('[itemtype*="Person"], .team-member, .staff, .employee, .contact-person');
    contactElements.each((_, element) => {
      const nameElement = $(element).find('h2, h3, h4, .name, [property*="name"]').first();
      const name = nameElement.text().trim();
      
      if (name) {
        const contactData: Record<string, string> = { name };
        
        // Get title/position
        const titleElement = $(element).find('.title, .position, [property*="jobTitle"]').first();
        if (titleElement.length > 0) {
          contactData.title = titleElement.text().trim();
        }
        
        // Get phone
        const contactPhone = $(element).find('[href^="tel:"], .phone').first();
        if (contactPhone.length > 0) {
          const phoneHref = contactPhone.attr('href');
          contactData.phone = phoneHref 
            ? phoneHref.replace('tel:', '') 
            : contactPhone.text().trim();
        }
        
        // Get email
        const contactEmail = $(element).find('[href^="mailto:"], .email').first();
        if (contactEmail.length > 0) {
          const emailHref = contactEmail.attr('href');
          contactData.email = emailHref 
            ? emailHref.replace('mailto:', '') 
            : contactEmail.text().trim();
        }
        
        extractedData.push({
          type: 'contact',
          title: name,
          url: sourceUrl,
          data: contactData
        });
      }
    });
    
    // Extract social media profiles and links
    const socialLinks = $('a[href*="linkedin.com"], a[href*="twitter.com"], a[href*="facebook.com"], a[href*="instagram.com"]');
    socialLinks.each((_, element) => {
      const href = $(element).attr('href');
      if (href) {
        let platform = 'Unknown';
        if (href.includes('linkedin.com')) platform = 'LinkedIn';
        else if (href.includes('twitter.com')) platform = 'Twitter';
        else if (href.includes('facebook.com')) platform = 'Facebook';
        else if (href.includes('instagram.com')) platform = 'Instagram';
        
        extractedData.push({
          type: 'profile',
          title: `${platform} Profile`,
          url: href,
          data: {
            platform,
            url: href
          }
        });
      }
    });
    
    return extractedData;
  } catch (error) {
    console.error('Error extracting data from HTML:', error);
    return [];
  }
}