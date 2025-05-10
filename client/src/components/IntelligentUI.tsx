/**
 * IntelligentUI Component
 * Integrates all intelligent UI components for a seamless, intuitive experience
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
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
  const [location] = useLocation();
  
  // Use selectors with primitive values to avoid unnecessary re-renders
  // These are memoized to avoid new function creation on each render
  const selectActiveAgentId = useCallback((state) => state.activeAgentId, []);
  const activeAgentId = useAgentStore(selectActiveAgentId);
  
  const selectAgents = useCallback((state) => state.agents || {}, []);
  const agents = useAgentStore(selectAgents);
  
  const selectShowWelcomeScreen = useCallback((state) => state.ui.showWelcomeScreen, []);
  const showWelcomeScreen = usePreferencesStore(selectShowWelcomeScreen);
  
  const selectSetPreference = useCallback((state) => state.setPreference, []);
  const setPreference = usePreferencesStore(selectSetPreference);
  
  // Memoize complex derivations to prevent unnecessary recalculation
  const currentAgentContext = useMemo(() => 
    activeAgentId ? agents[activeAgentId]?.name : null,
  [activeAgentId, agents]);
  
  // Update first visit state based on preferences - with stable dependencies
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
  
  // Create stable callback to avoid recreating function
  const handleOnboardingComplete = useCallback(() => {
    // Disable welcome screen in preferences
    setPreference('ui', 'showWelcomeScreen', false);
    setIsFirstVisit(false);
    log.info("Onboarding completed and disabled in preferences");
  }, [setPreference]);

  return (
    <>
      {/* QuickAction Bar - Temporarily disabled to fix infinite loop issue */}
      {/* <QuickActionBar /> */}
      
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