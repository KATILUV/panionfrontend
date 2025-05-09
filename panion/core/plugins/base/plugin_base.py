"""
Consolidated Plugin Base Module

This module provides a unified base class for all plugins in the system.
It consolidates functionality from various existing plugin base classes:
- core/base_plugin.py
- core/plugin/base.py

This is the foundation of the consolidated plugin system.
"""

import logging
import inspect
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List, TypedDict, Union, Type, TypeGuard, Callable
from dataclasses import dataclass, field
from datetime import datetime
from uuid import uuid4

logger = logging.getLogger(__name__)

# Type definitions for plugin system
class PluginMetadata(TypedDict, total=False):
    """Plugin metadata type definition."""
    id: str
    name: str
    description: str
    version: str
    author: str
    license: str
    type: str
    capabilities: List[str]
    parameters: Dict[str, Any]
    dependencies: List[str]
    config: Dict[str, Any]
    
@dataclass
class PluginResult:
    """Result of plugin execution."""
    success: bool = False
    data: Dict[str, Any] = field(default_factory=dict)
    error: Optional[str] = None
    execution_time: float = 0.0
    metadata: Dict[str, Any] = field(default_factory=dict)

class BasePlugin(ABC):
    """
    Unified base plugin class for all plugins in the system.
    
    This class consolidates functionality from various existing plugin base classes
    and provides a standardized interface for all plugins.
    """
    
    def __init__(self, metadata: Optional[PluginMetadata] = None):
        """Initialize the plugin with optional metadata.
        
        Args:
            metadata: Optional plugin metadata.
        """
        self._id = metadata["id"] if metadata and "id" in metadata else str(uuid4())
        self._name = metadata["name"] if metadata and "name" in metadata else self._id
        self._description = metadata["description"] if metadata and "description" in metadata else ""
        self._version = metadata["version"] if metadata and "version" in metadata else "1.0.0"
        self._author = metadata["author"] if metadata and "author" in metadata else "Unknown"
        self._license = metadata["license"] if metadata and "license" in metadata else ""
        self._type = metadata["type"] if metadata and "type" in metadata else "standard"
        self._capabilities = metadata["capabilities"] if metadata and "capabilities" in metadata else []
        self._parameters = metadata["parameters"] if metadata and "parameters" in metadata else {}
        self._dependencies = metadata["dependencies"] if metadata and "dependencies" in metadata else []
        self._config = metadata["config"] if metadata and "config" in metadata else {}
        
        # Internal state
        self._initialized = False
        self._last_execution_time = None
        self._execution_count = 0
        self._errors = []
        
        logger.debug(f"Plugin {self._id} of type {self._type} initialized")
        
    @property
    def id(self) -> str:
        """Get the plugin ID."""
        return self._id
        
    @property
    def name(self) -> str:
        """Get the plugin name."""
        return self._name
        
    @property
    def description(self) -> str:
        """Get the plugin description."""
        return self._description
        
    @property
    def version(self) -> str:
        """Get the plugin version."""
        return self._version
        
    @property
    def author(self) -> str:
        """Get the plugin author."""
        return self._author
        
    @property
    def license(self) -> str:
        """Get the plugin license."""
        return self._license
        
    @property
    def type(self) -> str:
        """Get the plugin type."""
        return self._type
        
    @property
    def capabilities(self) -> List[str]:
        """Get the plugin capabilities."""
        return self._capabilities
        
    @property
    def parameters(self) -> Dict[str, Any]:
        """Get the plugin parameters."""
        return self._parameters
        
    @property
    def dependencies(self) -> List[str]:
        """Get the plugin dependencies."""
        return self._dependencies
        
    @property
    def config(self) -> Dict[str, Any]:
        """Get the plugin configuration."""
        return self._config
        
    @property
    def initialized(self) -> bool:
        """Check if the plugin is initialized."""
        return self._initialized
        
    @property
    def last_execution_time(self) -> Optional[datetime]:
        """Get the last execution time."""
        return self._last_execution_time
        
    @property
    def execution_count(self) -> int:
        """Get the execution count."""
        return self._execution_count
        
    @property
    def errors(self) -> List[Dict[str, Any]]:
        """Get the errors encountered during execution."""
        return self._errors
        
    def get_metadata(self) -> PluginMetadata:
        """Get the plugin metadata.
        
        Returns:
            Plugin metadata dictionary.
        """
        return {
            "id": self._id,
            "name": self._name,
            "description": self._description,
            "version": self._version,
            "author": self._author,
            "license": self._license,
            "type": self._type,
            "capabilities": self._capabilities,
            "parameters": self._parameters,
            "dependencies": self._dependencies,
            "config": self._config
        }
        
    async def initialize(self) -> bool:
        """Initialize the plugin.
        
        This method should be overridden by plugin implementations
        that require initialization.
        
        Returns:
            True if initialization succeeded, False otherwise.
        """
        self._initialized = True
        return True
        
    async def cleanup(self) -> bool:
        """Clean up plugin resources.
        
        This method should be overridden by plugin implementations
        that need to clean up resources.
        
        Returns:
            True if cleanup succeeded, False otherwise.
        """
        return True
        
    def validate_parameters(self, parameters: Dict[str, Any]) -> tuple[bool, Optional[str]]:
        """Validate the input parameters.
        
        This method should be overridden by plugin implementations
        that need to validate input parameters.
        
        Args:
            parameters: Parameters to validate.
            
        Returns:
            Tuple of (is_valid, error_message).
        """
        # Default implementation always validates
        return True, None
        
    @abstractmethod
    async def execute(self, parameters: Dict[str, Any]) -> PluginResult:
        """Execute the plugin's main functionality.
        
        This method must be implemented by all plugin subclasses.
        
        Args:
            parameters: Execution parameters.
            
        Returns:
            Plugin execution result.
        """
        raise NotImplementedError("Plugin subclasses must implement execute method")
        
    def is_capable_of(self, capability: str) -> bool:
        """Check if the plugin has a specific capability.
        
        Args:
            capability: Capability to check.
            
        Returns:
            True if the plugin has the capability, False otherwise.
        """
        return capability in self._capabilities
        
    def add_capability(self, capability: str) -> None:
        """Add a capability to the plugin.
        
        Args:
            capability: Capability to add.
        """
        if capability not in self._capabilities:
            self._capabilities.append(capability)
            
    def remove_capability(self, capability: str) -> None:
        """Remove a capability from the plugin.
        
        Args:
            capability: Capability to remove.
        """
        if capability in self._capabilities:
            self._capabilities.remove(capability)
            
    def log_error(self, error: str, context: Optional[Dict[str, Any]] = None) -> None:
        """Log an error encountered during plugin execution.
        
        Args:
            error: Error message.
            context: Optional error context.
        """
        error_entry = {
            "timestamp": datetime.now(),
            "message": error,
            "context": context or {}
        }
        self._errors.append(error_entry)
        logger.error(f"Plugin {self._id} error: {error}")
        
    @staticmethod
    def is_plugin(obj: object) -> TypeGuard[Callable]:
        """Check if an object is a plugin.
        
        Args:
            obj: Object to check.
            
        Returns:
            True if the object is a plugin, False otherwise.
        """
        return (inspect.isclass(obj) and 
                issubclass(obj, BasePlugin) and 
                obj != BasePlugin)