/**
 * Enhanced Chat Container
 * Wrapper for our enhanced chat interface with Manus-like capabilities
 */

import React from 'react';
import { WindowContent } from '@/components/windows/WindowContent';
import EnhancedChatInterface from './EnhancedChatInterface';

interface EnhancedChatContainerProps {
  onClose?: () => void;
}

export default function EnhancedChatContainer({ onClose }: EnhancedChatContainerProps) {
  return (
    <WindowContent className="p-0">
      <EnhancedChatInterface 
        title="Panion with Manus Capabilities"
        description="Enhanced intelligence with proactive, autonomous reasoning"
        className="border-none rounded-none h-full"
        onClose={onClose}
      />
    </WindowContent>
  );
}