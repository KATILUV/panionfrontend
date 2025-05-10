/**
 * User Preferences Store
 * Manages and persists user preferences and settings
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import log from '@/utils/logger';

// Recent activity interface
export interface RecentActivity {
  agentId: string;
  timestamp: number;
  count: number;
}

// User preferences state interface
interface PreferencesState {
  // Accessibility
  reducedMotion: boolean;
  highContrast: boolean;
  fontSize: 'small' | 'medium' | 'large';
  
  // Behavior
  autoSaveConversations: boolean;
  notificationsEnabled: boolean;
  conversationHistoryDays: number;
  
  // Personalization
  recentActivities: RecentActivity[];
  favoriteAgents: string[];
  savedPrompts: { id: string; name: string; text: string }[];
  
  // Quick access to frequent commands
  frequentCommands: { id: string; count: number }[];
  
  // Interaction history tracking
  hasCompletedOnboarding: boolean;
  lastActiveDate: string;
  
  // Methods
  logAgentActivity: (agentId: string) => void;
  toggleFavoriteAgent: (agentId: string) => void;
  logCommandUsage: (commandId: string) => void;
  getTopAgents: (limit?: number) => RecentActivity[];
  savePrompt: (name: string, text: string) => void;
  deletePrompt: (id: string) => void;
  resetOnboarding: () => void;
  setAccessibilityPreference: <K extends keyof Pick<PreferencesState, 'reducedMotion' | 'highContrast' | 'fontSize'>>(
    key: K,
    value: PreferencesState[K]
  ) => void;
  setBehaviorPreference: <K extends keyof Pick<PreferencesState, 'autoSaveConversations' | 'notificationsEnabled' | 'conversationHistoryDays'>>(
    key: K,
    value: PreferencesState[K]
  ) => void;
}

/**
 * User preferences store with persistence
 */
export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set, get) => ({
      // Default accessibility settings
      reducedMotion: false,
      highContrast: false,
      fontSize: 'medium',
      
      // Default behavior settings
      autoSaveConversations: true,
      notificationsEnabled: true,
      conversationHistoryDays: 30,
      
      // Personalization data
      recentActivities: [],
      favoriteAgents: [],
      savedPrompts: [],
      
      // Command usage frequency
      frequentCommands: [],
      
      // Interaction history
      hasCompletedOnboarding: false,
      lastActiveDate: new Date().toISOString(),
      
      /**
       * Log agent usage to track activity patterns
       */
      logAgentActivity: (agentId: string) => {
        set(state => {
          const now = Date.now();
          const activities = [...state.recentActivities];
          const existingIndex = activities.findIndex(a => a.agentId === agentId);
          
          if (existingIndex >= 0) {
            // Update existing activity
            activities[existingIndex] = {
              ...activities[existingIndex],
              timestamp: now,
              count: activities[existingIndex].count + 1
            };
          } else {
            // Add new activity
            activities.push({
              agentId,
              timestamp: now,
              count: 1
            });
          }
          
          // Keep only the 20 most recent activities
          const sortedActivities = activities
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 20);
          
          return {
            recentActivities: sortedActivities,
            lastActiveDate: new Date().toISOString()
          };
        });
        
        log.debug(`Logged activity for agent: ${agentId}`);
      },
      
      /**
       * Toggle an agent as favorite
       */
      toggleFavoriteAgent: (agentId: string) => {
        set(state => {
          const isFavorite = state.favoriteAgents.includes(agentId);
          
          return {
            favoriteAgents: isFavorite
              ? state.favoriteAgents.filter(id => id !== agentId)
              : [...state.favoriteAgents, agentId]
          };
        });
        
        const isFavorite = get().favoriteAgents.includes(agentId);
        log.debug(`${isFavorite ? 'Added' : 'Removed'} favorite agent: ${agentId}`);
      },
      
      /**
       * Log command usage to track frequently used actions
       */
      logCommandUsage: (commandId: string) => {
        set(state => {
          const commands = [...state.frequentCommands];
          const existingIndex = commands.findIndex(c => c.id === commandId);
          
          if (existingIndex >= 0) {
            // Update existing command
            commands[existingIndex] = {
              ...commands[existingIndex],
              count: commands[existingIndex].count + 1
            };
          } else {
            // Add new command
            commands.push({
              id: commandId,
              count: 1
            });
          }
          
          // Sort by count
          const sortedCommands = commands.sort((a, b) => b.count - a.count);
          
          return { frequentCommands: sortedCommands };
        });
      },
      
      /**
       * Get top agents by usage
       */
      getTopAgents: (limit = 5) => {
        const { recentActivities } = get();
        
        return [...recentActivities]
          .sort((a, b) => b.count - a.count)
          .slice(0, limit);
      },
      
      /**
       * Save a prompt for reuse
       */
      savePrompt: (name: string, text: string) => {
        set(state => {
          const id = `prompt-${Date.now()}`;
          return {
            savedPrompts: [...state.savedPrompts, { id, name, text }]
          };
        });
        
        log.debug(`Saved prompt: ${name}`);
      },
      
      /**
       * Delete a saved prompt
       */
      deletePrompt: (id: string) => {
        set(state => ({
          savedPrompts: state.savedPrompts.filter(prompt => prompt.id !== id)
        }));
        
        log.debug(`Deleted prompt: ${id}`);
      },
      
      /**
       * Reset the onboarding flag to show onboarding again
       */
      resetOnboarding: () => {
        set({ hasCompletedOnboarding: false });
        log.info('Onboarding reset');
      },
      
      /**
       * Set accessibility preference
       */
      setAccessibilityPreference: (key, value) => {
        set({ [key]: value });
        log.debug(`Updated accessibility preference: ${key}=${String(value)}`);
      },
      
      /**
       * Set behavior preference
       */
      setBehaviorPreference: (key, value) => {
        set({ [key]: value });
        log.debug(`Updated behavior preference: ${key}=${String(value)}`);
      }
    }),
    {
      name: 'panion-user-preferences',
      // Only store specific fields
      partialize: (state) => ({
        reducedMotion: state.reducedMotion,
        highContrast: state.highContrast,
        fontSize: state.fontSize,
        autoSaveConversations: state.autoSaveConversations,
        notificationsEnabled: state.notificationsEnabled,
        conversationHistoryDays: state.conversationHistoryDays,
        recentActivities: state.recentActivities,
        favoriteAgents: state.favoriteAgents,
        savedPrompts: state.savedPrompts,
        frequentCommands: state.frequentCommands,
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        lastActiveDate: state.lastActiveDate
      })
    }
  )
);

export default usePreferencesStore;