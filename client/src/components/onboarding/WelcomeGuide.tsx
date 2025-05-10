/**
 * WelcomeGuide Component
 * Provides a friendly onboarding experience for new users
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronRight, 
  ChevronLeft, 
  X, 
  MessageSquare, 
  Lightbulb, 
  Settings, 
  Sparkles,
  Layout,
  Zap,
  Search
} from 'lucide-react';
import { useAgentStore } from '@/state/agentStore';
import { usePreferencesStore } from '@/state/preferencesStore';
import log from '@/utils/logger';

// Guide step interface
interface GuideStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action?: () => void;
  actionLabel?: string;
}

// Component props
interface WelcomeGuideProps {
  onComplete: () => void;
  className?: string;
}

/**
 * WelcomeGuide component provides a step-by-step introduction to Panion
 */
const WelcomeGuide: React.FC<WelcomeGuideProps> = ({
  onComplete,
  className = ''
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const openAgent = useAgentStore(state => state.openAgent);
  
  // Define onboarding steps
  const steps: GuideStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to Panion',
      description: 'Your AI-powered companion desktop. Let\'s take a quick tour to help you get started.',
      icon: <Sparkles size={24} />,
      actionLabel: 'Let\'s Go',
      action: () => setCurrentStep(1)
    },
    {
      id: 'agents',
      title: 'Meet Your AI Agents',
      description: 'Panion provides specialized AI agents to help with different tasks. Click on any agent icon in the taskbar to start a conversation.',
      icon: <MessageSquare size={24} />,
      actionLabel: 'Try Panion',
      action: () => {
        openAgent('panion');
        setCurrentStep(2);
      }
    },
    {
      id: 'quick-actions',
      title: 'Quick Actions',
      description: 'Use the Quick Action Bar in the corner for fast access to common tasks and contextual actions.',
      icon: <Zap size={24} />,
      actionLabel: 'Next',
      action: () => setCurrentStep(3)
    },
    {
      id: 'smart-suggestions',
      title: 'Smart Suggestions',
      description: 'Panion learns from your interactions and provides contextual suggestions to help you work more efficiently.',
      icon: <Lightbulb size={24} />,
      actionLabel: 'Next',
      action: () => setCurrentStep(4)
    },
    {
      id: 'customize',
      title: 'Make It Yours',
      description: 'Customize Panion through the Settings agent. Change themes, adjust preferences, and personalize your experience.',
      icon: <Settings size={24} />,
      actionLabel: 'Open Settings',
      action: () => {
        openAgent('settings');
        setCurrentStep(5);
      }
    },
    {
      id: 'finish',
      title: 'You\'re All Set!',
      description: 'You\'re ready to start using Panion. If you need help at any time, just ask any agent or use the search function.',
      icon: <Search size={24} />,
      actionLabel: 'Get Started',
      action: () => {
        setIsExiting(true);
        setTimeout(() => {
          onComplete();
          log.info('Welcome guide completed');
        }, 500);
      }
    }
  ];
  
  // Current step
  const step = steps[currentStep];
  
  // Handle next step
  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsExiting(true);
      setTimeout(() => {
        onComplete();
        log.info('Welcome guide completed');
      }, 500);
    }
  };
  
  // Handle previous step
  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  // Handle skip
  const handleSkip = () => {
    setIsExiting(true);
    setTimeout(() => {
      onComplete();
      log.info('Welcome guide skipped');
    }, 500);
  };
  
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  };
  
  const stepVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 }
  };
  
  return (
    <AnimatePresence mode="wait">
      {!isExiting && (
        <motion.div
          key="welcome-guide"
          className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm ${className}`}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ duration: 0.3 }}
        >
          <motion.div 
            className="bg-card rounded-lg overflow-hidden shadow-xl w-full max-w-md border border-border"
            layoutId="welcome-card"
          >
            {/* Header */}
            <div className="flex items-center justify-between bg-primary px-6 py-4">
              <h2 className="text-lg font-semibold text-primary-foreground flex items-center gap-2">
                <Layout className="h-5 w-5" />
                Panion Onboarding
              </h2>
              <button 
                onClick={handleSkip}
                className="text-primary-foreground/80 hover:text-primary-foreground transition-colors"
                aria-label="Close welcome guide"
              >
                <X size={18} />
              </button>
            </div>
            
            {/* Step indicator */}
            <div className="bg-muted px-6 py-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Step {currentStep + 1} of {steps.length}
                </span>
                <div className="flex gap-1">
                  {steps.map((_, index) => (
                    <div 
                      key={`step-${index}`}
                      className={`h-1.5 w-6 rounded-full ${
                        index === currentStep 
                          ? 'bg-primary' 
                          : index < currentStep 
                            ? 'bg-primary/60' 
                            : 'bg-border'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
            
            {/* Step content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`step-${currentStep}`}
                variants={stepVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={{ duration: 0.2 }}
                className="px-6 py-6"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary/10 rounded-full text-primary">
                    {step.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-medium mb-2">{step.title}</h3>
                    <p className="text-muted-foreground mb-4">{step.description}</p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
            
            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-border">
              <div>
                {currentStep > 0 && (
                  <button
                    onClick={handlePrevious}
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ChevronLeft size={16} />
                    Previous
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleSkip}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Skip Tour
                </button>
                <button
                  onClick={step.action || handleNext}
                  className="flex items-center gap-1 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
                >
                  {step.actionLabel || 'Next'}
                  {!step.actionLabel && <ChevronRight size={16} />}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WelcomeGuide;