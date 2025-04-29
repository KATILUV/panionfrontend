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

const ChatInputArea: React.FC<ChatInputAreaProps> = (props) => {
  const { isLoading, handleSubmit, onImageSelect } = props;
  
  // Local state
  const [input, setInput] = useState<string>(props.inputValue || '');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update local input when props change
  React.useEffect(() => {
    setInput(props.inputValue || '');
  }, [props.inputValue]);

  // Handle local input changes and propagate them to parent
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInput(newValue);
    props.setInputValue(newValue);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onload = (event) => {
        if (event.target?.result) {
          const imageDataUrl = event.target.result as string;
          setSelectedImage(imageDataUrl);
          
          // Notify parent component
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    // Notify parent component
    if (onImageSelect) {
      onImageSelect(null);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || (!input.trim() && !selectedImage)) return;
    
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
      
      <form onSubmit={handleFormSubmit} className="flex items-center bg-white/5 backdrop-blur-2xl border border-white/20 rounded-full shadow-xl p-1.5 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#7928CA]/5 to-[#FF0080]/5 pointer-events-none"></div>
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-200 via-purple-400 to-purple-800 blur-xl"></div>
        
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          className="flex-1 py-3 px-5 bg-transparent focus:outline-none text-white placeholder:text-gray-300/80 rounded-l-full"
          placeholder="Message Clara..."
          disabled={isLoading}
          style={{ fontFamily: "'Inter', sans-serif", letterSpacing: "0.01em", fontWeight: 400 }}
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
          className="cursor-pointer mx-1 p-2 rounded-full hover:bg-white/10 transition-all duration-200 ease-in-out"
        >
          <Image className="h-5 w-5 text-white opacity-70 hover:opacity-100 transition-opacity" />
        </label>
        
        <Button
          type="submit"
          className="bg-gradient-to-r from-[#7928CA] to-[#FF0080] hover:from-[#6b20b7] hover:to-[#e60073] text-white rounded-full p-3 ml-2 flex items-center justify-center transition-all duration-300 h-11 w-11 shadow-lg hover:shadow-xl hover:scale-105"
          disabled={isLoading || (!input.trim() && !selectedImage)}
        >
          <Plane className="h-5 w-5" />
        </Button>
      </form>
    </div>
  );
};

export default ChatInputArea;