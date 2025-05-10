/**
 * OnboardingGuide Component
 * Creates an interactive guided tour for first-time users
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, X, HelpCircle } from 'lucide-react';
import log from '@/utils/logger';

// Step interface for onboarding
interface OnboardingStep {
  title: string;
  description: string;
  targetElement: string; // CSS selector for the element to highlight
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

// Component props
interface OnboardingGuideProps {
  isFirstVisit?: boolean; // Whether this is the user's first time
  onComplete: () => void; // Function to call when onboarding is complete
}

const OnboardingGuide: React.FC<OnboardingGuideProps> = ({ 
  isFirstVisit = false,
  onComplete
}) => {
  // State for the current step and visibility
  const [isVisible, setIsVisible] = useState<boolean>(isFirstVisit);
  const [currentStep, setCurrentStep] = useState<number>(0);
  
  // Define the onboarding steps
  const steps: OnboardingStep[] = [
    {
      title: "Welcome to Panion AI!",
      description: "Your intelligent desktop companion. This quick tour will show you how to get the most out of your experience.",
      targetElement: "body", // Just show in center of screen
      position: 'center'
    },
    {
      title: "Meet Your Agents",
      description: "Panion comes with specialized AI agents that help with different tasks. Click on an agent icon to start a conversation.",
      targetElement: ".dock", // Target the dock with agent icons
      position: 'bottom'
    },
    {
      title: "Open Windows",
      description: "Each agent opens in its own window. You can move, resize, minimize, or maximize these windows just like on a desktop.",
      targetElement: ".window", // Target any open window
      position: 'top'
    },
    {
      title: "Smart Conversations",
      description: "Agents understand natural language and learn from your interactions to provide personalized assistance.",
      targetElement: ".chat-input", // Target chat input field
      position: 'bottom'
    },
    {
      title: "Ready to start!",
      description: "You're all set to explore Panion AI. Click 'Finish' to begin, or you can restart this guide anytime from settings.",
      targetElement: "body",
      position: 'center'
    }
  ];
  
  // Log when onboarding starts
  useEffect(() => {
    if (isVisible) {
      log.info("Onboarding guide started", {
        isFirstVisit,
        totalSteps: steps.length
      });
    }
  }, [isVisible, isFirstVisit, steps.length]);
  
  // Go to the next step
  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      log.debug(`Onboarding progressed to step ${currentStep + 1}`);
    } else {
      // Complete the onboarding
      handleComplete();
    }
  };
  
  // Go to the previous step
  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      log.debug(`Onboarding returned to step ${currentStep - 1}`);
    }
  };
  
  // Complete the onboarding
  const handleComplete = () => {
    setIsVisible(false);
    onComplete();
    log.info("Onboarding guide completed");
  };
  
  // Skip the onboarding
  const handleSkip = () => {
    setIsVisible(false);
    onComplete();
    log.info("Onboarding guide skipped");
  };
  
  // Don't render if not visible
  if (!isVisible) return null;
  
  // Current step data
  const step = steps[currentStep];
  
  // Position the tooltip based on the target element and specified position
  const getPosition = () => {
    try {
      const target = document.querySelector(step.targetElement);
      
      if (target && step.position !== 'center') {
        const rect = target.getBoundingClientRect();
        
        switch (step.position) {
          case 'top':
            return { top: `${rect.top - 120}px`, left: `${rect.left + rect.width / 2 - 150}px` };
          case 'bottom':
            return { top: `${rect.bottom + 20}px`, left: `${rect.left + rect.width / 2 - 150}px` };
          case 'left':
            return { top: `${rect.top + rect.height / 2 - 100}px`, left: `${rect.left - 320}px` };
          case 'right':
            return { top: `${rect.top + rect.height / 2 - 100}px`, left: `${rect.right + 20}px` };
        }
      }
      
      // Default center position
      return { 
        top: '50%', 
        left: '50%', 
        transform: 'translate(-50%, -50%)' 
      };
    } catch (error) {
      // Fallback to center if any error occurs
      return { 
        top: '50%', 
        left: '50%', 
        transform: 'translate(-50%, -50%)' 
      };
    }
  };
  
  // Highlight animation variants
  const highlightVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.3 } }
  };

  return (
    <div className="onboarding-guide fixed inset-0 z-[9999] pointer-events-none">
      {/* Overlay with cutout for the target element */}
      <div className="overlay fixed inset-0 bg-black/50 pointer-events-auto" onClick={handleSkip} />
      
      {/* Tooltip */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`step-${currentStep}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="onboarding-tooltip bg-popover rounded-lg shadow-lg p-4 w-[300px] pointer-events-auto"
          style={getPosition()}
        >
          {/* Close button */}
          <button 
            onClick={handleSkip}
            className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
            aria-label="Close onboarding"
          >
            <X size={18} />
          </button>
          
          {/* Content */}
          <div className="mb-4 mt-1">
            <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
            <p className="text-sm text-muted-foreground">{step.description}</p>
          </div>
          
          {/* Progress indicators */}
          <div className="flex justify-center mb-4">
            {steps.map((_, index) => (
              <div 
                key={index}
                className={`w-2 h-2 rounded-full mx-1 ${
                  index === currentStep ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
          
          {/* Navigation buttons */}
          <div className="flex justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className={`px-3 py-1 rounded text-sm flex items-center ${
                currentStep === 0 
                ? 'text-muted-foreground cursor-not-allowed' 
                : 'text-foreground hover:bg-muted'
              }`}
            >
              <ChevronLeft size={16} className="mr-1" />
              Previous
            </button>
            
            <button
              onClick={currentStep < steps.length - 1 ? handleNext : handleComplete}
              className="px-3 py-1 rounded text-sm bg-primary text-primary-foreground hover:bg-primary/90 flex items-center"
            >
              {currentStep < steps.length - 1 ? 'Next' : 'Finish'}
              {currentStep < steps.length - 1 ? (
                <ChevronRight size={16} className="ml-1" />
              ) : null}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
      
      {/* Help button to restart the guide */}
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-primary text-primary-foreground rounded-full p-2 shadow-lg z-50 hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50"
        aria-label="Help"
      >
        <HelpCircle size={20} />
      </button>
    </div>
  );
};

export default OnboardingGuide;