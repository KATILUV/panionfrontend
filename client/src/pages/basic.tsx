import React, { useState, useRef, useEffect } from 'react';
import ClaraOrb from '@/components/ClaraOrb';
import BasicInput from '@/components/BasicInput';
import { Message } from '@/types/chat';

/**
 * Simple standalone page for testing basic input functionality
 */
const Basic: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      content: "Hello! I'm Clara. How can I help you today?",
      isUser: false,
      timestamp: new Date().toISOString()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (message: string) => {
    // Add user message
    const userMessage: Message = {
      content: message,
      isUser: true,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    
    try {
      // Send message to API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message })
      });
      
      const data = await response.json();
      
      // Add Clara's response
      const claraMessage: Message = {
        content: data.response,
        isUser: false,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, claraMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add error message
      const errorMessage: Message = {
        content: 'Sorry, I encountered an error processing your request.',
        isUser: false,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto px-4 md:px-6 py-4">
      {/* Clara's orb */}
      <ClaraOrb isProcessing={isLoading} />

      {/* Title and status */}
      <div className="text-center mb-5">
        <h1 className="text-3xl font-semibold text-white transition-all duration-300 hover:text-primary">
          Clara
        </h1>
        <p className="text-sm text-gray-300">
          {isLoading ? 'Thinking...' : 'Your AI Companion'}
        </p>
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto flex flex-col chat-container p-4 space-y-4 bg-gray-900/50 rounded-lg backdrop-blur-sm border border-white/10">
        {messages.map((message, index) => (
          <div 
            key={index}
            className={`p-4 rounded-2xl max-w-[80%] shadow-lg ${
              message.isUser 
                ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white self-end border-b-2 border-purple-700/50' 
                : 'bg-gray-800/60 backdrop-blur-sm text-white self-start border border-white/10'
            }`}
          >
            {message.content}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
  
      {/* Basic input */}
      <BasicInput 
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />

      {/* Footer */}
      <div className="text-center text-xs text-gray-300 mt-2 mb-1">
        <p>✨ Clara remembers important information from your conversations ✨</p>
      </div>
    </div>
  );
};

export default Basic;