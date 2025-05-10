/**
 * IntelligentUI Component
 * Integrates all intelligent UI components for a seamless, intuitive experience
 */

import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import QuickActionBar from '@/components/quickactions/QuickActionBar';
import SmartSuggestions from '@/components/suggestions/SmartSuggestions';
import { useAgentStore } from '@/state/agentStore';
import { useThemeStore } from '@/state/themeStore';
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
  
  // Determine if we should show onboarding
  useEffect(() => {
    // Check if this is first visit (would normally use preferences store)
    const hasVisitedBefore = localStorage.getItem('hasVisitedBefore');
    
    if (!hasVisitedBefore) {
      setIsFirstVisit(true);
      localStorage.setItem('hasVisitedBefore', 'true');
      log.info("First visit detected, showing onboarding");
    }
  }, []);
  
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
  
  const handleOnboardingComplete = () => {
    log.info("Onboarding completed");
  };

  return (
    <>
      {/* QuickAction Bar - Always available at the bottom right */}
      <QuickActionBar />
      
      {/* Smart Suggestions - Contextual at the top of content areas */}
      {showSuggestions && (
        <div className="fixed left-1/2 transform -translate-x-1/2 top-4 z-40 w-full max-w-lg">
          <SmartSuggestions />
        </div>
      )}
      
      {/* Will add Onboarding component when ready */}
      {isFirstVisit && (
        <div className="fixed bottom-4 left-4 p-4 bg-card rounded-lg shadow-lg border border-border z-50">
          <div className="text-sm">
            <strong>Welcome to Panion AI!</strong>
            <p className="mt-1">Your intelligent desktop companion. Click around to explore or check the menu for help.</p>
            <button 
              className="mt-2 px-3 py-1 bg-primary text-primary-foreground rounded-md text-xs"
              onClick={handleOnboardingComplete}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default IntelligentUI;