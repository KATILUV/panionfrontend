/**
 * IntelligentUI Component - Simplified to fix infinite loop issues
 */

import React from 'react';
import WelcomeGuide from '@/components/onboarding/WelcomeGuide';
import { shallow } from 'zustand/shallow';
import { usePreferencesStore } from '@/state/preferencesStore';
import log from '@/utils/logger';

/**
 * Extremely simplified IntelligentUI to identify and fix render loop issues
 */
const IntelligentUI: React.FC = () => {
  // Use static values for now
  const showWelcomeScreen = true;
  
  // Create simple handler that doesn't rely on store
  const handleOnboardingComplete = () => {
    log.info("Onboarding completed");
  };

  return (
    <>
      {/* Just render the welcome guide with static props */}
      {showWelcomeScreen && (
        <WelcomeGuide onComplete={handleOnboardingComplete} />
      )}

      {/* Static indicator that IntelligentUI is working */}
      <div className="fixed bottom-2 left-2 px-2 py-1 bg-green-500 text-white rounded-md text-xs z-50 opacity-50">
        IntelligentUI OK
      </div>
    </>
  );
};

export default IntelligentUI;