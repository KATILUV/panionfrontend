import React, { useState } from 'react';
import { useMarketplaceStore } from '../../state/marketplaceStore';
import { useThemeStore } from '../../state/themeStore';
import { motion } from 'framer-motion';
import { 
  Search, Filter, Star, Download, Plus, Check, Tag, X, RefreshCw, 
  Settings, ExternalLink, ShoppingBag, PlayCircle
} from 'lucide-react';
import * as Icons from 'lucide-react';
import { useLocation } from 'wouter';

// Dynamic icon rendering from string
const DynamicIcon = ({ name, ...props }: { name: string; [key: string]: any }) => {
  const IconComponent = (Icons as any)[name] || Icons.HelpCircle;
  return <IconComponent {...props} />;
};

// This is now the Agent Manager component
const MarketplaceAgent = () => {
  console.log("MarketplaceAgent mounted"); // Add console log for debugging
  const [_, navigate] = useLocation();
  
  const { 
    agents, 
    categories, 
    installAgent,
    uninstallAgent,
    getInstalledAgents,
    searchAgents,
    searchQuery
  } = useMarketplaceStore();
  
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  
  // We only want to display installed agents in this view
  const installedAgents = getInstalledAgents();
  
  // Single agent card component
  const AgentCard = ({ agent }: { agent: any }) => {
    const isSelected = selectedAgent === agent.id;
    const isInstalled = agent.isInstalled;
    
    return (
      <motion.div 
        className={`relative rounded-lg p-4 cursor-pointer theme-transition
          ${isSelected 
            ? 'bg-primary/20 border border-primary/40' 
            : 'bg-black/20 hover:bg-black/30 border border-white/10'}
        `}
        onClick={() => setSelectedAgent(isSelected ? null : agent.id)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 300, damping: 15 }}
      >
        {/* New badge */}
        {agent.isNew && (
          <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
            NEW
          </div>
        )}
        
        <div className="flex items-center mb-3">
          <div className={`p-2 rounded-full mr-3 ${isSelected ? 'bg-primary/30' : 'bg-primary/10'}`}>
            <DynamicIcon name={agent.icon} size={24} className={isSelected ? 'text-primary' : 'text-white/70'} />
          </div>
          <div>
            <h3 className="text-lg font-medium">{agent.title}</h3>
            <div className="flex items-center text-xs text-white/60">
              <span>{agent.author}</span>
              <span className="mx-1">•</span>
              <span>v{agent.version}</span>
            </div>
          </div>
        </div>
        
        <p className="text-sm text-white/80 mb-3 line-clamp-2">{agent.description}</p>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="flex items-center">
              <Star size={14} className="text-yellow-400 mr-1" />
              <span className="text-xs">{agent.rating}</span>
            </div>
            <div className="flex items-center">
              <Download size={14} className="text-white/60 mr-1" />
              <span className="text-xs">{agent.downloads}</span>
            </div>
          </div>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              isInstalled ? uninstallAgent(agent.id) : installAgent(agent.id);
            }}
            className={`p-1.5 rounded-full transition-all
              ${isInstalled 
                ? 'bg-green-500/20 hover:bg-green-500/30 text-green-400' 
                : 'bg-primary/20 hover:bg-primary/30 text-primary-foreground'}
            `}
          >
            {isInstalled ? <Check size={16} /> : <Plus size={16} />}
          </button>
        </div>
      </motion.div>
    );
  };
  
  // Detailed agent view when selected
  const AgentDetail = () => {
    if (!selectedAgent) return null;
    
    const agent = agents.find(a => a.id === selectedAgent);
    if (!agent) return null;
    
    return (
      <motion.div 
        className="bg-black/30 border border-white/10 rounded-lg p-6 h-full"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 20 }}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-primary/20 mr-4">
              <DynamicIcon name={agent.icon} size={32} className="text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold">{agent.title}</h2>
              <div className="flex items-center text-sm text-white/60">
                <span>{agent.author}</span>
                <span className="mx-1">•</span>
                <span>v{agent.version}</span>
              </div>
            </div>
          </div>
          
          <button
            onClick={() => agent.isInstalled ? uninstallAgent(agent.id) : installAgent(agent.id)}
            className={`px-4 py-2 rounded-full flex items-center space-x-2 transition-all
              ${agent.isInstalled 
                ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400' 
                : 'bg-primary/20 hover:bg-primary/30 text-primary-foreground'}
            `}
          >
            {agent.isInstalled ? (
              <>
                <X size={18} />
                <span>Uninstall</span>
              </>
            ) : (
              <>
                <Plus size={18} />
                <span>Install</span>
              </>
            )}
          </button>
        </div>
        
        <p className="text-white/80 mb-6">{agent.description}</p>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-black/20 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <Star size={18} className="text-yellow-400 mr-2" />
              <h3 className="font-medium">Rating</h3>
            </div>
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star 
                  key={i} 
                  size={16} 
                  className={i <= Math.floor(agent.rating) ? "text-yellow-400" : "text-gray-500"}
                  fill={i <= Math.floor(agent.rating) ? "#FBBF24" : "none"}
                />
              ))}
              <span className="ml-2 text-sm">{agent.rating} / 5</span>
            </div>
          </div>
          
          <div className="bg-black/20 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <Download size={18} className="text-white/60 mr-2" />
              <h3 className="font-medium">Downloads</h3>
            </div>
            <p className="text-lg">{agent.downloads.toLocaleString()}</p>
          </div>
        </div>
        
        <div className="mb-6">
          <h3 className="font-medium mb-2">Categories</h3>
          <div className="flex flex-wrap gap-2">
            {agent.categories.map((catId) => {
              const category = categories.find(c => c.id === catId);
              return category ? (
                <div key={catId} className="bg-primary/10 text-primary-foreground px-3 py-1 rounded-full text-sm flex items-center">
                  <DynamicIcon name={category.icon} size={14} className="mr-1" />
                  {category.name}
                </div>
              ) : null;
            })}
          </div>
        </div>
        
        <div>
          <h3 className="font-medium mb-2">Tags</h3>
          <div className="flex flex-wrap gap-2">
            {agent.tags.map((tag) => (
              <div key={tag} className="bg-black/20 text-white/70 px-3 py-1 rounded-full text-sm flex items-center">
                <Tag size={14} className="mr-1" />
                {tag}
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    );
  };

  // Main component render
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Agent Manager</h1>
        
        <div className="flex items-center space-x-3">
          {/* Search box */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search agents..."
              className="pl-8 pr-3 py-1.5 bg-black/20 border border-white/10 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 w-48"
              value={searchQuery}
              onChange={(e) => searchAgents(e.target.value)}
            />
            <Search size={16} className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-white/50" />
          </div>
          
          {/* Browse Marketplace button */}
          <button 
            className="px-4 py-1.5 rounded-md bg-primary/20 hover:bg-primary/30 text-primary transition-all flex items-center"
            onClick={() => navigate('/marketplace')}
          >
            <ShoppingBag size={16} className="mr-2" />
            Browse Marketplace
          </button>
        </div>
      </div>
      
      {/* Main content area */}
      <div className="flex-1 overflow-hidden">
        <div className="flex h-full space-x-4">
          {/* Installed agent list */}
          <div className={`${selectedAgent ? 'w-1/2' : 'w-full'} overflow-y-auto pr-2`}>
            {installedAgents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {installedAgents.map((agent) => (
                  <AgentCard key={agent.id} agent={agent} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="bg-black/20 rounded-full p-4 mb-4">
                  <PlayCircle size={36} className="text-white/40" />
                </div>
                <h3 className="text-lg font-medium mb-2">No agents installed</h3>
                <p className="text-white/60 max-w-md mb-6">
                  You haven't installed any agents yet. Visit the marketplace to discover and install new agents.
                </p>
                <button 
                  className="px-5 py-2.5 rounded-md bg-primary hover:bg-primary/90 text-white transition-all flex items-center"
                  onClick={() => navigate('/marketplace')}
                >
                  <ShoppingBag size={18} className="mr-2" />
                  Browse Marketplace
                </button>
              </div>
            )}
          </div>
          
          {/* Agent details */}
          {selectedAgent && (
            <div className="w-1/2 overflow-y-auto pr-2">
              <AgentDetail />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MarketplaceAgent;