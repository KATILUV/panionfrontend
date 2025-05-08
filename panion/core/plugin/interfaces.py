"""
Plugin System Interfaces
Defines abstract interfaces to break circular dependencies between components.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List, Protocol, runtime_checkable, TYPE_CHECKING
from pathlib import Path
from datetime import datetime

if TYPE_CHECKING:
    from .types import Plugin, PluginMetadata, PluginState
    from ..goals.types import Goal

class IPluginManager(ABC):
    """Interface for plugin management operations."""
    
    @abstractmethod
    async def initialize(self) -> None:
        """Initialize the plugin manager."""
        pass
    
    @abstractmethod
    async def start(self) -> None:
        """Start the plugin manager."""
        pass
    
    @abstractmethod
    async def stop(self) -> None:
        """Stop the plugin manager."""
        pass
    
    @abstractmethod
    async def pause(self) -> None:
        """Pause the plugin manager."""
        pass
    
    @abstractmethod
    async def resume(self) -> None:
        """Resume the plugin manager."""
        pass
    
    @abstractmethod
    async def update(self) -> None:
        """Update the plugin manager state."""
        pass
    
    @abstractmethod
    async def load_plugin(self, plugin_id: str, config: Dict[str, Any]) -> bool:
        """Load a plugin.
        
        Args:
            plugin_id: Plugin identifier
            config: Plugin configuration
            
        Returns:
            bool: Whether loading was successful
        """
        pass
    
    @abstractmethod
    async def unload_plugin(self, plugin_id: str) -> bool:
        """Unload a plugin.
        
        Args:
            plugin_id: Plugin identifier
            
        Returns:
            bool: Whether unloading was successful
        """
        pass
    
    @abstractmethod
    async def get_plugin(self, plugin_id: str) -> Optional['IPlugin']:
        """Get a plugin instance.
        
        Args:
            plugin_id: Plugin identifier
            
        Returns:
            Optional[IPlugin]: Plugin instance if found
        """
        pass
    
    @abstractmethod
    async def get_plugin_state(self, plugin_id: str) -> Optional['ComponentState']:
        """Get a plugin's state.
        
        Args:
            plugin_id: Plugin identifier
            
        Returns:
            Optional[ComponentState]: Plugin state if found
        """
        pass
    
    @abstractmethod
    async def get_plugin_metrics(self, plugin_id: str) -> Optional[Dict[str, Any]]:
        """Get a plugin's metrics.
        
        Args:
            plugin_id: Plugin identifier
            
        Returns:
            Optional[Dict[str, Any]]: Plugin metrics if found
        """
        pass
    
    @abstractmethod
    async def update_metrics(self) -> None:
        """Update plugin metrics."""
        pass
    
    @abstractmethod
    async def get_status(self) -> Dict[str, Any]:
        """Get the current status of the plugin manager."""
        pass
    
    @abstractmethod
    async def register_plugin(self, plugin: 'IPlugin') -> None:
        """Register a new plugin."""
        pass
    
    @abstractmethod
    async def unregister_plugin(self, plugin_name: str) -> None:
        """Unregister a plugin."""
        pass
    
    @abstractmethod
    async def list_plugins(self) -> List[str]:
        """List all registered plugins."""
        pass

@runtime_checkable
class IPluginTester(Protocol):
    """Interface for plugin testing operations."""
    
    @abstractmethod
    async def test_plugin(self, plugin: 'IPlugin', test_cases: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Run tests on a plugin."""
        raise NotImplementedError()
    
    @abstractmethod
    async def validate_plugin(self, plugin: 'IPlugin') -> bool:
        """Validate a plugin's functionality."""
        raise NotImplementedError()

@runtime_checkable
class IGoalManager(Protocol):
    """Interface for goal management operations."""
    
    @abstractmethod
    async def create_goal(self, goal_data: Dict[str, Any]) -> 'Goal':
        """Create a new goal."""
        raise NotImplementedError()
    
    @abstractmethod
    async def get_goal(self, goal_id: str) -> Optional['Goal']:
        """Get a goal by ID."""
        raise NotImplementedError()
    
    @abstractmethod
    async def update_goal(self, goal_id: str, updates: Dict[str, Any]) -> bool:
        """Update a goal's data."""
        raise NotImplementedError()

@runtime_checkable
class IAgentSpawner(Protocol):
    """Interface for agent spawning operations."""
    
    @abstractmethod
    async def spawn_agent(self, agent_type: str, config: Dict[str, Any]) -> str:
        """Spawn a new agent."""
        raise NotImplementedError()
    
    @abstractmethod
    async def terminate_agent(self, agent_id: str) -> bool:
        """Terminate an agent."""
        raise NotImplementedError()

class IPlugin(ABC):
    """Interface for plugins."""
    
    @abstractmethod
    async def initialize(self) -> None:
        """Initialize the plugin."""
        pass
    
    @abstractmethod
    async def start(self) -> None:
        """Start the plugin."""
        pass
    
    @abstractmethod
    async def stop(self) -> None:
        """Stop the plugin."""
        pass
    
    @abstractmethod
    async def pause(self) -> None:
        """Pause the plugin."""
        pass
    
    @abstractmethod
    async def resume(self) -> None:
        """Resume the plugin."""
        pass
    
    @abstractmethod
    async def update(self) -> None:
        """Update the plugin state."""
        pass
    
    @abstractmethod
    async def get_metrics(self) -> Dict[str, Any]:
        """Get plugin metrics.
        
        Returns:
            Dict[str, Any]: Plugin metrics
        """
        pass 