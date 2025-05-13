/**
 * Memory Explorer Agent
 * Visualization and interaction for the Panion memory system
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Brain, 
  Search, 
  Database, 
  Filter, 
  Calendar, 
  BarChart, 
  Trash2, 
  Tag,
  X,
  Clock,
  ArrowUpDown,
  ChevronsUpDown,
  Sparkles
} from 'lucide-react';
import { motion } from 'framer-motion';
import BaseAgent from './BaseAgent';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import log from '@/utils/logger';

// Memory type definitions
interface Memory {
  sessionId: string;
  content: string;
  isUser: boolean;
  timestamp: string;
  important?: boolean;
  date?: string;
  category?: string;
  imageUrl?: string;
  imageAnalysis?: string;
  mediaType?: 'text' | 'image' | 'mixed';
  conversationMode?: string;
}

// Memory stats interface
interface MemoryStats {
  totalMemories: number;
  categoryCounts: Record<string, number>;
  oldestMemoryDate: string | null;
  newestMemoryDate: string | null;
}

// Enhanced Memory category enumeration
enum MemoryCategory {
  PERSONAL = 'personal',
  FACT = 'fact',
  PREFERENCE = 'preference',
  INTEREST = 'interest',
  CAPABILITY = 'capability',
  RELATIONSHIP = 'relationship',
  EVENT = 'event',
}

// Memory importance enumeration
enum MemoryImportance {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// Memory sort options
type SortOption = 'newest' | 'oldest' | 'importance' | 'category';

// Interface for the Memory Explorer Agent props
interface MemoryExplorerAgentProps {
  onClose?: () => void;
}

/**
 * Memory Explorer Agent Component
 * Provides visualization and interaction with the Panion memory system
 */
