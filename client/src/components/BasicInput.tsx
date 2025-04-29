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
    <div className="mt-4 mb-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="flex-1 p-3 rounded-lg border border-gray-600 bg-gray-800 text-white"
          placeholder="Message Clara..."
          disabled={isLoading}
        />
        <button
          type="submit"
          className="px-4 py-2 bg-purple-600 text-white rounded-lg"
          disabled={isLoading || !message.trim()}
        >
          Send
        </button>
      </form>
    </div>
  );
}

export default BasicInput;