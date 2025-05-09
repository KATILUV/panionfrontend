"""
Plugin Base Module
Defines the standardized base class for all Panion plugins.

This module consolidates the functionality from multiple previous plugin base implementations:
- core/base_plugin.py
- core/plugin/base.py
- core/plugins/base_plugin.py

It provides a comprehensive base class with standardized lifecycle management,
error handling, validation, and metadata support.
"""

import logging
from typing import Dict, Any, Optional, List, Set, Tuple, Union
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
import json
from pathlib import Path
import uuid

# Plugin metadata structure
@dataclass
class PluginMetadata:
    """Comprehensive metadata for a plugin."""
    name: str
    version: str
    description: str
    author: str
    tags: List[str] = field(default_factory=list)
    dependencies: List[str] = field(default_factory=list)
    score: float = 0.0
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    capabilities: List[str] = field(default_factory=list)
    compatibility: Dict[str, str] = field(default_factory=dict)
    resource_requirements: Dict[str, float] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Convert metadata to a dictionary format."""
        return {
            "name": self.name,
            "version": self.version,
            "description": self.description,
            "author": self.author,
            "tags": self.tags,
            "dependencies": self.dependencies,
            "score": self.score,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "capabilities": self.capabilities,
            "compatibility": self.compatibility,
            "resource_requirements": self.resource_requirements
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'PluginMetadata':
        """Create a PluginMetadata object from a dictionary."""
        created_at = data.get("created_at")
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        
        updated_at = data.get("updated_at")
        if isinstance(updated_at, str):
            updated_at = datetime.fromisoformat(updated_at)
            
        return cls(
            name=data.get("name", ""),
            version=data.get("version", "0.1.0"),
            description=data.get("description", ""),
            author=data.get("author", ""),
            tags=data.get("tags", []),
            dependencies=data.get("dependencies", []),
            score=data.get("score", 0.0),
            created_at=created_at or datetime.now(),
            updated_at=updated_at or datetime.now(),
            capabilities=data.get("capabilities", []),
            compatibility=data.get("compatibility", {}),
            resource_requirements=data.get("resource_requirements", {})
        )

# Enhanced plugin result model
@dataclass
class PluginResult:
    """Comprehensive result of a plugin execution."""
    success: bool
    data: Dict[str, Any]
    error: Optional[str] = None
    warnings: List[str] = field(default_factory=list)
    metrics: Dict[str, float] = field(default_factory=dict)
    execution_time: float = 0.0
    resource_usage: Dict[str, float] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert result to a dictionary format."""
        return {
            "success": self.success,
            "data": self.data,
            "error": self.error,
            "warnings": self.warnings,
            "metrics": self.metrics,
            "execution_time": self.execution_time,
            "resource_usage": self.resource_usage
        }

class BasePlugin(ABC):
    """Comprehensive base class for all Panion plugins."""
    
    def __init__(
        self,
        name: str = None,
        version: str = "0.1.0",
        description: str = None,
        author: str = "Panion Team",
        tags: Optional[List[str]] = None,
        dependencies: Optional[List[str]] = None,
        config: Optional[Dict[str, Any]] = None
    ):
        """Initialize the plugin.
        
        Args:
            name: Plugin name (defaults to class name if not provided)
            version: Plugin version
            description: Plugin description (defaults to class docstring if not provided)
            author: Plugin author
            tags: Optional list of tags for categorization
            dependencies: Optional list of dependencies (other plugins/components)
            config: Optional configuration dictionary
        """
        # Setup logging
        self.logger = logging.getLogger(self.__class__.__name__)
        
        # Setup basic info
        self.id = str(uuid.uuid4())
        self.name = name or self.__class__.__name__
        self.description = description or self.__class__.__doc__ or f"{self.name} plugin"
        
        # Setup metadata
        self.metadata = PluginMetadata(
            name=self.name,
            version=version,
            description=self.description,
            author=author,
            tags=tags or [],
            dependencies=dependencies or [],
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        # Setup state
        self.status = "initialized"
        self.config = config or {}
        self.last_executed = None
        self.execution_count = 0
        self.error_count = 0
        self.validation_rules = {}
        
        # Performance metrics
        self.performance_metrics = {
            "avg_execution_time": 0.0,
            "success_rate": 1.0,
            "error_rate": 0.0
        }
    
    @abstractmethod
    async def execute(self, parameters: Dict[str, Any]) -> PluginResult:
        """Execute the plugin's main functionality.
        
        This method must be implemented by all plugin subclasses to define their core functionality.
        The implementation should handle the plugin's main logic, including input validation,
        error handling, and result formatting.
        
        Args:
            parameters: Dictionary of parameters for the plugin execution. The specific
                       parameters required will depend on the plugin implementation.
            
        Returns:
            PluginResult containing the execution results.
        """
        raise NotImplementedError("Plugin subclasses must implement execute method")
    
    async def validate(self, parameters: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        """Validate input parameters before execution.
        
        Args:
            parameters: Dictionary of parameters to validate
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        if not self.validation_rules:
            return True, None
            
        for param_name, validation_func in self.validation_rules.items():
            if param_name not in parameters:
                return False, f"Missing required parameter: {param_name}"
                
            param_value = parameters[param_name]
            if not validation_func(param_value):
                return False, f"Invalid value for parameter: {param_name}"
                
        return True, None
    
    async def initialize(self) -> bool:
        """Initialize the plugin (resources, connections, etc.).
        
        Returns:
            True if initialization succeeded, False otherwise
        """
        self.status = "ready"
        return True
    
    async def cleanup(self) -> None:
        """Clean up any resources used by the plugin."""
        self.status = "shutdown"
    
    def update_metadata(self, **kwargs) -> None:
        """Update plugin metadata.
        
        Args:
            **kwargs: Metadata fields to update
        """
        for key, value in kwargs.items():
            if hasattr(self.metadata, key):
                setattr(self.metadata, key, value)
        
        self.metadata.updated_at = datetime.now()
    
    def get_metadata(self) -> Dict[str, Any]:
        """Get plugin metadata as a dictionary.
        
        Returns:
            Dictionary containing plugin metadata
        """
        return self.metadata.to_dict()
    
    def set_validation_rules(self, rules: Dict[str, callable]) -> None:
        """Set validation rules for plugin parameters.
        
        Args:
            rules: Dictionary mapping parameter names to validation functions
        """
        self.validation_rules = rules
    
    def log_execution(self, success: bool, execution_time: float) -> None:
        """Log execution statistics.
        
        Args:
            success: Whether execution was successful
            execution_time: Execution time in seconds
        """
        self.execution_count += 1
        if not success:
            self.error_count += 1
            
        # Update metrics
        self.last_executed = datetime.now()
        
        # Update running averages
        current_avg = self.performance_metrics["avg_execution_time"]
        count = self.execution_count
        self.performance_metrics["avg_execution_time"] = (
            (current_avg * (count - 1) + execution_time) / count
        )
        
        self.performance_metrics["success_rate"] = (
            (self.execution_count - self.error_count) / self.execution_count
        )
        self.performance_metrics["error_rate"] = self.error_count / self.execution_count