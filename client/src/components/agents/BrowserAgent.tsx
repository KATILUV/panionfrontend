import React from 'react';
import { Card } from '@/components/ui/card';
import { Database, ExternalLink, BarChart, PieChart, Network, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import BrowserInterface from '../BrowserInterface';

const BrowserAgent: React.FC = () => {
  const [_, setLocation] = useLocation();
  const [activeTab, setActiveTab] = React.useState('browser');

  const handleOpenFullPage = () => {
    setLocation('/browser');
  };
  
  const handleOpenAnalyticsPage = () => {
    // Navigate to browser page with specific tab
    setLocation('/browser');
    // The actual tab switching will happen after the page loads
  };

  return (
    <Card className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-3">
        <div className="flex items-center">
          <Database className="h-5 w-5 mr-2 text-blue-500" />
          <div>
            <h3 className="font-medium">Data Browser</h3>
            <p className="text-xs text-muted-foreground">Exploration & Analytics</p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="flex items-center" 
          onClick={handleOpenFullPage}
        >
          <ExternalLink className="h-4 w-4 mr-1" />
          <span className="text-xs">Full View</span>
        </Button>
      </div>
      
      {/* Mini tabs menu */}
      <div className="flex px-3 pt-2">
        <TabsList className="h-8 w-full">
          <TabsTrigger 
            value="browser" 
            className="text-xs"
            onClick={() => setActiveTab('browser')}
            data-state={activeTab === 'browser' ? 'active' : ''}
          >
            Browser
          </TabsTrigger>
          <TabsTrigger 
            value="analytics" 
            className="text-xs"
            onClick={handleOpenAnalyticsPage}
            data-state={activeTab === 'analytics' ? 'active' : ''}
          >
            Analytics
          </TabsTrigger>
        </TabsList>
      </div>
      
      {/* Browser component */}
      <div className="flex-1 overflow-hidden mt-2">
        {activeTab === 'browser' ? (
          <BrowserInterface />
        ) : (
          <div className="p-4 flex flex-col items-center justify-center h-full">
            <h3 className="text-lg font-medium mb-2">Advanced Analytics</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Access powerful data visualization and analysis tools in the full browser view
            </p>
            <div className="grid grid-cols-2 gap-2 w-full mb-6">
              <Card className="p-3 flex flex-col items-center">
                <BarChart className="h-8 w-8 mb-2 text-blue-500" />
                <span className="text-xs font-medium">Dashboards</span>
              </Card>
              <Card className="p-3 flex flex-col items-center">
                <PieChart className="h-8 w-8 mb-2 text-purple-500" />
                <span className="text-xs font-medium">Quality Metrics</span>
              </Card>
              <Card className="p-3 flex flex-col items-center">
                <Network className="h-8 w-8 mb-2 text-green-500" />
                <span className="text-xs font-medium">Knowledge Graph</span>
              </Card>
              <Card className="p-3 flex flex-col items-center">
                <FileDown className="h-8 w-8 mb-2 text-orange-500" />
                <span className="text-xs font-medium">Export Tools</span>
              </Card>
            </div>
            <Button onClick={handleOpenFullPage} className="w-full">
              Open Full Analytics View
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};

export default BrowserAgent;