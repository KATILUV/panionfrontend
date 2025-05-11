import React, { useState } from 'react';
import CollaborationDashboard from '@/components/CollaborationDashboard';
import VisualCollaboration from '@/components/collaboration/VisualCollaboration';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BrainCircuit, Image as ImageIcon } from 'lucide-react';

const CollaborationPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('agent-collab');
  
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Agent Collaboration System</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full flex justify-start mb-6">
          <TabsTrigger value="agent-collab" className="flex items-center gap-2">
            <BrainCircuit className="h-4 w-4" />
            Agent Collaboration
          </TabsTrigger>
          <TabsTrigger value="visual-collab" className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            Visual Collaboration
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="agent-collab">
          <CollaborationDashboard />
        </TabsContent>
        
        <TabsContent value="visual-collab">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold mb-2">Multi-Agent Visual Analysis</h2>
            <p className="text-gray-600">
              Upload an image to be analyzed by a team of specialized AI agents, each focusing on different aspects of the visual content.
              Agents will collaborate, share insights, and generate a comprehensive understanding of the image.
            </p>
          </div>
          <VisualCollaboration />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CollaborationPage;