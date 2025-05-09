import React, { KeyboardEvent, useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, BrainCircuit } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  placeholder?: string;
  disabled?: boolean;
  strategicMode?: boolean;
  toggleStrategicMode?: () => void;
  inputRef?: React.RefObject<HTMLInputElement>;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChange,
  onSubmit,
  isLoading,
  placeholder = "Type your message...",
  disabled = false,
  strategicMode = false,
  toggleStrategicMode,
  inputRef
}) => {
  // If no inputRef is provided, create a local one
  const localInputRef = useRef<HTMLInputElement>(null);
  const actualInputRef = inputRef || localInputRef;

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isLoading && value.trim()) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="flex items-center gap-2 w-full">
      {/* Strategic Mode Toggle Button (if enabled) */}
      {toggleStrategicMode && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={strategicMode ? "default" : "outline"}
                size="icon"
                className="h-9 w-9 flex-shrink-0"
                onClick={toggleStrategicMode}
                disabled={isLoading || disabled}
              >
                <BrainCircuit className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{strategicMode ? 'Strategic mode active' : 'Enable strategic mode'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Input Field */}
      <div className="flex-1 relative">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isLoading || disabled}
          className="pr-10"
          ref={actualInputRef}
        />
      </div>

      {/* Send Button */}
      <Button
        type="submit"
        size="icon"
        disabled={isLoading || disabled || !value.trim()}
        onClick={onSubmit}
        className="h-9 w-9 flex-shrink-0"
      >
        {isLoading ? <Spinner size="sm" /> : <Send className="h-4 w-4" />}
      </Button>
    </div>
  );
};