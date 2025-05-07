import React, { useState, useEffect } from 'react';
import { useMarketplaceStore } from '@/state/marketplaceStore';
import { useThemeStore } from '@/state/themeStore';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, SearchX, Filter, Star, Download, Plus, Check, Tag, X, 
  RefreshCw, ShoppingBag, ArrowLeft, Zap, MessageCircle, 
  ArrowUpRight, Sparkles, ChevronLeft, ChevronRight,
  Folder as FolderIcon, RotateCcw, ChevronDown, LayoutGrid, Grid, Timer
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
  // Explicitly set the theme accent to purple when this page loads
  const setAccent = useThemeStore(state => state.setAccent);
  
  useEffect(() => {
    // Force the accent to purple for marketplace
    setAccent('purple');
  }, [setAccent]);
  
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
  
  type TabType = 'featured' | 'popular' | 'new' | 'browse';
  const [activeTab, setActiveTab] = useState<TabType>('featured');
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
  
  // Enhanced agent card component with hover effects and masonry layout support
  const AgentCard = ({ agent }: { agent: any }) => {
    const isSelected = selectedAgent === agent.id;
    const isInstalled = agent.isInstalled;
    const [isHovered, setIsHovered] = useState(false);
    
    // Determine card height class for masonry-style layout
    // We'll use agent description length & features to suggest a row height
    const getCardHeight = () => {
      // Factors: has preview image, description length, number of categories
      if (agent.previewImage) return 'row-span-2'; // Taller for cards with images
      
      const descLength = agent.description.length;
      const catCount = agent.categories.length;
      
      if (descLength > 200 || catCount > 4) return 'row-span-2';
      if (descLength < 100 && catCount < 3) return 'row-span-1';
      return agent.isFeatured ? 'row-span-2' : 'row-span-1'; 
    };
    
    return (
      <motion.div 
        className={`relative rounded-xl overflow-hidden cursor-pointer group ${getCardHeight()}`}
        onClick={() => setSelectedAgent(isSelected ? null : agent.id)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        whileHover={{ 
          y: -5,
          transition: { 
            duration: 0.2,
          },
        }}
        whileTap={{ scale: 0.98 }}
        layout // Enable layout animations for masonry effect
        transition={{ 
          layout: { 
            type: 'spring', 
            stiffness: 350, 
            damping: 30
          }
        }}
      >
        {/* Card background with gradient overlay */}
        <div 
          className={`absolute inset-0 transition-all duration-300 ${
            isSelected 
              ? 'bg-gradient-to-br from-purple-900/50 to-black/70 backdrop-blur-sm' 
              : 'bg-gradient-to-br from-black/20 to-black/30 backdrop-blur-sm group-hover:from-purple-900/30 group-hover:to-black/50'
          }`}
        />
        
        {/* Highlight border - animated on hover */}
        <div 
          className={`absolute inset-0 transition-opacity duration-300 pointer-events-none ${
            isSelected
              ? 'opacity-100 border-2 border-purple-500/50'
              : isHovered
                ? 'opacity-100 border border-purple-500/30' 
                : 'opacity-0 border border-transparent'
          }`}
        />
        
        {/* New badge with enhanced styling */}
        {agent.isNew && (
          <div className="absolute top-3 right-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full z-10 shadow-md transform transition-transform group-hover:scale-110 flex items-center">
            <span className="mr-1">NEW</span>
            <div className="w-1.5 h-1.5 rounded-full bg-white/80 animate-pulse" />
          </div>
        )}
        
        {/* Featured badge with enhanced styling */}
        {agent.isFeatured && (
          <div className="absolute top-3 left-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full z-10 shadow-md transform transition-transform group-hover:scale-110 flex items-center">
            <Sparkles size={10} className="mr-1" />
            <span>FEATURED</span>
          </div>
        )}
        
        {/* Preview image with enhanced effects */}
        {agent.previewImage && (
          <div className="relative overflow-hidden">
            <div 
              className="h-48 w-full transition-transform duration-700 ease-out group-hover:scale-105"
              style={{ 
                backgroundImage: `url(${agent.previewImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
            {/* Gradient overlay with varying opacity */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/90 group-hover:from-black/10 transition-opacity duration-300" />
            
            {/* Agent icon and name positioned over image */}
            <div className="absolute bottom-0 left-0 p-4 text-white w-full">
              <div className="flex items-center">
                <div className="p-2 rounded-full bg-purple-600/30 backdrop-blur-sm mr-3 group-hover:bg-purple-600/50 transition-colors duration-300 shadow-lg">
                  <DynamicIcon name={agent.icon} size={20} className="text-white" />
                </div>
                <h3 className="text-xl font-semibold group-hover:text-white transition-colors text-white/90">{agent.title}</h3>
              </div>
            </div>
          </div>
        )}
        
        {/* Content section with improved spacing */}
        <div className="p-5 relative">
          {/* Only show icon and title if there's no preview image */}
          {!agent.previewImage && (
            <div className="flex items-center mb-3">
              <div className={`p-2 rounded-full mr-3 transition-colors duration-300 ${
                isSelected 
                  ? 'bg-purple-600/50' 
                  : isHovered 
                    ? 'bg-purple-600/30' 
                    : 'bg-purple-500/10'
              }`}>
                <DynamicIcon name={agent.icon} size={24} className="text-white" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-white/90 group-hover:text-white transition-colors">{agent.title}</h3>
                <div className="flex items-center text-xs text-white/60">
                  <span>{agent.author}</span>
                  <span className="mx-1">•</span>
                  <span>v{agent.version}</span>
                </div>
              </div>
            </div>
          )}
          
          {/* Description with line clamp and hover effect to show more */}
          <div className="relative">
            <p className={`text-sm text-white/70 mb-4 transition-all duration-300 group-hover:text-white/90 ${
              isSelected ? 'line-clamp-none' : 'line-clamp-2'
            }`}>
              {agent.description}
            </p>
            
            {/* Read more indicator that fades out when selected */}
            {!isSelected && agent.description.length > 120 && (
              <div className="absolute bottom-0 right-0 text-xs text-purple-300 bg-gradient-to-l from-black/40 px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                Read more
              </div>
            )}
          </div>
          
          {/* Categories with enhanced visual style */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {agent.categories.slice(0, 3).map((catId: string) => {
              const category = categories.find(c => c.id === catId);
              return category ? (
                <div 
                  key={catId} 
                  className="bg-black/40 text-purple-200 px-2 py-0.5 rounded-full text-xs flex items-center border border-purple-500/20 group-hover:border-purple-500/40 transition-colors"
                >
                  <DynamicIcon name={category.icon} size={10} className="mr-1 text-purple-300" />
                  {category.name}
                </div>
              ) : null;
            })}
            {agent.categories.length > 3 && (
              <div className="bg-black/40 text-white/60 px-2 py-0.5 rounded-full text-xs border border-white/10">
                +{agent.categories.length - 3} more
              </div>
            )}
          </div>
          
          {/* Stats and action buttons with enhanced animations */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center group-hover:scale-105 transition-transform">
                <Star size={14} className="text-yellow-400 mr-1" />
                <span className="text-xs text-white/80 group-hover:text-white transition-colors">{agent.rating}</span>
              </div>
              <div className="flex items-center group-hover:scale-105 transition-transform">
                <Download size={14} className="text-white/60 mr-1 group-hover:text-white/80 transition-colors" />
                <span className="text-xs text-white/80 group-hover:text-white transition-colors">{agent.downloads}</span>
              </div>
            </div>
            
            {/* Install/Uninstall button with enhanced hover effects */}
            <motion.button
              onClick={(e) => {
                e.stopPropagation();
                isInstalled ? uninstallAgent(agent.id) : installAgent(agent.id);
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center space-x-1 shadow-md
                ${isInstalled 
                  ? 'bg-green-500/20 hover:bg-green-500/40 text-green-400 border border-green-500/30' 
                  : 'bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-500/30'}
              `}
            >
              {isInstalled ? (
                <>
                  <Check size={14} className="mr-1" />
                  <span>Installed</span>
                </>
              ) : (
                <>
                  <Plus size={14} className="mr-1" />
                  <span>Install</span>
                </>
              )}
            </motion.button>
          </div>
          
          {/* Quick preview indicator - only shows on hover */}
          {!isSelected && (
            <motion.div 
              className="absolute -bottom-10 left-0 right-0 flex justify-center pointer-events-none"
              animate={{ 
                y: isHovered ? -15 : 0,
                opacity: isHovered ? 1 : 0
              }}
              transition={{ duration: 0.2 }}
            >
              <div className="px-3 py-1 bg-black/60 backdrop-blur-sm rounded-full text-xs text-white/80 flex items-center shadow-lg">
                <span>Click for details</span>
              </div>
            </motion.div>
          )}
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
                <div className="p-3 rounded-full bg-purple-600/20 backdrop-blur-sm mr-4">
                  <DynamicIcon name={agent.icon} size={32} className="text-purple-300" />
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
                <div className="p-3 rounded-full bg-purple-600/20 mr-4">
                  <DynamicIcon name={agent.icon} size={32} className="text-purple-300" />
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
                  : 'bg-purple-600 hover:bg-purple-500 text-white'}
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
                    <div key={catId} className="bg-purple-500/10 text-purple-200 px-3 py-1.5 rounded-full text-sm flex items-center">
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
                  <div className="w-10 h-10 rounded-full bg-purple-500/20 mr-3 flex items-center justify-center">
                    <span className="text-purple-300 font-bold">JD</span>
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
                  <div className="w-10 h-10 rounded-full bg-purple-500/20 mr-3 flex items-center justify-center">
                    <span className="text-purple-300 font-bold">AS</span>
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
                  : 'bg-purple-600 hover:bg-purple-500'}
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

  // Featured section heading (simple version - carousel removed)
  const FeaturedHeading = () => {
    return (
      <div className="mb-8 flex items-center">
        <div className="bg-purple-600/20 backdrop-blur-sm p-2 rounded-full mr-3">
          <Sparkles size={20} className="text-purple-300" />
        </div>
        <h2 className="text-2xl font-bold text-white">Featured Agents</h2>
      </div>
    );
  };
  
  // Main component render
  return (
    <div className="min-h-screen">
      {/* Enhanced Split Hero Section */}
      <section className="relative overflow-hidden py-10 md:py-16 bg-gradient-to-br from-[#1c1056] via-[#1a1245] to-[#21115b]">
        {/* Enhanced Background stars/particles effect */}
        <div className="absolute inset-0 z-0 opacity-30">
          <div className="absolute h-1 w-1 bg-white rounded-full top-[15%] left-[10%] shadow-glow"></div>
          <div className="absolute h-1 w-1 bg-white rounded-full top-[35%] left-[25%] shadow-glow"></div>
          <div className="absolute h-1 w-1 bg-white rounded-full top-[65%] left-[15%] shadow-glow"></div>
          <div className="absolute h-1 w-1 bg-white rounded-full top-[25%] right-[18%] shadow-glow"></div>
          <div className="absolute h-1 w-1 bg-white rounded-full top-[55%] right-[25%] shadow-glow"></div>
          <div className="absolute h-0.5 w-0.5 bg-white rounded-full top-[40%] left-[40%] shadow-glow"></div>
          <div className="absolute h-0.5 w-0.5 bg-white rounded-full top-[70%] left-[50%] shadow-glow"></div>
          <div className="absolute h-0.5 w-0.5 bg-white rounded-full top-[20%] right-[40%] shadow-glow"></div>
          <div className="absolute h-0.5 w-0.5 bg-white rounded-full top-[60%] right-[35%] shadow-glow"></div>
        </div>
        
        <div className="container mx-auto px-6 relative z-20">
          {/* Back to desktop link */}
          <div className="mb-5">
            <Link href="/desktop" className="inline-flex items-center text-white/70 hover:text-white transition-colors bg-black/20 px-4 py-1.5 rounded-full backdrop-blur-sm border border-white/10">
              <ArrowLeft size={16} className="mr-2" />
              <span>Back to Desktop</span>
            </Link>
          </div>
          
          {/* Split Hero Layout - Two columns on desktop */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
            {/* Left column - Text and search content */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7 }}
              className="relative z-10"
            >
              {/* Title with enhanced visual treatment */}
              <div className="relative mb-6">
                <motion.div 
                  className="absolute -top-10 -left-10 w-40 h-40 bg-purple-500/20 rounded-full blur-2xl"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                />
                
                <div className="relative z-20 mb-2">
                  <h1 className="text-4xl md:text-6xl font-bold mb-3 text-white tracking-tight">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-300 to-white">Panion</span> 
                    <span className="relative">
                      <span className="relative z-10">Agent</span>
                      <motion.span 
                        className="absolute bottom-1 left-0 h-3 w-full bg-purple-600/30 rounded-sm -z-10"
                        animate={{ width: ["0%", "100%"], opacity: [0, 1] }}
                        transition={{ duration: 0.8, delay: 0.5 }}
                      />
                    </span>
                    <span className="block">Marketplace</span>
                  </h1>
                </div>
                
                <p className="text-lg md:text-xl text-purple-100 max-w-xl mb-8 leading-relaxed">
                  Discover specialized agents to enhance your workspace and boost your productivity with intelligent automation.
                </p>
              </div>
              
              {/* Enhanced Search bar with glow effect */}
              <div className="relative max-w-md mb-8">
                <motion.div
                  className="absolute inset-0 rounded-full bg-violet-500/20 blur-md z-0"
                  animate={{ scale: [1, 1.05, 1], opacity: [0.2, 0.3, 0.2] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
                <input
                  type="text"
                  placeholder="Search agents..."
                  className="pl-12 pr-4 py-3 bg-black/40 backdrop-blur-sm border border-purple-500/30 rounded-full text-white w-full focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 relative z-10 shadow-[0_0_15px_rgba(147,51,234,0.15)]"
                  value={searchQuery}
                  onChange={(e) => searchAgents(e.target.value)}
                />
                <div className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-purple-300 z-10 bg-purple-500/20 rounded-full p-1">
                  <Search size={18} />
                </div>
              </div>
              
              {/* Quick filter chips for popular categories */}
              <div className="flex flex-wrap gap-2 mb-6">
                <div className="text-sm text-white/70 mr-1 flex items-center">Popular:</div>
                {categories.slice(0, 4).map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setCategory(selectedCategory === category.id ? null : category.id)}
                    className={`px-3 py-1.5 rounded-full text-sm flex items-center transition-all
                      ${selectedCategory === category.id
                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/30'
                        : 'bg-black/30 hover:bg-black/40 text-white/80 hover:text-white border border-white/10 backdrop-blur-sm'
                      }
                    `}
                  >
                    <DynamicIcon name={category.icon} size={14} className="mr-1.5" />
                    {category.name}
                  </button>
                ))}
              </div>
              
              {/* CTA buttons */}
              <div className="flex flex-wrap gap-4">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white rounded-full font-medium flex items-center shadow-lg shadow-purple-900/30 transition-all"
                  onClick={() => setActiveTab('featured')}
                >
                  <Sparkles size={16} className="mr-2" />
                  Explore Featured Agents
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-5 py-2.5 bg-black/40 hover:bg-black/50 text-white border border-purple-500/30 rounded-full font-medium flex items-center backdrop-blur-sm transition-all"
                  onClick={() => setActiveTab('browse')}
                >
                  <Tag size={16} className="mr-2" />
                  Browse All Agents
                </motion.button>
              </div>
            </motion.div>
            
            {/* Right column - Visual elements and featured preview */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="relative hidden md:block"
            >
              {/* Decorative blob/gradient backgrounds */}
              <motion.div 
                className="absolute -top-40 -right-20 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl"
                animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.3, 0.2] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div 
                className="absolute top-20 left-0 w-80 h-80 bg-violet-500/15 rounded-full blur-3xl"
                animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.25, 0.15] }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              />
              
              {/* Featured mini preview cards */}
              <div className="relative px-4 py-6">
                <div className="absolute inset-0 bg-gradient-to-br from-black/30 to-purple-900/20 backdrop-blur-sm rounded-2xl border border-white/10"></div>
                
                <h3 className="relative text-lg font-semibold mb-4 text-white flex items-center">
                  <Sparkles size={18} className="text-purple-300 mr-2" />
                  Featured Agents
                </h3>
                
                {/* Staggered agent preview cards */}
                <div className="relative flex flex-col">
                  {getFeaturedAgents().slice(0, 3).map((agent, idx) => (
                    <motion.div
                      key={agent.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.2 + (idx * 0.1) }}
                      className={`relative p-3 mb-3 rounded-lg bg-black/40 backdrop-blur-md border border-white/10 
                        ${idx === 0 ? 'z-30 -rotate-2 shadow-xl' : idx === 1 ? 'z-20 rotate-1 shadow-lg' : 'z-10 -rotate-1 shadow-md'}`}
                      style={{ transformOrigin: 'center' }}
                    >
                      <div className="flex items-center">
                        <div className="p-2 rounded-full bg-purple-600/20 mr-3">
                          <DynamicIcon name={agent.icon} size={20} className="text-white" />
                        </div>
                        <div>
                          <h4 className="font-medium">{agent.title}</h4>
                          <div className="text-xs text-white/60">{agent.author}</div>
                        </div>
                        {agent.isInstalled ? (
                          <div className="ml-auto bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded-full flex items-center">
                            <Check size={10} className="mr-1" />
                            Installed
                          </div>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              installAgent(agent.id);
                            }}
                            className="ml-auto bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs px-2 py-0.5 rounded-full flex items-center transition-colors"
                          >
                            <Plus size={10} className="mr-1" />
                            Install
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                  
                  {/* More agents indicator */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="flex justify-center items-center py-2 text-sm text-white/70"
                  >
                    <ArrowUpRight size={14} className="mr-1.5" />
                    Explore all {agents.length} agents
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
        
        {/* Bottom gradient overlay - extended and more gradual for better blend */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0c0a1f] via-[#110b2b]/90 to-transparent z-10"></div>
      </section>
      
      {/* Content Section - with improved gradient background and visual hierarchy */}
      <section className="container mx-auto px-6 pb-20 relative bg-gradient-to-b from-[#0c0a1f] to-[#080619]">
        {/* Simple heading for featured section */}
        {activeTab === 'featured' && <FeaturedHeading />}
        
        {/* Main tabs - Enhanced toolbar */}
        <div className="bg-black/30 backdrop-blur-md border border-purple-500/20 rounded-xl px-3 py-2 flex justify-between items-center mb-6 mt-8 shadow-[0_4px_15px_rgba(0,0,0,0.2)] transition-all">
          <div className="flex space-x-1">
            <button 
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                activeTab === 'featured' 
                  ? 'bg-gradient-to-r from-purple-600/90 to-purple-500/90 text-white shadow-[0_2px_8px_rgba(146,64,249,0.25)]' 
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              )}
              onClick={() => {
                setActiveTab('featured');
                setSelectedAgent(null);
              }}
            >
              <Sparkles className="inline-block mr-1.5 h-3.5 w-3.5" />
              Featured
            </button>
            <button 
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                activeTab === 'popular' 
                  ? 'bg-gradient-to-r from-purple-600/90 to-purple-500/90 text-white shadow-[0_2px_8px_rgba(146,64,249,0.25)]' 
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              )}
              onClick={() => {
                setActiveTab('popular');
                setSelectedAgent(null);
              }}
            >
              <Zap className="inline-block mr-1.5 h-3.5 w-3.5" />
              Popular
            </button>
            <button 
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                activeTab === 'new' 
                  ? 'bg-gradient-to-r from-purple-600/90 to-purple-500/90 text-white shadow-[0_2px_8px_rgba(146,64,249,0.25)]' 
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              )}
              onClick={() => {
                setActiveTab('new');
                setSelectedAgent(null);
              }}
            >
              <Plus className="inline-block mr-1.5 h-3.5 w-3.5" />
              New
            </button>
            <button 
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                activeTab === 'browse' 
                  ? 'bg-gradient-to-r from-purple-600/90 to-purple-500/90 text-white shadow-[0_2px_8px_rgba(146,64,249,0.25)]' 
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              )}
              onClick={() => {
                setActiveTab('browse');
                setSelectedAgent(null);
              }}
            >
              <Search className="inline-block mr-1.5 h-3.5 w-3.5" />
              Browse
            </button>
          </div>
          
          {/* Filter button - enhanced */}
          <button 
            className={`py-1.5 px-3 rounded-lg transition-all flex items-center ${
              showFilters || selectedCategory || selectedTags.length > 0 
                ? 'bg-gradient-to-r from-purple-600/90 to-purple-500/90 text-white shadow-[0_2px_8px_rgba(146,64,249,0.25)]' 
                : 'bg-black/20 border border-white/10 text-white/70 hover:text-white hover:bg-white/10'
            }`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={16} className="mr-1.5" />
            <span className="text-sm">Filter</span>
          </button>
        </div>
        
        {/* Filter panel - Enhanced to match toolbar */}
        {showFilters && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="bg-black/30 backdrop-blur-md border border-purple-500/20 rounded-xl p-5 mb-6 shadow-[0_4px_15px_rgba(0,0,0,0.15)] transition-all"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <h3 className="text-sm font-medium mb-2.5 text-purple-200 flex items-center">
                <Icons.Folder size={14} className="mr-1.5 opacity-80" />
                Categories
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    className={`px-2.5 py-1 rounded-lg text-xs flex items-center transition-all ${
                      selectedCategory === category.id 
                        ? 'bg-gradient-to-r from-purple-600/80 to-purple-500/80 text-white shadow-[0_2px_6px_rgba(146,64,249,0.2)]' 
                        : 'bg-black/40 hover:bg-black/50 text-white/70 border border-white/5'
                    }`}
                    onClick={() => setCategory(selectedCategory === category.id ? null : category.id)}
                  >
                    <DynamicIcon name={category.icon} size={12} className="mr-1" />
                    {category.name}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium mb-2.5 text-purple-200 flex items-center">
                <Icons.Tag size={14} className="mr-1.5 opacity-80" />
                Tags
              </h3>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1 thin-scrollbar">
                {getAllTags().map((tag) => (
                  <button
                    key={tag}
                    className={`px-2.5 py-1 rounded-lg text-xs flex items-center transition-all ${
                      selectedTags.includes(tag) 
                        ? 'bg-gradient-to-r from-purple-600/80 to-purple-500/80 text-white shadow-[0_2px_6px_rgba(146,64,249,0.2)]' 
                        : 'bg-black/40 hover:bg-black/50 text-white/70 border border-white/5'
                    }`}
                    onClick={() => toggleTag(tag)}
                  >
                    <Tag size={10} className="mr-1" />
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {/* Reset filters button - enhanced */}
          {(selectedCategory || selectedTags.length > 0) && (
            <div className="mt-4 flex justify-end">
              <button 
                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600/50 to-purple-500/50 text-white hover:from-purple-600/70 hover:to-purple-500/70 transition-all flex items-center shadow-[0_2px_6px_rgba(146,64,249,0.15)]"
                onClick={() => {
                  setCategory(null);
                  selectedTags.forEach(tag => toggleTag(tag));
                }}
              >
                <RefreshCw size={12} className="mr-1.5" />
                <span className="text-xs">Reset Filters</span>
              </button>
            </div>
          )}
        </motion.div>
        )}
        
        {/* Main content area */}
        {selectedAgent ? (
          <AgentDetail />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 auto-rows-min">
            {getDisplayedAgents().map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
            
            {getDisplayedAgents().length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 bg-purple-900/30 rounded-full flex items-center justify-center mb-4">
                  <Search size={24} className="text-purple-300" />
                </div>
                <h3 className="text-xl font-medium text-white mb-2">No agents found</h3>
                <p className="text-white/60 max-w-md mb-4">
                  {"We couldn't find any agents matching your current filters. Try adjusting your search criteria."}
                </p>
                {activeTab === 'browse' && (
                  <button 
                    className="mt-6 px-4 py-2 bg-purple-600/80 text-white rounded-lg flex items-center"
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
      </section>
    </div>
  );
};

export default MarketplacePage;