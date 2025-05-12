import { useState, useEffect, useCallback, useRef } from 'react'
import { useWebSocketService } from '../../services/webSocketService';

// Optional: import any UI components you need
// import { Button } from "@/components/ui/button";
// import { Textarea } from "@/components/ui/textarea";

type ConversationMode = 'casual' | 'deep' | 'strategic' | 'logical';

interface Message {
  id: string | number;
  sender: 'user' | 'assistant' | 'system';
  message: string;
  timestamp: number;
  mode?: ConversationMode;
}

const EnhancedPanionChat = () => {
  // State for message input, chat history, typing indicator, and conversation mode
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [mode, setMode] = useState<ConversationMode>('casual');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Set up WebSocket connection using our enhanced service
  const {
    connectionStatus,
    isServerHealthy,
    error,
    sendMessage
  } = useWebSocketService({
    path: '/ws-chat',
    debug: true,
    onMessage: (msg) => {
      if (msg.type === 'message') {
        setChatHistory(prev => [...prev, {
          id: Date.now(),
          message: msg.message || '',
          sender: msg.sender || 'assistant',
          timestamp: msg.timestamp || Date.now(),
          mode: msg.conversationMode
        }]);
        setIsTyping(false);
      } else if (msg.type === 'typing_indicator') {
        setIsTyping(!!msg.message);
      }
    },
    onConnect: () => {
      console.log('Connected to chat server');
      // Add welcome message
      setChatHistory(prev => [
        ...prev, 
        {
          id: Date.now(),
          message: "Hello! I'm Panion, your AI companion. How can I help you today?",
          sender: 'assistant',
          timestamp: Date.now(),
          mode: 'casual'
        }
      ]);
    },
    onDisconnect: () => {
      console.log('Disconnected from chat server');
    }
  });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isTyping]);

  // Handle message submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    // Create a new message object
    const newMessage: Message = {
      id: Date.now(),
      message,
      sender: 'user',
      timestamp: Date.now(),
      mode
    };

    // Add message to chat history
    setChatHistory(prev => [...prev, newMessage]);

    // Send message via WebSocket with conversation mode
    sendMessage({
      type: 'message',
      message,
      sender: 'user',
      conversationMode: mode
    });

    // Clear input
    setMessage('');
    
    // Show typing indicator
    setIsTyping(true);
  };

  // Handle conversation mode change
  const handleModeChange = (newMode: ConversationMode) => {
    // Announce mode change to user
    setChatHistory(prev => [
      ...prev,
      {
        id: Date.now(),
        message: `Switching to ${newMode} conversation mode.`,
        sender: 'system',
        timestamp: Date.now()
      }
    ]);
    
    setMode(newMode);
    
    // Notify server of mode change
    sendMessage({
      type: 'message',  // Using message type instead of conversation_mode
      message: `Change conversation mode to ${newMode}`,
      conversationMode: newMode
    });
  };

  return (
    <div className="flex flex-col w-full h-full p-4 bg-white dark:bg-gray-900">
      <div className="flex justify-between items-center mb-4 pb-2 border-b">
        <div className="text-xl font-bold">
          Panion
          <span className="ml-2 px-2 py-1 text-xs rounded-full bg-gray-200 dark:bg-gray-700">
            {connectionStatus}
          </span>
          {!isServerHealthy && (
            <span className="ml-2 px-2 py-1 text-xs rounded-full bg-red-200 dark:bg-red-900">
              Server unhealthy
            </span>
          )}
        </div>
        
        {/* Conversation Mode Selector */}
        <div className="flex space-x-1 text-xs">
          {(['casual', 'deep', 'strategic', 'logical'] as ConversationMode[]).map((m) => (
            <button
              key={m}
              onClick={() => handleModeChange(m)}
              className={`px-2 py-1 rounded ${
                mode === m 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-grow overflow-y-auto mb-4 p-2">
        {chatHistory.map((chat) => (
          <div 
            key={chat.id}
            className={`mb-3 p-3 rounded-lg ${
              chat.sender === 'user' 
                ? 'bg-blue-100 dark:bg-blue-900 ml-auto max-w-[80%]' 
                : chat.sender === 'system'
                  ? 'bg-gray-100 dark:bg-gray-800 mx-auto max-w-[80%] italic text-center'
                  : 'bg-gray-100 dark:bg-gray-800 mr-auto max-w-[80%]'
            }`}
          >
            <div className="text-sm font-semibold mb-1 flex justify-between">
              <span>{chat.sender === 'user' ? 'You' : chat.sender === 'system' ? 'System' : 'Panion'}</span>
              {chat.mode && (
                <span className="text-xs bg-gray-200 dark:bg-gray-700 rounded px-1">
                  {chat.mode}
                </span>
              )}
            </div>
            <div className="whitespace-pre-wrap">{chat.message}</div>
          </div>
        ))}
        
        {isTyping && (
          <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg mr-auto mb-3 max-w-[80%]">
            <div className="text-sm font-semibold mb-1">Panion</div>
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        )}
        
        {error && (
          <div className="bg-red-100 dark:bg-red-900 p-3 rounded-lg mx-auto mb-3 max-w-[80%] text-center">
            {error}
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={handleSubmit} className="flex">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-grow p-2 border rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-300 dark:bg-gray-800 dark:border-gray-700"
          disabled={connectionStatus !== 'connected'}
        />
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded-r-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-gray-400 dark:disabled:bg-gray-700"
          disabled={connectionStatus !== 'connected' || !message.trim()}
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default EnhancedPanionChat;