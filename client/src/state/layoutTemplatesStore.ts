import { create } from 'zustand';
import { AgentId } from './agentStore';
import { log } from './systemLogStore';

/**
 * Layout Template - a blueprint for creating new window layouts
 */
export interface LayoutTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  thumbnail?: string;
  layout: {
    type: 'centered' | 'split' | 'triple' | 'grid' | 'stack';
    priority?: AgentId[]; // Optional list of agents that should be prioritized for template positions
  };
}

/**
 * Template Category - for organizing templates into groups
 */
export interface TemplateCategory {
  id: string;
  name: string;
  description: string;
}

interface TemplateState {
  templates: LayoutTemplate[];
  categories: TemplateCategory[];
  
  getTemplateById: (id: string) => LayoutTemplate | undefined;
  getTemplatesByCategory: (category: string) => LayoutTemplate[];
}

// Define the template categories
const defaultCategories: TemplateCategory[] = [
  {
    id: 'focus',
    name: 'Focus',
    description: 'Templates designed for focused, distraction-free work'
  },
  {
    id: 'development',
    name: 'Development',
    description: 'Templates optimized for coding and development workflow'
  },
  {
    id: 'communication',
    name: 'Communication',
    description: 'Templates designed for chat and messaging focused work'
  },
  {
    id: 'productivity',
    name: 'Productivity',
    description: 'Templates for task management and productivity'
  },
  {
    id: 'research',
    name: 'Research',
    description: 'Templates for research and information gathering'
  },
];

// Define the built-in layout templates
const defaultTemplates: LayoutTemplate[] = [
  // Focus Mode Template
  {
    id: 'focus-mode',
    name: 'Focus Mode',
    description: 'Single centered window for distraction-free work',
    category: 'focus',
    tags: ['minimal', 'concentration', 'single-window'],
    layout: {
      type: 'centered',
      priority: ['clara'] // Prioritize Clara as the centered agent
    }
  },
  
  // Split View Template
  {
    id: 'split-view',
    name: 'Split View',
    description: 'Two windows side by side for comparison or multitasking',
    category: 'productivity',
    tags: ['dual-window', 'side-by-side', 'comparison'],
    layout: {
      type: 'split',
      priority: ['clara', 'notes'] // Prioritize Clara and Notes for split view
    }
  },
  
  // Development Setup Template
  {
    id: 'dev-setup',
    name: 'Development Setup',
    description: 'Code editor with terminal and notes in optimal arrangement',
    category: 'development',
    tags: ['coding', 'terminal', 'editor'],
    layout: {
      type: 'triple',
      priority: ['notes', 'clara', 'marketplace'] // Prioritize these agents for dev setup
    }
  },
  
  // Communication Hub Template
  {
    id: 'communication-hub',
    name: 'Communication Hub',
    description: 'Chat windows arranged for team communication',
    category: 'communication',
    tags: ['chat', 'messaging', 'collaboration'],
    layout: {
      type: 'stack',
      priority: ['clara'] // Prioritize Clara for communication hub
    }
  },
  
  // Research Dashboard Template
  {
    id: 'research-dashboard',
    name: 'Research Dashboard',
    description: 'Notes with multiple browser windows arranged grid-style',
    category: 'research',
    tags: ['research', 'browsing', 'note-taking'],
    layout: {
      type: 'grid',
      priority: ['notes', 'clara', 'marketplace', 'settings']
    }
  },
  
  // Triple Split Template
  {
    id: 'triple-split',
    name: 'Triple Split',
    description: 'Three windows arranged for advanced multitasking',
    category: 'productivity',
    tags: ['multi-window', 'arrangement', 'organization'],
    layout: {
      type: 'triple'
    }
  },
];

export const useTemplateStore = create<TemplateState>((set, get) => ({
  templates: defaultTemplates,
  categories: defaultCategories,
  
  getTemplateById: (id: string) => {
    return get().templates.find(template => template.id === id);
  },
  
  getTemplatesByCategory: (category: string) => {
    return get().templates.filter(template => template.category === category);
  }
}));

/**
 * Generate window states for a template
 * @param template The layout template to use
 * @param agentIds List of agent IDs available to place in the template
 * @returns Record of window states
 */
export function generateWindowStates(
  template: LayoutTemplate,
  agentIds: AgentId[]
): Record<AgentId, {
  position: { x: number, y: number };
  size: { width: number, height: number };
  isOpen: boolean;
  isMinimized: boolean;
}> {
  const windowStates: Record<string, any> = {};
  
  // If no agents provided, return empty window states
  if (!agentIds || !agentIds.length) {
    log.error('No agents available for template');
    return windowStates;
  }
  
  // Sort agents based on template priority if provided
  let sortedAgentIds = [...agentIds];
  if (template.layout.priority && template.layout.priority.length) {
    // Move priority agents to the front of the array
    sortedAgentIds = template.layout.priority
      .filter(id => agentIds.includes(id)) // Keep only existing agents
      .concat(agentIds.filter(id => !template.layout.priority!.includes(id))); // Add the rest
  }
  
  const { type } = template.layout;
  
  switch (type) {
    case 'centered':
      // Single centered window
      if (sortedAgentIds.length > 0) {
        windowStates[sortedAgentIds[0]] = {
          position: { x: 240, y: 120 },
          size: { width: 800, height: 600 },
          isOpen: true,
          isMinimized: false
        };
      }
      break;
      
    case 'split':
      // Two windows side by side
      if (sortedAgentIds.length > 0) {
        windowStates[sortedAgentIds[0]] = {
          position: { x: 50, y: 100 },
          size: { width: 600, height: 600 },
          isOpen: true,
          isMinimized: false
        };
      }
      if (sortedAgentIds.length > 1) {
        windowStates[sortedAgentIds[1]] = {
          position: { x: 670, y: 100 },
          size: { width: 600, height: 600 },
          isOpen: true,
          isMinimized: false
        };
      }
      break;
      
    case 'triple':
      // Three windows in balanced arrangement
      if (sortedAgentIds.length > 0) {
        windowStates[sortedAgentIds[0]] = {
          position: { x: 50, y: 100 },
          size: { width: 500, height: 400 },
          isOpen: true,
          isMinimized: false
        };
      }
      if (sortedAgentIds.length > 1) {
        windowStates[sortedAgentIds[1]] = {
          position: { x: 570, y: 100 },
          size: { width: 500, height: 400 },
          isOpen: true,
          isMinimized: false
        };
      }
      if (sortedAgentIds.length > 2) {
        windowStates[sortedAgentIds[2]] = {
          position: { x: 300, y: 520 },
          size: { width: 500, height: 400 },
          isOpen: true,
          isMinimized: false
        };
      }
      break;
      
    case 'grid':
      // Grid arrangement (2x2)
      const positions = [
        { x: 50, y: 50 },
        { x: 650, y: 50 },
        { x: 50, y: 450 },
        { x: 650, y: 450 }
      ];
      
      sortedAgentIds.slice(0, 4).forEach((id, index) => {
        windowStates[id] = {
          position: positions[index],
          size: { width: 580, height: 380 },
          isOpen: true,
          isMinimized: false
        };
      });
      break;
      
    case 'stack':
      // Stacked windows with slight offset
      sortedAgentIds.slice(0, 4).forEach((id, index) => {
        windowStates[id] = {
          position: { x: 100 + (index * 40), y: 100 + (index * 40) },
          size: { width: 600, height: 500 },
          isOpen: true,
          isMinimized: false
        };
      });
      break;
  }
  
  return windowStates;
}