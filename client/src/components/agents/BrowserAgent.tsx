import React from 'react';
import { Card } from '@/components/ui/card';
import { Database, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import BrowserInterface from '../BrowserInterface';

const BrowserAgent: React.FC = () => {
  const [_, setLocation] = useLocation();

  const handleOpenFullPage = () => {
    setLocation('/browser');
  };

  return (
    <Card className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-3">
        <div className="flex items-center">
          <Database className="h-5 w-5 mr-2 text-blue-500" />
          <div>
            <h3 className="font-medium">Browser</h3>
            <p className="text-xs text-muted-foreground">Data exploration & extraction</p>
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
      
      {/* Browser component */}
      <div className="flex-1 overflow-hidden">
        <BrowserInterface />
      </div>
    </Card>
  );
};

export default BrowserAgent;