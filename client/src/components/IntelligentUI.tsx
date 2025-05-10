/**
 * IntelligentUI Component
 * Integrates all intelligent UI components for a seamless, intuitive experience
 */

import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import QuickActionBar from '@/components/quickactions/QuickActionBar';
import SmartSuggestions from '@/components/suggestions/SmartSuggestions';
import WelcomeGuide from '@/components/onboarding/WelcomeGuide';
import { useAgentStore } from '@/state/agentStore';
import { useThemeStore } from '@/state/themeStore';
import { usePreferencesStore } from '@/state/preferencesStore';
import log from '@/utils/logger';

/**
 * IntelligentUI integrates all smart UI components
 */
const IntelligentUI: React.FC = () => {
  const [isFirstVisit, setIsFirstVisit] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const activeAgentId = useAgentStore(state => state.activeAgentId);
  const agents = useAgentStore(state => state.agents || {});
  const [location] = useLocation();
  
  // Determine if we should show onboarding based on preferences
  const showWelcomeScreen = usePreferencesStore(state => state.ui.showWelcomeScreen);
  
  // Update first visit state based on preferences
  useEffect(() => {
    if (showWelcomeScreen) {
      setIsFirstVisit(true);
      log.info("Welcome screen enabled, showing onboarding");
    } else {
      setIsFirstVisit(false);
    }
  }, [showWelcomeScreen]);
  
  // Only show suggestions in certain contexts
  useEffect(() => {
    // Don't show suggestions on certain pages
    if (location === '/settings' || location === '/help') {
      setShowSuggestions(false);
    } else {
      setShowSuggestions(true);
    }
  }, [location]);
  
  // Get current agent context
  const currentAgentContext = activeAgentId ? agents[activeAgentId]?.name : null;
  
  const setPreference = usePreferencesStore(state => state.setPreference);
  
  const handleOnboardingComplete = () => {
    // Disable welcome screen in preferences
    setPreference('ui', 'showWelcomeScreen', false);
    setIsFirstVisit(false);
    log.info("Onboarding completed and disabled in preferences");
  };

  return (
    <>
      {/* QuickAction Bar - Always available at the bottom right */}
      <QuickActionBar />
      
      {/* Smart Suggestions - Disabled for now until we fix the store compatibility */}
      {/* {showSuggestions && (
        <div className="fixed left-1/2 transform -translate-x-1/2 top-4 z-40 w-full max-w-lg">
          <SmartSuggestions />
        </div>
      )} */}
      
      {/* Welcome Guide Onboarding */}
      {isFirstVisit && (
        <WelcomeGuide onComplete={handleOnboardingComplete} />
      )}
    </>
  );
};

export default IntelligentUI;