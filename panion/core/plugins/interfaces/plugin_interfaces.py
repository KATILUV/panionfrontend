"""
Plugin Interfaces Module

This module defines the abstract interfaces and enums that different components
of the plugin system must implement.
"""

from abc import ABC, abstractmethod
from enum import Enum, auto
from typing import Dict, List, Any, Optional, Tuple, Set, Union

from ..exceptions import PluginError

class PluginType(Enum):
    """Enumeration of plugin types."""
    PROCESSOR = "processor"        # Data processing plugins
    CONNECTOR = "connector"        # External system connectors
    UTILITY = "utility"            # Utility/helper plugins
    SERVICE = "service"            # Long-running service plugins
    ANALYSIS = "analysis"          # Data analysis plugins
    UI = "ui"                      # User interface plugins
    STORAGE = "storage"            # Data storage plugins
    CUSTOM = "custom"              # Custom plugin types

class PluginState(Enum):
    """Enumeration of plugin states."""
    REGISTERED = auto()            # Plugin is registered but not initialized
    INITIALIZED = auto()           # Plugin is initialized and ready to use
    ACTIVE = auto()                # Plugin is active and in use
    DISABLED = auto()              # Plugin is temporarily disabled
    ERROR = auto()                 # Plugin is in error state
    UNREGISTERED = auto()          # Plugin is unregistered

class IPluginManager(ABC):
    """Interface for plugin manager implementations."""
    
    @abstractmethod
    async def register_plugin_dir(self, plugin_dir: str) -> List[str]:
        """Register a directory for plugin discovery.
        
        Args:
            plugin_dir: Directory containing plugins.
            
        Returns:
            List of discovered plugin IDs.
        """
        pass
    
    @abstractmethod
    async def scan_for_new_plugins(self) -> List[str]:
        """Scan registered directories for new plugins.
        
        Returns:
            List of newly discovered plugin IDs.
        """
        pass
    
    @abstractmethod
    async def register_plugin(self, plugin_id: str, metadata: Dict[str, Any]) -> bool:
        """Register a plugin with the manager.
        
        Args:
            plugin_id: Unique plugin identifier.
            metadata: Plugin metadata.
            
        Returns:
            True if registration succeeded, False otherwise.
        """
        pass
    
    @abstractmethod
    async def unregister_plugin(self, plugin_id: str) -> bool:
        """Unregister a plugin from the manager.
        
        Args:
            plugin_id: Plugin ID to unregister.
            
        Returns:
            True if unregistration succeeded, False otherwise.
        """
        pass
    
    @abstractmethod
    async def get_plugin_metadata(self, plugin_id: str) -> Optional[Dict[str, Any]]:
        """Get plugin metadata.
        
        Args:
            plugin_id: Plugin ID.
            
        Returns:
            Plugin metadata if found, None otherwise.
        """
        pass
    
    @abstractmethod
    async def get_plugin_instance(self, plugin_id: str) -> Any:
        """Get a plugin instance.
        
        Args:
            plugin_id: Plugin ID.
            
        Returns:
            Plugin instance if found, None otherwise.
        """
        pass
    
    @abstractmethod
    async def execute_plugin(self, plugin_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a plugin with the given parameters.
        
        Args:
            plugin_id: Plugin ID.
            parameters: Execution parameters.
            
        Returns:
            Plugin execution result.
        """
        pass
    
    @abstractmethod
    async def validate_plugin_parameters(self, plugin_id: str, parameters: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        """Validate plugin parameters.
        
        Args:
            plugin_id: Plugin ID.
            parameters: Parameters to validate.
            
        Returns:
            Tuple of (is_valid, error_message).
        """
        pass
    
    @abstractmethod
    async def get_plugin_metrics(self, plugin_id: str) -> Dict[str, Any]:
        """Get plugin performance metrics.
        
        Args:
            plugin_id: Plugin ID.
            
        Returns:
            Dictionary of metrics.
        """
        pass
    
    @abstractmethod
    async def list_plugins(self, filter_criteria: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """List registered plugins.
        
        Args:
            filter_criteria: Optional filter criteria.
            
        Returns:
            List of plugin metadata dictionaries.
        """
        pass
    
    @abstractmethod
    async def get_plugin_dependencies(self, plugin_id: str) -> List[str]:
        """Get plugin dependencies.
        
        Args:
            plugin_id: Plugin ID.
            
        Returns:
            List of dependency plugin IDs.
        """
        pass
    
    @abstractmethod
    async def get_plugin_dependents(self, plugin_id: str) -> List[str]:
        """Get plugins that depend on this plugin.
        
        Args:
            plugin_id: Plugin ID.
            
        Returns:
            List of dependent plugin IDs.
        """
        pass