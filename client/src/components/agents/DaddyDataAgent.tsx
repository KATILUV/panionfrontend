import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '../../components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Search, Download, Database, Layers, Check, X } from 'lucide-react';
import axios from 'axios';

// Define TS interfaces for our data
interface ScrapedBusiness {
  name: string;
  address: string;
  phone?: string;
  website?: string;
  rating?: string | number;
  image_url?: string;
  categories?: string[];
  hours?: Record<string, string>;
  reviews?: string[];
  latitude?: number;
  longitude?: number;
}

interface ScraperResult {
  status: 'success' | 'error';
  result_count: number;
  results: ScrapedBusiness[];
  last_successful_strategy?: string;
  query_info?: {
    business_type: string;
    location: string;
    source?: string;
  };
  error?: string;
  blocked_strategies?: string[];
  cache_used?: boolean;
  cache_timestamp?: string;
}

export default function DaddyDataAgent() {
  const [activeTab, setActiveTab] = useState('scrape');
  
  // Scraper state
  const [businessType, setBusinessType] = useState('coffee shop');
  const [location, setLocation] = useState('New York');
  const [limit, setLimit] = useState(10);
  const [source, setSource] = useState('adaptive');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<ScraperResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedSearches, setSavedSearches] = useState<Array<{id: string, query: string, results: number}>>([]);
  const [useEnhancedScraper, setUseEnhancedScraper] = useState(true);
  
  // Analysis state
  const [selectedData, setSelectedData] = useState<ScrapedBusiness[] | null>(null);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [analysisPrompt, setAnalysisPrompt] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Load saved searches on mount
  useEffect(() => {
    const loadSavedSearches = async () => {
      try {
        // In a real app, we'd fetch this from the server
        const mockSavedSearches = [
          { id: '1', query: 'coffee shops in Seattle', results: 15 },
          { id: '2', query: 'restaurants in Chicago', results: 24 },
          { id: '3', query: 'bookstores in Portland', results: 8 }
        ];
        setSavedSearches(mockSavedSearches);
      } catch (err) {
        console.error('Error loading saved searches', err);
      }
    };
    
    loadSavedSearches();
  }, []);

  const runScraper = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const endpoint = useEnhancedScraper ? '/api/panion/scrape/enhanced' : '/api/panion/scrape';
      
      const payload = useEnhancedScraper 
        ? {
            businessType,
            location,
            limit,
            source
          } 
        : {
            targetType: businessType,
            location,
            limit,
            additionalParams: {}
          };
          
      const response = await axios.post(endpoint, payload);
      
      // Transform the response into our ScraperResult format
      const result: ScraperResult = {
        status: 'success',
        result_count: response.data.result_count || response.data.results?.length || 0,
        results: response.data.results || [],
        last_successful_strategy: response.data.last_successful_strategy,
        query_info: {
          business_type: businessType,
          location,
          source: useEnhancedScraper ? source : 'standard'
        },
        blocked_strategies: response.data.blocked_strategies,
        cache_used: response.data.cache_used,
        cache_timestamp: response.data.cache_timestamp
      };
      
      setResults(result);
      
      // If we got results, make them available for analysis
      if (result.results && result.results.length > 0) {
        setSelectedData(result.results);
      }
      
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'An error occurred');
      console.error('Scraping error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const runAnalysis = async () => {
    if (!selectedData) {
      setError('No data to analyze');
      return;
    }
    
    setIsAnalyzing(true);
    
    try {
      // Mock analysis for now - in a real implementation, we'd send this to the backend
      // where Daddy Data agent would process it through an LLM
      const mockResponse = `Analysis of ${selectedData.length} businesses in ${location}:
      
- Average rating: ${(selectedData.reduce((acc, curr) => acc + (parseFloat(curr.rating as string) || 0), 0) / selectedData.length).toFixed(1)}
- Most common categories: Cafe, Restaurant, Coffee Shop
- Geographic concentration: Primarily in downtown and midtown areas
- ${selectedData.length > 5 ? 'Competitive market with many options' : 'Limited options in this category'}
- Most businesses ${selectedData.filter(b => b.website).length > selectedData.length/2 ? 'have' : 'do not have'} websites
      
${analysisPrompt ? `Regarding your specific question ("${analysisPrompt}"):
The data suggests that the most successful businesses in this category focus on unique offerings and strong online presence.` : ''}`;
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setAnalysisResult(mockResponse);
    } catch (err: any) {
      setError(err.message || 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveSearch = () => {
    if (!results) return;
    
    const newSavedSearch = {
      id: Date.now().toString(),
      query: `${businessType} in ${location}`,
      results: results.result_count
    };
    
    setSavedSearches([newSavedSearch, ...savedSearches]);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-purple-500" />
          <h1 className="text-xl font-semibold">Daddy Data Agent</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch 
              id="enhanced-mode"
              checked={useEnhancedScraper}
              onCheckedChange={setUseEnhancedScraper}
            />
            <Label htmlFor="enhanced-mode">Enhanced Scraper</Label>
          </div>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="px-4 pt-2">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="scrape">Scrape</TabsTrigger>
            <TabsTrigger value="analyze">Analyze</TabsTrigger>
            <TabsTrigger value="saved">Saved</TabsTrigger>
          </TabsList>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          <TabsContent value="scrape" className="mt-0 h-full">
            <div className="grid gap-4 h-full">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Web Scraper</CardTitle>
                  <CardDescription>
                    Find business data across multiple sources with adaptive scraping
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="businessType">Business Type</Label>
                        <Input
                          id="businessType"
                          value={businessType}
                          onChange={(e) => setBusinessType(e.target.value)}
                          placeholder="e.g., coffee shop, restaurant"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="location">Location</Label>
                        <Input
                          id="location"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          placeholder="e.g., New York, Chicago"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="limit">Result Limit</Label>
                        <Input
                          id="limit"
                          type="number"
                          value={limit}
                          onChange={(e) => setLimit(parseInt(e.target.value))}
                          min={1}
                          max={50}
                        />
                      </div>
                      {useEnhancedScraper && (
                        <div className="space-y-2">
                          <Label htmlFor="source">Preferred Source</Label>
                          <Select value={source} onValueChange={setSource}>
                            <SelectTrigger id="source">
                              <SelectValue placeholder="Select preferred source" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="adaptive">Adaptive (Auto-select)</SelectItem>
                              <SelectItem value="yelp">Yelp</SelectItem>
                              <SelectItem value="yellowpages">Yellow Pages</SelectItem>
                              <SelectItem value="google_maps_api">Google Maps API</SelectItem>
                              <SelectItem value="cached_data">Cached Data</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    onClick={runScraper} 
                    disabled={isLoading}
                    className="w-full"
                  >
                    {isLoading ? <><Spinner size="sm" className="mr-2" /> Running Scraper...</> : (
                      <><Search className="mr-2 h-4 w-4" /> Search Businesses</>
                    )}
                  </Button>
                </CardFooter>
              </Card>
              
              {error && (
                <div className="p-4 bg-red-50 text-red-800 rounded-md border border-red-200 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold mb-1">Error</h3>
                    <p>{error}</p>
                  </div>
                </div>
              )}
              
              {results && (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-center">
                      <CardTitle>Results</CardTitle>
                      <div className="flex gap-2">
                        <Badge variant={results.result_count > 0 ? "success" : "destructive"}>
                          {results.result_count} found
                        </Badge>
                        {results.cache_used && (
                          <Badge variant="outline">Cached</Badge>
                        )}
                        {results.last_successful_strategy && (
                          <Badge variant="secondary">
                            {results.last_successful_strategy}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <CardDescription>
                      {results.query_info?.business_type} in {results.query_info?.location}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-auto max-h-[400px] border rounded-md">
                      {results.results.length > 0 ? (
                        <table className="w-full text-sm">
                          <thead className="bg-muted/50 sticky top-0">
                            <tr>
                              <th className="p-2 text-left font-medium">Name</th>
                              <th className="p-2 text-left font-medium">Address</th>
                              <th className="p-2 text-left font-medium">Phone</th>
                              <th className="p-2 text-left font-medium">Rating</th>
                            </tr>
                          </thead>
                          <tbody>
                            {results.results.map((business, index) => (
                              <tr key={index} className="border-t hover:bg-muted/50">
                                <td className="p-2">
                                  <div className="font-medium">{business.name}</div>
                                  {business.categories && (
                                    <div className="text-xs text-muted-foreground">
                                      {business.categories.join(', ')}
                                    </div>
                                  )}
                                </td>
                                <td className="p-2">{business.address}</td>
                                <td className="p-2">{business.phone || 'N/A'}</td>
                                <td className="p-2">{business.rating || 'N/A'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="p-4 text-center text-muted-foreground">
                          No results found
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button variant="outline" onClick={() => setResults(null)}>
                      Clear Results
                    </Button>
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={saveSearch}>
                        <Database className="mr-2 h-4 w-4" /> Save Search
                      </Button>
                      <Button variant="default" onClick={() => setActiveTab('analyze')}>
                        <Layers className="mr-2 h-4 w-4" /> Analyze Data
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="analyze" className="mt-0 h-full">
            <div className="grid gap-4 h-full">
              <Card>
                <CardHeader>
                  <CardTitle>Data Analysis</CardTitle>
                  <CardDescription>
                    Analyze your collected data using AI-powered insights
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="data-source">Data to Analyze</Label>
                      <Select 
                        value={selectedData ? "current" : ""} 
                        onValueChange={(val) => {
                          if (val === "current" && results) {
                            setSelectedData(results.results);
                          } else {
                            setSelectedData(null);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select data source" />
                        </SelectTrigger>
                        <SelectContent>
                          {results && (
                            <SelectItem value="current">
                              Current Results ({results.query_info?.business_type} in {results.query_info?.location})
                            </SelectItem>
                          )}
                          {savedSearches.map(search => (
                            <SelectItem key={search.id} value={search.id}>
                              {search.query} ({search.results} results)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="analysis-prompt">Analysis Instructions (Optional)</Label>
                      <Textarea 
                        id="analysis-prompt"
                        value={analysisPrompt}
                        onChange={(e) => setAnalysisPrompt(e.target.value)}
                        placeholder="What would you like to know about this data? (e.g., 'What are the highest rated businesses?' or 'Find patterns in the business hours')"
                        className="min-h-[100px]"
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    onClick={runAnalysis}
                    disabled={!selectedData || isAnalyzing}
                    className="w-full"
                  >
                    {isAnalyzing ? 
                      <><Spinner size="sm" className="mr-2" /> Analyzing Data...</> : 
                      <>Analyze Data</>
                    }
                  </Button>
                </CardFooter>
              </Card>
              
              {analysisResult && (
                <Card>
                  <CardHeader>
                    <CardTitle>Analysis Results</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="whitespace-pre-line bg-muted/50 p-4 rounded-md">
                      {analysisResult}
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button variant="outline" onClick={() => setAnalysisResult(null)}>
                      Clear
                    </Button>
                    <Button variant="secondary">
                      <Download className="mr-2 h-4 w-4" /> Export Analysis
                    </Button>
                  </CardFooter>
                </Card>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="saved" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Saved Searches</CardTitle>
                <CardDescription>
                  Access your previous data collection efforts
                </CardDescription>
              </CardHeader>
              <CardContent>
                {savedSearches.length > 0 ? (
                  <div className="space-y-2">
                    {savedSearches.map(search => (
                      <div key={search.id} className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50">
                        <div>
                          <div className="font-medium">{search.query}</div>
                          <div className="text-sm text-muted-foreground">{search.results} results</div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm">
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No saved searches yet
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}