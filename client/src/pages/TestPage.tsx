import TestChat from '../components/TestChat';
import PanionChat from '../components/PanionChat';

const TestPage = () => {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="container mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">Panion System Test</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-4">WebSocket Test Chat</h2>
            <TestChat />
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-4">Panion Chat</h2>
            <div className="h-[600px]">
              <PanionChat />
            </div>
          </div>
        </div>
        
        <div className="mt-12 bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4">System Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border p-4 rounded-lg">
              <h3 className="font-medium">WebSocket Server</h3>
              <div className="flex items-center mt-2">
                <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                <span>Online</span>
              </div>
            </div>
            
            <div className="border p-4 rounded-lg">
              <h3 className="font-medium">Panion API</h3>
              <div className="flex items-center mt-2">
                <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                <span>Online</span>
              </div>
            </div>
            
            <div className="border p-4 rounded-lg">
              <h3 className="font-medium">Memory System</h3>
              <div className="flex items-center mt-2">
                <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                <span>Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestPage;