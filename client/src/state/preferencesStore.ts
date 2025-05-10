/**
 * User Preferences Store
 * Manages user customization preferences throughout the application
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import log from '@/utils/logger';

// Define preference categories
export type WorkflowPreferences = {
  favoriteAgents: string[];
  pinnedActions: string[];
  recentSearches: string[];
  defaultAgent: string;
  startupAgent: string | null;
  autoSave: boolean;
};

export type UIPreferences = {
  showWelcomeScreen: boolean;
  showTips: boolean;
  compactMode: boolean;
  showTaskbar: boolean;
  actionBarPosition: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  showActionLabels: boolean;
  enableAnimations: boolean;
  fontSize: 'small' | 'medium' | 'large';
  enableSmartSuggestions: boolean;
  darkModeSchedule: 'system' | 'always' | 'never' | 'timed';
  darkModeStartTime?: string; // Format: "HH:MM" 
  darkModeEndTime?: string; // Format: "HH:MM"
};

export type AccessibilityPreferences = {
  highContrast: boolean;
  reduceMotion: boolean;
  screenReader: boolean;
  keyboardNavigationMode: 'standard' | 'enhanced';
  colorBlindMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
  textToSpeech: boolean;
  speechToText: boolean;
};

export type NotificationPreferences = {
  enableNotifications: boolean;
  notificationSounds: boolean;
  desktopNotifications: boolean;
  inAppNotifications: boolean;
  reminderNotifications: boolean;
  updateNotifications: boolean;
  doNotDisturbMode: boolean;
  doNotDisturbStartTime?: string; // Format: "HH:MM"
  doNotDisturbEndTime?: string; // Format: "HH:MM"
};

export type PrivacyPreferences = {
  saveHistory: boolean;
  shareAnalytics: boolean;
  clearHistoryOnExit: boolean;
  personalizedSuggestions: boolean;
  autoDeleteHistoryAfterDays: number;
  rememberSessions: boolean;
};

// Define agent-specific preferences
export type AgentPreferences = {
  conversationMode?: string;
  customPrompt?: string;
  useHistory?: boolean;
  showThinking?: boolean;
  [key: string]: any; // Allow for dynamic/future preferences
};

// Main preferences state type
export interface PreferencesState {
  // User profile
  name: string;
  email: string;
  avatar: string | null;
  joined: string; // ISO date string
  lastLogin: string; // ISO date string
  
  // Categories
  workflow: WorkflowPreferences;
  ui: UIPreferences;
  accessibility: AccessibilityPreferences;
  notifications: NotificationPreferences;
  privacy: PrivacyPreferences;
  
  // Agent-specific preferences
  agents?: Record<string, AgentPreferences>;
  
  // Basic actions
  setName: (name: string) => void;
  setEmail: (email: string) => void;
  setAvatar: (avatar: string | null) => void;
  
  // Workflow preferences
  addFavoriteAgent: (agentId: string) => void;
  removeFavoriteAgent: (agentId: string) => void;
  addPinnedAction: (actionId: string) => void;
  removePinnedAction: (actionId: string) => void;
  setDefaultAgent: (agentId: string) => void;
  setStartupAgent: (agentId: string | null) => void;
  
  // UI preferences
  setActionBarPosition: (position: UIPreferences['actionBarPosition']) => void;
  toggleActionLabels: () => void;
  toggleSmartSuggestions: () => void;
  toggleCompactMode: () => void;
  
  // Agent preferences
  setAgentPreference: (agentId: string, key: string, value: any) => void;
  
  // Generic setter for any preference
  setPreference: <T extends keyof PreferencesState>(
    category: T, 
    key: keyof PreferencesState[T], 
    value: any
  ) => void;
  
  // Reset preferences
  resetToDefault: () => void;
}

// Default preferences
const defaultPreferences: Omit<PreferencesState, 
  'setName' | 'setEmail' | 'setAvatar' | 
  'addFavoriteAgent' | 'removeFavoriteAgent' | 
  'addPinnedAction' | 'removePinnedAction' | 
  'setDefaultAgent' | 'setStartupAgent' | 
  'setActionBarPosition' | 'toggleActionLabels' | 
  'toggleSmartSuggestions' | 'toggleCompactMode' | 
  'setPreference' | 'resetToDefault' | 'setAgentPreference'
> = {
  // Initialize agent preferences with default conversation modes
  agents: {
    panion: {
      conversationMode: 'casual'
    }
  },
  name: 'Guest User',
  email: '',
  avatar: null,
  joined: new Date().toISOString(),
  lastLogin: new Date().toISOString(),
  
  workflow: {
    favoriteAgents: ['clara', 'panion'],
    pinnedActions: ['open-search', 'open-notes', 'toggle-maximize'],
    recentSearches: [],
    defaultAgent: 'clara',
    startupAgent: 'panion',
    autoSave: true
  },
  
  ui: {
    showWelcomeScreen: true,
    showTips: true,
    compactMode: false,
    showTaskbar: true,
    actionBarPosition: 'bottom-right',
    showActionLabels: true,
    enableAnimations: true,
    fontSize: 'medium',
    enableSmartSuggestions: true,
    darkModeSchedule: 'system'
  },
  
  accessibility: {
    highContrast: false,
    reduceMotion: false,
    screenReader: false,
    keyboardNavigationMode: 'standard',
    colorBlindMode: 'none',
    textToSpeech: false,
    speechToText: false
  },
  
  notifications: {
    enableNotifications: true,
    notificationSounds: true,
    desktopNotifications: true,
    inAppNotifications: true,
    reminderNotifications: true,
    updateNotifications: true,
    doNotDisturbMode: false
  },
  
  privacy: {
    saveHistory: true,
    shareAnalytics: false,
    clearHistoryOnExit: false,
    personalizedSuggestions: true,
    autoDeleteHistoryAfterDays: 90,
    rememberSessions: true
  }
};

// Create the preferences store
export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      ...defaultPreferences,
      
      // Basic profile setters
      setName: (name) => {
        set({ name });
        log.debug(`Preferences: Name set to "${name}"`);
      },
      
      setEmail: (email) => {
        set({ email });
        log.debug(`Preferences: Email set to "${email}"`);
      },
      
      setAvatar: (avatar) => {
        set({ avatar });
        log.debug(`Preferences: Avatar updated`);
      },
      
      // Workflow preferences
      addFavoriteAgent: (agentId) => {
        set((state) => {
          if (state.workflow.favoriteAgents.includes(agentId)) {
            return state; // Already in favorites
          }
          
          const newFavorites = [...state.workflow.favoriteAgents, agentId];
          log.debug(`Preferences: Added ${agentId} to favorites`);
          
          return {
            workflow: {
              ...state.workflow,
              favoriteAgents: newFavorites
            }
          };
        });
      },
      
      removeFavoriteAgent: (agentId) => {
        set((state) => {
          const newFavorites = state.workflow.favoriteAgents.filter(id => id !== agentId);
          log.debug(`Preferences: Removed ${agentId} from favorites`);
          
          return {
            workflow: {
              ...state.workflow,
              favoriteAgents: newFavorites
            }
          };
        });
      },
      
      addPinnedAction: (actionId) => {
        set((state) => {
          if (state.workflow.pinnedActions.includes(actionId)) {
            return state; // Already pinned
          }
          
          const newPinnedActions = [...state.workflow.pinnedActions, actionId];
          log.debug(`Preferences: Pinned action ${actionId}`);
          
          return {
            workflow: {
              ...state.workflow,
              pinnedActions: newPinnedActions
            }
          };
        });
      },
      
      removePinnedAction: (actionId) => {
        set((state) => {
          const newPinnedActions = state.workflow.pinnedActions.filter(id => id !== actionId);
          log.debug(`Preferences: Unpinned action ${actionId}`);
          
          return {
            workflow: {
              ...state.workflow,
              pinnedActions: newPinnedActions
            }
          };
        });
      },
      
      setDefaultAgent: (agentId) => {
        set((state) => ({
          workflow: {
            ...state.workflow,
            defaultAgent: agentId
          }
        }));
        log.debug(`Preferences: Default agent set to ${agentId}`);
      },
      
      setStartupAgent: (agentId) => {
        set((state) => ({
          workflow: {
            ...state.workflow,
            startupAgent: agentId
          }
        }));
        log.debug(`Preferences: Startup agent ${agentId ? `set to ${agentId}` : 'disabled'}`);
      },
      
      // UI preferences
      setActionBarPosition: (position) => {
        set((state) => ({
          ui: {
            ...state.ui,
            actionBarPosition: position
          }
        }));
        log.debug(`Preferences: Action bar position set to ${position}`);
      },
      
      toggleActionLabels: () => {
        set((state) => ({
          ui: {
            ...state.ui,
            showActionLabels: !state.ui.showActionLabels
          }
        }));
        log.debug(`Preferences: Action labels ${state => state.ui.showActionLabels ? 'hidden' : 'shown'}`);
      },
      
      toggleSmartSuggestions: () => {
        set((state) => ({
          ui: {
            ...state.ui,
            enableSmartSuggestions: !state.ui.enableSmartSuggestions
          }
        }));
        log.debug(`Preferences: Smart suggestions ${state => state.ui.enableSmartSuggestions ? 'disabled' : 'enabled'}`);
      },
      
      toggleCompactMode: () => {
        set((state) => ({
          ui: {
            ...state.ui,
            compactMode: !state.ui.compactMode
          }
        }));
        log.debug(`Preferences: Compact mode ${state => state.ui.compactMode ? 'disabled' : 'enabled'}`);
      },
      
      // Generic setter for any preference
      setPreference: (category, key, value) => {
        set((state) => ({
          [category]: {
            ...state[category],
            [key]: value
          }
        }));
        log.debug(`Preferences: Set ${String(category)}.${String(key)} to:`, value);
      },
      
      // Set agent-specific preferences
      setAgentPreference: (agentId, key, value) => {
        set((state) => {
          const currentAgents = state.agents || {};
          const agentSettings = currentAgents[agentId] || {};
          
          return {
            agents: {
              ...currentAgents,
              [agentId]: {
                ...agentSettings,
                [key]: value
              }
            }
          };
        });
        log.debug(`Preferences: Set agent.${agentId}.${key} to:`, value);
      },
      
      // Reset to default preferences
      resetToDefault: () => {
        set(defaultPreferences);
        log.debug('Preferences: Reset to defaults');
      }
    }),
    {
      name: 'panion-preferences-storage'
    }
  )
);

export default usePreferencesStore;