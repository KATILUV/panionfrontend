import React, { useState } from 'react';
import BrowserInterface from '../components/BrowserInterface';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Globe, 
  BarChart4, 
  PieChart, 
  Database, 
  FileDown, 
  Settings, 
  Network,
  ArrowLeft
} from 'lucide-react';
import { useLocation } from 'wouter';

// Import the data visualization components
import DataQualityMetrics from '../components/data/DataQualityMetrics';
import BusinessDataDashboard from '../components/data/BusinessDataDashboard';
import KnowledgeGraph from '../components/data/KnowledgeGraph';
import ExportManager from '../components/data/ExportManager';
import UserPreferences from '../components/data/UserPreferences';

// Sample data for demonstration
const sampleCompleteness = [
  { name: 'Business Name', value: 95, max: 100 },
  { name: 'Address', value: 92, max: 100 },
  { name: 'Phone', value: 78, max: 100 },
  { name: 'Email', value: 65, max: 100 },
  { name: 'Website', value: 72, max: 100 },
  { name: 'Owner Info', value: 45, max: 100 },
];

const sampleAccuracy = [
  { name: 'Business Name', value: 98, max: 100 },
  { name: 'Address', value: 95, max: 100 },
  { name: 'Phone', value: 85, max: 100 },
  { name: 'Email', value: 80, max: 100 },
  { name: 'Website', value: 92, max: 100 },
];

const sampleConsistency = [
  { name: 'Format', value: 90, max: 100 },
  { name: 'Categorization', value: 82, max: 100 },
  { name: 'Geographic', value: 95, max: 100 },
];

// Import types from KnowledgeGraph component
import type { Node as GraphNode, Link as GraphLink } from '../components/data/KnowledgeGraph';

// Sample graph data with correct type annotations
const sampleGraphData: { nodes: GraphNode[], links: GraphLink[] } = {
  nodes: [
    { id: 'b1', type: 'business', name: 'Acme Corp', properties: { size: 'large', founded: 1985 } },
    { id: 'b2', type: 'business', name: 'TechStart Inc', properties: { size: 'small', founded: 2015 } },
    { id: 'o1', type: 'owner', name: 'John Smith', properties: { age: 45 } },
    { id: 'o2', type: 'owner', name: 'Jane Doe', properties: { age: 38 } },
    { id: 'l1', type: 'location', name: 'Seattle, WA', properties: { region: 'West' } },
    { id: 'l2', type: 'location', name: 'Chicago, IL', properties: { region: 'Midwest' } },
    { id: 'c1', type: 'category', name: 'Technology', properties: {} },
    { id: 'c2', type: 'category', name: 'Manufacturing', properties: {} },
  ],
  links: [
    { source: 'b1', target: 'o1', type: 'owned-by' },
    { source: 'b2', target: 'o2', type: 'owned-by' },
    { source: 'b1', target: 'l1', type: 'located-in' },
    { source: 'b2', target: 'l2', type: 'located-in' },
    { source: 'b1', target: 'c2', type: 'categorized-as' },
    { source: 'b2', target: 'c1', type: 'categorized-as' },
    { source: 'o2', target: 'l1', type: 'lives-in' },
  ]
};

// Sample business data
const sampleBusinesses = [
  {
    id: '1',
    name: 'Acme Corporation',
    category: 'Manufacturing',
    address: '123 Main St',
    city: 'Seattle',
    state: 'WA',
    zipCode: '98101',
    contactName: 'John Smith',
    contactEmail: 'john@acme.com',
    contactPhone: '(206) 555-1234',
    employeeCount: 250,
    yearEstablished: 1985,
    lastUpdated: '2025-04-15',
    isVerified: true,
    latitude: 47.6062,
    longitude: -122.3321
  },
  {
    id: '2',
    name: 'TechStart Inc',
    category: 'Technology',
    address: '456 Pine Ave',
    city: 'Chicago',
    state: 'IL',
    zipCode: '60601',
    contactName: 'Jane Doe',
    contactEmail: 'jane@techstart.io',
    contactPhone: '(312) 555-6789',
    employeeCount: 45,
    yearEstablished: 2015,
    lastUpdated: '2025-05-01',
    isVerified: true,
    latitude: 41.8781,
    longitude: -87.6298
  },
  {
    id: '3',
    name: 'Green Fields Farm',
    category: 'Agriculture',
    address: '789 Rural Rd',
    city: 'Portland',
    state: 'OR',
    zipCode: '97205',
    contactName: 'Bob Johnson',
    contactEmail: 'bob@greenfields.org',
    contactPhone: '(503) 555-4321',
    employeeCount: 85,
    yearEstablished: 2000,
    lastUpdated: '2025-03-22',
    isVerified: false,
    latitude: 45.5152,
    longitude: -122.6784
  },
  {
    id: '4',
    name: 'Bright Ideas Consulting',
    category: 'Professional Services',
    address: '321 Business Blvd',
    city: 'Denver',
    state: 'CO',
    zipCode: '80202',
    contactName: 'Sarah Williams',
    contactEmail: 'sarah@brightideas.co',
    contactPhone: '(720) 555-8765',
    employeeCount: 30,
    yearEstablished: 2010,
    lastUpdated: '2025-04-30',
    isVerified: true,
    latitude: 39.7392,
    longitude: -104.9903
  }
];

