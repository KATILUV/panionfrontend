import React from 'react';
import ClaraOrb from '@/components/ClaraOrb';
import ChatContainer from '@/components/ChatContainer';
import ChatInputArea from '@/components/ChatInputArea';
import { useChat } from '@/hooks/useChat';

const Chat: React.FC = () => {
  const { 
    messages, 
    isLoading, 
    handleSubmit, 
    inputValue, 
    setInputValue,
    setSelectedImage
  } = useChat();

  // Handler for the image selection from ChatInputArea
  const handleImageChange = (imageDataUrl: string | null) => {
    setSelectedImage(imageDataUrl);
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto px-4 md:px-6 py-4">
      {/* Pass isProcessing to the orb so it animates while Clara is thinking */}
      <ClaraOrb isProcessing={isLoading} />

      <div className="text-center mb-5">
        <h1 className="text-3xl font-semibold text-white transition-all duration-300 hover:text-primary">Clara</h1>
        <p className="text-sm text-gray-300">{isLoading ? 'Thinking...' : 'Your AI Companion'}</p>
      </div>

      <ChatContainer 
        messages={messages} 
        isLoading={isLoading} 
      />
  
      <ChatInputArea 
        inputValue={inputValue}
        setInputValue={setInputValue}
        handleSubmit={handleSubmit}
        isLoading={isLoading}
        onImageSelect={handleImageChange}
      />

      {/* Add a subtle footer */}
      <div className="text-center text-xs text-gray-300 mt-2 mb-1">
        <p>✨ Clara remembers important information from your conversations ✨</p>
      </div>
    </div>
  );
};

export default Chat;
