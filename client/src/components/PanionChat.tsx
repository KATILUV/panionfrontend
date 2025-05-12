import { useState, useEffect, useCallback, useRef } from 'react'
import { useWebSocketService } from '../services/webSocketService';

const PanionChat = () => {
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Set up WebSocket connection
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
          message: msg.message,
          sender: msg.sender || 'assistant',
          timestamp: msg.timestamp
        }]);
        setIsTyping(false);
      } else if (msg.type === 'typing_indicator') {
        setIsTyping(!!msg.message);
      }
    },
    onConnect: () => {
      console.log('Connected to chat server');
    },
    onDisconnect: () => {
      console.log('Disconnected from chat server');
    }
  });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // Handle message submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    // Add message to chat history
    setChatHistory(prev => [...prev, {
      id: Date.now(),
      message,
      sender: 'user',
      timestamp: Date.now()
    }]);

    // Send message via WebSocket
    sendMessage({
      type: 'message',
      message,
      sender: 'user'
    });

    // Clear input
    setMessage('');
  };

  return (
    <div className="flex flex-col w-full max-w-2xl mx-auto h-[80vh] p-4 border rounded-lg shadow-lg bg-white">
      <div className="text-xl font-bold mb-4 pb-2 border-b">
        Panion Chat
        <span className="ml-2 px-2 py-1 text-xs rounded-full bg-gray-200">
          {connectionStatus}
        </span>
        {!isServerHealthy && (
          <span className="ml-2 px-2 py-1 text-xs rounded-full bg-red-200">
            Server unhealthy
          </span>
        )}
      </div>

      {/* Chat Messages */}
      <div className="flex-grow overflow-y-auto mb-4 p-2">
        {chatHistory.map((chat) => (
          <div 
            key={chat.id}
            className={`mb-3 p-3 rounded-lg ${
              chat.sender === 'user' 
                ? 'bg-blue-100 ml-auto max-w-[80%]' 
                : 'bg-gray-100 mr-auto max-w-[80%]'
            }`}
          >
            <div className="text-sm font-semibold mb-1">
              {chat.sender === 'user' ? 'You' : 'Panion'}
            </div>
            <div>{chat.message}</div>
          </div>
        ))}
        
        {isTyping && (
          <div className="bg-gray-100 p-3 rounded-lg mr-auto mb-3 max-w-[80%]">
            <div className="text-sm font-semibold mb-1">Panion</div>
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        )}
        
        {error && (
          <div className="bg-red-100 p-3 rounded-lg mx-auto mb-3 max-w-[80%] text-center">
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
          className="flex-grow p-2 border rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
          disabled={connectionStatus !== 'connected'}
        />
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded-r-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-gray-400"
          disabled={connectionStatus !== 'connected' || !message.trim()}
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default PanionChat;