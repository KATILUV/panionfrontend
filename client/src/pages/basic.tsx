import React from 'react';
import ClaraOrb from '@/components/ClaraOrb';
import BasicInput from '@/components/BasicInput';

/**
 * Simple standalone page for testing basic input functionality
 */
const Basic: React.FC = () => {
  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto px-4 md:px-6 py-4">
      {/* Clara's orb */}
      <ClaraOrb />

      {/* Title and status */}
      <div className="text-center mb-5">
        <h1 className="text-3xl font-semibold text-white transition-all duration-300 hover:text-primary">
          Clara
        </h1>
        <p className="text-sm text-gray-300">
          Your AI Companion
        </p>
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto flex flex-col chat-container">
        {/* Messages will be added here by the BasicInput component */}
      </div>
  
      {/* Basic input */}
      <BasicInput />

      {/* Footer */}
      <div className="text-center text-xs text-gray-300 mt-2 mb-1">
        <p>✨ Clara remembers important information from your conversations ✨</p>
      </div>
    </div>
  );
};

export default Basic;