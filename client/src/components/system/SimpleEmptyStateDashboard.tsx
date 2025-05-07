import React, { useState, useEffect } from 'react';
import { useAgentStore } from '../../state/agentStore';
import { MessageSquare, FileText, Settings, PlusCircle } from 'lucide-react';
import { useLocation } from 'wouter';
import SimpleActionCard from './SimpleActionCard';
import { useThemeStore } from '../../state/themeStore';

const SimpleEmptyStateDashboard: React.FC = () => {
  const openAgent = useAgentStore(state => state.openAgent);
  const [_, navigate] = useLocation();
  const accent = useThemeStore(state => state.accent);
  
  // Add a re-render trigger for theme changes
  const [renderKey, setRenderKey] = useState(0);
  
  // Force re-render when accent color changes
  useEffect(() => {
    console.log("SimpleEmptyStateDashboard: Accent color changed to:", accent);
    setRenderKey(prev => prev + 1);
  }, [accent]);

  const actions = [
    {
      title: "Chat with Clara",
      description: "Start a conversation with Clara, your AI assistant",
      icon: <MessageSquare className="h-5 w-5" />,
      onClick: () => {
        console.log("Opening Clara agent");
        openAgent('clara');
      },
      colorIndex: 0  // Use index instead of hardcoded color
    },
    {
      title: "Take Notes",
      description: "Open the Notes agent to capture your thoughts",
      icon: <FileText className="h-5 w-5" />,
      onClick: () => {
        console.log("Opening Notes agent");
        openAgent('notes');
      },
      colorIndex: 1  // Use index instead of hardcoded color
    },
    {
      title: "Settings",
      description: "Configure your Panion desktop environment",
      icon: <Settings className="h-5 w-5" />,
      onClick: () => {
        console.log("Opening Settings agent");
        openAgent('settings');
      },
      colorIndex: 2  // Use index instead of hardcoded color
    },
    {
      title: "Marketplace",
      description: "Discover and install new agents for your workspace",
      icon: <PlusCircle className="h-5 w-5" />,
      onClick: () => {
        console.log("Navigating to marketplace");
        navigate('/marketplace');
      },
      colorIndex: 0  // Use index instead of hardcoded color (different pattern)
    }
  ];

  return (
    <div className="h-full w-full max-w-screen-xl mx-auto px-4 md:px-8 relative z-10 pt-4 pb-10">
      <h1 className="text-2xl font-bold mb-6">Welcome to Panion</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {actions.map((action, index) => (
          <SimpleActionCard
            key={`${action.title}-${index}-${renderKey}`} // Include renderKey in the key
            title={action.title}
            description={action.description}
            icon={action.icon}
            onClick={action.onClick}
            colorIndex={action.colorIndex} // Pass colorIndex instead of color
          />
        ))}
      </div>
    </div>
  );
};

export default SimpleEmptyStateDashboard;