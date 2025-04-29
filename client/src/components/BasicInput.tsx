import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plane } from 'lucide-react';

// Super simple input component with no complex logic
function BasicInput() {
  const [message, setMessage] = useState('');
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    // Send message to backend
    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    })
    .then(response => response.json())
    .then(data => {
      console.log('Success:', data);
      
      // Add user message to UI
      const userMessage = document.createElement('div');
      userMessage.className = 'chat-bubble chat-bubble-user mb-4 p-4 self-end max-w-[80%] message-in';
      userMessage.textContent = message;
      document.querySelector('.chat-container')?.appendChild(userMessage);
      
      // Add Clara's response
      const claraMessage = document.createElement('div');
      claraMessage.className = 'chat-bubble chat-bubble-ai mb-4 p-4 self-start max-w-[80%] message-in text-gray-800';
      claraMessage.textContent = data.response;
      document.querySelector('.chat-container')?.appendChild(claraMessage);
      
      // Clear input
      setMessage('');
      
      // Scroll to bottom
      const container = document.querySelector('.chat-container');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    })
    .catch(error => {
      console.error('Error:', error);
    });
  };
  
  return (
    <div className="mb-6 relative">
      <form onSubmit={handleSubmit} className="flex items-center bg-white/5 backdrop-blur-2xl border border-white/20 rounded-full shadow-xl p-1.5 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#7928CA]/5 to-[#FF0080]/5 pointer-events-none"></div>
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-200 via-purple-400 to-purple-800 blur-xl"></div>
        
        <input
          type="text"
          value={message}
          onChange={handleChange}
          className="flex-1 py-3 px-5 bg-transparent focus:outline-none text-white placeholder:text-gray-300/80 rounded-l-full"
          placeholder="Message Clara..."
          style={{ fontFamily: "'Inter', sans-serif", letterSpacing: "0.01em", fontWeight: 400 }}
        />
        
        <Button
          type="submit"
          className="bg-gradient-to-r from-[#7928CA] to-[#FF0080] hover:from-[#6b20b7] hover:to-[#e60073] text-white rounded-full p-3 ml-2 flex items-center justify-center transition-all duration-300 h-11 w-11 shadow-lg hover:shadow-xl hover:scale-105"
          disabled={!message.trim()}
        >
          <Plane className="h-5 w-5" />
        </Button>
      </form>
    </div>
  );
}

export default BasicInput;