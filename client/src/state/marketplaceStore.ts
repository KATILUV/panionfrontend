import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AgentId } from './agentStore';
import { log } from './systemLogStore';

export interface MarketplaceAgentCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface MarketplaceAgent {
  id: AgentId;
  title: string;
  description: string;
  icon: string;
  author: string;
  version: string;
  categories: string[];
  tags: string[];
  rating: number;
  downloads: number;
  previewImage?: string;
  isInstalled: boolean;
  isNew?: boolean;
  isFeatured?: boolean;
}

interface MarketplaceState {
  agents: MarketplaceAgent[];
  categories: MarketplaceAgentCategory[];
  installedAgents: AgentId[];
  searchQuery: string;
  selectedCategory: string | null;
  selectedTags: string[];
  
  // Actions
  installAgent: (id: AgentId) => void;
  uninstallAgent: (id: AgentId) => void;
  searchAgents: (query: string) => void;
  setCategory: (category: string | null) => void;
  toggleTag: (tag: string) => void;
  
  // Computed
  getFilteredAgents: () => MarketplaceAgent[];
  getFeaturedAgents: () => MarketplaceAgent[];
  getPopularAgents: () => MarketplaceAgent[];
  getNewAgents: () => MarketplaceAgent[];
  getInstalledAgents: () => MarketplaceAgent[];
}

// Sample categories
const defaultCategories: MarketplaceAgentCategory[] = [
  {
    id: 'productivity',
    name: 'Productivity',
    description: 'Tools to help you get more done',
    icon: 'Calendar'
  },
  {
    id: 'creativity',
    name: 'Creativity',
    description: 'Express yourself and create',
    icon: 'Palette'
  },
  {
    id: 'development',
    name: 'Development',
    description: 'Tools for developers',
    icon: 'Code'
  },
  {
    id: 'utilities',
    name: 'Utilities',
    description: 'Helpful tools and utilities',
    icon: 'Settings'
  },
  {
    id: 'communication',
    name: 'Communication',
    description: 'Connect with others',
    icon: 'MessageCircle'
  }
];

// Sample agents data
const defaultAgents: MarketplaceAgent[] = [
  {
    id: 'clara-chat',
    title: 'Panion Chat',
    description: 'The primary chat interface for Panion',
    icon: 'MessageCircle',
    author: 'Panion',
    version: '1.0.0',
    categories: ['communication'],
    tags: ['chat', 'ai', 'assistant'],
    rating: 5,
    downloads: 1000,
    isInstalled: true,
    isFeatured: true
  },
  {
    id: 'notes',
    title: 'Notes',
    description: 'Take and organize your notes',
    icon: 'FileText',
    author: 'Panion',
    version: '1.0.0',
    categories: ['productivity'],
    tags: ['notes', 'text', 'writing'],
    rating: 4.5,
    downloads: 850,
    isInstalled: true
  },
  {
    id: 'settings',
    title: 'Settings',
    description: 'Configure your Panion desktop',
    icon: 'Settings',
    author: 'Panion',
    version: '1.0.0',
    categories: ['utilities'],
    tags: ['settings', 'configuration'],
    rating: 4,
    downloads: 950,
    isInstalled: true
  },
  {
    id: 'code-assistant',
    title: 'Code Assistant',
    description: 'Help with coding and development tasks',
    icon: 'Code',
    author: 'Panion',
    version: '1.0.0',
    categories: ['development'],
    tags: ['code', 'development', 'programming'],
    rating: 4.8,
    downloads: 750,
    isInstalled: false,
    isNew: true
  },
  {
    id: 'image-generator',
    title: 'Image Generator',
    description: 'Generate images with AI',
    icon: 'Image',
    author: 'Panion',
    version: '1.0.0',
    categories: ['creativity'],
    tags: ['ai', 'image', 'generation'],
    rating: 4.7,
    downloads: 820,
    isInstalled: false,
    isFeatured: true
  },
  {
    id: 'task-manager',
    title: 'Task Manager',
    description: 'Manage your tasks and to-dos',
    icon: 'CheckSquare',
    author: 'Panion',
    version: '1.0.0',
    categories: ['productivity'],
    tags: ['tasks', 'todo', 'organization'],
    rating: 4.6,
    downloads: 780,
    isInstalled: false
  },
  {
    id: 'calendar',
    title: 'Calendar',
    description: 'Schedule and manage your time',
    icon: 'Calendar',
    author: 'Panion',
    version: '1.0.0',
    categories: ['productivity'],
    tags: ['calendar', 'schedule', 'time'],
    rating: 4.3,
    downloads: 680,
    isInstalled: false
  },
  {
    id: 'file-explorer',
    title: 'File Explorer',
    description: 'Browse and manage your files',
    icon: 'Folder',
    author: 'Panion',
    version: '1.0.0',
    categories: ['utilities'],
    tags: ['files', 'explorer', 'management'],
    rating: 4.4,
    downloads: 720,
    isInstalled: false,
    isNew: true
  },
  {
    id: 'music-player',
    title: 'Music Player',
    description: 'Play and organize your music',
    icon: 'Music',
    author: 'Panion',
    version: '1.0.0',
    categories: ['entertainment'],
    tags: ['music', 'audio', 'player'],
    rating: 4.2,
    downloads: 650,
    isInstalled: false
  },
  {
    id: 'weather',
    title: 'Weather',
    description: 'Get weather forecasts',
    icon: 'Cloud',
    author: 'Panion',
    version: '1.0.0',
    categories: ['utilities'],
    tags: ['weather', 'forecast'],
    rating: 4.1,
    downloads: 600,
    isInstalled: false,
    isFeatured: true
  },
];

