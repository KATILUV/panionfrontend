import React from 'react';
import CollaborationDashboard from '@/components/CollaborationDashboard';

const CollaborationPage: React.FC = () => {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Agent Collaboration System</h1>
      <CollaborationDashboard />
    </div>
  );
};

export default CollaborationPage;