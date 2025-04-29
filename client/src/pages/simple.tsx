import React, { useState, useRef, useEffect } from 'react';

interface Message {
  content: string;
  isUser: boolean;
  timestamp: string;
}

/**
 * A very simple chat interface with Clara
 */
const SimplePage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      content: "Hello! I'm Clara. How can I help you today?",
      isUser: false,
      timestamp: new Date().toISOString()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || isLoading) return;
    
    // Add user message
    const userMessage: Message = {
      content: input,
      isUser: true,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    try {
      // Send message to API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: input })
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
    <div className="min-h-screen bg-gray-900 flex flex-col max-w-xl mx-auto p-4">
      <h1 className="text-3xl font-bold text-center text-white mb-4">Simple Clara Chat</h1>
      
      {/* Chat container */}
      <div className="flex-1 bg-gray-800 rounded-lg p-4 mb-4 overflow-auto">
        {messages.map((message, index) => (
          <div 
            key={index} 
            className={`p-3 rounded-lg mb-3 ${
              message.isUser 
                ? 'bg-purple-600 text-white ml-auto max-w-[80%]' 
                : 'bg-gray-700 text-white mr-auto max-w-[80%]'
            }`}
          >
            {message.content}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 p-3 rounded-lg border border-gray-600 bg-gray-800 text-white"
          placeholder="Type your message..."
          disabled={isLoading}
          autoFocus
        />
        <button
          type="submit"
          className="px-4 py-2 bg-purple-600 text-white rounded-lg"
          disabled={isLoading || !input.trim()}
        >
          {isLoading ? '...' : 'Send'}
        </button>
      </form>
    </div>
  );
};

export default SimplePage;