import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Plane, Image, X } from 'lucide-react';

interface ChatInputAreaProps {
  inputValue: string;
  setInputValue: (value: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  onImageSelect?: (imageDataUrl: string | null) => void;
}

const ChatInputArea: React.FC<ChatInputAreaProps> = ({ 
  inputValue, 
  setInputValue, 
  handleSubmit,
  isLoading,
  onImageSelect
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [fileObj, setFileObj] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onload = (event) => {
        if (event.target?.result) {
          const imageDataUrl = event.target.result as string;
          setSelectedImage(imageDataUrl);
          setFileObj(file);
          
          // Notify parent component about the selected image if the prop is provided
          if (onImageSelect) {
            onImageSelect(imageDataUrl);
          }
        }
      };
      
      reader.readAsDataURL(file);
    }
  };

  const clearSelectedImage = () => {
    setSelectedImage(null);
    setFileObj(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    // Notify parent component that the image has been cleared
    if (onImageSelect) {
      onImageSelect(null);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || (!inputValue.trim() && !selectedImage)) return;
    
    // Tell the parent about our selected image before we submit the form
    if (selectedImage) {
      // In a real app, you might want to pass this to a context or send it via API
      // For now, we're just adding it to the chat state directly
    }
    
    // Pass the event to the parent component 
    handleSubmit(e);
    
    // Clear the selected image after sending
    clearSelectedImage();
  };

  return (
    <div className="mb-6 relative">
      {selectedImage && (
        <div className="mb-2 relative">
          <div className="rounded-lg overflow-hidden border border-white/20 w-20 h-20 relative">
            <img 
              src={selectedImage} 
              alt="Selected" 
              className="w-full h-full object-cover"
            />
            <button 
              onClick={clearSelectedImage}
              className="absolute top-1 right-1 bg-black/50 rounded-full p-1 text-white hover:bg-black/70 transition-colors"
              type="button"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}
      
      <form onSubmit={handleFormSubmit} className="flex items-center bg-white/15 backdrop-blur-md border border-white/20 rounded-full shadow-lg p-1.5">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="flex-1 py-3 px-5 bg-transparent focus:outline-none text-white placeholder:text-gray-300 rounded-l-full"
          placeholder="Message Clara..."
          disabled={isLoading}
        />
        
        <input 
          type="file" 
          accept="image/*"
          className="hidden"
          onChange={handleImageSelect}
          ref={fileInputRef}
          id="image-upload"
        />
        
        <label 
          htmlFor="image-upload" 
          className="cursor-pointer mx-1 p-2 rounded-full hover:bg-white/10 transition-colors"
        >
          <Image className="h-5 w-5 text-gray-300" />
        </label>
        
        <Button
          type="submit"
          className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-full p-3 ml-2 flex items-center justify-center transition-all duration-300 h-11 w-11 shadow-md hover:shadow-lg hover:scale-105"
          disabled={isLoading || (!inputValue.trim() && !selectedImage)}
        >
          <Plane className="h-5 w-5" />
        </Button>
      </form>
    </div>
  );
};

export default ChatInputArea;
