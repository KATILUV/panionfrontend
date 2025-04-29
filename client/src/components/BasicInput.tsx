import React, { useState } from 'react';

interface BasicInputProps {
  onSubmit: (message: string) => void;
  isLoading: boolean;
}

function BasicInput({ onSubmit, isLoading }: BasicInputProps) {
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;
    
    onSubmit(message);
    setMessage('');
  };

  return (
    <div className="mt-6 mb-4">
      <form onSubmit={handleSubmit} className="flex items-center bg-white/5 backdrop-blur-sm border border-white/20 rounded-full shadow-xl p-1.5 relative overflow-hidden transition-all duration-300 hover:shadow-pink-500/10 hover:border-white/30">
        {/* Subtle gradient backgrounds */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-pink-500/10 pointer-events-none"></div>
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-200 via-purple-400 to-purple-800 blur-xl"></div>
        
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="flex-1 py-3 px-5 bg-transparent focus:outline-none text-white placeholder:text-gray-300/80 rounded-l-full"
          placeholder="Message Clara..."
          disabled={isLoading}
          style={{ fontFamily: "'Inter', sans-serif" }}
          autoFocus
        />
        <button
          type="submit"
          className={`bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white rounded-full p-3 flex items-center justify-center transition-all duration-300 h-10 w-10 shadow-lg hover:shadow-xl ${
            isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:scale-105'
          }`}
          disabled={isLoading || !message.trim()}
        >
          {isLoading ? (
            <div className="flex space-x-1 items-center justify-center">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse delay-75"></span>
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse delay-150"></span>
            </div>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          )}
        </button>
      </form>
    </div>
  );
}

export default BasicInput;