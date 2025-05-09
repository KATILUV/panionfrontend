"""
Base Plugin Module

This module provides the foundation for the consolidated plugin system.
It defines the basic plugin classes and types that all plugins must extend.
"""

import inspect
import logging
from typing import Dict, Any, Optional, Tuple, List, Type, ClassVar, Protocol, Set
from abc import ABC, abstractmethod
from dataclasses import dataclass, field, asdict, fields

logger = logging.getLogger(__name__)

@dataclass
class PluginMetadata:
    """Metadata for a plugin."""
    id: str
    name: str
    description: str
    version: str
    author: str
    type: str
    capabilities: List[str] = field(default_factory=list)
    parameters: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    dependencies: List[str] = field(default_factory=list)
    config: Dict[str, Any] = field(default_factory=dict)
    compatibility: Dict[str, Any] = field(default_factory=dict)
    resource_requirements: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert metadata to a dictionary.
        
        Returns:
            Dictionary representation of metadata.
        """
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'PluginMetadata':
        """Create metadata from a dictionary.
        
        Args:
            data: Dictionary representation of metadata.
            
        Returns:
            PluginMetadata instance.
        """
        # Filter out unknown fields
        known_fields = {f.name for f in fields(cls)}
        filtered_data = {k: v for k, v in data.items() if k in known_fields}
        return cls(**filtered_data)

@dataclass
class PluginResult:
    """Result of a plugin execution."""
    success: bool
    message: str = "Operation completed"
    error: Optional[str] = None
    data: Optional[Dict[str, Any]] = None
    metrics: Dict[str, Any] = field(default_factory=dict)
    warnings: List[str] = field(default_factory=list)
    
    @staticmethod
    def success(message: str = "Operation successful", data: Optional[Dict[str, Any]] = None, 
               metrics: Optional[Dict[str, Any]] = None, warnings: Optional[List[str]] = None) -> 'PluginResult':
        """Create a success result.
        
        Args:
            message: Success message.
            data: Result data.
            metrics: Execution metrics.
            warnings: Execution warnings.
            
        Returns:
            PluginResult instance for success.
        """
        return PluginResult(
            success=True,
            message=message,
            data=data or {},
            metrics=metrics or {},
            warnings=warnings or []
        )
    
    @staticmethod
    def failure(message: str = "Operation failed", error: Optional[str] = None,
               data: Optional[Dict[str, Any]] = None, metrics: Optional[Dict[str, Any]] = None,
               warnings: Optional[List[str]] = None) -> 'PluginResult':
        """Create a failure result.
        
        Args:
            message: Failure message.
            error: Error description.
            data: Result data.
            metrics: Execution metrics.
            warnings: Execution warnings.
            
        Returns:
            PluginResult instance for failure.
        """
        return PluginResult(
            success=False,
            message=message,
            error=error or message,
            data=data or {},
            metrics=metrics or {},
            warnings=warnings or []
        )

class BasePlugin(ABC):
    """
    Base class for all plugins in the consolidated system.
    
    All plugins must inherit from this class and implement its abstract methods.
    """
    
    # Class variable to identify plugin subclasses
    _plugin_marker: ClassVar[bool] = True
    
    def __init__(self, metadata: PluginMetadata):
        """Initialize the plugin with metadata.
        
        Args:
            metadata: Plugin metadata.
        """
        self.metadata = metadata
        self._initialized = False
        self._logger = logging.getLogger(f"plugin.{metadata.id}")
    
    @abstractmethod
    async def initialize(self) -> PluginResult:
        """Initialize the plugin.
        
        Returns:
            PluginResult with success status and any initialization information.
        """
        pass
    
    @abstractmethod
    async def execute(self, parameters: Dict[str, Any]) -> PluginResult:
        """Execute the plugin functionality.
        
        Args:
            parameters: Parameters for execution.
            
        Returns:
            Result of execution.
        """
        pass
    
    @abstractmethod
    async def cleanup(self) -> PluginResult:
        """Cleanup resources used by the plugin.
        
        Returns:
            PluginResult with success status and any cleanup information.
        """
        pass
    
    def validate_parameters(self, parameters: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        """Validate plugin parameters.
        
        By default, this checks if all required parameters are present.
        Subclasses can override for more complex validation.
        
        Args:
            parameters: Parameters to validate.
            
        Returns:
            Tuple of (is_valid, error_message).
        """
        # Default implementation: check if all required parameters are present
        for param_name, param_info in self.metadata.parameters.items():
            if param_info.get("required", False) and param_name not in parameters:
                return False, f"Missing required parameter: {param_name}"
        
        return True, None
    
    @property
    def id(self) -> str:
        """Get plugin ID."""
        return self.metadata.id
    
    @property
    def name(self) -> str:
        """Get plugin name."""
        return self.metadata.name
    
    @property
    def description(self) -> str:
        """Get plugin description."""
        return self.metadata.description
    
    @property
    def version(self) -> str:
        """Get plugin version."""
        return self.metadata.version
    
    @property
    def author(self) -> str:
        """Get plugin author."""
        return self.metadata.author
    
    @property
    def type(self) -> str:
        """Get plugin type."""
        return self.metadata.type
    
    @property
    def capabilities(self) -> List[str]:
        """Get plugin capabilities."""
        return self.metadata.capabilities
    
    @property
    def dependencies(self) -> List[str]:
        """Get plugin dependencies."""
        return self.metadata.dependencies
    
    @property
    def initialized(self) -> bool:
        """Check if plugin is initialized."""
        return self._initialized
    
    @staticmethod
    def is_plugin(cls: Type) -> bool:
        """Determine if a class is a plugin.
        
        Args:
            cls: Class to check.
            
        Returns:
            True if the class is a plugin, False otherwise.
        """
        # Check if the class is a subclass of BasePlugin and not BasePlugin itself
        return (
            inspect.isclass(cls) and
            cls is not BasePlugin and
            issubclass(cls, BasePlugin) and
            getattr(cls, "_plugin_marker", False)
        )
    
    def log_debug(self, message: str) -> None:
        """Log a debug message.
        
        Args:
            message: Message to log.
        """
        self._logger.debug(message)
    
    def log_info(self, message: str) -> None:
        """Log an info message.
        
        Args:
            message: Message to log.
        """
        self._logger.info(message)
    
    def log_warning(self, message: str) -> None:
        """Log a warning message.
        
        Args:
            message: Message to log.
        """
        self._logger.warning(message)
    
    def log_error(self, message: str) -> None:
        """Log an error message.
        
        Args:
            message: Message to log.
        """
        self._logger.error(message)
    
    def log_execution(self, parameters: Dict[str, Any], result: PluginResult) -> None:
        """Log plugin execution.
        
        Args:
            parameters: Execution parameters.
            result: Execution result.
        """
        if result.success:
            self.log_info(f"Successfully executed with parameters: {parameters}")
        else:
            self.log_error(f"Failed to execute with parameters: {parameters}, error: {result.error}")
        
        for warning in result.warnings:
            self.log_warning(f"Execution warning: {warning}")
            
    async def get_metrics(self) -> PluginResult:
        """Get plugin metrics.
        
        Returns:
            PluginResult with plugin metrics.
        """
        # Default implementation: no metrics
        return PluginResult.success(
            message="Metrics retrieved successfully",
            data={}
        )