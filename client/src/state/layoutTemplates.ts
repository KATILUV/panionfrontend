import { create } from 'zustand';
import { AgentId, WindowLayout } from './agentStore';

/**
 * DEPRECATED: This file is kept as a compatibility layer but is no longer in active use.
 * New implementations should use layoutUtils.ts for direct window manipulation.
 * 
 * The template-based layout system has been replaced with a simpler, direct approach
 * using the utility functions in layoutUtils.ts, which provide a cleaner API
 * for applying common layouts.
 */

// Simplified layout template interface for backward compatibility
export interface LayoutTemplate {
  id: string;
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  windowStates?: Record<AgentId, {
    position: { x: number, y: number };
    size: { width: number, height: number };
    isOpen: boolean;
    isMinimized: boolean;
  }>;
}

// Empty template store for backward compatibility
interface TemplateStore {
  templates: LayoutTemplate[];
  getTemplateById: (id: string) => LayoutTemplate | undefined;
}

export const useTemplateStore = create<TemplateStore>((set, get) => ({
  templates: [],
  getTemplateById: (id: string) => {
    console.warn('Layout templates are deprecated. Use layoutUtils.ts instead.');
    return get().templates.find(t => t.id === id);
  }
}));

// Empty template categories for backward compatibility
export const templateCategories: any[] = [];

// Empty templates array for backward compatibility
export const layoutTemplates: LayoutTemplate[] = [];

/**
 * Stub function that logs a warning and returns an empty object
 * @deprecated Use layoutUtils.ts instead
 */
export function generateWindowStates(
  template: any,
  agentIds: any[]
): Record<string, any> {
  console.warn('Layout templates are deprecated. Use layoutUtils.ts instead.');
  return {};
}

/**
 * Stub function that logs a warning and returns a minimal layout object
 * @deprecated Use layoutUtils.ts instead
 */
export function createLayoutFromTemplate(
  template: any,
  agentIds: AgentId[]
): Omit<WindowLayout, 'id'> {
  console.warn('Layout templates are deprecated. Use layoutUtils.ts instead.');
  
  const timestamp = Date.now();
  
  return {
    name: "Deprecated layout",
    category: "Deprecated",
    tags: ["deprecated"],
    createdAt: timestamp,
    updatedAt: timestamp,
    windowStates: {}
  };
}