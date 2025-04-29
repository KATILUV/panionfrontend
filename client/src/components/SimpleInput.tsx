import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plane } from 'lucide-react';

/**
 * Props for the SimpleInput component
 */
interface SimpleInputProps {
  /** Function to call when submitting a message */
  onSubmit: (message: string) => void;
  /** Whether the component should show a loading state */
  isLoading: boolean;
}

/**
 * A simple chat input component with modern styling
 * Keeps internal state for the input value
 */
const SimpleInput: React.FC<SimpleInputProps> = ({ onSubmit, isLoading }) => {
  const [inputValue, setInputValue] = useState<string>('');

  /**
   * Handle form submission
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    
    onSubmit(inputValue);
    setInputValue('');
  };

  /**
   * Handle input change
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  return (
    <div className="mb-6">
      <form onSubmit={handleSubmit} className="flex items-center bg-white/5 backdrop-blur-2xl border border-white/20 rounded-full shadow-xl p-1.5 relative overflow-hidden">
        {/* Gradient backgrounds for glass effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#7928CA]/5 to-[#FF0080]/5 pointer-events-none"></div>
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-200 via-purple-400 to-purple-800 blur-xl"></div>
        
        {/* Text input */}
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          className="flex-1 py-3 px-5 bg-transparent focus:outline-none text-white placeholder:text-gray-300/80 rounded-l-full"
          placeholder="Message Clara..."
          disabled={isLoading}
          style={{ fontFamily: "'Inter', sans-serif", letterSpacing: "0.01em", fontWeight: 400 }}
        />
        
        {/* Send button */}
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