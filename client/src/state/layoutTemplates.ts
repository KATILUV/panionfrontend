import { AgentId, WindowLayout } from './agentStore';

/**
 * Layout Template - a blueprint for creating new window layouts
 */
export interface LayoutTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  thumbnail?: string; // Path to preview image
  windowStates: Record<AgentId, {
    position: { x: number, y: number };
    size: { width: number, height: number };
    isOpen: boolean;
    isMinimized: boolean;
  }>;
}

/**
 * Template Category - for organizing templates into groups
 */
export interface TemplateCategory {
  id: string;
  name: string;
  description: string;
}

/**
 * Template system configuration
 */
export interface TemplateSystemConfig {
  categories: TemplateCategory[];
  templates: LayoutTemplate[];
}

/**
 * Template Categories
 */
export const templateCategories: TemplateCategory[] = [
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

/**
 * Create initial predefined templates
 * Note: These windowStates will need to be dynamically populated
 * based on the actually registered agents in the application
 */
export const layoutTemplates: LayoutTemplate[] = [
  // Focus Mode Template
  {
    id: 'focus-mode',
    name: 'Focus Mode',
    description: 'Single centered window for distraction-free work',
    category: 'focus',
    tags: ['minimal', 'concentration', 'single-window'],
    windowStates: {}
  },
  
  // Split View Template
  {
    id: 'split-view',
    name: 'Split View',
    description: 'Two windows side by side for comparison or multitasking',
    category: 'productivity',
    tags: ['dual-window', 'side-by-side', 'comparison'],
    windowStates: {}
  },
  
  // Development Setup Template
  {
    id: 'dev-setup',
    name: 'Development Setup',
    description: 'Code editor with terminal and notes in optimal arrangement',
    category: 'development',
    tags: ['coding', 'terminal', 'editor'],
    windowStates: {}
  },
  
  // Communication Hub Template
  {
    id: 'communication-hub',
    name: 'Communication Hub',
    description: 'Chat windows arranged for team communication',
    category: 'communication',
    tags: ['chat', 'messaging', 'collaboration'],
    windowStates: {}
  },
  
  // Research Dashboard Template
  {
    id: 'research-dashboard',
    name: 'Research Dashboard',
    description: 'Notes with multiple browser windows arranged grid-style',
    category: 'research',
    tags: ['research', 'browsing', 'note-taking'],
    windowStates: {}
  },
  
  // Triple Split Template
  {
    id: 'triple-split',
    name: 'Triple Split',
    description: 'Three windows arranged for advanced multitasking',
    category: 'productivity',
    tags: ['multi-window', 'arrangement', 'organization'],
    windowStates: {}
  },
];

/**
 * Generate window states for a template based on a selected pattern
 * @param agentIds List of agent IDs to include in the template
 * @param pattern Pattern name for window positioning
 * @returns Record of window states
 */
export function generateWindowStates(
  agentIds: AgentId[], 
  pattern: 'centered' | 'split' | 'triple' | 'grid' | 'stack'
): Record<AgentId, {
  position: { x: number, y: number };
  size: { width: number, height: number };
  isOpen: boolean;
  isMinimized: boolean;
}> {
  const windowStates: Record<string, any> = {};
  
  // If no agents provided, return empty window states
  if (!agentIds.length) return windowStates;
  
  switch (pattern) {
    case 'centered':
      // Single centered window
      if (agentIds.length > 0) {
        windowStates[agentIds[0]] = {
          position: { x: 200, y: 100 },
          size: { width: 800, height: 600 },
          isOpen: true,
          isMinimized: false
        };
      }
      break;
      
    case 'split':
      // Two windows side by side
      if (agentIds.length > 0) {
        windowStates[agentIds[0]] = {
          position: { x: 50, y: 100 },
          size: { width: 600, height: 600 },
          isOpen: true,
          isMinimized: false
        };
      }
      if (agentIds.length > 1) {
        windowStates[agentIds[1]] = {
          position: { x: 670, y: 100 },
          size: { width: 600, height: 600 },
          isOpen: true,
          isMinimized: false
        };
      }
      break;
      
    case 'triple':
      // Three windows in balanced arrangement
      if (agentIds.length > 0) {
        windowStates[agentIds[0]] = {
          position: { x: 50, y: 100 },
          size: { width: 500, height: 400 },
          isOpen: true,
          isMinimized: false
        };
      }
      if (agentIds.length > 1) {
        windowStates[agentIds[1]] = {
          position: { x: 570, y: 100 },
          size: { width: 500, height: 400 },
          isOpen: true,
          isMinimized: false
        };
      }
      if (agentIds.length > 2) {
        windowStates[agentIds[2]] = {
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
      
      agentIds.slice(0, 4).forEach((id, index) => {
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
      agentIds.forEach((id, index) => {
        windowStates[id] = {
          position: { x: 100 + (index * 30), y: 100 + (index * 30) },
          size: { width: 600, height: 500 },
          isOpen: true,
          isMinimized: false
        };
      });
      break;
  }
  
  return windowStates;
}

/**
 * Apply a template to the current window registry
 * @param template The layout template to apply
 * @param agentIds The current agent IDs in the registry
 * @returns A complete WindowLayout object
 */
export function createLayoutFromTemplate(
  template: LayoutTemplate,
  agentIds: AgentId[]
): Omit<WindowLayout, 'id'> {
  // Determine which pattern to apply based on template ID
  let pattern: 'centered' | 'split' | 'triple' | 'grid' | 'stack' = 'centered';
  
  if (template.id === 'focus-mode') {
    pattern = 'centered';
  } else if (template.id === 'split-view') {
    pattern = 'split';
  } else if (template.id === 'triple-split') {
    pattern = 'triple';
  } else if (template.id === 'research-dashboard') {
    pattern = 'grid';
  } else if (template.id === 'dev-setup') {
    pattern = 'split';
  } else if (template.id === 'communication-hub') {
    pattern = 'stack';
  }
  
  // Generate window states for all agents
  const windowStates = generateWindowStates(agentIds, pattern);
  
  const timestamp = Date.now();
  
  // Create a new layout
  return {
    name: template.name,
    category: template.category,
    tags: template.tags,
    createdAt: timestamp,
    updatedAt: timestamp,
    windowStates
  };
}