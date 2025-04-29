import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plane } from 'lucide-react';

interface SimpleInputProps {
  onSubmit: (message: string) => void;
  isLoading: boolean;
}

const SimpleInput: React.FC<SimpleInputProps> = ({ onSubmit, isLoading }) => {
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    
    onSubmit(inputValue);
    setInputValue('');
  };

  return (
    <div className="mb-6">
      <form onSubmit={handleSubmit} className="flex items-center bg-white/5 backdrop-blur-2xl border border-white/20 rounded-full shadow-xl p-1.5 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#7928CA]/5 to-[#FF0080]/5 pointer-events-none"></div>
        
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="flex-1 py-3 px-5 bg-transparent focus:outline-none text-white placeholder:text-gray-300/80 rounded-l-full"
          placeholder="Message Clara..."
          disabled={isLoading}
          style={{ fontFamily: "'Inter', sans-serif", letterSpacing: "0.01em", fontWeight: 400 }}
        />
        
        <Button
          type="submit"
          className="bg-gradient-to-r from-[#7928CA] to-[#FF0080] hover:from-[#6b20b7] hover:to-[#e60073] text-white rounded-full p-3 ml-2 flex items-center justify-center transition-all duration-300 h-11 w-11 shadow-lg hover:shadow-xl hover:scale-105"
          disabled={isLoading || !inputValue.trim()}
        >
          <Plane className="h-5 w-5" />
        </Button>
      </form>
    </div>
  );
};

export default SimpleInput;