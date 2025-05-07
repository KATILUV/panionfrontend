import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAgentStore } from '../../state/agentStore';
import { useCommandStore } from '../../state/commandStore';
import { PlusCircle, Fingerprint, Layout, Book, MessageSquare, FileText, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import RotatingTagline from '../RotatingTagline';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useThemeStore } from '@/state/themeStore';
import { useWindowSize } from 'react-use';

interface QuickActionProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  color: string;
  shortcut?: string;
}

const QuickAction: React.FC<QuickActionProps> = ({ title, description, icon, onClick, color, shortcut }) => {
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
          {shortcut && (
            <div className="mt-2 flex items-center">
              <kbd className="px-2 py-1 text-xs font-semibold bg-black/10 dark:bg-white/10 rounded border border-gray-200 dark:border-gray-700">
                {shortcut}
              </kbd>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

interface EmptyStateDashboardProps {
  isMobile?: boolean;
}

const EmptyStateDashboard: React.FC<EmptyStateDashboardProps> = ({ isMobile = false }) => {
  const { width } = useWindowSize();
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
          ? 'from-gray-800/30 via-gray-900/20 to-background' 
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
          ? 'from-gray-800 to-black' 
          : index % 3 === 1 
            ? 'from-zinc-800 to-gray-900' 
            : 'from-neutral-800 to-gray-950';
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
  
  const toggleCommandPalette = () => {
    // This will work better than dispatching a keydown event
    useCommandStore.getState().togglePalette();
  };
  
  const quickActions = [
    {
      title: "Chat with Clara",
      description: "Start a conversation with Clara, your AI assistant",
      icon: <MessageSquare className="h-5 w-5" />,
      onClick: () => openAgent('clara'),
      color: getCardColor(0),
      shortcut: "Shift+C",
      shortcutAction: (e: KeyboardEvent) => {
        if (e.shiftKey && e.key === 'C') openAgent('clara');
      }
    },
    {
      title: "Take Notes",
      description: "Open the Notes agent to capture your thoughts",
      icon: <FileText className="h-5 w-5" />,
      onClick: () => openAgent('notes'),
      color: getCardColor(1),
      shortcut: "Shift+N", 
      shortcutAction: (e: KeyboardEvent) => {
        if (e.shiftKey && e.key === 'N') openAgent('notes');
      }
    },
    {
      title: "Command Palette",
      description: "Access all features and tools (Cmd+K / Ctrl+K)",
      icon: <Layout className="h-5 w-5" />,
      onClick: toggleCommandPalette,
      color: getCardColor(2),
      shortcut: "Cmd+K",
      shortcutAction: (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') toggleCommandPalette();
      }
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

  // Add keyboard shortcut handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only apply shortcuts when empty state is visible (no windows open)
      if (Object.values(useAgentStore.getState().windows).some(w => w.isOpen)) {
        return;
      }
      
      // Process shortcuts
      quickActions.forEach(action => {
        if (action.shortcutAction) {
          action.shortcutAction(e);
        }
      });
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Modify quickActions text for mobile if needed
  const mobileQuickActions = quickActions.map(action => {
    if (isMobile && action.title === "Command Palette") {
      return {
        ...action,
        description: "Tap to access all features and tools"
      };
    }
    return action;
  });

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={`absolute inset-0 flex flex-col items-center justify-center ${isMobile ? 'p-4' : 'p-8'} bg-gradient-radial ${getGradient()}`}
    >
      <div className={`${isMobile ? 'w-full' : 'max-w-4xl w-full'} flex flex-col items-center`}>
        {/* Logo and welcome */}
        <motion.div 
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          className={`text-center ${isMobile ? 'mb-6' : 'mb-10'}`}
        >
          <h1 className={`${isMobile ? 'text-4xl' : 'text-5xl'} font-bold mb-2 text-white`}>Panion</h1>
          <div className={`${isMobile ? 'text-lg' : 'text-xl'} text-white`}>
            <RotatingTagline phrases={welcomePhrases} interval={3000} />
          </div>
        </motion.div>
        
        {/* Quick actions */}
        <div className={`grid grid-cols-1 ${isMobile ? 'gap-3' : 'md:grid-cols-3 gap-4'} w-full ${isMobile ? 'mb-6' : 'mb-10'}`}>
          {mobileQuickActions.map((action, index) => (
            <QuickAction
              key={index}
              title={action.title}
              description={action.description}
              icon={action.icon}
              onClick={action.onClick}
              color={action.color}
              shortcut={!isMobile ? action.shortcut : undefined}
            />
          ))}
        </div>
        
        {/* Tip section */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center text-white text-sm mt-4"
        >
          {isMobile ? (
            <p>Tip: Tap the taskbar icons to switch between agents</p>
          ) : (
            <p>Pro tip: You can open multiple agents and arrange them in your workspace</p>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
};

export default EmptyStateDashboard;