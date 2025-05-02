import React from 'react';
import { motion } from 'framer-motion';
import { useAgentStore } from '../../state/agentStore';
import { PlusCircle, Fingerprint, Layout, Book, MessageSquare, FileText, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import RotatingTagline from '../RotatingTagline';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useThemeStore } from '@/state/themeStore';

interface QuickActionProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  color: string;
}

const QuickAction: React.FC<QuickActionProps> = ({ title, description, icon, onClick, color }) => {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.98 }}
      className={`rounded-xl bg-gradient-to-br ${color} p-[1px] shadow-lg cursor-pointer`}
      onClick={onClick}
    >
      <Card className="bg-card/50 backdrop-blur-sm border-none h-full">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <CardTitle className="text-xl font-bold">{title}</CardTitle>
            <div className="text-foreground/80">{icon}</div>
          </div>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-sm">{description}</CardDescription>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const EmptyStateDashboard: React.FC = () => {
  const openAgent = useAgentStore(state => state.openAgent);
  const currentTheme = useThemeStore(state => state.getCurrentTheme());
  const accentColor = useThemeStore(state => state.accent);
  
  // Determine gradient based on theme and accent
  const getGradient = () => {
    switch (accentColor) {
      case 'purple':
        return currentTheme === 'dark' 
          ? 'from-purple-900/20 via-purple-800/10 to-background' 
          : 'from-purple-100 via-purple-50/80 to-background';
      case 'blue':
        return currentTheme === 'dark' 
          ? 'from-blue-900/20 via-blue-800/10 to-background' 
          : 'from-blue-100 via-blue-50/80 to-background';
      case 'green':
        return currentTheme === 'dark' 
          ? 'from-green-900/20 via-green-800/10 to-background' 
          : 'from-green-100 via-green-50/80 to-background';
      case 'orange':
        return currentTheme === 'dark' 
          ? 'from-orange-900/20 via-orange-800/10 to-background' 
          : 'from-orange-100 via-orange-50/80 to-background';
      case 'pink':
        return currentTheme === 'dark' 
          ? 'from-pink-900/20 via-pink-800/10 to-background' 
          : 'from-pink-100 via-pink-50/80 to-background';
      default:
        return currentTheme === 'dark' 
          ? 'from-purple-900/20 via-purple-800/10 to-background' 
          : 'from-purple-100 via-purple-50/80 to-background';
    }
  };
  
  // Determine color theme for cards based on accent
  const getCardColor = (index: number) => {
    switch (accentColor) {
      case 'purple':
        return index % 3 === 0 
          ? 'from-purple-500 to-indigo-600' 
          : index % 3 === 1 
            ? 'from-indigo-400 to-purple-700' 
            : 'from-violet-500 to-purple-600';
      case 'blue':
        return index % 3 === 0 
          ? 'from-blue-500 to-cyan-600' 
          : index % 3 === 1 
            ? 'from-cyan-400 to-blue-700' 
            : 'from-sky-500 to-blue-600';
      case 'green':
        return index % 3 === 0 
          ? 'from-green-500 to-emerald-600' 
          : index % 3 === 1 
            ? 'from-emerald-400 to-green-700' 
            : 'from-teal-500 to-green-600';
      case 'orange':
        return index % 3 === 0 
          ? 'from-orange-500 to-amber-600' 
          : index % 3 === 1 
            ? 'from-amber-400 to-orange-700' 
            : 'from-yellow-500 to-orange-600';
      case 'pink':
        return index % 3 === 0 
          ? 'from-pink-500 to-rose-600' 
          : index % 3 === 1 
            ? 'from-rose-400 to-pink-700' 
            : 'from-fuchsia-500 to-pink-600';
      default:
        return index % 3 === 0 
          ? 'from-purple-500 to-indigo-600' 
          : index % 3 === 1 
            ? 'from-indigo-400 to-purple-700' 
            : 'from-violet-500 to-purple-600';
    }
  };
  
  const quickActions = [
    {
      title: "Chat with Panion",
      description: "Start a conversation with Panion, your AI assistant",
      icon: <MessageSquare className="h-5 w-5" />,
      onClick: () => openAgent('clara'),
      color: getCardColor(0)
    },
    {
      title: "Take Notes",
      description: "Open the Notes agent to capture your thoughts",
      icon: <FileText className="h-5 w-5" />,
      onClick: () => openAgent('notes'),
      color: getCardColor(1)
    },
    {
      title: "Press Cmd+K",
      description: "Open the command palette to access all features",
      icon: <Layout className="h-5 w-5" />,
      onClick: () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true })),
      color: getCardColor(2)
    }
  ];
  
  const welcomePhrases = [
    "Your AI desktop environment",
    "Multi-agent workspace",
    "Flexible window management",
    "Smarter than a chatbot",
    "Personalized AI assistant",
    "Your digital command center"
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={`absolute inset-0 flex flex-col items-center justify-center p-8 bg-gradient-radial ${getGradient()}`}
    >
      <div className="max-w-4xl w-full flex flex-col items-center">
        {/* Logo and welcome */}
        <motion.div 
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          className="text-center mb-10"
        >
          <h1 className="text-5xl font-bold mb-2">Panion</h1>
          <div className="text-xl text-muted-foreground">
            <RotatingTagline phrases={welcomePhrases} interval={3000} />
          </div>
        </motion.div>
        
        {/* Quick actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mb-10">
          {quickActions.map((action, index) => (
            <QuickAction
              key={index}
              title={action.title}
              description={action.description}
              icon={action.icon}
              onClick={action.onClick}
              color={action.color}
            />
          ))}
        </div>
        
        {/* Tip section */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center text-muted-foreground text-sm mt-4"
        >
          <p>Pro tip: You can open multiple agents and arrange them in your workspace</p>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default EmptyStateDashboard;