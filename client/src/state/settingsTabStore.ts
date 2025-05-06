import { create } from 'zustand'

interface SettingsTabState {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const useSettingsTabStore = create<SettingsTabState>((set) => ({
  activeTab: 'appearance',
  setActiveTab: (tab) => set({ activeTab: tab }),
}));