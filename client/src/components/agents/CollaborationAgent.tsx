import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import CollaborationDashboard from '@/components/CollaborationDashboard';
import { useLocation } from 'wouter';
import { useThemeStore } from '@/state/themeStore';
import { Users, ArrowLeft } from 'lucide-react';

const CollaborationAgent: React.FC = () => {
  const [_, navigate] = useLocation();
  const currentTheme = useThemeStore(state => state.getCurrentTheme());
  const isDark = currentTheme === 'dark';
  
  // Navigate to the full collaboration page
  const handleFullPageView = () => {
    navigate('/collaboration');
  };
  
  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Agent header */}
      <div className={`p-4 ${isDark ? 'bg-slate-900' : 'bg-slate-100'} border-b flex justify-between items-center`}>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-purple-500" />
          <h2 className="text-lg font-semibold">Agent Collaboration</h2>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleFullPageView} 
          className="flex items-center gap-1"
        >
          <span>Full View</span>
        </Button>
      </div>
      
      {/* Dashboard content */}
      <div className="flex-1 overflow-y-auto p-2">
        <CollaborationDashboard />
      </div>
    </div>
  );
};

export default CollaborationAgent;