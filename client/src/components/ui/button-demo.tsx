import React from 'react';
import { FutureButton } from './future-button';
import { Cpu, Settings, User, MessageSquare, Plus } from 'lucide-react';

const ButtonDemo = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Enhanced Button Variants</h2>
        <div className="flex flex-wrap gap-4">
          <FutureButton variant="default">Default Button</FutureButton>
          <FutureButton variant="primary">Primary Button</FutureButton>
          <FutureButton variant="outline">Outline Button</FutureButton>
          <FutureButton variant="ghost">Ghost Button</FutureButton>
          <FutureButton variant="accent">Accent Button</FutureButton>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Button Sizes</h2>
        <div className="flex flex-wrap items-center gap-4">
          <FutureButton size="sm">Small Button</FutureButton>
          <FutureButton size="default">Default Size</FutureButton>
          <FutureButton size="lg">Large Button</FutureButton>
          <FutureButton size="icon"><Plus /></FutureButton>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Special Effects</h2>
        <div className="flex flex-wrap gap-4">
          <FutureButton gradient variant="primary">Gradient Button</FutureButton>
          <FutureButton glow variant="primary">Glow Effect</FutureButton>
          <FutureButton neonBorder variant="outline">Neon Border</FutureButton>
          <FutureButton glow neonBorder variant="primary">
            All Effects
          </FutureButton>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Button with Icons</h2>
        <div className="flex flex-wrap gap-4">
          <FutureButton variant="primary">
            <User size={16} />
            <span>User Profile</span>
          </FutureButton>
          <FutureButton variant="outline">
            <Settings size={16} />
            <span>Settings</span>
          </FutureButton>
          <FutureButton variant="default">
            <MessageSquare size={16} />
            <span>Chat</span>
          </FutureButton>
          <FutureButton variant="accent">
            <Cpu size={16} />
            <span>AI Models</span>
          </FutureButton>
        </div>
      </div>
    </div>
  );
};

export default ButtonDemo;