import React, { useState, useRef } from 'react';
import { useThemeStore } from '../state/themeStore';

interface ChatInputProps {
  onSendMessage: (message: string, imageFile?: File | null) => void;
  isLoading: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading }) => {
  const [message, setMessage] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const getCurrentTheme = useThemeStore((state) => state.getCurrentTheme);
  const accent = useThemeStore((state) => state.accent);
  const isDarkMode = getCurrentTheme() === 'dark';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (message.trim() || imageFile) {
      onSendMessage(message, imageFile);
      setMessage('');
      setImageFile(null);
      setImagePreview(null);
    }
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="relative mb-4">
      {imagePreview && (
        <div className="relative max-w-[180px] mb-2 self-end ml-auto">
          <img 
            src={imagePreview} 
            alt="Upload preview"
            className={`max-w-full max-h-[180px] rounded-xl shadow-lg ${
              isDarkMode
                ? 'border border-white/20'
                : 'border border-indigo-200/50'
            }`}
          />
          <button 
            onClick={removeImage}
            className="absolute -top-2 -right-2 w-6 h-6 bg-white/90 text-gray-800 rounded-full flex items-center justify-center shadow-md"
            aria-label="Remove image"
          >
            ×
          </button>
        </div>
      )}
      
      <form 
        onSubmit={handleSubmit}
        className={`relative flex items-center backdrop-blur-md rounded-full overflow-hidden shadow-lg ${
          isDarkMode
            ? 'bg-white/10 border border-white/20'
            : 'bg-indigo-50/30 border border-indigo-200/30'
        }`}
      >
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Message Clara..."
          className={`flex-grow py-3 px-4 bg-transparent border-none outline-none ${
            isDarkMode ? 'text-white placeholder:text-white/50' : 'text-gray-800 placeholder:text-gray-500'
          }`}
          disabled={isLoading}
        />
        
        <div className="flex items-center px-2">
          <button
            type="button"
            onClick={handleImageClick}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors mr-2 ${
              isDarkMode 
                ? 'bg-white/20 text-white hover:bg-white/30' 
                : 'bg-indigo-100/50 text-indigo-600 hover:bg-indigo-100/80'
            }`}
            disabled={isLoading}
            aria-label="Upload image"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="hidden"
          />
          
          <button
            type="submit"
            className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-r from-purple-700 to-pink-600 text-white hover:from-purple-600 hover:to-pink-500 transition-colors"
            disabled={isLoading || (!message.trim() && !imageFile)}
            aria-label="Send message"
          >
            {isLoading ? (
              <div className="flex space-x-1">
                <div className="w-1.5 h-1.5 rounded-full bg-white/70 animate-typing-dot-1"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-white/70 animate-typing-dot-2"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-white/70 animate-typing-dot-3"></div>
              </div>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatInput;