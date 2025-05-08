import React, { useState, useEffect } from 'react';
import { useAgentStore } from '../../state/agentStore';
import { MessageSquare, FileText, Settings, PlusCircle } from 'lucide-react';
import { useLocation } from 'wouter';
import SimpleActionCard from './SimpleActionCard';
import { useThemeStore } from '../../state/themeStore';
import { useUserPrefsStore } from '../../state/userPrefsStore';

const SimpleEmptyStateDashboard: React.FC = () => {
  const openAgent = useAgentStore(state => state.openAgent);
  const [_, navigate] = useLocation();
  const accent = useThemeStore(state => state.accent);
  const userName = useUserPrefsStore(state => state.name);
  
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
    <div className="absolute inset-0 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full mx-auto flex flex-col items-center justify-center min-h-[80vh]">
        {/* Centered Title Block with modern styling */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-extralight tracking-tight mb-4 text-white/90">
            Welcome to <span className="font-semibold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">Panion</span>
          </h1>
          <p className="text-white/70 text-xl mb-2">Your AI-powered workspace environment</p>
          <div className="w-20 h-1 bg-gradient-to-r from-white/30 to-transparent mx-auto mt-6"></div>
        </div>
        
        {/* Centered card grid with a modern appearance */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 w-full max-w-3xl mx-auto">
          {actions.map((action, index) => (
            <SimpleActionCard
              key={`${action.title}-${index}-${renderKey}`}
              title={action.title}
              description={action.description}
              icon={action.icon}
              onClick={action.onClick}
              colorIndex={action.colorIndex}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default SimpleEmptyStateDashboard;