// Export fields
const exportFields = [
  { key: 'name', label: 'Business Name', required: true, selected: true },
  { key: 'category', label: 'Category', required: false, selected: true },
  { key: 'address', label: 'Street Address', required: false, selected: true },
  { key: 'city', label: 'City', required: false, selected: true },
  { key: 'state', label: 'State', required: false, selected: true },
  { key: 'zipCode', label: 'ZIP Code', required: false, selected: true },
  { key: 'contactName', label: 'Contact Name', required: false, selected: true },
  { key: 'contactEmail', label: 'Email', required: false, selected: true },
  { key: 'contactPhone', label: 'Phone', required: false, selected: true },
  { key: 'employeeCount', label: 'Employee Count', required: false, selected: false },
  { key: 'yearEstablished', label: 'Year Established', required: false, selected: false },
  { key: 'lastUpdated', label: 'Last Updated', required: false, selected: false },
  { key: 'isVerified', label: 'Verified', required: false, selected: false },
  { key: 'latitude', label: 'Latitude', required: false, selected: false },
  { key: 'longitude', label: 'Longitude', required: false, selected: false },
];

const BrowserPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('browser');
  const [_, setLocation] = useLocation();

  // Handler for exporting data
  const handleExport = async (format: any, data: any[], fields: string[], options: Record<string, any>) => {
    // In a real implementation, this would call a backend API
    console.log('Exporting data:', { format, fields: fields.length, options });
    
    // Simulate a download URL
    return URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }));
  };

  // Handler for business location view
  const handleLocationView = (business: any) => {
    console.log('Viewing location for:', business.name);
  };

  // Navigation back to desktop
  const navigateToDesktop = () => {
    setLocation('/desktop');
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header with navigation */}
      <div className="border-b p-4 flex items-center justify-between bg-card">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={navigateToDesktop}
            className="mr-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Data Browser</h1>
            <p className="text-muted-foreground">
              Explore websites, extract business and contact information, and analyze data
            </p>
          </div>
        </div>
      </div>
      
      {/* Main content with tabs */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <div className="px-4 border-b bg-muted/40">
            <TabsList className="h-12">
              <TabsTrigger value="browser" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                <span>Browser</span>
              </TabsTrigger>
              <TabsTrigger value="dashboard" className="flex items-center gap-2">
                <BarChart4 className="h-4 w-4" />
                <span>Dashboard</span>
              </TabsTrigger>
              <TabsTrigger value="quality" className="flex items-center gap-2">
                <PieChart className="h-4 w-4" />
                <span>Quality Metrics</span>
              </TabsTrigger>
              <TabsTrigger value="knowledge" className="flex items-center gap-2">
                <Network className="h-4 w-4" />
                <span>Knowledge Graph</span>
              </TabsTrigger>
              <TabsTrigger value="export" className="flex items-center gap-2">
                <FileDown className="h-4 w-4" />
                <span>Export</span>
              </TabsTrigger>
              <TabsTrigger value="preferences" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span>Preferences</span>
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="browser" className="flex-1 overflow-auto p-0">
            <div className="h-full">
              <BrowserInterface />
            </div>
          </TabsContent>
          
          <TabsContent value="dashboard" className="flex-1 overflow-auto p-4">
            <BusinessDataDashboard 
              businesses={sampleBusinesses}
              onExport={(format, filteredData) => {
                console.log(`Exporting ${filteredData.length} records as ${format}`);
              }}
              onLocationView={handleLocationView}
            />
          </TabsContent>
          
          <TabsContent value="quality" className="flex-1 overflow-auto p-4">
            <DataQualityMetrics 
              completeness={sampleCompleteness}
              accuracy={sampleAccuracy}
              consistency={sampleConsistency}
              timeliness={85}
              datasetName="Business Data"
              lastUpdated="2025-05-09"
              recordCount={sampleBusinesses.length}
            />
          </TabsContent>
          
          <TabsContent value="knowledge" className="flex-1 overflow-auto p-4">
            <KnowledgeGraph 
              data={sampleGraphData}
              onNodeSelect={(node) => {
                console.log('Selected node:', node);
              }}
              onExport={(format) => {
                console.log(`Exporting graph as ${format}`);
              }}
            />
          </TabsContent>
          
          <TabsContent value="export" className="flex-1 overflow-auto p-4">
            <ExportManager 
              data={sampleBusinesses}
              fields={exportFields}
              onExport={handleExport}
              presets={[
                {
                  id: '1',
                  name: 'Contact Info Export',
                  format: 'csv',
                  fields: ['name', 'contactName', 'contactEmail', 'contactPhone'],
                  description: 'Basic contact information export'
                },
                {
                  id: '2',
                  name: 'Full Business Profile',
                  format: 'json',
                  fields: exportFields.map(f => f.key),
                  description: 'Complete business details with all fields'
                }
              ]}
            />
          </TabsContent>
          
          <TabsContent value="preferences" className="flex-1 overflow-auto p-4">
            <UserPreferences 
              availableLocations={[
                { state: 'WA', cities: ['Seattle', 'Tacoma', 'Bellevue'] },
                { state: 'OR', cities: ['Portland', 'Salem', 'Eugene'] },
                { state: 'CA', cities: ['Los Angeles', 'San Francisco', 'San Diego'] },
                { state: 'IL', cities: ['Chicago', 'Springfield'] },
                { state: 'CO', cities: ['Denver', 'Boulder', 'Colorado Springs'] }
              ]}
              availableCategories={[
                { name: 'Manufacturing', subCategories: ['Automotive', 'Electronics', 'Textiles', 'Food Processing'] },
                { name: 'Technology', subCategories: ['Software', 'Hardware', 'IT Services', 'Telecom'] },
                { name: 'Retail', subCategories: ['Apparel', 'Electronics', 'Home Goods', 'Groceries'] },
                { name: 'Professional Services', subCategories: ['Consulting', 'Legal', 'Accounting', 'Marketing'] },
                { name: 'Agriculture', subCategories: ['Crops', 'Livestock', 'Dairy', 'Organic'] }
              ]}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default BrowserPage;