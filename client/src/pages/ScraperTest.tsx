import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// Use our custom spinner component
import { Spinner } from '../components/ui/spinner';
import axios from 'axios';

export default function ScraperTest() {
  const [businessType, setBusinessType] = useState('smoke shop');
  const [location, setLocation] = useState('New York');
  const [limit, setLimit] = useState(10);
  const [source, setSource] = useState('adaptive');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const runStandardScraper = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.post('/api/panion/scrape', {
        targetType: businessType,
        location,
        limit,
        additionalParams: {}
      });
      setResults(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'An error occurred');
      console.error('Scraping error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const runEnhancedScraper = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.post('/api/panion/scrape/enhanced', {
        businessType,
        location,
        limit,
        source
      });
      setResults(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'An error occurred');
      console.error('Enhanced scraping error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">Adaptive Web Scraper Test</h1>
      <p className="text-gray-500 mb-8">
        This page tests the enhanced scraper with adaptive strategy selection.
      </p>

      <Tabs defaultValue="enhanced">
        <TabsList className="mb-6">
          <TabsTrigger value="enhanced">Enhanced Scraper</TabsTrigger>
          <TabsTrigger value="standard">Standard Scraper</TabsTrigger>
        </TabsList>

        <TabsContent value="enhanced">
          <Card>
            <CardHeader>
              <CardTitle>Enhanced Scraper with Adaptive Strategy</CardTitle>
              <CardDescription>
                Tests the advanced scraper with fallback mechanisms and adaptive strategy selection.
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
                      placeholder="e.g., smoke shop, coffee, restaurant"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g., New York, Los Angeles"
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
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={runEnhancedScraper} 
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? <><Spinner size="sm" className="mr-2" /> Running Enhanced Scraper...</> : 'Run Enhanced Scraper'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="standard">
          <Card>
            <CardHeader>
              <CardTitle>Standard Scraper</CardTitle>
              <CardDescription>
                Test the standard scraper implementation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="stdBusinessType">Business Type</Label>
                    <Input
                      id="stdBusinessType"
                      value={businessType}
                      onChange={(e) => setBusinessType(e.target.value)}
                      placeholder="e.g., smoke shop, coffee, restaurant"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stdLocation">Location</Label>
                    <Input
                      id="stdLocation"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g., New York, Los Angeles"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stdLimit">Result Limit</Label>
                  <Input
                    id="stdLimit"
                    type="number"
                    value={limit}
                    onChange={(e) => setLimit(parseInt(e.target.value))}
                    min={1}
                    max={50}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={runStandardScraper} 
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? <><Spinner size="sm" className="mr-2" /> Running Standard Scraper...</> : 'Run Standard Scraper'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      {error && (
        <div className="mt-6 p-4 bg-red-50 text-red-800 rounded-md border border-red-200">
          <h3 className="font-semibold mb-2">Error</h3>
          <p>{error}</p>
        </div>
      )}

      {results && (
        <div className="mt-6">
          <h2 className="text-xl font-bold mb-4">Results</h2>
          <Card>
            <CardHeader>
              <CardTitle>
                {results.result_count} Results Found
                {results.last_successful_strategy && (
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    (Strategy: {results.last_successful_strategy})
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto max-h-[400px]">
                <pre className="bg-gray-100 p-4 rounded-md text-sm">
                  {JSON.stringify(results, null, 2)}
                </pre>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}