import React from 'react';
import { Button } from '@/components/ui/button';
import { Plane } from 'lucide-react';

interface ChatInputAreaProps {
  inputValue: string;
  setInputValue: (value: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
}

const ChatInputArea: React.FC<ChatInputAreaProps> = ({ 
  inputValue, 
  setInputValue, 
  handleSubmit,
  isLoading
}) => {
  return (
    <div className="mb-6 relative">
      <form onSubmit={handleSubmit} className="flex items-center bg-white/15 backdrop-blur-md border border-white/20 rounded-full shadow-lg p-1.5">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="flex-1 py-3 px-5 bg-transparent focus:outline-none text-white placeholder:text-gray-300 rounded-l-full"
          placeholder="Message Clara..."
          disabled={isLoading}
        />
        <Button
          type="submit"
          className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-full p-3 ml-2 flex items-center justify-center transition-all duration-300 h-11 w-11 shadow-md hover:shadow-lg hover:scale-105"
          disabled={isLoading || !inputValue.trim()}
        >
          <Plane className="h-5 w-5" />
        </Button>
      </form>
    </div>
  );
};

export default ChatInputArea;
