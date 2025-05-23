/**
 * PanionAgentSettings Component
 * Settings panel for the Panion agent, including conversation mode selection
 */

import React, { useState } from 'react';
import { 
  Coffee, 
  BookOpen, 
  Target, 
  CircuitBoard,
  Check, 
  MessageCircle, 
  Save,
  Settings as SettingsIcon,
  Palette,
  Code,
  GraduationCap,
  Image as ImageIcon,
  Users
} from 'lucide-react';
import { 
  ConversationMode, 
  CONVERSATION_MODES,
  DEFAULT_CONVERSATION_MODE
} from '@/types/conversationModes';
import { usePreferencesStore } from '@/state/preferencesStore';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import log from '@/utils/logger';

interface PanionAgentSettingsProps {
  onClose?: () => void;
  useMultiAgentAnalysis?: boolean;
  onToggleMultiAgentAnalysis?: (value: boolean) => void;
}

/**
 * PanionAgentSettings component for configuring Panion behavior
 */
const PanionAgentSettings: React.FC<PanionAgentSettingsProps> = ({ 
  onClose,
  useMultiAgentAnalysis = false,
  onToggleMultiAgentAnalysis
}) => {
  // Get the current conversation mode from preferences
  const conversationMode = usePreferencesStore(
    state => (state.agents?.panion?.conversationMode as ConversationMode) || DEFAULT_CONVERSATION_MODE
  );
  const setAgentPreference = usePreferencesStore(state => state.setAgentPreference);
  
  // Local state for the selected mode
  const [selectedMode, setSelectedMode] = useState<ConversationMode>(conversationMode);
  
  // Handle multi-agent toggle
  const handleMultiAgentToggle = (checked: boolean) => {
    if (onToggleMultiAgentAnalysis) {
      onToggleMultiAgentAnalysis(checked);
      log.info(`Multi-agent image analysis ${checked ? 'enabled' : 'disabled'}`);
    }
  };
  
  // Save the selected conversation mode
  const handleSave = () => {
    setAgentPreference('panion', 'conversationMode', selectedMode);
    log.info(`Conversation mode updated to: ${selectedMode}`);
    if (onClose) onClose();
  };
  
  // Get icon component based on mode ID
  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'Coffee': return <Coffee size={18} />;
      case 'BookOpen': return <BookOpen size={18} />;
      case 'Target': return <Target size={18} />;
      case 'CircuitBoard': return <CircuitBoard size={18} />;
      case 'Palette': return <Palette size={18} />;
      case 'Code': return <Code size={18} />;
      case 'GraduationCap': return <GraduationCap size={18} />;
      default: return <MessageCircle size={18} />;
    }
  };
  
  return (
    <div className="p-4 space-y-6">
      <header className="flex items-center gap-2 border-b border-border pb-4">
        <SettingsIcon size={20} className="text-primary" />
        <h2 className="text-lg font-medium">Panion Settings</h2>
      </header>
      
      <section className="space-y-4">
        <h3 className="text-md font-medium flex items-center gap-2">
          <MessageCircle size={18} />
          Conversation Mode
        </h3>
        <p className="text-sm text-muted-foreground">
          Choose how Panion should respond to your messages.
        </p>
        
        <div className="grid grid-cols-1 gap-2 mt-3">
          {Object.values(CONVERSATION_MODES).map((mode) => (
            <button
              key={mode.id}
              className={`flex items-start p-3 rounded-md border ${
                selectedMode === mode.id 
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-card hover:bg-accent/50'
              } transition-colors`}
              onClick={() => setSelectedMode(mode.id)}
            >
              <div className="flex-shrink-0 mt-0.5">
                <div className={`p-2 rounded-full ${mode.color || 'bg-primary'} text-white`}>
                  {getIconComponent(mode.icon)}
                </div>
              </div>
              <div className="ml-3 flex-1">
                <div className="flex justify-between">
                  <h4 className="text-sm font-medium">{mode.name}</h4>
                  {selectedMode === mode.id && (
                    <Check size={16} className="text-primary" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {mode.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </section>
      
      <section className="space-y-4 border-t border-border pt-4">
        <h3 className="text-md font-medium flex items-center gap-2">
          <ImageIcon size={18} />
          Image Analysis Settings
        </h3>
        <p className="text-sm text-muted-foreground">
          Configure how Panion analyzes images you share.
        </p>
        
        <div className="flex items-center justify-between rounded-lg border border-border p-4 shadow-sm">
          <div className="space-y-0.5">
            <div className="flex items-center">
              <Users className="mr-2 h-4 w-4 text-muted-foreground" />
              <Label htmlFor="multi-agent-toggle" className="text-sm font-medium">
                Multi-Agent Image Analysis
              </Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Analyze images using multiple specialized AI agents for deeper insights.
            </p>
          </div>
          <Switch
            id="multi-agent-toggle"
            checked={useMultiAgentAnalysis}
            onCheckedChange={handleMultiAgentToggle}
          />
        </div>
      </section>
      
      <footer className="flex justify-end border-t border-border pt-4">
        <button
          className="flex items-center gap-1 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
          onClick={handleSave}
        >
          <Save size={16} />
          Save Changes
        </button>
      </footer>
    </div>
  );
};

export default PanionAgentSettings;