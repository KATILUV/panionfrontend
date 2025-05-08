"""
Event System
Handles event-based communication between components.
"""

import logging
from typing import Dict, Any, List, Callable, Optional
from dataclasses import dataclass
from datetime import datetime
from enum import Enum, auto

logger = logging.getLogger(__name__)

class EventType(Enum):
    """Types of events in the system."""
    PLUGIN_LOADED = auto()
    PLUGIN_UNLOADED = auto()
    PLUGIN_TEST_STARTED = auto()
    PLUGIN_TEST_COMPLETED = auto()
    PLUGIN_SYNTHESIS_STARTED = auto()
    PLUGIN_SYNTHESIS_COMPLETED = auto()
    PLUGIN_CACHE_UPDATED = auto()
    PLUGIN_REFINEMENT_STARTED = auto()
    PLUGIN_REFINEMENT_COMPLETED = auto()

@dataclass
class Event:
    """Event data structure."""
    type: EventType
    data: Dict[str, Any]
    timestamp: datetime = datetime.now()
    source: str = ""

class EventBus:
    """Event bus for handling system-wide events."""
    
    def __init__(self):
        self._subscribers: Dict[EventType, List[Callable[[Event], None]]] = {}
        self._event_history: List[Event] = []
        
    def subscribe(self, event_type: EventType, callback: Callable[[Event], None]) -> None:
        """Subscribe to an event type."""
        if event_type not in self._subscribers:
            self._subscribers[event_type] = []
        self._subscribers[event_type].append(callback)
        
    def unsubscribe(self, event_type: EventType, callback: Callable[[Event], None]) -> None:
        """Unsubscribe from an event type."""
        if event_type in self._subscribers:
            self._subscribers[event_type].remove(callback)
            
    def publish(self, event: Event) -> None:
        """Publish an event to all subscribers."""
        self._event_history.append(event)
        
        if event.type in self._subscribers:
            for callback in self._subscribers[event.type]:
                try:
                    callback(event)
                except Exception as e:
                    logger.error(f"Error in event handler: {e}")
                    
    def get_event_history(self, event_type: Optional[EventType] = None) -> List[Event]:
        """Get event history, optionally filtered by type."""
        if event_type:
            return [e for e in self._event_history if e.type == event_type]
        return self._event_history

# Create singleton instance
event_bus = EventBus() 