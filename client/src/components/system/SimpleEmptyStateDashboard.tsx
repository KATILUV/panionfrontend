import React from 'react';
import { useAgentStore } from '../../state/agentStore';
import { MessageSquare, FileText, Settings, PlusCircle } from 'lucide-react';
import { useLocation } from 'wouter';
import SimpleActionCard from './SimpleActionCard';

const SimpleEmptyStateDashboard: React.FC = () => {
  const openAgent = useAgentStore(state => state.openAgent);
  const [_, navigate] = useLocation();

  const actions = [
    {
      title: "Chat with Clara",
      description: "Start a conversation with Clara, your AI assistant",
      icon: <MessageSquare className="h-5 w-5" />,
      onClick: () => {
        console.log("Opening Clara agent");
        openAgent('clara');
      },
      color: 'from-purple-500 to-indigo-600'
    },
    {
      title: "Take Notes",
      description: "Open the Notes agent to capture your thoughts",
      icon: <FileText className="h-5 w-5" />,
      onClick: () => {
        console.log("Opening Notes agent");
        openAgent('notes');
      },
      color: 'from-indigo-400 to-purple-700'
    },
    {
      title: "Settings",
      description: "Configure your Panion desktop environment",
      icon: <Settings className="h-5 w-5" />,
      onClick: () => {
        console.log("Opening Settings agent");
        openAgent('settings');
      },
      color: 'from-violet-500 to-purple-600'
    },
    {
      title: "Marketplace",
      description: "Discover and install new agents for your workspace",
      icon: <PlusCircle className="h-5 w-5" />,
      onClick: () => {
        console.log("Navigating to marketplace");
        navigate('/marketplace');
      },
      color: 'from-purple-500 to-indigo-600'
    }
  ];

  return (
    <div className="h-full w-full max-w-screen-xl mx-auto px-4 md:px-8 relative z-10 pt-4 pb-10">
      <h1 className="text-2xl font-bold mb-6">Welcome to Panion</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {actions.map((action, index) => (
          <SimpleActionCard
            key={`${action.title}-${index}`}
            title={action.title}
            description={action.description}
            icon={action.icon}
            onClick={action.onClick}
            color={action.color}
          />
        ))}
      </div>
    </div>
  );
};

export default SimpleEmptyStateDashboard;