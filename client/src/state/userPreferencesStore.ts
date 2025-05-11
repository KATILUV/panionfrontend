/**
 * User Preferences Store
 * Manages and persists user personalization preferences
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Match schema types from server
type PreferredMode = 'casual' | 'deep' | 'strategic' | 'logical' | 'creative' | 'technical' | 'educational';
type Theme = 'light' | 'dark' | 'system';
type FontSize = 'small' | 'medium' | 'large';
type AgentReactiveness = 'calm' | 'balanced' | 'reactive';
type ResponseLength = 'concise' | 'balanced' | 'detailed';
type DetailLevel = 'simple' | 'balanced' | 'comprehensive';
type MemoryUtilizationLevel = 'minimal' | 'medium' | 'extensive';

export interface UserPreferencesState {
  // User identity (if logged in)
  userId?: number;
  
  // Preferred conversation mode
  preferredMode: PreferredMode;
  
  // UI preferences
  theme: Theme;
  fontSize: FontSize;
  
  // AI personality settings
  personalityTraits: string[];
  
  // Notification preferences
  enableNotifications: boolean;
  
  // System preferences
  showThinkingProcess: boolean;
  agentReactiveness: AgentReactiveness;
  
  // Response preferences
  responseLength: ResponseLength;
  detailLevel: DetailLevel;
  
  // Feature toggles
  multiAgentAnalysisEnabled: boolean;
  memoryUtilizationLevel: MemoryUtilizationLevel;
  
  // Custom settings (extensible for future features)
  customSettings: Record<string, any>;
  
  // Last updated
  lastUpdated: string;
  
  // Actions
  setPreferredMode: (mode: PreferredMode) => void;
  setTheme: (theme: Theme) => void;
  setFontSize: (size: FontSize) => void;
  setPersonalityTraits: (traits: string[]) => void;
  toggleNotifications: (enabled?: boolean) => void;
  toggleThinkingProcess: (show?: boolean) => void;
  setAgentReactiveness: (level: AgentReactiveness) => void;
  setResponseLength: (length: ResponseLength) => void;
  setDetailLevel: (level: DetailLevel) => void;
  toggleMultiAgentAnalysis: (enabled?: boolean) => void;
  setMemoryUtilizationLevel: (level: MemoryUtilizationLevel) => void;
  updateCustomSetting: (key: string, value: any) => void;
  syncWithServer: () => Promise<void>;
  resetToDefaults: () => void;
}

// Default preferences
const DEFAULT_PREFERENCES = {
  preferredMode: 'casual' as PreferredMode,
  theme: 'system' as Theme,
  fontSize: 'medium' as FontSize,
  personalityTraits: ['analytical', 'curious', 'empathetic'],
  enableNotifications: true,
  showThinkingProcess: true,
  agentReactiveness: 'balanced' as AgentReactiveness,
  responseLength: 'balanced' as ResponseLength,
  detailLevel: 'balanced' as DetailLevel,
  multiAgentAnalysisEnabled: true,
  memoryUtilizationLevel: 'medium' as MemoryUtilizationLevel,
  customSettings: {},
  lastUpdated: new Date().toISOString(),
};

// Create the store with persistence
export const useUserPreferencesStore = create<UserPreferencesState>()(
  persist(
    (set, get) => ({
      // Default values
      ...DEFAULT_PREFERENCES,
      
      // Actions
      setPreferredMode: (mode) => set({
        preferredMode: mode,
        lastUpdated: new Date().toISOString()
      }),
      
      setTheme: (theme) => set({
        theme,
        lastUpdated: new Date().toISOString()
      }),
      
      setFontSize: (fontSize) => set({
        fontSize,
        lastUpdated: new Date().toISOString()
      }),
      
      setPersonalityTraits: (traits) => set({
        personalityTraits: traits,
        lastUpdated: new Date().toISOString()
      }),
      
      toggleNotifications: (enabled) => set((state) => ({
        enableNotifications: enabled !== undefined ? enabled : !state.enableNotifications,
        lastUpdated: new Date().toISOString()
      })),
      
      toggleThinkingProcess: (show) => set((state) => ({
        showThinkingProcess: show !== undefined ? show : !state.showThinkingProcess,
        lastUpdated: new Date().toISOString()
      })),
      
      setAgentReactiveness: (level) => set({
        agentReactiveness: level,
        lastUpdated: new Date().toISOString()
      }),
      
      setResponseLength: (length) => set({
        responseLength: length,
        lastUpdated: new Date().toISOString()
      }),
      
      setDetailLevel: (level) => set({
        detailLevel: level,
        lastUpdated: new Date().toISOString()
      }),
      
      toggleMultiAgentAnalysis: (enabled) => set((state) => ({
        multiAgentAnalysisEnabled: enabled !== undefined ? enabled : !state.multiAgentAnalysisEnabled,
        lastUpdated: new Date().toISOString()
      })),
      
      setMemoryUtilizationLevel: (level) => set({
        memoryUtilizationLevel: level,
        lastUpdated: new Date().toISOString()
      }),
      
      updateCustomSetting: (key, value) => set((state) => ({
        customSettings: {
          ...state.customSettings,
          [key]: value
        },
        lastUpdated: new Date().toISOString()
      })),
      
      syncWithServer: async () => {
        const state = get();
        
        if (!state.userId) {
          console.log('No user ID available, skipping server sync');
          return;
        }
        
        try {
          // Prepare data for server
          const preferencesData = {
            preferredMode: state.preferredMode,
            theme: state.theme,
            fontSize: state.fontSize,
            personalityTraits: state.personalityTraits,
            enableNotifications: state.enableNotifications,
            showThinkingProcess: state.showThinkingProcess,
            agentReactiveness: state.agentReactiveness,
            responseLength: state.responseLength,
            detailLevel: state.detailLevel,
            multiAgentAnalysisEnabled: state.multiAgentAnalysisEnabled,
            memoryUtilizationLevel: state.memoryUtilizationLevel,
            customSettings: state.customSettings,
          };
          
          // Send to server
          const response = await fetch(`/api/preferences/${state.userId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(preferencesData),
          });
          
          if (!response.ok) {
            throw new Error('Failed to sync preferences with server');
          }
          
          // Update last updated timestamp
          set({ lastUpdated: new Date().toISOString() });
          
          console.log('Preferences synced with server successfully');
        } catch (error) {
          console.error('Error syncing preferences with server:', error);
        }
      },
      
      resetToDefaults: () => set({
        ...DEFAULT_PREFERENCES,
        userId: get().userId, // Keep user ID
        lastUpdated: new Date().toISOString()
      }),
    }),
    {
      name: 'panion-user-preferences', // Local storage key
    }
  )
);

// Utility functions
export const getPersonalityTraitOptions = () => [
  { value: 'analytical', label: 'Analytical' },
  { value: 'contemplative', label: 'Contemplative' },
  { value: 'curious', label: 'Curious' },
  { value: 'methodical', label: 'Methodical' },
  { value: 'empathetic', label: 'Empathetic' },
  { value: 'pragmatic', label: 'Pragmatic' },
  { value: 'adaptive', label: 'Adaptive' },
  { value: 'playful', label: 'Playful' },
  { value: 'cautious', label: 'Cautious' },
  { value: 'creative', label: 'Creative' },
  { value: 'detailed', label: 'Detailed' },
  { value: 'concise', label: 'Concise' },
  { value: 'reflective', label: 'Reflective' },
  { value: 'encouraging', label: 'Encouraging' },
];