import { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { 
  Search, 
  Database, 
  FileSpreadsheet, 
  BarChartHorizontal,
  Filter, 
  Check, 
  X, 
  Clock, 
  Download,
  HelpCircle,
  AlertCircle,
  FileCog,
  Loader2
} from 'lucide-react';

interface SearchResult {
  name: string;
  phone: string;
  address: string;
  website?: string;
  sources: string[];
  [key: string]: any;
}

interface Task {
  id: string;
  type: string;
  params: any;
  result: any;
  created_at: string;
}

interface VerifiedData {
  original: any;
  verified_fields: any;
  confidence_scores: any;
  overall_confidence: number;
}

const DaddyDataAgent = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('search');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLocation, setSearchLocation] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [filteredResults, setFilteredResults] = useState<SearchResult[]>([]);
  const [selectedResults, setSelectedResults] = useState<SearchResult[]>([]);
  const [verifiedData, setVerifiedData] = useState<VerifiedData[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [exportFormat, setExportFormat] = useState('excel');
  const [downloadLink, setDownloadLink] = useState('');
  const [fieldsToVerify, setFieldsToVerify] = useState(['name', 'phone', 'address', 'website']);
  const [activeTaskId, setActiveTaskId] = useState('');
  const [taskProgress, setTaskProgress] = useState(0);
  const [filterMinConfidence, setFilterMinConfidence] = useState(0.7);
  
  // Load tasks on initial render
  useEffect(() => {
    fetchTasks();
  }, []);
  
  const fetchTasks = async () => {
    try {
      const response = await fetch('/api/daddy-data/tasks');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setTasks(data.tasks);
        }
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };
  
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Error",
        description: "Search query is required",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    setSearchResults([]);
    setFilteredResults([]);
    setSelectedResults([]);
    
    try {
      const response = await fetch('/api/daddy-data/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: searchQuery,
          location: searchLocation || undefined,
          limit: 100
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setActiveTaskId(data.task_id);
          setSearchResults(data.results || []);
          setFilteredResults(data.results || []);
          
          toast({
            title: "Search completed",
            description: `Found ${data.count} results`,
          });
        } else {
          throw new Error(data.error || 'Unknown error occurred');
        }
      } else {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('Error searching:', error);
      toast({
        title: "Search failed",
        description: error.message || "Failed to perform search",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleSelectResult = (result: SearchResult) => {
    if (selectedResults.some(r => r.phone === result.phone)) {
      setSelectedResults(selectedResults.filter(r => r.phone !== result.phone));
    } else {
      setSelectedResults([...selectedResults, result]);
    }
  };
  
  const handleSelectAll = () => {
    if (selectedResults.length === filteredResults.length) {
      setSelectedResults([]);
    } else {
      setSelectedResults([...filteredResults]);
    }
  };
  
  const handleVerifyData = async () => {
    if (selectedResults.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one result to verify",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    setVerifiedData([]);
    
    try {
      const response = await fetch('/api/daddy-data/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: selectedResults,
          fields_to_verify: fieldsToVerify
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setActiveTaskId(data.task_id);
          setVerifiedData(data.results || []);
          setActiveTab('verify');
          
          toast({
            title: "Verification completed",
            description: `Verified ${data.total_verified} items, ${data.high_confidence_count} with high confidence`,
          });
        } else {
          throw new Error(data.error || 'Unknown error occurred');
        }
      } else {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('Error verifying data:', error);
      toast({
        title: "Verification failed",
        description: error.message || "Failed to verify data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleOrganizeData = async () => {
    if (verifiedData.length === 0) {
      toast({
        title: "Error",
        description: "No verified data to organize",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    setDownloadLink('');
    
    try {
      // Filter data by confidence if needed
      const dataToOrganize = verifiedData.filter(
        item => item.overall_confidence >= filterMinConfidence
      );
      
      if (dataToOrganize.length === 0) {
        throw new Error('No data meets the confidence threshold');
      }
      
      const response = await fetch('/api/daddy-data/organize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: dataToOrganize,
          format: exportFormat,
          structure: {
            columns: [
              { name: "Name", key: "name" },
              { name: "Phone", key: "phone" },
              { name: "Address", key: "address" },
              { name: "Website", key: "website" },
              { name: "Confidence", key: "overall_confidence" }
            ]
          }
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setActiveTaskId(data.task_id);
          
          // Extract filename from file_path
          const filename = data.file_path.split('/').pop();
          setDownloadLink(`/api/daddy-data/download/${filename}`);
          
          setActiveTab('export');
          
          toast({
            title: "Data organized successfully",
            description: `${data.row_count} records exported to ${data.format} format`,
          });
          
          // Refresh tasks
          fetchTasks();
        } else {
          throw new Error(data.error || 'Unknown error occurred');
        }
      } else {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('Error organizing data:', error);
      toast({
        title: "Export failed",
        description: error.message || "Failed to organize data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const filterByConfidence = (minConfidence: number) => {
    setFilterMinConfidence(minConfidence);
    // If we're in the verification tab, filter the verified data
    if (activeTab === 'verify' && verifiedData.length > 0) {
      const filtered = verifiedData.filter(
        item => item.overall_confidence >= minConfidence
      );
      toast({
        title: "Filtered by confidence",
        description: `Showing ${filtered.length} of ${verifiedData.length} records`,
      });
    }
  };
  
  const getConfidenceBadgeColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-500/20 text-green-700';
    if (confidence >= 0.6) return 'bg-yellow-500/20 text-yellow-700';
    return 'bg-red-500/20 text-red-700';
  };
  
  return (
    <div className="w-full max-w-7xl mx-auto p-4">
      <div className="flex items-center gap-2 mb-4">
        <Database className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Daddy Data Agent</h1>
      </div>
      <p className="text-gray-500 mb-6">
        Deep web research, data verification, and organization agent. Gather accurate information from multiple sources, verify it, and export to structured formats.
      </p>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="search" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Search
          </TabsTrigger>
          <TabsTrigger value="verify" className="flex items-center gap-2">
            <Check className="h-4 w-4" />
            Verify
          </TabsTrigger>
          <TabsTrigger value="export" className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Export
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Tasks
          </TabsTrigger>
        </TabsList>
        
        {/* Search Tab */}
        <TabsContent value="search" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Search for Data</CardTitle>
              <CardDescription>Find businesses and information across multiple sources</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="search-query">Search Query</Label>
                  <Input
                    id="search-query"
                    placeholder="e.g., smoke shops, doctors, restaurants"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="search-location">Location (Optional)</Label>
                  <Input
                    id="search-location"
                    placeholder="e.g., New York, California"
                    value={searchLocation}
                    onChange={(e) => setSearchLocation(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleSearch} 
                disabled={loading || !searchQuery.trim()} 
                className="w-full md:w-auto"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Search
              </Button>
            </CardFooter>
          </Card>
          
          {searchResults.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Search Results</CardTitle>
                    <CardDescription>Found {searchResults.length} results</CardDescription>
                  </div>
                  <Button variant="outline" onClick={handleVerifyData} disabled={selectedResults.length === 0}>
                    Verify Selected ({selectedResults.length})
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex justify-between items-center">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleSelectAll}
                    className="text-xs"
                  >
                    {selectedResults.length === filteredResults.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>
                
                <div className="space-y-4 max-h-[500px] overflow-y-auto p-1">
                  {filteredResults.map((result, index) => (
                    <div 
                      key={index} 
                      className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                        selectedResults.some(r => r.phone === result.phone) 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => handleSelectResult(result)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">{result.name}</h3>
                          <p className="text-sm">{result.phone}</p>
                          <p className="text-sm text-gray-500">{result.address}</p>
                          {result.website && (
                            <a 
                              href={result.website} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm text-blue-500 hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {result.website}
                            </a>
                          )}
                        </div>
                        <div className="flex flex-col items-end">
                          <div className={`h-5 w-5 rounded-full flex items-center justify-center ${
                            selectedResults.some(r => r.phone === result.phone)
                              ? 'bg-primary text-white'
                              : 'bg-gray-200'
                          }`}>
                            {selectedResults.some(r => r.phone === result.phone) && (
                              <Check className="h-3 w-3" />
                            )}
                          </div>
                          <div className="flex mt-2 gap-1">
                            {result.sources?.map((source) => (
                              <Badge key={source} variant="outline" className="text-xs">
                                {source}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        {/* Verify Tab */}
        <TabsContent value="verify" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Data Verification</CardTitle>
                  <CardDescription>
                    Verified data accuracy by cross-referencing multiple sources
                  </CardDescription>
                </div>
                <Button onClick={handleOrganizeData} disabled={loading || verifiedData.length === 0}>
                  Organize Data
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {verifiedData.length === 0 ? (
                <div className="text-center py-6">
                  <HelpCircle className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-lg font-semibold">No Verified Data</h3>
                  <p className="text-muted-foreground">
                    Search for data and select items to verify
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <Label htmlFor="confidence-filter">Minimum Confidence Threshold</Label>
                    <div className="flex items-center gap-2">
                      <input
                        id="confidence-filter"
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={filterMinConfidence}
                        onChange={(e) => filterByConfidence(parseFloat(e.target.value))}
                        className="w-full"
                      />
                      <span className="min-w-[3rem] text-right">{(filterMinConfidence * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                  
                  <div className="space-y-4 max-h-[500px] overflow-y-auto p-1">
                    {verifiedData
                      .filter(item => item.overall_confidence >= filterMinConfidence)
                      .map((item, index) => (
                        <div 
                          key={index} 
                          className="border rounded-lg p-3"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-semibold">{item.verified_fields.name || item.original.name}</h3>
                              <p className="text-sm">{item.verified_fields.phone || item.original.phone}</p>
                              <p className="text-sm text-gray-500">
                                {item.verified_fields.address || item.original.address}
                              </p>
                              {(item.verified_fields.website || item.original.website) && (
                                <a 
                                  href={item.verified_fields.website || item.original.website} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-500 hover:underline"
                                >
                                  {item.verified_fields.website || item.original.website}
                                </a>
                              )}
                            </div>
                            <div className="flex flex-col items-end">
                              <Badge className={`mb-2 ${getConfidenceBadgeColor(item.overall_confidence)}`}>
                                {(item.overall_confidence * 100).toFixed(0)}% Confidence
                              </Badge>
                              
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                {Object.entries(item.confidence_scores).map(([field, score]) => (
                                  <div key={field} className="flex items-center justify-between">
                                    <span className="capitalize">{field}:</span>
                                    <span className={score >= 0.8 ? 'text-green-600' : score >= 0.6 ? 'text-yellow-600' : 'text-red-600'}>
                                      {(Number(score) * 100).toFixed(0)}%
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Export Tab */}
        <TabsContent value="export" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Export Data</CardTitle>
              <CardDescription>
                Organize verified data into structured formats
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="export-format">Export Format</Label>
                  <Select 
                    value={exportFormat} 
                    onValueChange={setExportFormat}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excel">Excel Spreadsheet</SelectItem>
                      <SelectItem value="csv">CSV File</SelectItem>
                      <SelectItem value="json">JSON Data</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-end">
                  <Button 
                    onClick={handleOrganizeData} 
                    disabled={loading || verifiedData.length === 0}
                    className="w-full md:w-auto"
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Generate {exportFormat.toUpperCase()} File
                  </Button>
                </div>
              </div>
              
              {downloadLink && (
                <div className="mt-6">
                  <Alert className="bg-green-50 border-green-200">
                    <FileCog className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-800">File Ready for Download</AlertTitle>
                    <AlertDescription className="text-green-700">
                      Your data has been organized and is ready for download.
                    </AlertDescription>
                    
                    <div className="mt-4">
                      <Button asChild variant="default" className="gap-2">
                        <a href={downloadLink} download>
                          <Download className="h-4 w-4" />
                          Download {exportFormat.toUpperCase()} File
                        </a>
                      </Button>
                    </div>
                  </Alert>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Tasks Tab */}
        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Task History</CardTitle>
                  <CardDescription>
                    View previous search, verification and export tasks
                  </CardDescription>
                </div>
                <Button variant="outline" onClick={fetchTasks}>
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <div className="text-center py-6">
                  <Clock className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-lg font-semibold">No Tasks Yet</h3>
                  <p className="text-muted-foreground">
                    Tasks will appear here as you search, verify, and organize data
                  </p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[500px] overflow-y-auto p-1">
                  {tasks.map((task) => (
                    <div key={task.id} className="border rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold capitalize">{task.type} Task</h3>
                            <Badge variant={task.result.status === 'completed' ? 'default' : 'destructive'}>
                              {task.result.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500">
                            {new Date(task.created_at).toLocaleString()}
                          </p>
                          
                          {task.type === 'search' && (
                            <div className="mt-2">
                              <p className="text-sm">
                                <span className="font-medium">Query:</span>{' '}
                                {task.params.query}
                                {task.params.location && ` in ${task.params.location}`}
                              </p>
                              {task.result.count !== undefined && (
                                <p className="text-sm">
                                  <span className="font-medium">Results:</span>{' '}
                                  {task.result.count}
                                </p>
                              )}
                            </div>
                          )}
                          
                          {task.type === 'verify' && (
                            <div className="mt-2">
                              <p className="text-sm">
                                <span className="font-medium">Verified:</span>{' '}
                                {task.result.total_verified} items
                              </p>
                              {task.result.high_confidence_count !== undefined && (
                                <p className="text-sm">
                                  <span className="font-medium">High Confidence:</span>{' '}
                                  {task.result.high_confidence_count} items
                                </p>
                              )}
                            </div>
                          )}
                          
                          {task.type === 'organize' && (
                            <div className="mt-2">
                              <p className="text-sm">
                                <span className="font-medium">Format:</span>{' '}
                                {task.params.format.toUpperCase()}
                              </p>
                              {task.result.row_count !== undefined && (
                                <p className="text-sm">
                                  <span className="font-medium">Rows:</span>{' '}
                                  {task.result.row_count}
                                </p>
                              )}
                              {task.result.file_path && (
                                <a
                                  href={`/api/daddy-data/download/${task.result.file_path.split('/').pop()}`}
                                  download
                                  className="text-sm text-blue-500 hover:underline inline-flex items-center gap-1 mt-1"
                                >
                                  <Download className="h-3 w-3" />
                                  Download File
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DaddyDataAgent;