import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAgentStore } from '../../state/agentStore';
import { useCommandStore } from '../../state/commandStore';
import { 
  PlusCircle, 
  Fingerprint, 
  Layout, 
  Book, 
  MessageSquare, 
  FileText, 
  Settings, 
  Search, 
  Calendar, 
  Code, 
  Image, 
  Palette, 
  Sun, 
  Moon, 
  Sunset, 
  X,
  Info,
  MousePointer,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import RotatingTagline from '../RotatingTagline';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useThemeStore } from '@/state/themeStore';
import { useWindowSize } from 'react-use';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useMarketplaceStore } from '@/state/marketplaceStore';
import { useLocation } from 'wouter';

// Define action card props type
interface ActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  color?: string;      // Made optional - can calculate from colorIndex
  colorIndex?: number; // Added to support dynamic color calculation
  shortcut?: string;
  badge?: string;
  badgeColor?: string;
}

// Improved Action Card component
const ActionCard: React.FC<ActionCardProps> = ({ 
  title, 
  description, 
  icon, 
  onClick, 
  color, 
  colorIndex = 0,  // Default to 0 if not provided
  shortcut,
  badge,
  badgeColor = "bg-primary" 
}) => {
  // THIS IS CRITICAL - We get the accent color INSIDE the component render
  // This ensures it's reactive to theme changes
  const accent = useThemeStore(state => state.accent);
  
  // Calculate the gradient directly in the render instead of in a function
  // This ensures it's always fresh with the latest theme
  let gradientColor = color;
  
  if (!gradientColor) {
    const variant = colorIndex % 3;
    
    // Pick colors based on current theme
    if (accent === 'purple') {
      gradientColor = variant === 0 
        ? 'from-purple-500 to-indigo-600' 
        : variant === 1 
          ? 'from-indigo-400 to-purple-700' 
          : 'from-violet-500 to-purple-600';
    }
    else if (accent === 'blue') {
      gradientColor = variant === 0 
        ? 'from-blue-500 to-cyan-600' 
        : variant === 1 
          ? 'from-cyan-400 to-blue-700' 
          : 'from-sky-500 to-blue-600';
    }
    else if (accent === 'green') {
      gradientColor = variant === 0 
        ? 'from-green-500 to-emerald-600' 
        : variant === 1 
          ? 'from-emerald-400 to-green-700' 
          : 'from-teal-500 to-green-600';
    }
    else if (accent === 'orange') {
      gradientColor = variant === 0 
        ? 'from-gray-800 to-black' 
        : variant === 1 
          ? 'from-zinc-800 to-gray-900' 
          : 'from-neutral-800 to-gray-950';
    }
    else if (accent === 'pink') {
      gradientColor = variant === 0 
        ? 'from-pink-500 to-rose-600' 
        : variant === 1 
          ? 'from-rose-400 to-pink-700' 
          : 'from-fuchsia-500 to-pink-600';
    }
    else {
      // Default to purple
      gradientColor = variant === 0 
        ? 'from-purple-500 to-indigo-600' 
        : variant === 1 
          ? 'from-indigo-400 to-purple-700' 
          : 'from-violet-500 to-purple-600';
    }
  }
  
  return (
    <div 
      className={`w-full text-left rounded-xl bg-gradient-to-br ${gradientColor} p-[1px] shadow-lg cursor-pointer border-0 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 focus:ring-offset-background pointer-events-auto z-50`}
      onClick={() => {
        console.log(`Card clicked: ${title}`);
        onClick();
      }}
    >
      <Card className="bg-card/50 backdrop-blur-sm border-none h-full overflow-hidden relative">
        {badge && (
          <div className={`absolute top-2 right-2 ${badgeColor} text-white text-xs px-1.5 py-0.5 rounded-sm font-medium`}>
            {badge}
          </div>
        )}
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <span className="text-foreground/80">{icon}</span>
              {title}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-sm text-foreground/70">{description}</CardDescription>
          {shortcut && (
            <div className="mt-2 flex items-center">
              <kbd className="px-2 py-1 text-xs font-semibold bg-black/10 dark:bg-white/10 rounded border border-gray-200 dark:border-gray-700">
                {shortcut}
              </kbd>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Workspace Layout Template Card
interface LayoutTemplateProps {
  title: string;
  description: string;
  type: 'centered' | 'split' | 'triple' | 'grid' | 'stack';
  onClick: () => void;
}

const LayoutTemplateCard: React.FC<LayoutTemplateProps> = ({ title, description, type, onClick }) => {
  // Generate simple SVG representation of the layout type
  const renderLayoutIcon = () => {
    switch (type) {
      case 'centered':
        return (
          <svg width="64" height="36" viewBox="0 0 64 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-2">
            <rect x="8" y="4" width="48" height="28" rx="2" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        );
      case 'split':
        return (
          <svg width="64" height="36" viewBox="0 0 64 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-2">
            <rect x="4" y="4" width="26" height="28" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <rect x="34" y="4" width="26" height="28" rx="2" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        );
      case 'triple':
        return (
          <svg width="64" height="36" viewBox="0 0 64 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-2">
            <rect x="4" y="4" width="16" height="28" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <rect x="24" y="4" width="16" height="28" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <rect x="44" y="4" width="16" height="28" rx="2" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        );
      case 'grid':
        return (
          <svg width="64" height="36" viewBox="0 0 64 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-2">
            <rect x="4" y="4" width="26" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <rect x="34" y="4" width="26" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <rect x="4" y="20" width="26" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <rect x="34" y="20" width="26" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        );
      case 'stack':
        return (
          <svg width="64" height="36" viewBox="0 0 64 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-2">
            <rect x="4" y="4" width="48" height="20" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <rect x="12" y="12" width="48" height="20" rx="2" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div
      onClick={() => {
        console.log(`Layout template clicked: ${type}`);
        onClick();
      }}
      className="p-4 bg-black/10 dark:bg-white/5 rounded-lg border border-white/10 dark:border-white/5 hover:bg-black/20 dark:hover:bg-white/10 cursor-pointer transition-colors duration-200 flex flex-col items-center w-full border-0 focus:outline-none focus:ring-2 focus:ring-primary/40 pointer-events-auto"
    >
      {renderLayoutIcon()}
      <h3 className="font-medium text-sm text-center">{title}</h3>
      <p className="text-xs text-center text-muted-foreground mt-1">{description}</p>
    </div>
  );
};

// Define Category interface
interface Category {
  id: string;
  name: string;
  icon: React.ReactNode;
}

// Main Dashboard Component
interface EmptyStateDashboardProps {
  isMobile?: boolean;
}

const EmptyStateDashboard: React.FC<EmptyStateDashboardProps> = ({ isMobile = false }) => {
  const { width } = useWindowSize();
  const openAgent = useAgentStore(state => state.openAgent);
  const currentTheme = useThemeStore(state => state.getCurrentTheme());
  const accentColor = useThemeStore(state => state.accent);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showSearch, setShowSearch] = useState<boolean>(false);
  // Add state to force re-render when accent color changes
  const [renderKey, setRenderKey] = useState(0);
  // Initialize navigation function from wouter
  const [_, navigate] = useLocation();
  
  // Force re-render when accent color changes
  useEffect(() => {
    console.log("Accent color changed to:", accentColor);
    setRenderKey(prev => prev + 1);
  }, [accentColor]);
  
  // Time-based greeting
  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: "Good morning", icon: <Sun className="h-5 w-5 mr-2" /> };
    if (hour < 18) return { text: "Good afternoon", icon: <Sunset className="h-5 w-5 mr-2" /> };
    return { text: "Good evening", icon: <Moon className="h-5 w-5 mr-2" /> };
  };
  
  const greeting = getTimeBasedGreeting();
  
  // Get and format marketplace agents
  const { 
    agents: marketplaceAgents = [], 
    categories: marketplaceCategories = [],
    getInstalledAgents,
    getFilteredAgents
  } = useMarketplaceStore(state => state);
  
  // Define categories for organizing actions
  const categories: Category[] = [
    { id: "all", name: "All", icon: <Layout className="h-4 w-4 mr-1" /> },
    { id: "productivity", name: "Productivity", icon: <Calendar className="h-4 w-4 mr-1" /> },
    { id: "communication", name: "Communication", icon: <MessageSquare className="h-4 w-4 mr-1" /> },
    { id: "creativity", name: "Creativity", icon: <Palette className="h-4 w-4 mr-1" /> },
    { id: "development", name: "Development", icon: <Code className="h-4 w-4 mr-1" /> },
    { id: "layouts", name: "Layouts", icon: <Layout className="h-4 w-4 mr-1" /> },
  ];
  
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
    useCommandStore.getState().togglePalette();
  };

  const { 
    openAgent: openAgentFn,
    registry, 
    createWindowGroup, 
    loadLayout,
    saveLayout 
  } = useAgentStore.getState();
  
  // Layout template handlers
  const applyLayout = (type: 'centered' | 'split' | 'triple' | 'grid' | 'stack') => {
    // Get agent IDs of installed agents
    const agentIds = registry.map(agent => agent.id).slice(0, 4); // Limit to 4 agents
    
    // Create a new layout
    const layoutName = `${type.charAt(0).toUpperCase() + type.slice(1)} Layout`;
    
    // Simple layout implementation without generateWindowStates
    // Just open the agents directly in a basic arrangement
    switch(type) {
      case 'centered':
        // Just open the first agent centered
        if (agentIds.length > 0) {
          openAgentFn(agentIds[0]);
        }
        break;
        
      case 'split':
        // Open first two agents
        if (agentIds.length > 0) {
          openAgentFn(agentIds[0]);
        }
        if (agentIds.length > 1) {
          openAgentFn(agentIds[1]);
        }
        break;
        
      case 'triple':
        // Open first three agents
        agentIds.slice(0, 3).forEach(id => {
          openAgentFn(id);
        });
        break;
        
      case 'grid':
        // Open up to four agents in a grid
        agentIds.slice(0, 4).forEach(id => {
          openAgentFn(id);
        });
        break;
        
      case 'stack':
        // Open up to three agents stacked
        agentIds.slice(0, 3).forEach(id => {
          openAgentFn(id);
        });
        break;
    }
    
    // At the end, save the current layout with the specified name
    saveLayout(layoutName);
  };
  
  // Quick actions - notice we don't pre-calculate colors here
  const quickActions = [
    {
      title: "Chat with Clara",
      description: "Start a conversation with Clara, your AI assistant",
      icon: <MessageSquare className="h-5 w-5" />,
      onClick: () => openAgent('clara'),
      colorIndex: 0,  // Use index instead of pre-calculated color
      shortcut: "Shift+C",
      category: "communication",
      shortcutAction: (e: KeyboardEvent) => {
        if (e.shiftKey && e.key === 'C') openAgent('clara');
      }
    },
    {
      title: "Take Notes",
      description: "Open the Notes agent to capture your thoughts",
      icon: <FileText className="h-5 w-5" />,
      onClick: () => openAgent('notes'),
      colorIndex: 1,  // Use index instead of pre-calculated color
      shortcut: "Shift+N", 
      category: "productivity",
      shortcutAction: (e: KeyboardEvent) => {
        if (e.shiftKey && e.key === 'N') openAgent('notes');
      }
    },
    {
      title: "Settings",
      description: "Configure your Panion desktop environment",
      icon: <Settings className="h-5 w-5" />,
      onClick: () => openAgent('settings'),
      colorIndex: 2,  // Use index instead of pre-calculated color
      category: "utilities",
      shortcutAction: null
    },
    {
      title: "Marketplace",
      description: "Discover and install new agents for your workspace",
      icon: <PlusCircle className="h-5 w-5" />,
      onClick: () => {
        // Use wouter's navigation instead of modifying window.location directly
        navigate('/marketplace');
      },
      colorIndex: 3,  // Use index instead of pre-calculated color
      category: "utilities",
      shortcutAction: null
    },
    {
      title: "Command Palette",
      description: "Access all features and tools",
      icon: <Layout className="h-5 w-5" />,
      onClick: toggleCommandPalette,
      colorIndex: 4,  // Use index instead of pre-calculated color
      shortcut: "Cmd+K",
      category: "utilities",
      shortcutAction: (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') toggleCommandPalette();
      }
    }
  ];
  
  // Define a type for all action items
  interface ActionItem {
    title: string;
    description: string;
    icon: React.ReactNode;
    onClick: () => void;
    colorIndex: number; // Store index instead of actual color
    category: string;
    shortcut?: string;
    badge?: string;
    badgeColor?: string;
    shortcutAction: ((e: KeyboardEvent) => void) | null;
  }
  
  // Add all marketplace agents to action list
  const allActions: ActionItem[] = [
    ...quickActions.map(action => ({
      ...action,
      // Don't pre-calculate colors here
    })),
    ...(marketplaceAgents || [])
      .filter(agent => !quickActions.some(qa => qa.title === agent.title))
      .map((agent, index) => ({
        title: agent.title,
        description: agent.description,
        icon: getIconByName(agent.icon),
        onClick: () => {
          if (agent.isInstalled) {
            openAgent(agent.id);
          } else {
            // Navigate directly to marketplace for non-installed agents using wouter
            navigate('/marketplace');
          }
        },
        colorIndex: index + quickActions.length, // Store index only
        category: agent.categories && agent.categories.length > 0 ? agent.categories[0] : "utilities",
        badge: agent.isInstalled ? undefined : "Install",
        badgeColor: "bg-primary",
        shortcutAction: null
      }))
  ];
  
  // Helper to get icon by name (string to component)
  function getIconByName(iconName: string) {
    switch (iconName) {
      case 'MessageCircle':
        return <MessageSquare className="h-5 w-5" />;
      case 'FileText':
        return <FileText className="h-5 w-5" />;
      case 'Settings':
        return <Settings className="h-5 w-5" />;
      case 'Code':
        return <Code className="h-5 w-5" />;
      case 'Image':
        return <Image className="h-5 w-5" />;
      case 'Palette':
        return <Palette className="h-5 w-5" />;
      default:
        return <Info className="h-5 w-5" />;
    }
  }
  
  // Define layout templates
  const layoutTemplates = [
    {
      title: "Centered",
      description: "Single window in center",
      type: 'centered' as const
    },
    {
      title: "Split View",
      description: "Two windows side by side",
      type: 'split' as const
    },
    {
      title: "Triple View",
      description: "Three windows arrangement",
      type: 'triple' as const
    },
    {
      title: "Grid Layout",
      description: "Four windows in 2×2 grid",
      type: 'grid' as const
    },
    {
      title: "Stacked",
      description: "Windows stacked together",
      type: 'stack' as const
    }
  ];
  
  // Filter actions by category and search query
  const filteredActions = allActions.filter(action => {
    const matchesCategory = activeTab === 'all' || action.category === activeTab;
    const matchesSearch = searchQuery === '' || 
      action.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      action.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });
  
  // Set up keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Global keyboard shortcuts
      allActions.forEach(action => {
        if (action.shortcutAction) {
          action.shortcutAction(e);
        }
      });
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [allActions]);
  
  return (
    <div className={`h-full w-full max-w-screen-xl mx-auto px-4 md:px-8 relative z-10 pt-4 ${isMobile ? 'pb-20' : 'pb-10'}`}>
      {/* Top greeting section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div className="flex items-center">
          {greeting.icon}
          <h1 className="text-2xl font-bold">{greeting.text}</h1>
        </div>
        
        <div className="flex items-center mt-4 md:mt-0 w-full md:w-auto">
          {showSearch ? (
            <div className="relative w-full md:w-auto flex items-center">
              <Input
                placeholder="Search actions and agents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full md:w-64 pr-8"
                autoFocus
              />
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute right-0" 
                onClick={() => {
                  setSearchQuery('');
                  setShowSearch(false);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setShowSearch(true)} className="gap-2 ml-auto">
              <Search className="h-4 w-4" />
              <span className="hidden md:inline">Search</span>
            </Button>
          )}
        </div>
      </div>
      
      {/* Tabs for categories */}
      <Tabs 
        defaultValue="all" 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="mb-6"
      >
        <TabsList className="bg-transparent grid grid-cols-3 md:grid-cols-6 gap-1 p-0">
          {categories.map((category) => (
            <TabsTrigger 
              key={category.id} 
              value={category.id}
              className={activeTab === category.id 
                ? "bg-primary/20 text-white border-primary/30 hover:bg-primary/30"
                : "bg-transparent border border-white/5 hover:bg-white/5"
              }
            >
              <div className="flex items-center gap-1.5">
                {category.icon}
                <span>{category.name}</span>
              </div>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      
      {/* Main content area with adaptive layout */}
      <div className="flex flex-col gap-10">
        {activeTab !== 'layouts' ? (
          <>
            {/* Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {filteredActions.map((action, index) => (
                <ActionCard
                  key={`${action.title}-${index}-${renderKey}`}
                  title={action.title}
                  description={action.description}
                  icon={action.icon}
                  onClick={action.onClick}
                  colorIndex={action.colorIndex}
                  shortcut={action.shortcut}
                  badge={action.badge}
                  badgeColor={action.badgeColor}
                />
              ))}
            </div>
            
            {/* Only show layouts teaser when not in layouts tab */}
            <div className="mt-6">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-semibold">Window Layouts</h2>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setActiveTab('layouts')}
                  className="text-muted-foreground hover:text-foreground"
                >
                  See all layouts
                </Button>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {layoutTemplates.slice(0, isMobile ? 2 : 5).map((template) => (
                  <LayoutTemplateCard
                    key={template.type}
                    title={template.title}
                    description={template.description}
                    type={template.type}
                    onClick={() => applyLayout(template.type)}
                  />
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Layout Templates (when in layouts tab) */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Window Layouts</h2>
              <p className="text-muted-foreground mb-6">
                Choose a layout to arrange your windows in a specific configuration.
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {layoutTemplates.map((template) => (
                  <LayoutTemplateCard
                    key={template.type}
                    title={template.title}
                    description={template.description}
                    type={template.type}
                    onClick={() => applyLayout(template.type)}
                  />
                ))}
              </div>
            </div>
            
            {/* Saved Layouts (future feature) */}
            <div className="mt-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Your Saved Layouts</h2>
                <Button variant="outline" size="sm" className="gap-2">
                  <PlusCircle className="h-4 w-4" />
                  Save Current Layout
                </Button>
              </div>
              
              <div className="bg-black/20 rounded-lg border border-white/10 p-8 text-center">
                <div className="flex justify-center mb-3">
                  <Layout className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-1">No saved layouts yet</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Arrange your windows and save the layout to create your own custom arrangements.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
      
      {/* Tagline rotator at bottom */}
      <div className="mt-10 text-center">
        <RotatingTagline
          phrases={[
            "Organize your AI workspace",
            "Customize your agent experience",
            "Discover new AI capabilities",
            "Connect your digital assistants",
            "Design your perfect workflow"
          ]}
          interval={5000}
          className="text-sm text-muted-foreground"
        />
      </div>
    </div>
  );
};

export default EmptyStateDashboard;