export const useMarketplaceStore = create<MarketplaceState>()(
  persist(
    (set, get) => ({
      agents: defaultAgents,
      categories: defaultCategories,
      installedAgents: defaultAgents.filter(a => a.isInstalled).map(a => a.id),
      searchQuery: '',
      selectedCategory: null,
      selectedTags: [],
      
      installAgent: (id: AgentId) => {
        log.info(`Installing agent: ${id}`);
        set((state) => {
          const updatedAgents = state.agents.map(agent => 
            agent.id === id ? { ...agent, isInstalled: true } : agent
          );
          const updatedInstalledAgents = [...state.installedAgents, id];
          
          return {
            agents: updatedAgents,
            installedAgents: updatedInstalledAgents
          };
        });
      },
      
      uninstallAgent: (id: AgentId) => {
        log.info(`Uninstalling agent: ${id}`);
        set((state) => {
          const updatedAgents = state.agents.map(agent => 
            agent.id === id ? { ...agent, isInstalled: false } : agent
          );
          const updatedInstalledAgents = state.installedAgents.filter(agentId => agentId !== id);
          
          return {
            agents: updatedAgents,
            installedAgents: updatedInstalledAgents
          };
        });
      },
      
      searchAgents: (query: string) => {
        set({ searchQuery: query });
      },
      
      setCategory: (category: string | null) => {
        set({ selectedCategory: category });
      },
      
      toggleTag: (tag: string) => {
        set((state) => {
          const isSelected = state.selectedTags.includes(tag);
          const updatedTags = isSelected
            ? state.selectedTags.filter(t => t !== tag)
            : [...state.selectedTags, tag];
            
          return { selectedTags: updatedTags };
        });
      },
      
      getFilteredAgents: () => {
        const { agents, searchQuery, selectedCategory, selectedTags } = get();
        
        return agents.filter(agent => {
          // Filter by search query
          const matchesSearch = searchQuery === '' || 
            agent.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            agent.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            agent.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
          
          // Filter by category
          const matchesCategory = selectedCategory === null || 
            agent.categories.includes(selectedCategory);
          
          // Filter by tags
          const matchesTags = selectedTags.length === 0 || 
            selectedTags.every(tag => agent.tags.includes(tag));
          
          return matchesSearch && matchesCategory && matchesTags;
        });
      },
      
      getFeaturedAgents: () => {
        return get().agents.filter(agent => agent.isFeatured);
      },
      
      getPopularAgents: () => {
        return [...get().agents].sort((a, b) => b.downloads - a.downloads).slice(0, 6);
      },
      
      getNewAgents: () => {
        return get().agents.filter(agent => agent.isNew);
      },
      
      getInstalledAgents: () => {
        return get().agents.filter(agent => agent.isInstalled);
      }
    }),
    {
      name: 'marketplace-storage',
    }
  )
);