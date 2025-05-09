"""
Plugin Interfaces Module
Defines standardized interfaces for the plugin system.

This module consolidates interfaces from various plugin-related implementations:
- core/plugin/interfaces.py
- core/plugin_types.py
- core/shared_types.py (plugin-related parts)

It provides well-defined interfaces for plugin management, discovery, lifecycle management,
and related functionality.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional, Set, Union, Type
from enum import Enum
from datetime import datetime

from ..base.plugin_base import BasePlugin, PluginMetadata, PluginResult

class PluginType(Enum):
    """Types of plugins supported by the system."""
    STANDARD = "standard"           # General-purpose plugins
    DATA_PROCESSING = "data_processing"  # Data processing plugins
    SERVICE = "service"             # Service-oriented plugins
    INTEGRATION = "integration"     # External service integration plugins
    UTILITY = "utility"             # Utility/helper plugins
    WEB_SCRAPING = "web_scraping"   # Web scraping plugins
    ANALYSIS = "analysis"           # Data analysis plugins
    AI = "ai"                      # AI/ML plugins

class PluginState(Enum):
    """Possible states of a plugin."""
    UNINITIALIZED = "uninitialized"  # Plugin has not been initialized
    INITIALIZED = "initialized"     # Plugin has been initialized
    ACTIVE = "active"               # Plugin is active and ready
    DISABLED = "disabled"           # Plugin is disabled but loaded
    ERROR = "error"                 # Plugin has encountered an error
    DEPRECATED = "deprecated"       # Plugin is deprecated and should not be used

class PluginErrorType(Enum):
    """Types of errors that can occur in the plugin system."""
    INITIALIZATION = "initialization"  # Error during plugin initialization
    DEPENDENCY = "dependency"       # Error with plugin dependencies
    EXECUTION = "execution"         # Error during plugin execution
    VALIDATION = "validation"       # Error during parameter validation
    RESOURCE = "resource"           # Error with resource allocation/usage
    SECURITY = "security"           # Security-related error
    PERMISSION = "permission"       # Permission-related error

class IPluginDiscovery(ABC):
    """Interface for plugin discovery."""
    
    @abstractmethod
    async def discover_plugins(self, plugin_dir: str) -> List[Dict[str, Any]]:
        """Discover plugins in the specified directory.
        
        Args:
            plugin_dir: Directory to search for plugins
            
        Returns:
            List of plugin metadata dictionaries
        """
        pass
    
    @abstractmethod
    async def scan_for_new_plugins(self) -> List[str]:
        """Scan for new plugins.
        
        Returns:
            List of new plugin IDs discovered
        """
        pass

class IPluginFactory(ABC):
    """Interface for plugin factory."""
    
    @abstractmethod
    async def create_plugin(self, plugin_type: str, config: Dict[str, Any]) -> BasePlugin:
        """Create a plugin instance.
        
        Args:
            plugin_type: Type of plugin to create
            config: Plugin configuration
            
        Returns:
            Instantiated plugin object
        """
        pass
    
    @abstractmethod
    async def get_plugin_class(self, plugin_id: str) -> Type[BasePlugin]:
        """Get the plugin class by ID.
        
        Args:
            plugin_id: Plugin ID
            
        Returns:
            Plugin class
        """
        pass

class IPluginRegistry(ABC):
    """Interface for plugin registry."""
    
    @abstractmethod
    async def register_plugin(self, plugin_id: str, metadata: PluginMetadata) -> bool:
        """Register a plugin.
        
        Args:
            plugin_id: Plugin ID
            metadata: Plugin metadata
            
        Returns:
            True if registration succeeded, False otherwise
        """
        pass
    
    @abstractmethod
    async def unregister_plugin(self, plugin_id: str) -> bool:
        """Unregister a plugin.
        
        Args:
            plugin_id: Plugin ID
            
        Returns:
            True if unregistration succeeded, False otherwise
        """
        pass
    
    @abstractmethod
    async def get_plugin_metadata(self, plugin_id: str) -> Optional[PluginMetadata]:
        """Get plugin metadata.
        
        Args:
            plugin_id: Plugin ID
            
        Returns:
            Plugin metadata if found, None otherwise
        """
        pass
    
    @abstractmethod
    async def list_plugins(self, filter_criteria: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """List registered plugins.
        
        Args:
            filter_criteria: Optional filter criteria
            
        Returns:
            List of plugin metadata dictionaries
        """
        pass

class IPluginExecutor(ABC):
    """Interface for plugin execution."""
    
    @abstractmethod
    async def execute_plugin(self, plugin_id: str, parameters: Dict[str, Any]) -> PluginResult:
        """Execute a plugin.
        
        Args:
            plugin_id: Plugin ID
            parameters: Execution parameters
            
        Returns:
            Plugin execution result
        """
        pass
    
    @abstractmethod
    async def validate_plugin_parameters(self, plugin_id: str, parameters: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        """Validate plugin parameters.
        
        Args:
            plugin_id: Plugin ID
            parameters: Parameters to validate
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        pass

class IPluginLifecycle(ABC):
    """Interface for plugin lifecycle management."""
    
    @abstractmethod
    async def initialize_plugin(self, plugin_id: str) -> bool:
        """Initialize a plugin.
        
        Args:
            plugin_id: Plugin ID
            
        Returns:
            True if initialization succeeded, False otherwise
        """
        pass
    
    @abstractmethod
    async def enable_plugin(self, plugin_id: str) -> bool:
        """Enable a plugin.
        
        Args:
            plugin_id: Plugin ID
            
        Returns:
            True if enabling succeeded, False otherwise
        """
        pass
    
    @abstractmethod
    async def disable_plugin(self, plugin_id: str) -> bool:
        """Disable a plugin.
        
        Args:
            plugin_id: Plugin ID
            
        Returns:
            True if disabling succeeded, False otherwise
        """
        pass
    
    @abstractmethod
    async def cleanup_plugin(self, plugin_id: str) -> bool:
        """Clean up a plugin's resources.
        
        Args:
            plugin_id: Plugin ID
            
        Returns:
            True if cleanup succeeded, False otherwise
        """
        pass

class IPluginManager(IPluginRegistry, IPluginExecutor, IPluginLifecycle):
    """Comprehensive interface for plugin management.
    
    Combines registry, execution, and lifecycle management interfaces.
    """
    
    @abstractmethod
    async def get_plugin_instance(self, plugin_id: str) -> Optional[BasePlugin]:
        """Get plugin instance.
        
        Args:
            plugin_id: Plugin ID
            
        Returns:
            Plugin instance if found, None otherwise
        """
        pass
    
    @abstractmethod
    async def get_plugin_dependencies(self, plugin_id: str) -> List[str]:
        """Get plugin dependencies.
        
        Args:
            plugin_id: Plugin ID
            
        Returns:
            List of dependency plugin IDs
        """
        pass
    
    @abstractmethod
    async def check_compatibility(self, plugin_id: str, target_plugin_id: str) -> bool:
        """Check if two plugins are compatible.
        
        Args:
            plugin_id: Plugin ID
            target_plugin_id: Target plugin ID
            
        Returns:
            True if compatible, False otherwise
        """
        pass
    
    @abstractmethod
    async def get_plugin_metrics(self, plugin_id: str) -> Dict[str, Any]:
        """Get plugin performance metrics.
        
        Args:
            plugin_id: Plugin ID
            
        Returns:
            Dictionary of metrics
        """
        pass