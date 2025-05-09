import React from 'react';
import BrowserInterface from '../components/BrowserInterface';
import { Card } from '@/components/ui/card';

const BrowserPage: React.FC = () => {
  return (
    <div className="container h-screen p-4 flex flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Data Browser</h1>
        <p className="text-muted-foreground">
          Explore websites, extract business and contact information, and save data in various formats
        </p>
      </div>
      
      <div className="flex-1 pb-4">
        <BrowserInterface />
      </div>
    </div>
  );
};

export default BrowserPage;