import React, { useState, useEffect } from 'react';
import { useMarketplaceStore } from '@/state/marketplaceStore';
import { useThemeStore } from '@/state/themeStore';
import { motion } from 'framer-motion';
import { 
  Search, Filter, Star, Download, Plus, Check, Tag, X, 
  RefreshCw, ShoppingBag, ArrowLeft, Zap, MessageCircle, 
  ArrowUpRight, Sparkles 
} from 'lucide-react';
import * as Icons from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';

// Dynamic icon rendering from string
const DynamicIcon = ({ name, ...props }: { name: string; [key: string]: any }) => {
  const IconComponent = (Icons as any)[name] || Icons.HelpCircle;
  return <IconComponent {...props} />;
};

const MarketplacePage = () => {
  const { 
    agents, 
    categories, 
    searchAgents, 
    setCategory, 
    toggleTag,
    installAgent,
    uninstallAgent,
    getFilteredAgents,
    getFeaturedAgents,
    getPopularAgents,
    getNewAgents,
    searchQuery,
    selectedCategory,
    selectedTags
  } = useMarketplaceStore();
  
  const [activeTab, setActiveTab] = useState<'featured' | 'popular' | 'new' | 'browse'>('featured');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  
  // Get the current accent color for highlighting
  const accent = useThemeStore(state => state.accent);
  
  // Get agents based on active tab
  const getDisplayedAgents = () => {
    switch (activeTab) {
      case 'featured':
        return getFeaturedAgents();
      case 'popular':
        return getPopularAgents();
      case 'new':
        return getNewAgents();
      case 'browse':
      default:
        return getFilteredAgents();
    }
  };

  // Get all unique tags from agents
  const getAllTags = () => {
    const tagSet = new Set<string>();
    agents.forEach(agent => {
      agent.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet);
  };
  
  // Single agent card component - enhanced for marketplace
  const AgentCard = ({ agent }: { agent: any }) => {
    const isSelected = selectedAgent === agent.id;
    const isInstalled = agent.isInstalled;
    
    return (
      <motion.div 
        className={`relative rounded-lg overflow-hidden cursor-pointer transition-all
          ${isSelected 
            ? 'ring-2 ring-primary/50 bg-black/30' 
            : 'hover:bg-black/30 bg-black/20'}
        `}
        onClick={() => setSelectedAgent(isSelected ? null : agent.id)}
        whileHover={{ scale: 1.02, y: -3 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 300, damping: 15 }}
      >
        {/* New badge */}
        {agent.isNew && (
          <div className="absolute top-3 right-3 bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full z-10">
            NEW
          </div>
        )}
        
        {/* Featured badge */}
        {agent.isFeatured && (
          <div className="absolute top-3 left-3 bg-primary text-white text-xs font-bold px-2 py-0.5 rounded-full z-10 flex items-center">
            <Sparkles size={10} className="mr-1" />
            FEATURED
          </div>
        )}
        
        {/* Preview image */}
        {agent.previewImage && (
          <div className="h-48 w-full relative overflow-hidden">
            <div 
              className="absolute inset-0 bg-center bg-cover" 
              style={{ 
                backgroundImage: `url(${agent.previewImage})`,
                filter: 'blur(1px)',
                transform: 'scale(1.05)'
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80" />
            <div className="absolute bottom-0 left-0 p-4 text-white w-full">
              <div className="flex items-center">
                <div className="p-2 rounded-full bg-primary/20 backdrop-blur-sm mr-3">
                  <DynamicIcon name={agent.icon} size={20} className="text-white" />
                </div>
                <h3 className="text-xl font-semibold">{agent.title}</h3>
              </div>
            </div>
          </div>
        )}
        
        {/* Content */}
        <div className="p-5">
          {/* Only show icon and title if there's no preview image */}
          {!agent.previewImage && (
            <div className="flex items-center mb-3">
              <div className={`p-2 rounded-full mr-3 ${isSelected ? 'bg-primary/30' : 'bg-primary/10'}`}>
                <DynamicIcon name={agent.icon} size={24} className={isSelected ? 'text-primary' : 'text-white/80'} />
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
          )}
          
          <p className="text-sm text-white/80 mb-4 line-clamp-2">{agent.description}</p>
          
          {/* Categories */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {agent.categories.slice(0, 3).map((catId) => {
              const category = categories.find(c => c.id === catId);
              return category ? (
                <div key={catId} className="bg-primary/10 text-primary-foreground px-2 py-0.5 rounded-full text-xs flex items-center">
                  <DynamicIcon name={category.icon} size={10} className="mr-1" />
                  {category.name}
                </div>
              ) : null;
            })}
            {agent.categories.length > 3 && (
              <div className="bg-black/20 text-white/60 px-2 py-0.5 rounded-full text-xs">
                +{agent.categories.length - 3} more
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
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
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center space-x-1
                ${isInstalled 
                  ? 'bg-green-500/20 hover:bg-green-500/30 text-green-400' 
                  : 'bg-primary/20 hover:bg-primary/30 text-primary-foreground'}
              `}
            >
              {isInstalled ? (
                <>
                  <Check size={14} />
                  <span>Installed</span>
                </>
              ) : (
                <>
                  <Plus size={14} />
                  <span>Install</span>
                </>
              )}
            </button>
          </div>
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
        className="bg-black/30 backdrop-blur-sm border border-white/10 rounded-lg h-full overflow-y-auto"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 20 }}
      >
        {/* Preview image banner */}
        {agent.previewImage && (
          <div className="h-64 w-full relative">
            <div 
              className="absolute inset-0 bg-center bg-cover" 
              style={{ backgroundImage: `url(${agent.previewImage})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/80 backdrop-blur-[1px]" />
            
            <div className="absolute top-4 left-4">
              <button 
                onClick={() => setSelectedAgent(null)}
                className="bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white p-2 rounded-full transition-all"
              >
                <ArrowLeft size={20} />
              </button>
            </div>
            
            <div className="absolute bottom-0 left-0 p-6 text-white">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-primary/20 backdrop-blur-sm mr-4">
                  <DynamicIcon name={agent.icon} size={32} className="text-primary" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold">{agent.title}</h2>
                  <div className="flex items-center text-sm text-white/70">
                    <span>{agent.author}</span>
                    <span className="mx-2">•</span>
                    <span>v{agent.version}</span>
                    <span className="mx-2">•</span>
                    <div className="flex items-center">
                      <Star size={14} className="text-yellow-400 mr-1" />
                      <span>{agent.rating}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className="p-6">
          {/* Only show header if there's no preview image */}
          {!agent.previewImage && (
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <button 
                  onClick={() => setSelectedAgent(null)}
                  className="bg-black/40 hover:bg-black/60 text-white p-2 rounded-full transition-all mr-3"
                >
                  <ArrowLeft size={20} />
                </button>
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
            </div>
          )}
          
          {/* Install button - fixed at the top right when scrolling */}
          <div className="sticky top-0 z-10 float-right ml-4 mb-4">
            <button
              onClick={() => agent.isInstalled ? uninstallAgent(agent.id) : installAgent(agent.id)}
              className={`px-5 py-2.5 rounded-full flex items-center space-x-2 transition-all shadow-lg
                ${agent.isInstalled 
                  ? 'bg-red-500 text-white hover:bg-red-600' 
                  : 'bg-primary hover:bg-primary/90 text-white'}
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
                  <span>Install Agent</span>
                </>
              )}
            </button>
          </div>
          
          <p className="text-white/80 text-lg mb-8 leading-relaxed">{agent.description}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Stats and categories in 2-column layout */}
            <div>
              <h3 className="text-xl font-semibold mb-4">Details</h3>
              
              <div className="grid grid-cols-2 gap-4">
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
            </div>
            
            <div>
              <h3 className="text-xl font-semibold mb-4">Categories</h3>
              <div className="flex flex-wrap gap-2">
                {agent.categories.map((catId) => {
                  const category = categories.find(c => c.id === catId);
                  return category ? (
                    <div key={catId} className="bg-primary/10 text-primary-foreground px-3 py-1.5 rounded-full text-sm flex items-center">
                      <DynamicIcon name={category.icon} size={14} className="mr-1.5" />
                      {category.name}
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          </div>
          
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4">Tags</h3>
            <div className="flex flex-wrap gap-3">
              {agent.tags.map((tag) => (
                <div key={tag} className="bg-black/20 text-white/70 px-3 py-1.5 rounded-full text-sm flex items-center">
                  <Tag size={14} className="mr-1.5" />
                  {tag}
                </div>
              ))}
            </div>
          </div>
          
          {/* Testimonials section - example */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4">What People Are Saying</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-black/20 rounded-lg p-5 border border-white/10">
                <div className="flex items-center mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 mr-3 flex items-center justify-center">
                    <span className="text-primary font-bold">JD</span>
                  </div>
                  <div>
                    <h4 className="font-medium">John Doe</h4>
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star key={i} size={12} className="text-yellow-400" fill="#FBBF24" />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-white/80">
                  "This agent completely transformed my workflow. So intuitive and helpful!"
                </p>
              </div>
              
              <div className="bg-black/20 rounded-lg p-5 border border-white/10">
                <div className="flex items-center mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 mr-3 flex items-center justify-center">
                    <span className="text-primary font-bold">AS</span>
                  </div>
                  <div>
                    <h4 className="font-medium">Alice Smith</h4>
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star key={i} size={12} className={i <= 4 ? "text-yellow-400" : "text-gray-500"} fill={i <= 4 ? "#FBBF24" : "none"} />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-white/80">
                  "Great agent with amazing capabilities. Would love to see more integrations in the future."
                </p>
              </div>
            </div>
          </div>
          
          {/* Call to action */}
          <div className="flex justify-center mb-10">
            <button
              onClick={() => agent.isInstalled ? uninstallAgent(agent.id) : installAgent(agent.id)}
              className={`px-8 py-3 rounded-full flex items-center space-x-3 transition-all text-white font-medium
                ${agent.isInstalled 
                  ? 'bg-red-500 hover:bg-red-600' 
                  : 'bg-primary hover:bg-primary/90'}
              `}
            >
              {agent.isInstalled ? (
                <>
                  <X size={20} />
                  <span>Uninstall Agent</span>
                </>
              ) : (
                <>
                  <Plus size={20} />
                  <span>Install Agent</span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    );
  };

  // Featured spotlight for the top of the page
  const FeaturedSpotlight = () => {
    const featuredAgents = getFeaturedAgents().slice(0, 1);
    if (!featuredAgents.length) return null;
    
    const agent = featuredAgents[0];
    
    return (
      <div className="mb-8 relative overflow-hidden rounded-xl">
        <div className="relative h-[400px] flex overflow-hidden">
          {/* Background image with overlay */}
          {agent.previewImage ? (
            <>
              <div 
                className="absolute inset-0 bg-center bg-cover" 
                style={{ backgroundImage: `url(${agent.previewImage})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent" />
            </>
          ) : (
            // Fallback gradient if no image
            <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-primary/20" />
          )}
          
          {/* Content */}
          <div className="relative flex flex-col justify-center p-8 md:p-12 md:max-w-[60%]">
            <div className="mb-4 flex items-center space-x-2">
              <div className="bg-primary/20 backdrop-blur-sm p-2 rounded-full">
                <DynamicIcon name={agent.icon} size={28} className="text-primary" />
              </div>
              <div className="bg-primary rounded-full px-3 py-1 text-xs text-white font-bold flex items-center">
                <Sparkles size={10} className="mr-1" />
                FEATURED AGENT
              </div>
            </div>
            
            <h2 className="text-3xl md:text-4xl font-bold mb-3 text-white">{agent.title}</h2>
            <p className="text-lg text-white/80 mb-6 line-clamp-3">{agent.description}</p>
            
            <div className="flex flex-wrap gap-2 mb-6">
              {agent.categories.map((catId) => {
                const category = categories.find(c => c.id === catId);
                return category ? (
                  <div key={catId} className="bg-black/30 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-sm flex items-center">
                    <DynamicIcon name={category.icon} size={14} className="mr-1.5" />
                    {category.name}
                  </div>
                ) : null;
              })}
            </div>
            
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => setSelectedAgent(agent.id)}
                className="bg-white text-black px-6 py-2.5 rounded-full font-medium flex items-center space-x-2 hover:bg-white/90 transition-all"
              >
                <span>Learn More</span>
                <ArrowUpRight size={18} />
              </button>
              
              <button
                onClick={() => agent.isInstalled ? uninstallAgent(agent.id) : installAgent(agent.id)}
                className={`px-6 py-2.5 rounded-full flex items-center space-x-2 transition-all
                  ${agent.isInstalled 
                    ? 'bg-red-500 text-white hover:bg-red-600' 
                    : 'bg-primary text-white hover:bg-primary/90'}
                `}
              >
                {agent.isInstalled ? (
                  <>
                    <Check size={18} />
                    <span>Installed</span>
                  </>
                ) : (
                  <>
                    <Plus size={18} />
                    <span>Install Now</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Main component render
  return (
    <div className="max-w-[1600px] mx-auto px-4 py-8">
      {/* Back to desktop link */}
      <div className="mb-6">
        <Link href="/desktop" className="inline-flex items-center text-white/70 hover:text-white transition-all">
          <ArrowLeft size={16} className="mr-1" />
          <span>Back to Desktop</span>
        </Link>
      </div>
      
      {/* Page title */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <ShoppingBag size={28} className="text-primary mr-3" />
          <h1 className="text-3xl font-bold">Agent Marketplace</h1>
        </div>
        
        {/* Search box */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search agents..."
            className="pl-10 pr-4 py-2.5 bg-black/30 backdrop-blur-sm border border-white/10 rounded-full text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 w-64"
            value={searchQuery}
            onChange={(e) => searchAgents(e.target.value)}
          />
          <Search size={18} className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-white/50" />
        </div>
      </div>
      
      {/* Only show featured spotlight when on the featured tab */}
      {activeTab === 'featured' && <FeaturedSpotlight />}
      
      {/* Main tabs */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex space-x-1">
          <button 
            className={cn(
              "px-4 py-2 rounded-lg text-base font-medium transition-all",
              activeTab === 'featured' 
                ? 'bg-primary/20 text-primary' 
                : 'text-white/70 hover:text-white hover:bg-white/5'
            )}
            onClick={() => {
              setActiveTab('featured');
              setSelectedAgent(null);
            }}
          >
            <Sparkles className="inline-block mr-2 h-4 w-4" />
            Featured
          </button>
          <button 
            className={cn(
              "px-4 py-2 rounded-lg text-base font-medium transition-all",
              activeTab === 'popular' 
                ? 'bg-primary/20 text-primary' 
                : 'text-white/70 hover:text-white hover:bg-white/5'
            )}
            onClick={() => {
              setActiveTab('popular');
              setSelectedAgent(null);
            }}
          >
            <Zap className="inline-block mr-2 h-4 w-4" />
            Popular
          </button>
          <button 
            className={cn(
              "px-4 py-2 rounded-lg text-base font-medium transition-all",
              activeTab === 'new' 
                ? 'bg-primary/20 text-primary' 
                : 'text-white/70 hover:text-white hover:bg-white/5'
            )}
            onClick={() => {
              setActiveTab('new');
              setSelectedAgent(null);
            }}
          >
            <Plus className="inline-block mr-2 h-4 w-4" />
            New
          </button>
          <button 
            className={cn(
              "px-4 py-2 rounded-lg text-base font-medium transition-all",
              activeTab === 'browse' 
                ? 'bg-primary/20 text-primary' 
                : 'text-white/70 hover:text-white hover:bg-white/5'
            )}
            onClick={() => {
              setActiveTab('browse');
              setSelectedAgent(null);
            }}
          >
            <Search className="inline-block mr-2 h-4 w-4" />
            Browse All
          </button>
        </div>
        
        {/* Filter button */}
        <button 
          className={`p-2 rounded-lg transition-all flex items-center ${showFilters || selectedCategory || selectedTags.length > 0 ? 'bg-primary/20 text-primary' : 'bg-black/20 border border-white/10 text-white/70 hover:text-white'}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter size={18} className="mr-2" />
          <span>Filter</span>
        </button>
      </div>
      
      {/* Filter panel */}
      {showFilters && (
        <div className="bg-black/30 backdrop-blur-sm border border-white/10 rounded-lg p-6 mb-6 theme-transition">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-base font-medium mb-3">Categories</h3>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    className={`px-3 py-1.5 rounded-lg text-sm flex items-center transition-all ${selectedCategory === category.id ? 'bg-primary/20 text-primary' : 'bg-black/30 hover:bg-black/40 text-white/70'}`}
                    onClick={() => setCategory(selectedCategory === category.id ? null : category.id)}
                  >
                    <DynamicIcon name={category.icon} size={14} className="mr-1.5" />
                    {category.name}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="text-base font-medium mb-3">Tags</h3>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                {getAllTags().map((tag) => (
                  <button
                    key={tag}
                    className={`px-3 py-1.5 rounded-lg text-xs flex items-center transition-all ${selectedTags.includes(tag) ? 'bg-primary/20 text-primary' : 'bg-black/30 hover:bg-black/40 text-white/70'}`}
                    onClick={() => toggleTag(tag)}
                  >
                    <Tag size={12} className="mr-1.5" />
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {/* Reset filters button - only show when filters are active */}
          {(selectedCategory || selectedTags.length > 0) && (
            <div className="mt-4 flex justify-end">
              <button 
                className="px-3 py-1.5 rounded-lg bg-black/20 border border-white/10 text-white/70 hover:text-white transition-all flex items-center"
                onClick={() => {
                  setCategory(null);
                  selectedTags.forEach(tag => toggleTag(tag));
                }}
              >
                <RefreshCw size={14} className="mr-1.5" />
                Reset filters
              </button>
            </div>
          )}
        </div>
      )}
      
      {/* Main content area */}
      {selectedAgent ? (
        <AgentDetail />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {getDisplayedAgents().map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
          
          {getDisplayedAgents().length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
              <div className="bg-black/20 rounded-full p-6 mb-6">
                <Search size={40} className="text-white/40" />
              </div>
              <h3 className="text-xl font-medium mb-2">No agents found</h3>
              <p className="text-white/60 max-w-lg">
                {activeTab === 'installed' 
                  ? "You haven't installed any agents yet. Browse the marketplace to find new agents!" 
                  : "Try adjusting your search or filters to find what you're looking for"}
              </p>
              {activeTab === 'browse' && (
                <button 
                  className="mt-6 px-4 py-2 bg-primary/20 text-primary rounded-lg flex items-center"
                  onClick={() => {
                    setCategory(null);
                    selectedTags.forEach(tag => toggleTag(tag));
                    searchAgents('');
                  }}
                >
                  <RefreshCw size={16} className="mr-2" />
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MarketplacePage;