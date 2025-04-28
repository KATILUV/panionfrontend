import React from 'react';
import ClaraOrb from '@/components/ClaraOrb';
import ChatContainer from '@/components/ChatContainer';
import ChatInputArea from '@/components/ChatInputArea';
import { useChat } from '@/hooks/useChat';

const Chat: React.FC = () => {
  const { 
    messages, 
    isLoading, 
    sendMessage, 
    inputValue, 
    setInputValue 
  } = useChat();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      sendMessage(inputValue);
      setInputValue('');
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto px-4 md:px-6">
      <ClaraOrb />

      <div className="text-center mb-4">
        <h1 className="text-2xl font-semibold text-dark-gray">Clara</h1>
        <p className="text-sm text-gray-500">Your AI Companion</p>
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
      />
    </div>
  );
};

export default Chat;
