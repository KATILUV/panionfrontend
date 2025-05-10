import React from "react";
import { AgentStatus } from "@/components/ui/agent-status";
import { Card } from "@/components/ui/card";

/**
 * Example component showcasing the Agent Status indicators
 * and typography hierarchy inspired by Frame.io
 * Optimized to prevent animation glitches and improve performance
 */
export const StatusExample: React.FC = () => {
  return (
    <div className="w-full h-full flex flex-col gap-4 md:gap-6 p-3 md:p-6 overflow-auto touch-manipulation">
      <div>
        <h1 className="text-xl md:text-2xl">Typography & Status Indicators</h1>
        <p className="text-caption mb-3 md:mb-4 text-sm">
          Inspired by Frame.io's consistent visual hierarchy and color coding
        </p>
      </div>

      {/* Typography section - hidden on mobile to focus on status indicators */}
      <Card className="p-4 md:p-6 hidden md:block">
        <h2 className="text-lg">Typography Hierarchy</h2>
        <div className="flex flex-col gap-4 mt-2">
          <div className="border-b pb-2">
            <h1>Heading 1 - Primary Titles</h1>
            <p className="text-caption">32px, Semi-bold, -0.02em letter spacing</p>
          </div>
          
          <div className="border-b pb-2">
            <h2>Heading 2 - Section Headers</h2>
            <p className="text-caption">24px, Medium, -0.01em letter spacing</p>
          </div>
          
          <div className="border-b pb-2">
            <h3>Heading 3 - Content Groups</h3>
            <p className="text-caption">20px, Medium</p>
          </div>
          
          <div className="border-b pb-2">
            <h4>Heading 4 - Minor Section Headers</h4>
            <p className="text-caption">16px, Medium</p>
          </div>
          
          <div className="border-b pb-2">
            <p className="text-content">Content Text - This is the primary text style used for content throughout the application. It's designed for optimal readability with comfortable line height and letter spacing.</p>
            <p className="text-caption">16px, Regular, 1.5 line height, 0.01em letter spacing</p>
          </div>
          
          <div className="border-b pb-2">
            <p className="text-caption">Caption Text - Used for descriptions, hints, and additional context.</p>
            <p className="text-caption">14px, Regular, muted color</p>
          </div>
          
          <div className="border-b pb-2">
            <p className="text-small">Small Text - Used for metadata, timestamps, and other auxiliary information.</p>
            <p className="text-caption">12px, Medium</p>
          </div>
          
          <div>
            <p className="text-label">Label Text - Used for form labels, column headers, and other organizational elements.</p>
            <p className="text-caption">12px, Semi-bold, uppercase, 0.05em letter spacing, muted color</p>
          </div>
        </div>
      </Card>

      <Card className="p-3 md:p-6">
        <h2 className="text-base md:text-lg font-medium">Agent Status Indicators</h2>
        <p className="text-caption text-xs md:text-sm mb-3 md:mb-4">
          Consistent visual indicators for agent states inspired by Frame.io's status system
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">Standard Size</h3>
            <div className="flex flex-wrap gap-2">
              <AgentStatus status="idle" />
              <AgentStatus status="thinking" pulsingAnimation={false} />
              <AgentStatus status="active" pulsingAnimation={false} />
              <AgentStatus status="paused" />
              <AgentStatus status="error" />
              <AgentStatus status="success" />
              {/* Hide less common statuses on mobile */}
              <span className="hidden md:inline">
                <AgentStatus status="waiting" pulsingAnimation={false} />
                <AgentStatus status="learning" pulsingAnimation={false} />
              </span>
            </div>
          </div>
          
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">Small Size</h3>
            <div className="flex flex-wrap gap-2">
              <AgentStatus status="idle" size="sm" />
              <AgentStatus status="thinking" size="sm" pulsingAnimation={false} />
              <AgentStatus status="active" size="sm" pulsingAnimation={false} />
              <AgentStatus status="paused" size="sm" />
              <AgentStatus status="error" size="sm" />
              <AgentStatus status="success" size="sm" />
              {/* Hide less common statuses on mobile */}
              <span className="hidden md:inline">
                <AgentStatus status="waiting" size="sm" pulsingAnimation={false} />
                <AgentStatus status="learning" size="sm" pulsingAnimation={false} />
              </span>
            </div>
          </div>
          
          {/* Hide on mobile for simplicity */}
          <div className="hidden md:flex flex-col gap-2">
            <h3 className="text-sm font-medium">Large Size</h3>
            <div className="flex flex-wrap gap-2">
              <AgentStatus status="idle" size="lg" />
              <AgentStatus status="thinking" size="lg" pulsingAnimation={false} />
              <AgentStatus status="active" size="lg" pulsingAnimation={false} />
              <AgentStatus status="paused" size="lg" />
              <AgentStatus status="error" size="lg" />
              <AgentStatus status="success" size="lg" />
              <AgentStatus status="waiting" size="lg" pulsingAnimation={false} />
              <AgentStatus status="learning" size="lg" pulsingAnimation={false} />
            </div>
          </div>
          
          {/* Hide on mobile for simplicity */}
          <div className="hidden md:flex flex-col gap-2">
            <h3 className="text-sm font-medium">Icon Only</h3>
            <div className="flex flex-wrap gap-2">
              <AgentStatus status="idle" showLabel={false} />
              <AgentStatus status="thinking" showLabel={false} pulsingAnimation={false} />
              <AgentStatus status="active" showLabel={false} pulsingAnimation={false} />
              <AgentStatus status="paused" showLabel={false} />
              <AgentStatus status="error" showLabel={false} />
              <AgentStatus status="success" showLabel={false} />
              <AgentStatus status="waiting" showLabel={false} pulsingAnimation={false} />
              <AgentStatus status="learning" showLabel={false} pulsingAnimation={false} />
            </div>
          </div>
        </div>
        
        <div className="mt-4 md:mt-6">
          <h3 className="text-sm md:text-base font-medium">Usage Context Examples</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mt-2">
            <Card className="p-3 md:p-4 relative">
              <div className="absolute top-2 right-2">
                <AgentStatus status="active" showLabel={false} size="sm" pulsingAnimation={false} />
              </div>
              <h4 className="text-sm md:text-base font-medium">Panion Agent</h4>
              <p className="text-content text-xs md:text-sm">Main conversational agent with access to short and long-term memory.</p>
              <div className="flex items-center mt-2">
                <span className="text-small mr-2 text-xs">Last activity:</span>
                <span className="text-caption text-xs">2 minutes ago</span>
              </div>
            </Card>
            
            <Card className="p-3 md:p-4 relative">
              <div className="absolute top-2 right-2">
                <AgentStatus status="thinking" showLabel={false} size="sm" pulsingAnimation={false} />
              </div>
              <h4 className="text-sm md:text-base font-medium">Research Agent</h4>
              <p className="text-content text-xs md:text-sm">Specialized agent for data analysis and information retrieval.</p>
              <div className="flex items-center mt-2">
                <span className="text-small mr-2 text-xs">Processing:</span>
                <span className="text-caption text-xs">Analyzing market trends</span>
              </div>
            </Card>
            
            {/* Hide these on mobile screens for simplicity */}
            <div className="hidden md:block">
              <Card className="p-3 md:p-4 relative">
                <div className="absolute top-2 right-2">
                  <AgentStatus status="waiting" showLabel={false} size="sm" pulsingAnimation={false} />
                </div>
                <h4 className="text-sm md:text-base font-medium">Code Assistant</h4>
                <p className="text-content text-xs md:text-sm">Specialized agent for code generation and review.</p>
                <div className="flex items-center mt-2">
                  <span className="text-small mr-2 text-xs">Waiting for:</span>
                  <span className="text-caption text-xs">File selection</span>
                </div>
              </Card>
            </div>
            
            <div className="hidden md:block">
              <Card className="p-3 md:p-4 relative">
                <div className="absolute top-2 right-2">
                  <AgentStatus status="paused" showLabel={false} size="sm" />
                </div>
                <h4 className="text-sm md:text-base font-medium">Media Agent</h4>
                <p className="text-content text-xs md:text-sm">Image analysis and generation assistant.</p>
                <div className="flex items-center mt-2">
                  <span className="text-small mr-2 text-xs">Status:</span>
                  <span className="text-caption text-xs">Paused by user</span>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};