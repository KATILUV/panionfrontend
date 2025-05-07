import { create } from 'zustand'

interface SettingsTabState {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const useSettingsTabStore = create<SettingsTabState>((set) => ({
  activeTab: 'user-profile',
  setActiveTab: (tab) => set({ activeTab: tab }),
}));