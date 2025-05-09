import React, { useEffect, useState, useRef } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessagesSquare, AlertCircle, CheckCircle2, Clock } from "lucide-react";

interface LiveProgressEvent {
  id: string;
  timestamp: Date;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error' | 'progress';
  source?: string;
  details?: string;
}

interface LiveProgressStreamProps {
  taskId: string;
  height?: string;
  maxEvents?: number;
  autoScroll?: boolean;
  showTimestamps?: boolean;
}

const LiveProgressStream: React.FC<LiveProgressStreamProps> = ({
  taskId,
  height = '300px',
  maxEvents = 50,
  autoScroll = true,
  showTimestamps = true,
}) => {
  const [events, setEvents] = useState<LiveProgressEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<WebSocket | null>(null);

  // Set up WebSocket connection
  useEffect(() => {
    // Establish WebSocket connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log('WebSocket connected for task progress streaming');
      setConnected(true);
      
      // Subscribe to task updates
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: 'subscribe',
          taskId: taskId
        }));
      }
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Only process events for this task
        if (data.taskId === taskId) {
          const newEvent: LiveProgressEvent = {
            id: data.id || `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(data.timestamp || Date.now()),
            message: data.message || 'Event received',
            type: data.type || 'info',
            source: data.source,
            details: data.details
          };
          
          setEvents(prev => {
            // Add the new event and keep only the most recent ones up to maxEvents
            const updated = [...prev, newEvent];
            return updated.slice(Math.max(0, updated.length - maxEvents));
          });
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnected(false);
    };

    socket.onclose = () => {
      console.log('WebSocket connection closed');
      setConnected(false);
    };

    // Heartbeat to keep connection alive
    const heartbeatInterval = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'heartbeat' }));
      }
    }, 30000);

    return () => {
      clearInterval(heartbeatInterval);
      socket.close();
    };
  }, [taskId, maxEvents]);

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (autoScroll && scrollAreaRef.current && events.length > 0) {
      const scrollArea = scrollAreaRef.current;
      scrollArea.scrollTop = scrollArea.scrollHeight;
    }
  }, [events, autoScroll]);

  // Mock events for demonstration when no WebSocket events are coming
  useEffect(() => {
    // Only add mock events if there are no real ones and we're not connected yet
    if (!connected && events.length === 0) {
      // Add initial connecting event
      setEvents([{
        id: 'mock-init',
        timestamp: new Date(),
        message: 'Connecting to task progress stream...',
        type: 'info'
      }]);
    }
  }, [connected, events.length]);

  // Format timestamp
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // Render icon based on event type
  const getEventIcon = (type: LiveProgressEvent['type']) => {
    switch (type) {
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'progress':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'info':
      default:
        return <MessagesSquare className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="py-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-sm font-medium">Live Progress</CardTitle>
          <Badge 
            variant={connected ? "default" : "secondary"}
            className="ml-2 text-xs"
          >
            {connected ? 'Connected' : 'Connecting...'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-3">
        <ScrollArea 
          ref={scrollAreaRef} 
          className="h-[--scrollarea-height] border rounded-md bg-muted/10 p-2"
          style={{ "--scrollarea-height": height } as React.CSSProperties}
        >
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex items-start gap-2 text-sm border-b border-border/30 pb-2 last:border-0"
              >
                <div className="mt-0.5">
                  {getEventIcon(event.type)}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <p 
                      className={`font-medium ${
                        event.type === 'error' ? 'text-destructive' : 
                        event.type === 'success' ? 'text-green-500' : 
                        event.type === 'warning' ? 'text-yellow-500' :
                        'text-primary'
                      }`}
                    >
                      {event.message}
                    </p>
                    {showTimestamps && (
                      <span className="text-xs text-muted-foreground">
                        {formatTime(event.timestamp)}
                      </span>
                    )}
                  </div>
                  {event.details && (
                    <p className="text-xs text-muted-foreground">{event.details}</p>
                  )}
                  {event.source && (
                    <Badge variant="outline" className="text-[10px] h-4">
                      {event.source}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
            
            {events.length === 0 && (
              <div className="flex justify-center items-center h-[200px] text-muted-foreground text-sm">
                Waiting for task progress events...
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default LiveProgressStream;