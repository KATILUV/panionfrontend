import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAgentStore } from '../../state/agentStore';
import { useCommandStore } from '../../state/commandStore';
import { useThemeStore } from '@/state/themeStore';
import { useWindowSize } from 'react-use';
import { useLocation } from 'wouter';
import { useMarketplaceStore } from '@/state/marketplaceStore';
import { useUserPrefsStore } from '../../state/userPrefsStore';
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
  BrainCircuit
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import RotatingTagline from '../RotatingTagline';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

// Define action card props type
interface ActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  color?: string;      
  colorIndex?: number; 
  shortcut?: string;
  badge?: string;
  badgeColor?: string;
}

// Enhanced Action Card component that works for both simple and full dashboard
const ActionCard: React.FC<ActionCardProps> = ({ 
  title, 
  description, 
  icon, 
  onClick, 
  color, 
  colorIndex = 0,
  shortcut,
  badge,
  badgeColor = "bg-primary" 
}) => {
  // Get the accent color for dynamic styling
  const accent = useThemeStore(state => state.accent);
  const buttonRef = React.useRef<HTMLDivElement>(null);
  const clickHandled = React.useRef(false);
  
  // Handle click event with debounce protection
  const handleClick = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Prevent double-firing of click events
    if (clickHandled.current) return;
    clickHandled.current = true;
    
    console.log(`ActionCard: Clicked ${title}`);
    
    // Force button to show active state
    if (buttonRef.current) {
      buttonRef.current.classList.add('scale-95', 'shadow-inner', 'brightness-90');
      
      // Set a timeout to ensure the visual feedback is visible
      setTimeout(() => {
        // Execute the onClick handler
        onClick();
        
        // Reset after a short delay
        setTimeout(() => {
          if (buttonRef.current) {
            buttonRef.current.classList.remove('scale-95', 'shadow-inner', 'brightness-90');
          }
          clickHandled.current = false;
        }, 100);
      }, 50);
    } else {
      // Fallback if ref isn't available
      onClick();
      setTimeout(() => {
        clickHandled.current = false;
      }, 100);
    }
  }, [title, onClick]);
  
  // Calculate the gradient based on accent and color index
  const getColorGradient = () => {
    // If a specific color was provided, use it
    if (color) return color;
    
    // Otherwise, calculate color based on theme accent and index
    const variant = colorIndex % 3;
    
    switch (accent) {
      case 'purple':
        return variant === 0 
          ? 'from-purple-500 to-indigo-600' 
          : variant === 1 
            ? 'from-indigo-400 to-purple-700' 
            : 'from-violet-500 to-purple-600';
      case 'blue':
        return variant === 0 
          ? 'from-blue-500 to-cyan-600' 
          : variant === 1 
            ? 'from-cyan-400 to-blue-700' 
            : 'from-sky-500 to-blue-600';
      case 'green':
        return variant === 0 
          ? 'from-green-500 to-emerald-600' 
          : variant === 1 
            ? 'from-emerald-400 to-green-700' 
            : 'from-teal-500 to-green-600';
      case 'orange': // Dark theme
        return variant === 0 
          ? 'from-gray-800 to-black' 
          : variant === 1 
            ? 'from-zinc-800 to-gray-900' 
            : 'from-neutral-800 to-gray-950';
      case 'pink':
        return variant === 0 
          ? 'from-pink-500 to-rose-600' 
          : variant === 1 
            ? 'from-rose-400 to-pink-700' 
            : 'from-fuchsia-500 to-pink-600';
      default: // Default to purple
        return variant === 0 
          ? 'from-purple-500 to-indigo-600' 
          : variant === 1 
            ? 'from-indigo-400 to-purple-700' 
            : 'from-violet-500 to-purple-600';
    }
  };
  
  // Get the color gradient based on current theme
  const gradientColor = getColorGradient();
  
  return (
    <div 
      ref={buttonRef}
      className={`w-full text-left rounded-xl bg-gradient-to-br ${gradientColor} p-[1.5px] shadow-md hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-95 active:shadow-inner cursor-pointer border-0 focus-within:outline-none focus-within:ring-2 focus-within:ring-white/30 focus-within:ring-offset-1 focus-within:ring-offset-transparent`}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick(e as unknown as React.MouseEvent);
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={title}
    >
      <Card className="bg-black/20 backdrop-blur-lg border-none h-full overflow-hidden relative rounded-xl">
        {badge && (
          <div className={`absolute top-2 right-2 ${badgeColor} text-white text-xs px-1.5 py-0.5 rounded-md font-medium`}>
            {badge}
          </div>
        )}
        <CardHeader className="p-4 pb-1">
          <div className="flex justify-between items-start">
            <CardTitle className="text-base font-medium flex items-center gap-3 text-white">
              <span className="w-7 h-7 flex items-center justify-center rounded-full bg-white/10 text-white p-1.5">{icon}</span>
              {title}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <CardDescription className="text-sm text-white/80">{description}</CardDescription>
          {shortcut && (
            <div className="mt-3 flex items-center">
              <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-white/10 rounded border border-white/20 text-white/70">
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
      onClick={onClick}
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
interface DashboardProps {
  isMobile?: boolean;
  simple?: boolean;  // Use simple mode for fewer options and simpler layout
}

const Dashboard: React.FC<DashboardProps> = ({ isMobile = false, simple = false }) => {
  const { width } = useWindowSize();
  const openAgent = useAgentStore(state => state.openAgent);
  const currentTheme = useThemeStore(state => state.getCurrentTheme());
  const accentColor = useThemeStore(state => state.accent);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const userName = useUserPrefsStore(state => state.name);
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
    
    // Simple layout implementation
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
  
  // Define quickActions - Standard list of actions used in both simple and full dashboards
  const quickActions = [
    {
      title: "Chat with Clara",
      description: "Start a conversation with Clara, your AI assistant",
      icon: <MessageSquare className="h-5 w-5" />,
      onClick: () => openAgent('clara'),
      colorIndex: 0,
      shortcut: "Shift+C",
      category: "communication",
      shortcutAction: (e: KeyboardEvent) => {
        if (e.shiftKey && e.key === 'C') openAgent('clara');
      }
    },
    {
      title: "Panion Chat",
      description: "Interact with the Panion multi-agent system",
      icon: <BrainCircuit className="h-5 w-5" />,
      onClick: () => openAgent('panion'),
      colorIndex: 1,
      category: "communication",
    },
    {
      title: "Take Notes",
      description: "Open the Notes agent to capture your thoughts",
      icon: <FileText className="h-5 w-5" />,
      onClick: () => openAgent('notes'),
      colorIndex: 2,
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
      colorIndex: 0,
      category: "productivity",
    },
    {
      title: "Marketplace",
      description: "Discover and install new agents for your workspace",
      icon: <PlusCircle className="h-5 w-5" />,
      onClick: () => navigate('/marketplace'),
      colorIndex: 1,
      category: "productivity",
    }
  ];

  // Full dashboard renders the complete experience with categories, search, and full layout
  if (!simple) {
    return (
      <div className={`flex flex-col relative w-full h-full overflow-hidden overflow-y-auto bg-gradient-to-b ${getGradient()}`}>
        {/* Header Section */}
        <div className="flex flex-col px-8 pt-12 pb-6 w-full">
          <div className="flex justify-between items-start mb-6">
            <div className="flex flex-col">
              <h2 className="text-xl font-light flex items-center">
                {greeting.icon}
                <span>{greeting.text}{userName ? ', ' + userName : ''}</span>
              </h2>
              <RotatingTagline phrases={[
                "Building intelligent agents...",
                "Analyzing data patterns...",
                "Exploring the knowledge graph...",
                "Connecting with resources..."
              ]} className="text-sm mt-1 opacity-60" />
            </div>
            <Button 
              variant="outline" 
              size="sm"
              className="bg-card/30 border-white/10 text-white hover:bg-card/50"
              onClick={() => setShowSearch(!showSearch)}
            >
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>
          
          {/* Search Input (conditionally rendered) */}
          {showSearch && (
            <div className="mb-6 w-full">
              <Input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search agents, commands, or files..."
                className="bg-black/20 border-white/10 text-white w-full"
              />
            </div>
          )}
          
          {/* Category Tabs */}
          <Tabs 
            defaultValue="all"
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="bg-black/10 p-1 mb-4 max-w-full overflow-x-auto flex no-scrollbar">
              {categories.map(category => (
                <TabsTrigger 
                  key={category.id} 
                  value={category.id}
                  className="text-white/70 data-[state=active]:text-white data-[state=active]:bg-black/20 rounded-sm px-3 py-1.5 hover:text-white transition-colors"
                >
                  <div className="flex items-center whitespace-nowrap">
                    {category.icon}
                    {category.name}
                  </div>
                </TabsTrigger>
              ))}
            </TabsList>
            
            {/* Content for selected category */}
            {categories.map(category => (
              <TabsContent key={category.id} value={category.id} className="mt-0">
                {category.id === 'layouts' ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    <LayoutTemplateCard
                      title="Centered"
                      description="Single window centered"
                      type="centered"
                      onClick={() => applyLayout('centered')}
                    />
                    <LayoutTemplateCard
                      title="Split"
                      description="Two windows side by side"
                      type="split"
                      onClick={() => applyLayout('split')}
                    />
                    <LayoutTemplateCard
                      title="Triple"
                      description="Three windows in a row"
                      type="triple"
                      onClick={() => applyLayout('triple')}
                    />
                    <LayoutTemplateCard
                      title="Grid"
                      description="Four windows in a grid"
                      type="grid"
                      onClick={() => applyLayout('grid')}
                    />
                    <LayoutTemplateCard
                      title="Stack"
                      description="Windows stacked on top"
                      type="stack"
                      onClick={() => applyLayout('stack')}
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {/* Filter actions based on selected category or search */}
                    {quickActions
                      .filter(action => 
                        (category.id === 'all' || action.category === category.id) &&
                        (!searchQuery || 
                          action.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          action.description.toLowerCase().includes(searchQuery.toLowerCase()))
                      )
                      .map((action, index) => (
                        <ActionCard
                          key={`${action.title}-${index}-${renderKey}`}
                          title={action.title}
                          description={action.description}
                          icon={action.icon}
                          onClick={action.onClick}
                          colorIndex={action.colorIndex}
                          shortcut={action.shortcut}
                        />
                      ))
                    }
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    );
  }
  
  // Simple dashboard renders a more focused experience with limited options
  return (
    <div className="absolute inset-0 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full mx-auto flex flex-col items-center justify-center">
        {/* Modern Title Block */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-light tracking-tight mb-3 text-white/90">
            Welcome to <span className="font-semibold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">Panion</span>
          </h1>
          <p className="text-white/70 text-base">Your modern AI workspace environment</p>
          <div className="w-16 h-[2px] bg-gradient-to-r from-white/40 via-white/20 to-transparent mx-auto mt-5"></div>
        </div>
        
        {/* Balanced card grid */}
        <div className="grid grid-cols-2 gap-6 w-full max-w-xl mx-auto">
          {quickActions.map((action, index) => (
            <ActionCard
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

export default Dashboard;