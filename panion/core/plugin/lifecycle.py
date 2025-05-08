"""
Plugin Lifecycle Manager
Handles plugin lifecycle states and transitions.
"""

import logging
import asyncio
from typing import Dict, Any, Optional, List, Set, Callable
from datetime import datetime
from enum import Enum

from core.plugin_types import PluginState, PluginError, PluginSecurityLevel
from core.service_locator import service_locator
from core.dependency_resolver import dependency_resolver

class LifecycleEvent(Enum):
    """Plugin lifecycle events."""
    INITIALIZE = "initialize"
    START = "start"
    STOP = "stop"
    PAUSE = "pause"
    RESUME = "resume"
    ERROR = "error"
    UNLOAD = "unload"

class LifecycleManager:
    """Manages plugin lifecycle states and transitions."""
    
    def __init__(self):
        """Initialize the lifecycle manager."""
        self._logger = logging.getLogger(__name__)
        self._states: Dict[str, PluginState] = {}
        self._errors: Dict[str, List[str]] = {}
        self._event_handlers: Dict[LifecycleEvent, List[Callable]] = {
            event: [] for event in LifecycleEvent
        }
        self._state_history: Dict[str, List[tuple[PluginState, datetime]]] = {}
        
        # Register with service locator
        service_locator.register_service("lifecycle_manager", self)
        
        # Register dependencies
        dependency_resolver.register_dependency(
            "lifecycle_manager",
            lambda: self,
            ["plugin_manager"]
        )
    
    def register_event_handler(self, event: LifecycleEvent, handler: Callable) -> None:
        """Register a handler for a lifecycle event."""
        self._event_handlers[event].append(handler)
    
    def unregister_event_handler(self, event: LifecycleEvent, handler: Callable) -> None:
        """Unregister a handler for a lifecycle event."""
        if handler in self._event_handlers[event]:
            self._event_handlers[event].remove(handler)
    
    async def _notify_event_handlers(self, event: LifecycleEvent, plugin_name: str, **kwargs: Any) -> None:
        """Notify all handlers for a lifecycle event."""
        for handler in self._event_handlers[event]:
            try:
                if asyncio.iscoroutinefunction(handler):
                    await handler(plugin_name, **kwargs)
                else:
                    handler(plugin_name, **kwargs)
            except Exception as e:
                self._logger.error(f"Error in event handler for {event}: {e}")
    
    def set_state(self, plugin_name: str, state: PluginState, error: Optional[str] = None) -> None:
        """Set the state of a plugin and record the transition."""
        if plugin_name not in self._state_history:
            self._state_history[plugin_name] = []
            
        self._states[plugin_name] = state
        self._state_history[plugin_name].append((state, datetime.now()))
        
        if error:
            if plugin_name not in self._errors:
                self._errors[plugin_name] = []
            self._errors[plugin_name].append(error)
    
    def get_state(self, plugin_name: str) -> Optional[PluginState]:
        """Get the current state of a plugin."""
        return self._states.get(plugin_name)
    
    def get_state_history(self, plugin_name: str) -> List[tuple[PluginState, datetime]]:
        """Get the state history of a plugin."""
        return self._state_history.get(plugin_name, [])
    
    def get_errors(self, plugin_name: str) -> List[str]:
        """Get the errors for a plugin."""
        return self._errors.get(plugin_name, [])
    
    def clear_errors(self, plugin_name: str) -> None:
        """Clear errors for a plugin."""
        self._errors.pop(plugin_name, None)
    
    def clear_history(self, plugin_name: str) -> None:
        """Clear state history for a plugin."""
        self._state_history.pop(plugin_name, None)
    
    def clear_plugin(self, plugin_name: str) -> None:
        """Clear all data for a plugin."""
        self._states.pop(plugin_name, None)
        self._errors.pop(plugin_name, None)
        self._state_history.pop(plugin_name, None)
    
    def clear_all(self) -> None:
        """Clear all plugin data."""
        self._states.clear()
        self._errors.clear()
        self._state_history.clear()
    
    def get_plugins_by_state(self, state: PluginState) -> Set[str]:
        """Get all plugins in a specific state."""
        return {
            name for name, current_state in self._states.items()
            if current_state == state
        }
    
    def get_active_plugins(self) -> Set[str]:
        """Get all active plugins."""
        return self.get_plugins_by_state(PluginState.ACTIVE)
    
    def get_error_plugins(self) -> Set[str]:
        """Get all plugins in error state."""
        return self.get_plugins_by_state(PluginState.ERROR)

# Create singleton instance
lifecycle_manager = LifecycleManager() 