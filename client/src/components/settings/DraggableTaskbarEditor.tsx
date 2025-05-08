import React, { useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { useTaskbarStore, TaskbarPosition } from '@/state/taskbarStore';
import { useAgentStore, AgentId } from '@/state/agentStore';
import { Pin, PinOff, X, ArrowDown, ArrowUp, ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface PositionPreviewProps {
  position: TaskbarPosition;
  className?: string;
}

// Visual preview component for taskbar position
const PositionPreview: React.FC<PositionPreviewProps> = ({ position, className }) => {
  const getPreviewStyles = () => {
    // Base styles 
    const baseStyles = 'bg-muted border border-border rounded-md relative transition-all';
    const contentStyles = 'bg-primary/20 rounded-sm';
    
    // Container styles based on position
    let containerStyles = 'w-48 h-36 ' + baseStyles;
    
    // Position indicator styles
    let indicatorStyles = '';
    
    switch (position.location) {
      case 'top':
        indicatorStyles = 'h-6 absolute top-0 left-0 right-0 ' + contentStyles;
        break;
      case 'bottom':
        indicatorStyles = 'h-6 absolute bottom-0 left-0 right-0 ' + contentStyles;
        break;
      case 'left':
        indicatorStyles = 'w-6 absolute left-0 top-0 bottom-0 ' + contentStyles;
        break;
      case 'right':
        indicatorStyles = 'w-6 absolute right-0 top-0 bottom-0 ' + contentStyles;
        break;
    }
    
    // Apply alignment
    if (position.location === 'top' || position.location === 'bottom') {
      switch (position.alignment) {
        case 'start':
          indicatorStyles += ' flex justify-start';
          break;
        case 'center':
          indicatorStyles += ' flex justify-center';
          break;
        case 'end':
          indicatorStyles += ' flex justify-end';
          break;
        case 'space-between':
          indicatorStyles += ' flex justify-between';
          break;
      }
    } else { // left or right
      switch (position.alignment) {
        case 'start':
          indicatorStyles += ' flex flex-col justify-start';
          break;
        case 'center':
          indicatorStyles += ' flex flex-col justify-center';
          break;
        case 'end':
          indicatorStyles += ' flex flex-col justify-end';
          break;
        case 'space-between':
          indicatorStyles += ' flex flex-col justify-between';
          break;
      }
    }
    
    return { containerStyles, indicatorStyles };
  };
  
  const { containerStyles, indicatorStyles } = getPreviewStyles();
  
  // Display "dots" to represent icons in the taskbar
  const renderDots = () => {
    const dots = [];
    const numDots = position.alignment === 'space-between' ? 3 : 5;
    
    for (let i = 0; i < numDots; i++) {
      dots.push(
        <div 
          key={i} 
          className={cn(
            "rounded-full bg-primary/60",
            position.location === 'top' || position.location === 'bottom' 
              ? "w-3 h-3 mx-1" 
              : "w-3 h-3 my-1"
          )}
        />
      );
    }
    
    return dots;
  };
  
  return (
    <div className={cn(containerStyles, className)}>
      <div className={indicatorStyles}>
        {renderDots()}
      </div>
      <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground pointer-events-none">
        Preview
      </div>
    </div>
  );
};

export function DraggableTaskbarEditor() {
  const { toast } = useToast();
  
  // Force update mechanism for consistent render on state changes
  const [forceUpdate, setForceUpdate] = useState(0);

  // Subscribe to taskbar store changes
  useEffect(() => {
    const handleStoreChange = () => {
      console.log("DraggableTaskbarEditor - Store changed, forcing update");
      setForceUpdate(prev => prev + 1);
    };
    
    // Set up subscription
    const unsubscribe = useTaskbarStore.subscribe(handleStoreChange);
    
    // Log current state
    console.log("DraggableTaskbarEditor - Initial state:", {
      pinnedAgents: useTaskbarStore.getState().pinnedAgents,
      position: useTaskbarStore.getState().position
    });
    
    // Cleanup
    return () => unsubscribe();
  }, []);

  // Get current state from store
  const {
    pinnedAgents,
    position,
    reorderPinnedAgents,
    unpinAgent,
    clearPinnedAgents,
    setPosition
  } = useTaskbarStore();
  
  // Get agent information from agent store
  const registry = useAgentStore(state => state.registry);
  
  // Handle drag end
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;
    
    if (sourceIndex === destinationIndex) return;
    
    // Create a new array with the reordered items
    const reorderedAgents = Array.from(pinnedAgents);
    const [removed] = reorderedAgents.splice(sourceIndex, 1);
    reorderedAgents.splice(destinationIndex, 0, removed);
    
    // Get fresh function from store to avoid stale closures
    const { reorderPinnedAgents } = useTaskbarStore.getState();
    
    // Update store
    console.log("Reordering agents:", reorderedAgents);
    reorderPinnedAgents(reorderedAgents);
    
    toast({
      title: "Taskbar updated",
      description: "Agent order has been updated",
    });
  };
  
  // Function to get agent icon based on ID
  const getAgentIcon = (agentId: AgentId) => {
    // You can extend this with actual icons later
    return "🤖";
  };
  
  // Handle position change
  const changePosition = (location: 'top' | 'bottom' | 'left' | 'right') => {
    // Get fresh function from store
    const { setPosition } = useTaskbarStore.getState();
    const currentPosition = useTaskbarStore.getState().position;
    
    setPosition({
      ...currentPosition,
      location
    });
    
    toast({
      title: "Taskbar position updated",
      description: `Taskbar moved to ${location}`,
    });
  };
  
  // Handle alignment change
  const changeAlignment = (alignment: 'start' | 'end' | 'center' | 'space-between') => {
    // Get fresh function from store
    const { setPosition } = useTaskbarStore.getState();
    const currentPosition = useTaskbarStore.getState().position;
    
    setPosition({
      ...currentPosition,
      alignment
    });
    
    toast({
      title: "Taskbar alignment updated",
      description: `Alignment set to ${alignment}`,
    });
  };
  
  return (
    <div className="space-y-6">
      {/* Position control with visual preview */}
      <div className="bg-card p-4 rounded-lg border border-border">
        <h3 className="text-lg font-medium mb-4">Taskbar Position</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="col-start-2">
                <Button 
                  variant={position.location === 'top' ? "default" : "outline"}
                  className="w-full" 
                  onClick={() => changePosition('top')}
                >
                  <ArrowUp className="h-4 w-4 mr-1" />
                  Top
                </Button>
              </div>
              <div></div>
              
              <div>
                <Button 
                  variant={position.location === 'left' ? "default" : "outline"}
                  className="w-full" 
                  onClick={() => changePosition('left')}
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Left
                </Button>
              </div>
              <div></div>
              <div>
                <Button 
                  variant={position.location === 'right' ? "default" : "outline"}
                  className="w-full" 
                  onClick={() => changePosition('right')}
                >
                  <ArrowRight className="h-4 w-4 mr-1" />
                  Right
                </Button>
              </div>
              
              <div className="col-start-2">
                <Button 
                  variant={position.location === 'bottom' ? "default" : "outline"} 
                  className="w-full"
                  onClick={() => changePosition('bottom')}
                >
                  <ArrowDown className="h-4 w-4 mr-1" />
                  Bottom
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Alignment</h4>
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant={position.alignment === 'start' ? "default" : "outline"} 
                  size="sm"
                  onClick={() => changeAlignment('start')}
                >
                  Start
                </Button>
                <Button 
                  variant={position.alignment === 'center' ? "default" : "outline"} 
                  size="sm"
                  onClick={() => changeAlignment('center')}
                >
                  Center
                </Button>
                <Button 
                  variant={position.alignment === 'end' ? "default" : "outline"} 
                  size="sm"
                  onClick={() => changeAlignment('end')}
                >
                  End
                </Button>
                <Button 
                  variant={position.alignment === 'space-between' ? "default" : "outline"} 
                  size="sm"
                  onClick={() => changeAlignment('space-between')}
                >
                  Space Between
                </Button>
              </div>
            </div>
          </div>
          
          <div className="flex justify-center items-center">
            <PositionPreview position={position} />
          </div>
        </div>
      </div>
      
      {/* Drag and drop agent reordering */}
      <div className="bg-card p-4 rounded-lg border border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">Pinned Agents</h3>
          
          {pinnedAgents.length > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                // Get fresh function from store
                const { clearPinnedAgents } = useTaskbarStore.getState();
                clearPinnedAgents();
                
                toast({
                  title: "Taskbar cleared",
                  description: "All agents have been removed from the taskbar",
                });
              }}
              className="text-destructive hover:bg-destructive/10"
            >
              <X className="h-4 w-4 mr-1" />
              Clear All
            </Button>
          )}
        </div>
        
        {pinnedAgents.length > 0 ? (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="droppable-pinned-agents">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-2"
                >
                  {pinnedAgents.map((agentId, index) => {
                    const agent = registry.find(a => a.id === agentId);
                    if (!agent) return null;
                    
                    return (
                      <Draggable key={agentId} draggableId={agentId} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={cn(
                              "flex items-center justify-between p-3 rounded-md border",
                              snapshot.isDragging ? "bg-accent shadow-lg" : "bg-background/30",
                              "transition-all duration-200"
                            )}
                          >
                            <div className="flex items-center">
                              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                                {getAgentIcon(agentId)}
                              </div>
                              <div>
                                <div className="font-medium">{agent.title}</div>
                                <div className="text-xs text-muted-foreground">
                                  {snapshot.isDragging ? "Dragging..." : "Drag to reorder"}
                                </div>
                              </div>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => {
                                // Get fresh function from store
                                const { unpinAgent } = useTaskbarStore.getState();
                                unpinAgent(agentId);
                                
                                toast({
                                  title: "Agent unpinned",
                                  description: `${agent.title || 'Agent'} removed from taskbar`,
                                });
                              }}
                              className="text-destructive hover:bg-destructive/10 h-8 w-8 transition-all duration-200 hover:scale-105"
                            >
                              <PinOff className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        ) : (
          <div className="text-center py-8 text-muted-foreground border border-dashed rounded-md">
            No agents pinned to the taskbar yet.
          </div>
        )}
        
        <div className="mt-4">
          <p className="text-xs text-muted-foreground">
            Drag and drop to reorder agents in the taskbar. You can pin more agents from the Available Agents section.
          </p>
        </div>
      </div>
    </div>
  );
}

export default DraggableTaskbarEditor;