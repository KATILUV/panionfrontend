import { useState, useEffect, useRef } from 'react';
import { useWebSocketService } from '../services/webSocketService';

const TestChat = () => {
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Set up WebSocket connection to our test server with improved error handling
  const {
    connectionStatus,
    isServerHealthy,
    error,
    sendMessage,
    connect
  } = useWebSocketService({
    path: '/ws-chat', // Use the chat WebSocket endpoint
    debug: true,
    maxReconnectAttempts: 5, // Increase reconnect attempts
    reconnectInterval: 2000, // Shorter initial reconnect interval
    onMessage: (msg) => {
      console.log('Received message:', msg);
      
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
      } else if (msg.type === 'welcome') {
        setChatHistory(prev => [...prev, {
          id: Date.now(),
          message: msg.message || 'Connected to the server',
          sender: 'system',
          timestamp: msg.timestamp || Date.now()
        }]);
      }
    },
    onConnect: () => {
      console.log('Connected to chat server');
      setChatHistory(prev => [...prev, {
        id: Date.now(),
        message: 'Connection established with server',
        sender: 'system',
        timestamp: Date.now()
      }]);
    },
    onDisconnect: () => {
      console.log('Disconnected from chat server');
    },
    onError: (err) => {
      console.error('WebSocket error:', err);
      setChatHistory(prev => [...prev, {
        id: Date.now(),
        message: 'Connection error occurred. Attempting to reconnect...',
        sender: 'system',
        timestamp: Date.now()
      }]);
    },
    onReconnect: (attempt) => {
      console.log(`Reconnection attempt ${attempt}`);
      setChatHistory(prev => [...prev, {
        id: Date.now(),
        message: `Reconnection attempt ${attempt}...`,
        sender: 'system',
        timestamp: Date.now()
      }]);
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
    <div className="w-full max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Test Chat</h1>
      
      <div className="p-4 bg-gray-200 rounded-lg mb-4">
        <p><strong>Status:</strong> {connectionStatus}</p>
        <p><strong>Server Health:</strong> {isServerHealthy ? 'Good' : 'Issues Detected'}</p>
        {error && <p className="text-red-500"><strong>Error:</strong> {error}</p>}
      </div>
      
      <div className="border rounded-lg h-96 overflow-y-auto mb-4 p-4 bg-white">
        {chatHistory.map((chat) => (
          <div 
            key={chat.id}
            className={`mb-3 p-3 rounded-lg ${
              chat.sender === 'user' 
                ? 'bg-blue-100 ml-auto max-w-[80%]' 
                : chat.sender === 'system'
                ? 'bg-gray-200 mx-auto max-w-[80%] text-center'
                : 'bg-gray-100 mr-auto max-w-[80%]'
            }`}
          >
            <div className="text-sm font-semibold mb-1">
              {chat.sender === 'user' ? 'You' : chat.sender === 'system' ? 'System' : 'Assistant'}
            </div>
            <div>{chat.message}</div>
          </div>
        ))}
        
        {isTyping && (
          <div className="bg-gray-100 p-3 rounded-lg mr-auto mb-3">
            <div className="text-sm font-semibold mb-1">Assistant</div>
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

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
      
      <div className="mt-4">
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
        >
          Refresh Connection
        </button>
      </div>
    </div>
  );
};

export default TestChat;