const MemoryExplorerAgent: React.FC<MemoryExplorerAgentProps> = ({ onClose }) => {
  // State declarations
  const [memories, setMemories] = useState<Memory[]>([]);
  const [filteredMemories, setFilteredMemories] = useState<Memory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [isLoading, setIsLoading] = useState(false);
  const [memoryStats, setMemoryStats] = useState<MemoryStats | null>(null);
  const [smartSearchResult, setSmartSearchResult] = useState<string | null>(null);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [activeTab, setActiveTab] = useState('browse');
  
  const { toast } = useToast();

  // Memory categories based on the backend definitions
  const memoryCategories = [
    { id: 'all', name: 'All Memories', icon: <Database size={16} /> },
    { id: 'personal', name: 'Personal', icon: <Brain size={16} /> },
    { id: 'preference', name: 'Preferences', icon: <Sparkles size={16} /> },
    { id: 'fact', name: 'Facts', icon: <Tag size={16} /> },
    { id: 'interest', name: 'Interests', icon: <Sparkles size={16} /> },
    { id: 'goal', name: 'Goals', icon: <Tag size={16} /> },
    { id: 'experience', name: 'Experiences', icon: <Clock size={16} /> },
    { id: 'contact', name: 'Contacts', icon: <Database size={16} /> },
    { id: 'image', name: 'Images', icon: <Database size={16} /> },
    { id: 'visual_data', name: 'Visual Data', icon: <Database size={16} /> },
    { id: 'media', name: 'Media', icon: <Database size={16} /> },
    { id: 'other', name: 'Other', icon: <Database size={16} /> },
  ];

  // Function to initialize the agent
  const initializeAgent = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Fetch memory stats first
      const statsResponse = await fetch('/api/memory-stats');
      if (statsResponse.ok) {
        const stats = await statsResponse.json();
        setMemoryStats(stats);
      }
      
      // Fetch all memories
      const memoriesResponse = await fetch('/api/memories/all');
      if (memoriesResponse.ok) {
        const data = await memoriesResponse.json();
        setMemories(data.memories || []);
        setFilteredMemories(data.memories || []);
      } else {
        throw new Error('Failed to fetch memories');
      }
    } catch (error) {
      log.error('Error initializing Memory Explorer agent:', error);
      toast({
        title: 'Error Loading Memories',
        description: error instanceof Error ? error.message : 'Failed to load memory data',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Load data on mount
  useEffect(() => {
    initializeAgent();
  }, [initializeAgent]);

  // Function to handle category changes
  const handleCategoryChange = async (category: string) => {
    setActiveCategory(category);
    setIsLoading(true);
    
    try {
      const response = await fetch(`/api/memories/${category}`);
      if (response.ok) {
        const data = await response.json();
        setFilteredMemories(data.memories || []);
      } else {
        throw new Error(`Failed to fetch ${category} memories`);
      }
    } catch (error) {
      log.error(`Error fetching ${category} memories:`, error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to filter memories',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle search
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setFilteredMemories(memories);
      setSmartSearchResult(null);
      return;
    }
    
    setIsLoading(true);
    
    try {
      // First try to filter existing memories (client-side search)
      const filteredResults = memories.filter(memory => 
        memory.content.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredMemories(filteredResults);
      
      // Then get smart search results (AI-based) using POST endpoint
      const smartSearchResponse = await fetch('/api/smart-memory-search-by-category', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: searchQuery,
          category: activeCategory !== 'all' ? activeCategory : undefined
        })
      });
      
      if (smartSearchResponse.ok) {
        const data = await smartSearchResponse.json();
        setSmartSearchResult(data.result);
      }
    } catch (error) {
      log.error('Error searching memories:', error);
      toast({
        title: 'Search Error',
        description: error instanceof Error ? error.message : 'Failed to search memories',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle sorting
  const handleSort = (option: SortOption) => {
    setSortBy(option);
    
    const sorted = [...filteredMemories].sort((a, b) => {
      switch (option) {
        case 'newest':
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        case 'oldest':
          return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        case 'importance':
          // Sort by importance flag
          return (b.important ? 1 : 0) - (a.important ? 1 : 0);
        case 'category':
          // Sort by category
          return (a.category || 'zzzz').localeCompare(b.category || 'zzzz');
        default:
          return 0;
      }
    });
    
    setFilteredMemories(sorted);
  };

  // Handle memory selection
  const handleMemorySelect = (memory: Memory) => {
    setSelectedMemory(memory);
  };

  // Function to create a new memory
  const createNewMemory = async () => {
    if (!inputValue.trim()) {
      toast({
        title: 'Empty Memory',
        description: 'Please enter content for the new memory',
        variant: 'destructive'
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Create a new memory object
      const newMemory: Partial<Memory> = {
        content: inputValue,
        isUser: true,
        timestamp: new Date().toISOString(),
        category: activeCategory !== 'all' ? activeCategory : 'personal',
        important: false
      };
      
      // Call the API to save the memory
      const response = await fetch('/api/memory/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newMemory)
      });
      
      if (!response.ok) {
        throw new Error('Failed to save memory');
      }
      
      // Refresh memories after saving
      await initializeAgent();
      
      // Clear input
      setInputValue('');
      
      toast({
        title: 'Memory Created',
        description: 'Your new memory has been saved successfully',
      });
    } catch (error) {
      log.error('Error creating memory:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create memory',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // State for memory input
  const [inputValue, setInputValue] = useState('');

  // Memory card component
  const MemoryCard = ({ memory }: { memory: Memory }) => {
    const isSelected = selectedMemory?.timestamp === memory.timestamp && 
                      selectedMemory?.content === memory.content;
    
    const formattedDate = new Date(memory.timestamp).toLocaleString();
    const categoryLabel = memory.category ? 
      memoryCategories.find(c => c.id === memory.category)?.name : 'Uncategorized';
    
    return (
      <Card 
        className={`mb-3 transition-colors ${isSelected ? 'border-primary bg-muted/30' : ''}`}
        onClick={() => handleMemorySelect(memory)}
      >
        <CardHeader className="p-3 pb-0">
          <div className="flex justify-between">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock size={14} />
              <span>{formattedDate}</span>
            </div>
            {memory.important && (
              <Badge variant="outline" className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400">
                Important
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-2">
          <p className={`text-sm ${memory.isUser ? 'font-medium' : ''}`}>
            {memory.content}
          </p>
          {memory.imageUrl && (
            <div className="mt-2">
              <img 
                src={memory.imageUrl} 
                alt="Memory attachment" 
                className="rounded-md max-h-32 object-cover"
              />
            </div>
          )}
        </CardContent>
        <CardFooter className="p-3 pt-0 flex justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <span className="font-medium">{memory.isUser ? 'User' : 'Panion'}</span>
          </div>
          {memory.category && (
            <Badge variant="outline" className="text-xs">
              {categoryLabel}
            </Badge>
          )}
        </CardFooter>
      </Card>
    );
  };

  // Render memory stats
  const renderStats = () => {
    if (!memoryStats) return <div>No stats available</div>;
    
    return (
      <div className="p-4">
        <h3 className="text-xl font-semibold mb-4">Memory System Statistics</h3>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base">Total Memories</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-3xl font-bold">{memoryStats.totalMemories}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base">Memory Timespan</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-sm">
                {memoryStats.oldestMemoryDate && memoryStats.newestMemoryDate ? (
                  <>From {memoryStats.oldestMemoryDate} to {memoryStats.newestMemoryDate}</>
                ) : (
                  'No date range available'
                )}
              </p>
            </CardContent>
          </Card>
        </div>
        
        <h4 className="font-medium mb-2">Memory Distribution by Category</h4>
        <div className="grid grid-cols-1 gap-2">
          {Object.entries(memoryStats.categoryCounts)
            .filter(([_, count]) => count > 0)
            .sort(([_, countA], [__, countB]) => countB - countA)
            .map(([category, count]) => {
              const categoryInfo = memoryCategories.find(c => c.id === category);
              const percentage = Math.round((count / memoryStats.totalMemories) * 100);
              
              return (
                <div key={category} className="flex items-center gap-3">
                  <div className="w-24 font-medium text-sm flex items-center gap-1">
                    {categoryInfo?.icon}
                    <span>{categoryInfo?.name || category}</span>
                  </div>
                  <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary/80 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="w-12 text-right text-sm font-medium">{count}</div>
                </div>
              );
            })}
        </div>
      </div>
    );
  };

  // JSX structure for the agent
  return (
    <BaseAgent
      agentId="memory-explorer"
      title="Memory Explorer"
      description="Visualize and interact with Panion's memory system"
      className="flex flex-col"
      skipInitialization={true}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="border-b p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-lg">Memory Explorer</h2>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        {/* Main content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <div className="border-b px-4">
            <TabsList className="h-10">
              <TabsTrigger value="browse" className="flex items-center gap-1">
                <Database size={16} />
                <span>Browse</span>
              </TabsTrigger>
              <TabsTrigger value="search" className="flex items-center gap-1">
                <Search size={16} />
                <span>Search</span>
              </TabsTrigger>
              <TabsTrigger value="stats" className="flex items-center gap-1">
                <BarChart size={16} />
                <span>Stats</span>
              </TabsTrigger>
            </TabsList>
          </div>
          
          <div className="flex-1 overflow-hidden">
            <TabsContent value="browse" className="m-0 h-full flex flex-col">
              <div className="border-b p-3">
                <div className="flex justify-between items-center gap-2 mb-3">
                  <Select value={activeCategory} onValueChange={handleCategoryChange}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Categories</SelectLabel>
                        {memoryCategories.map(category => (
                          <SelectItem key={category.id} value={category.id} className="flex items-center gap-2">
                            {category.icon}
                            <span>{category.name}</span>
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="flex items-center gap-1">
                        <ArrowUpDown size={14} />
                        <span>Sort</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuGroup>
                        <DropdownMenuItem onClick={() => handleSort('newest')}>
                          Newest first
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSort('oldest')}>
                          Oldest first
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSort('importance')}>
                          Importance
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSort('category')}>
                          Category
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                {/* Add memory form */}
                <div className="flex gap-2 mb-2">
                  <Input
                    type="text"
                    placeholder="Create a new memory..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && createNewMemory()}
                    className="flex-1"
                  />
                  <Button 
                    onClick={createNewMemory} 
                    disabled={isLoading || !inputValue.trim()}
                    className="shrink-0"
                  >
                    {isLoading ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <Brain className="h-4 w-4 mr-2" />
                      </motion.div>
                    ) : (
                      <Brain className="h-4 w-4 mr-2" />
                    )}
                    Save
                  </Button>
                </div>
              </div>
              
              <div className="flex-1 overflow-hidden">
                <div className="flex h-full">
                  {/* Memory list */}
                  <div className="w-1/2 border-r overflow-hidden">
                    <ScrollArea className="h-full p-3">
                      {isLoading ? (
                        <div className="flex justify-center items-center h-32">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          >
                            <Brain className="h-6 w-6 text-muted-foreground" />
                          </motion.div>
                        </div>
                      ) : filteredMemories.length === 0 ? (
                        <div className="text-center p-6 text-muted-foreground">
                          <p>No memories found in this category</p>
                        </div>
                      ) : (
                        filteredMemories.map((memory, index) => (
                          <MemoryCard key={`${memory.timestamp}-${index}`} memory={memory} />
                        ))
                      )}
                    </ScrollArea>
                  </div>
                  
                  {/* Memory detail */}
                  <div className="w-1/2 overflow-hidden">
                    {selectedMemory ? (
                      <ScrollArea className="h-full p-4">
                        <h3 className="text-lg font-semibold mb-3">Memory Details</h3>
                        
                        <div className="grid grid-cols-2 gap-2 mb-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Created</p>
                            <p className="font-medium">
                              {new Date(selectedMemory.timestamp).toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Category</p>
                            <p className="font-medium">
                              {selectedMemory.category || 'Uncategorized'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Source</p>
                            <p className="font-medium">
                              {selectedMemory.isUser ? 'User message' : 'Panion response'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Importance</p>
                            <p className="font-medium">
                              {selectedMemory.important ? 'Important' : 'Standard'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="mb-4">
                          <p className="text-sm text-muted-foreground mb-1">Content</p>
                          <div className="p-3 bg-muted rounded-md">
                            <p>{selectedMemory.content}</p>
                          </div>
                        </div>
                        
                        {selectedMemory.imageUrl && (
                          <div className="mb-4">
                            <p className="text-sm text-muted-foreground mb-1">Attached Image</p>
                            <img 
                              src={selectedMemory.imageUrl} 
                              alt="Memory attachment" 
                              className="rounded-md max-h-64 object-contain"
                            />
                          </div>
                        )}
                        
                        {selectedMemory.imageAnalysis && (
                          <div className="mb-4">
                            <p className="text-sm text-muted-foreground mb-1">Image Analysis</p>
                            <div className="p-3 bg-muted rounded-md">
                              <p>{selectedMemory.imageAnalysis}</p>
                            </div>
                          </div>
                        )}
                        
                        {selectedMemory.conversationMode && (
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Conversation Mode</p>
                            <Badge variant="outline">
                              {selectedMemory.conversationMode}
                            </Badge>
                          </div>
                        )}
                      </ScrollArea>
                    ) : (
                      <div className="h-full flex items-center justify-center p-4 text-center text-muted-foreground">
                        <div>
                          <Brain className="h-10 w-10 mx-auto mb-2 opacity-50" />
                          <p>Select a memory to view details</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="search" className="m-0 h-full flex flex-col">
              <div className="border-b p-3">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Input
                      type="text"
                      placeholder="Search memories..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                  </div>
                  <Button onClick={handleSearch} disabled={isLoading}>
                    <Search className="h-4 w-4 mr-2" />
                    <span>Search</span>
                  </Button>
                </div>
              </div>
              
              <div className="flex-1 overflow-hidden">
                <div className="flex h-full">
                  {/* Search results */}
                  <div className="w-1/2 border-r overflow-hidden">
                    <ScrollArea className="h-full p-3">
                      {isLoading ? (
                        <div className="flex justify-center items-center h-32">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          >
                            <Search className="h-6 w-6 text-muted-foreground" />
                          </motion.div>
                        </div>
                      ) : filteredMemories.length === 0 ? (
                        <div className="text-center p-6 text-muted-foreground">
                          <p>No search results found</p>
                        </div>
                      ) : (
                        <>
                          <h3 className="text-sm font-medium mb-2">Search Results</h3>
                          {filteredMemories.map((memory, index) => (
                            <MemoryCard key={`${memory.timestamp}-${index}`} memory={memory} />
                          ))}
                        </>
                      )}
                    </ScrollArea>
                  </div>
                  
                  {/* AI smart search */}
                  <div className="w-1/2 overflow-hidden">
                    <ScrollArea className="h-full p-4">
                      <h3 className="text-lg font-semibold mb-3">AI-Powered Search</h3>
                      
                      {!searchQuery ? (
                        <div className="text-center p-6 text-muted-foreground">
                          <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>Enter a search query to use AI-powered memory search</p>
                        </div>
                      ) : isLoading ? (
                        <div className="flex justify-center items-center h-32">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          >
                            <Brain className="h-6 w-6 text-muted-foreground" />
                          </motion.div>
                        </div>
                      ) : smartSearchResult ? (
                        <div className="bg-muted/50 p-4 rounded-md">
                          <h4 className="text-md font-medium mb-2">Intelligent Search Results</h4>
                          <div className="whitespace-pre-line">
                            {smartSearchResult}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center p-6 text-muted-foreground">
                          <p>No AI search results available</p>
                        </div>
                      )}
                      
                      {selectedMemory && (
                        <div className="mt-6">
                          <h4 className="text-md font-medium mb-2">Selected Memory Details</h4>
                          <Card>
                            <CardHeader className="p-3 pb-0">
                              <div className="flex justify-between">
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <Clock size={14} />
                                  <span>{new Date(selectedMemory.timestamp).toLocaleString()}</span>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="p-3 pt-2">
                              <p className="text-sm">{selectedMemory.content}</p>
                            </CardContent>
                            <CardFooter className="p-3 pt-0 flex justify-between text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <span className="font-medium">{selectedMemory.isUser ? 'User' : 'Panion'}</span>
                              </div>
                              {selectedMemory.category && (
                                <Badge variant="outline" className="text-xs">
                                  {selectedMemory.category}
                                </Badge>
                              )}
                            </CardFooter>
                          </Card>
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="stats" className="m-0 h-full">
              <ScrollArea className="h-full">
                {isLoading ? (
                  <div className="flex justify-center items-center h-32">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <BarChart className="h-6 w-6 text-muted-foreground" />
                    </motion.div>
                  </div>
                ) : (
                  renderStats()
                )}
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </BaseAgent>
  );
};

export default MemoryExplorerAgent;