import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, ChevronsUpDown, Download, Filter, Map, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

// Define business type for data records
interface Business {
  id: string;
  name: string;
  category: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  employeeCount?: number;
  yearEstablished?: number;
  revenue?: string;
  rating?: number;
  latitude?: number;
  longitude?: number;
  lastUpdated: string;
  isVerified: boolean;
}

interface BusinessDataDashboardProps {
  businesses: Business[];
  onExport: (format: string, filteredData: Business[]) => void;
  onLocationView?: (business: Business) => void;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const BusinessDataDashboard: React.FC<BusinessDataDashboardProps> = ({
  businesses,
  onExport,
  onLocationView
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [stateFilter, setStateFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [activeTab, setActiveTab] = useState('overview');
  
  // Get unique categories and states for filters
  const categories = useMemo(() => {
    return Array.from(new Set(businesses.map(b => b.category))).sort();
  }, [businesses]);
  
  const states = useMemo(() => {
    return Array.from(new Set(businesses.map(b => b.state))).sort();
  }, [businesses]);

  // Apply filters and sorting
  const filteredBusinesses = useMemo(() => {
    return businesses
      .filter(business => {
        // Search across multiple fields
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = searchQuery === '' || 
          business.name.toLowerCase().includes(searchLower) ||
          business.address.toLowerCase().includes(searchLower) ||
          business.city.toLowerCase().includes(searchLower) ||
          (business.contactName && business.contactName.toLowerCase().includes(searchLower));
        
        // Category filter
        const matchesCategory = !categoryFilter || business.category === categoryFilter;
        
        // State filter
        const matchesState = !stateFilter || business.state === stateFilter;
        
        return matchesSearch && matchesCategory && matchesState;
      })
      .sort((a, b) => {
        // Handle custom sorting
        if (sortBy === 'name') {
          return sortOrder === 'asc' 
            ? a.name.localeCompare(b.name)
            : b.name.localeCompare(a.name);
        } else if (sortBy === 'city') {
          return sortOrder === 'asc'
            ? a.city.localeCompare(b.city)
            : b.city.localeCompare(a.city);
        } else if (sortBy === 'employeeCount') {
          const aValue = a.employeeCount || 0;
          const bValue = b.employeeCount || 0;
          return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
        } else if (sortBy === 'yearEstablished') {
          const aValue = a.yearEstablished || 0;
          const bValue = b.yearEstablished || 0;
          return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
        }
        return 0;
      });
  }, [businesses, searchQuery, categoryFilter, stateFilter, sortBy, sortOrder]);

  // Prepare summary data for charts
  const categoryData = useMemo(() => {
    const categoryCounts: Record<string, number> = {};
    filteredBusinesses.forEach(business => {
      categoryCounts[business.category] = (categoryCounts[business.category] || 0) + 1;
    });
    
    return Object.entries(categoryCounts)
      .map(([category, count]) => ({ name: category, value: count }))
      .sort((a, b) => b.value - a.value);
  }, [filteredBusinesses]);

  const stateData = useMemo(() => {
    const stateCounts: Record<string, number> = {};
    filteredBusinesses.forEach(business => {
      stateCounts[business.state] = (stateCounts[business.state] || 0) + 1;
    });
    
    return Object.entries(stateCounts)
      .map(([state, count]) => ({ name: state, value: count }))
      .sort((a, b) => b.value - a.value);
  }, [filteredBusinesses]);

  const employeeSizeDistribution = useMemo(() => {
    const sizes = {
      'Small (1-49)': 0,
      'Medium (50-249)': 0,
      'Large (250+)': 0,
      'Unknown': 0
    };
    
    filteredBusinesses.forEach(business => {
      if (!business.employeeCount) {
        sizes['Unknown']++;
      } else if (business.employeeCount < 50) {
        sizes['Small (1-49)']++;
      } else if (business.employeeCount < 250) {
        sizes['Medium (50-249)']++;
      } else {
        sizes['Large (250+)']++;
      }
    });
    
    return Object.entries(sizes)
      .map(([size, count]) => ({ name: size, value: count }));
  }, [filteredBusinesses]);

  const yearlyTrends = useMemo(() => {
    // Group by establishment year (by decade)
    const decades: Record<string, number> = {};
    filteredBusinesses.forEach(business => {
      if (business.yearEstablished) {
        const decade = Math.floor(business.yearEstablished / 10) * 10;
        decades[`${decade}s`] = (decades[`${decade}s`] || 0) + 1;
      }
    });
    
    return Object.entries(decades)
      .map(([decade, count]) => ({ name: decade, value: count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredBusinesses]);

  // Toggle sort order
  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Reset all filters
  const resetFilters = () => {
    setSearchQuery('');
    setCategoryFilter(null);
    setStateFilter(null);
    setSortBy('name');
    setSortOrder('asc');
  };

  return (
    <div className="flex flex-col space-y-4">
      {/* Dashboard Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Business Data Explorer</h2>
        <div className="flex items-center gap-2">
          <Select onValueChange={(value) => onExport(value, filteredBusinesses)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Export as..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="json">JSON</SelectItem>
              <SelectItem value="xlsx">Excel</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="flex items-center gap-1">
            <Download size={16} /> Export
          </Button>
        </div>
      </div>

      {/* Filters Row */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search businesses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-between w-[180px]">
                  {categoryFilter || "All Categories"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0">
                <Command>
                  <CommandInput placeholder="Search category..." />
                  <CommandList>
                    <CommandEmpty>No category found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        onSelect={() => setCategoryFilter(null)}
                        className="flex items-center"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            !categoryFilter ? "opacity-100" : "opacity-0"
                          )}
                        />
                        All Categories
                      </CommandItem>
                      <ScrollArea className="h-[200px]">
                        {categories.map((category) => (
                          <CommandItem
                            key={category}
                            onSelect={() => setCategoryFilter(category)}
                            className="flex items-center"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                categoryFilter === category ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {category}
                          </CommandItem>
                        ))}
                      </ScrollArea>
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-between w-[180px]">
                  {stateFilter || "All States"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0">
                <Command>
                  <CommandInput placeholder="Search state..." />
                  <CommandList>
                    <CommandEmpty>No state found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        onSelect={() => setStateFilter(null)}
                        className="flex items-center"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            !stateFilter ? "opacity-100" : "opacity-0"
                          )}
                        />
                        All States
                      </CommandItem>
                      <ScrollArea className="h-[200px]">
                        {states.map((state) => (
                          <CommandItem
                            key={state}
                            onSelect={() => setStateFilter(state)}
                            className="flex items-center"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                stateFilter === state ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {state}
                          </CommandItem>
                        ))}
                      </ScrollArea>
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            <Select
              value={`${sortBy}-${sortOrder}`}
              onValueChange={(value) => {
                const [field, order] = value.split('-');
                setSortBy(field);
                setSortOrder(order as 'asc' | 'desc');
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                <SelectItem value="city-asc">City (A-Z)</SelectItem>
                <SelectItem value="city-desc">City (Z-A)</SelectItem>
                <SelectItem value="employeeCount-asc">Size (Small to Large)</SelectItem>
                <SelectItem value="employeeCount-desc">Size (Large to Small)</SelectItem>
                <SelectItem value="yearEstablished-asc">Year (Oldest first)</SelectItem>
                <SelectItem value="yearEstablished-desc">Year (Newest first)</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={resetFilters} className="ml-auto">
              Reset Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing <span className="font-medium">{filteredBusinesses.length}</span> of <span className="font-medium">{businesses.length}</span> businesses
        </div>
        <div className="flex space-x-2">
          {categoryFilter && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Category: {categoryFilter}
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-4 w-4 ml-1" 
                onClick={() => setCategoryFilter(null)}
              >
                <span className="sr-only">Remove</span>
                ×
              </Button>
            </Badge>
          )}
          {stateFilter && (
            <Badge variant="secondary" className="flex items-center gap-1">
              State: {stateFilter}
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-4 w-4 ml-1" 
                onClick={() => setStateFilter(null)}
              >
                <span className="sr-only">Remove</span>
                ×
              </Button>
            </Badge>
          )}
          {searchQuery && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Search: {searchQuery}
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-4 w-4 ml-1" 
                onClick={() => setSearchQuery('')}
              >
                <span className="sr-only">Remove</span>
                ×
              </Button>
            </Badge>
          )}
        </div>
      </div>

      {/* Dashboard Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="charts">Charts</TabsTrigger>
          <TabsTrigger value="details">Business Details</TabsTrigger>
          <TabsTrigger value="contacts" disabled={!filteredBusinesses.some(b => b.contactName)}>
            Contact Info
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Businesses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{filteredBusinesses.length}</div>
                <p className="text-xs text-muted-foreground">
                  From {businesses.length} total records
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{categories.length}</div>
                <p className="text-xs text-muted-foreground">
                  Business categories represented
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">States</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{states.length}</div>
                <p className="text-xs text-muted-foreground">
                  States with businesses
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Contact Info</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {filteredBusinesses.filter(b => b.contactName || b.contactEmail || b.contactPhone).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Businesses with contact details
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle>Categories Distribution</CardTitle>
                <CardDescription>Top business categories</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData.slice(0, 5)}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {categoryData.slice(0, 5).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle>Geographic Distribution</CardTitle>
                <CardDescription>Businesses by state</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stateData.slice(0, 10)}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 50, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value" fill="#8884d8" name="Businesses" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Charts Tab */}
        <TabsContent value="charts" className="space-y-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Employee Size Distribution</CardTitle>
                <CardDescription>Businesses by employee count</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={employeeSizeDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {employeeSizeDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Business Age Trend</CardTitle>
                <CardDescription>Businesses by year established</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={yearlyTrends}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value" name="Businesses" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Business Details</CardTitle>
              <CardDescription>
                Showing {filteredBusinesses.length} of {businesses.length} businesses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md">
                <div className="grid grid-cols-12 gap-2 p-4 border-b font-medium text-sm">
                  <div className="col-span-3">Name</div>
                  <div className="col-span-2">Category</div>
                  <div className="col-span-3">Location</div>
                  <div className="col-span-1 text-center">Employees</div>
                  <div className="col-span-2 text-center">Established</div>
                  <div className="col-span-1 text-center">Actions</div>
                </div>
                <ScrollArea className="h-[500px]">
                  {filteredBusinesses.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      No businesses found matching your filters.
                    </div>
                  ) : (
                    filteredBusinesses.map((business) => (
                      <div key={business.id} className="grid grid-cols-12 gap-2 p-4 border-b hover:bg-muted/50 text-sm">
                        <div className="col-span-3 font-medium truncate">
                          {business.name}
                          {business.isVerified && (
                            <Badge variant="outline" className="ml-2 px-1 py-0 h-4">
                              Verified
                            </Badge>
                          )}
                        </div>
                        <div className="col-span-2 truncate">{business.category}</div>
                        <div className="col-span-3 truncate">
                          {business.city}, {business.state}
                        </div>
                        <div className="col-span-1 text-center">
                          {business.employeeCount || "-"}
                        </div>
                        <div className="col-span-2 text-center">
                          {business.yearEstablished || "Unknown"}
                        </div>
                        <div className="col-span-1 flex justify-center space-x-1">
                          {business.latitude && business.longitude && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8" 
                              onClick={() => onLocationView && onLocationView(business)}
                            >
                              <Map className="h-4 w-4" />
                              <span className="sr-only">View location</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contacts Tab */}
        <TabsContent value="contacts" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>
                Available contact details for businesses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md">
                <div className="grid grid-cols-12 gap-2 p-4 border-b font-medium text-sm">
                  <div className="col-span-3">Business</div>
                  <div className="col-span-3">Contact Name</div>
                  <div className="col-span-3">Email</div>
                  <div className="col-span-3">Phone</div>
                </div>
                <ScrollArea className="h-[500px]">
                  {filteredBusinesses.filter(b => b.contactName || b.contactEmail || b.contactPhone).length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      No contact information available for the selected businesses.
                    </div>
                  ) : (
                    filteredBusinesses
                      .filter(b => b.contactName || b.contactEmail || b.contactPhone)
                      .map((business) => (
                        <div key={business.id} className="grid grid-cols-12 gap-2 p-4 border-b hover:bg-muted/50 text-sm">
                          <div className="col-span-3 font-medium truncate">{business.name}</div>
                          <div className="col-span-3 truncate">{business.contactName || "-"}</div>
                          <div className="col-span-3 truncate">{business.contactEmail || "-"}</div>
                          <div className="col-span-3 truncate">{business.contactPhone || "-"}</div>
                        </div>
                      ))
                  )}
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BusinessDataDashboard;