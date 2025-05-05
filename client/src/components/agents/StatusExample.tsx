import React from "react";
import { AgentStatus } from "@/components/ui/agent-status";
import { Card } from "@/components/ui/card";

/**
 * Example component showcasing the Agent Status indicators
 * and typography hierarchy inspired by Frame.io
 */
export const StatusExample: React.FC = () => {
  return (
    <div className="w-full h-full flex flex-col gap-6 p-6 overflow-auto">
      <div>
        <h1>Typography & Status Indicators</h1>
        <p className="text-caption mb-4">
          Inspired by Frame.io's consistent visual hierarchy and color coding
        </p>
      </div>

      <Card className="p-6">
        <h2>Typography Hierarchy</h2>
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

      <Card className="p-6">
        <h2>Agent Status Indicators</h2>
        <p className="text-caption mb-4">
          Consistent visual indicators for agent states inspired by Frame.io's status system
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <h3>Standard Size</h3>
            <div className="flex flex-wrap gap-2">
              <AgentStatus status="idle" />
              <AgentStatus status="thinking" />
              <AgentStatus status="active" />
              <AgentStatus status="paused" />
              <AgentStatus status="error" />
              <AgentStatus status="success" />
              <AgentStatus status="waiting" />
              <AgentStatus status="learning" />
            </div>
          </div>
          
          <div className="flex flex-col gap-2">
            <h3>Small Size</h3>
            <div className="flex flex-wrap gap-2">
              <AgentStatus status="idle" size="sm" />
              <AgentStatus status="thinking" size="sm" />
              <AgentStatus status="active" size="sm" />
              <AgentStatus status="paused" size="sm" />
              <AgentStatus status="error" size="sm" />
              <AgentStatus status="success" size="sm" />
              <AgentStatus status="waiting" size="sm" />
              <AgentStatus status="learning" size="sm" />
            </div>
          </div>
          
          <div className="flex flex-col gap-2">
            <h3>Large Size</h3>
            <div className="flex flex-wrap gap-2">
              <AgentStatus status="idle" size="lg" />
              <AgentStatus status="thinking" size="lg" />
              <AgentStatus status="active" size="lg" />
              <AgentStatus status="paused" size="lg" />
              <AgentStatus status="error" size="lg" />
              <AgentStatus status="success" size="lg" />
              <AgentStatus status="waiting" size="lg" />
              <AgentStatus status="learning" size="lg" />
            </div>
          </div>
          
          <div className="flex flex-col gap-2">
            <h3>Icon Only</h3>
            <div className="flex flex-wrap gap-2">
              <AgentStatus status="idle" showLabel={false} />
              <AgentStatus status="thinking" showLabel={false} />
              <AgentStatus status="active" showLabel={false} />
              <AgentStatus status="paused" showLabel={false} />
              <AgentStatus status="error" showLabel={false} />
              <AgentStatus status="success" showLabel={false} />
              <AgentStatus status="waiting" showLabel={false} />
              <AgentStatus status="learning" showLabel={false} />
            </div>
          </div>
        </div>
        
        <div className="mt-6">
          <h3>Usage Context Examples</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <Card className="p-4 relative">
              <div className="absolute top-2 right-2">
                <AgentStatus status="active" showLabel={false} size="sm" />
              </div>
              <h4>Clara Agent</h4>
              <p className="text-content">Main conversational agent with access to short and long-term memory.</p>
              <div className="flex items-center mt-2">
                <span className="text-small mr-2">Last activity:</span>
                <span className="text-caption">2 minutes ago</span>
              </div>
            </Card>
            
            <Card className="p-4 relative">
              <div className="absolute top-2 right-2">
                <AgentStatus status="thinking" showLabel={false} size="sm" />
              </div>
              <h4>Research Agent</h4>
              <p className="text-content">Specialized agent for data analysis and information retrieval.</p>
              <div className="flex items-center mt-2">
                <span className="text-small mr-2">Processing:</span>
                <span className="text-caption">Analyzing market trends</span>
              </div>
            </Card>
            
            <Card className="p-4 relative">
              <div className="absolute top-2 right-2">
                <AgentStatus status="waiting" showLabel={false} size="sm" />
              </div>
              <h4>Code Assistant</h4>
              <p className="text-content">Specialized agent for code generation and review.</p>
              <div className="flex items-center mt-2">
                <span className="text-small mr-2">Waiting for:</span>
                <span className="text-caption">File selection</span>
              </div>
            </Card>
            
            <Card className="p-4 relative">
              <div className="absolute top-2 right-2">
                <AgentStatus status="paused" showLabel={false} size="sm" />
              </div>
              <h4>Media Agent</h4>
              <p className="text-content">Image analysis and generation assistant.</p>
              <div className="flex items-center mt-2">
                <span className="text-small mr-2">Status:</span>
                <span className="text-caption">Paused by user</span>
              </div>
            </Card>
          </div>
        </div>
      </Card>
    </div>
  );
};