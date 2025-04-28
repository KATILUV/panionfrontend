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
      <form onSubmit={handleSubmit} className="flex items-center bg-white rounded-full shadow-md p-1">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="flex-1 py-3 px-4 bg-transparent focus:outline-none text-dark-gray rounded-l-full"
          placeholder="Message Clara..."
          disabled={isLoading}
        />
        <Button
          type="submit"
          className="bg-primary hover:bg-opacity-90 text-white rounded-full p-3 ml-2 flex items-center justify-center transition-colors h-10 w-10"
          disabled={isLoading || !inputValue.trim()}
        >
          <Plane className="h-5 w-5" />
        </Button>
      </form>
    </div>
  );
};

export default ChatInputArea;
