"""
Shared state management for the Panion system.
"""

from typing import Dict, Any, Optional
from enum import Enum

class ComponentState(Enum):
    """State of a system component."""
    INITIALIZING = "initializing"
    ACTIVE = "active"
    ERROR = "error"
    TERMINATED = "terminated"

class SharedState:
    """Global state manager for the Panion system."""
    
    def __init__(self):
        self._plugins: Dict[str, Any] = {}
        self._error_handler = None
        self._component_states: Dict[str, ComponentState] = {}
    
    def register_plugin(self, name: str, plugin: Any) -> None:
        """Register a plugin."""
        self._plugins[name] = plugin
        self._component_states[name] = ComponentState.INITIALIZING
    
    def unregister_plugin(self, name: str) -> None:
        """Unregister a plugin."""
        self._plugins.pop(name, None)
        self._component_states.pop(name, None)
    
    def get_plugins(self) -> Dict[str, Any]:
        """Get all registered plugins."""
        return self._plugins
    
    def set_error_handler(self, handler: Any) -> None:
        """Set the error handler instance."""
        self._error_handler = handler
    
    def get_error_handler(self) -> Any:
        """Get the error handler instance."""
        return self._error_handler
    
    def set_component_state(self, name: str, state: ComponentState) -> None:
        """Set the state of a component."""
        self._component_states[name] = state
    
    def get_component_state(self, name: str) -> Optional[ComponentState]:
        """Get the state of a component."""
        return self._component_states.get(name)

# Global shared state instance
shared_state = SharedState() 