import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserPreferences {
  // User information
  name: string;
  email?: string;
  avatar?: string;
  
  // Preferences
  autoStartPanionOnBoot: boolean;
  showWelcomeScreen: boolean;
  
  // Actions
  setName: (name: string) => void;
  setEmail: (email: string) => void;
  setAvatar: (avatar: string) => void;
  setAutoStartPanionOnBoot: (autoStart: boolean) => void;
  setShowWelcomeScreen: (show: boolean) => void;
}

export const useUserPrefsStore = create<UserPreferences>()(
  persist(
    (set) => ({
      // Default values
      name: 'User',
      autoStartClaraOnBoot: true,
      showWelcomeScreen: true,

      // Actions
      setName: (name: string) => set({ name }),
      setEmail: (email: string) => set({ email }),
      setAvatar: (avatar: string) => set({ avatar }),
      setAutoStartClaraOnBoot: (autoStartClaraOnBoot: boolean) => set({ autoStartClaraOnBoot }),
      setShowWelcomeScreen: (showWelcomeScreen: boolean) => set({ showWelcomeScreen }),
    }),
    {
      name: 'panion-user-preferences',
    }
  )
);