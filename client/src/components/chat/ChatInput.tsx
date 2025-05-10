import React, { KeyboardEvent, useState, useRef, ChangeEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, BrainCircuit, Image as ImageIcon } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';

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
  onImageUpload?: (file: File) => Promise<void>;
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
  inputRef,
  onImageUpload
}) => {
  // If no inputRef is provided, create a local one
  const localInputRef = useRef<HTMLInputElement>(null);
  const actualInputRef = inputRef || localInputRef;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isLoading && value.trim()) {
      e.preventDefault();
      onSubmit();
    }
  };
  
  const handleFileInputChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!onImageUpload) return;
    
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload only image files (JPG, PNG, GIF, etc.)",
        variant: "destructive"
      });
      return;
    }
    
    // Check if file size is within the limit (5MB)
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > MAX_SIZE) {
      toast({
        title: "File too large",
        description: "Please upload images smaller than 5MB",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Show loading toast
      toast({
        title: "Uploading image...",
        description: "Please wait while we process your image",
      });
      
      // Upload the image
      await onImageUpload(file);
      
      // Reset the file input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload and process the image. Please try again.",
        variant: "destructive"
      });
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
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
      
      {/* Image Upload Button (if enabled) */}
      {onImageUpload && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 flex-shrink-0"
                onClick={triggerFileInput}
                disabled={isLoading || disabled}
              >
                <ImageIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Upload an image</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      
      {/* Hidden File Input */}
      <input 
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept="image/*"
        className="hidden"
      />

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