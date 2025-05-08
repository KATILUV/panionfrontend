"""
Base Plugin Class
Base class for all plugins with standardized lifecycle management.
"""

import logging
from pathlib import Path
from typing import Dict, Any, Optional, List
from datetime import datetime
from dataclasses import dataclass, field

from ..shared_types import IPluginManager
from ..error_types import ErrorContext, PluginError, PluginErrorType
from ..shared_state import shared_state, ComponentState
from ..decorators import with_error_recovery

@dataclass
class PluginMetadata:
    """Metadata for a plugin."""
    name: str
    version: str
    description: str
    author: str
    tags: List[str] = field(default_factory=list)
    dependencies: List[str] = field(default_factory=list)
    score: float = 0.0
    last_updated: datetime = field(default_factory=datetime.now)

class BasePlugin:
    """Base class for all plugins with standardized lifecycle management."""
    
    def __init__(
        self,
        name: str,
        version: str,
        description: str,
        author: str,
        tags: Optional[List[str]] = None,
        dependencies: Optional[List[str]] = None
    ):
        """Initialize the plugin.
        
        Args:
            name: Plugin name
            version: Plugin version
            description: Plugin description
            author: Plugin author
            tags: Optional list of tags
            dependencies: Optional list of dependencies
        """
        self.metadata = PluginMetadata(
            name=name,
            version=version,
            description=description,
            author=author,
            tags=tags or [],
            dependencies=dependencies or []
        )
        
        # Setup logging
        self.logger = logging.getLogger(f"Plugin.{name}")
        self._setup_logging()
        
        # Initialize state
        self._state = {
            "status": "initialized",
            "last_heartbeat": datetime.now(),
            "error_count": 0,
            "retry_count": 0
        }
        
        # Register with shared state
        shared_state.register_plugin(name, self)
    
    def _setup_logging(self) -> None:
        """Setup plugin-specific logging."""
        log_file = Path("logs") / "plugins" / f"{self.metadata.name}.log"
        log_file.parent.mkdir(exist_ok=True)
        
        handler = logging.FileHandler(log_file)
        handler.setFormatter(logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        ))
        self.logger.addHandler(handler)
    
    @with_error_recovery
    async def initialize(self) -> bool:
        """Initialize the plugin.
        
        Returns:
            bool: True if initialization was successful
        """
        try:
            # Validate dependencies
            if not self._validate_dependencies():
                raise RuntimeError("Failed to validate dependencies")
            
            # Initialize plugin-specific resources
            if not await self._initialize_resources():
                raise RuntimeError("Failed to initialize resources")
            
            # Update state
            self._state["status"] = "active"
            self._state["last_heartbeat"] = datetime.now()
            
            self.logger.info(f"Plugin {self.metadata.name} initialized successfully")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to initialize plugin: {str(e)}")
            self._state["status"] = "error"
            return False
    
    def _validate_dependencies(self) -> bool:
        """Validate plugin dependencies.
        
        Returns:
            bool: True if all dependencies are satisfied
        """
        try:
            for dependency in self.metadata.dependencies:
                if not self._check_dependency(dependency):
                    self.logger.error(f"Missing dependency: {dependency}")
                    return False
            return True
        except Exception as e:
            self.logger.error(f"Error validating dependencies: {str(e)}")
            return False
    
    def _check_dependency(self, dependency: str) -> bool:
        """Check if a dependency is available.
        
        Args:
            dependency: Dependency to check
            
        Returns:
            bool: True if dependency is available
        """
        try:
            # Check if dependency is a plugin
            if dependency in shared_state.get_plugins():
                return True
            
            # Check if dependency is a Python package
            import importlib
            try:
                importlib.import_module(dependency)
                return True
            except ImportError:
                return False
                
        except Exception as e:
            self.logger.error(f"Error checking dependency {dependency}: {str(e)}")
            return False
    
    async def _initialize_resources(self) -> bool:
        """Initialize plugin-specific resources.
        
        Returns:
            bool: True if resources were initialized successfully
        """
        return True  # Override in subclasses
    
    @with_error_recovery
    async def cleanup(self) -> bool:
        """Cleanup plugin resources.
        
        Returns:
            bool: True if cleanup was successful
        """
        try:
            # Cleanup plugin-specific resources
            if not await self._cleanup_resources():
                raise RuntimeError("Failed to cleanup resources")
            
            # Update state
            self._state["status"] = "terminated"
            
            # Unregister from shared state
            shared_state.unregister_plugin(self.metadata.name)
            
            self.logger.info(f"Plugin {self.metadata.name} cleaned up successfully")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to cleanup plugin: {str(e)}")
            return False
    
    async def _cleanup_resources(self) -> bool:
        """Cleanup plugin-specific resources.
        
        Returns:
            bool: True if resources were cleaned up successfully
        """
        return True  # Override in subclasses
    
    @with_error_recovery
    async def execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the plugin.
        
        Args:
            input_data: Input data for execution
            
        Returns:
            Dict[str, Any]: Execution result
        """
        try:
            # Update state
            self._state["last_heartbeat"] = datetime.now()
            
            # Execute plugin-specific logic
            result = await self._execute_plugin(input_data)
            
            # Update metrics
            self._update_metrics(result)
            
            return result
            
        except Exception as e:
            self.logger.error(f"Error executing plugin: {str(e)}")
            self._state["error_count"] += 1
            return {"status": "error", "error": str(e)}
    
    async def _execute_plugin(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute plugin-specific logic.
        
        Args:
            input_data: Input data for execution
            
        Returns:
            Dict[str, Any]: Execution result
        """
        raise NotImplementedError("Subclasses must implement _execute_plugin")
    
    def _update_metrics(self, result: Dict[str, Any]) -> None:
        """Update plugin metrics.
        
        Args:
            result: Execution result
        """
        try:
            # Update success rate
            if result.get("status") == "success":
                self.metadata.score = min(1.0, self.metadata.score + 0.1)
            else:
                self.metadata.score = max(0.0, self.metadata.score - 0.1)
            
            # Update last updated timestamp
            self.metadata.last_updated = datetime.now()
            
        except Exception as e:
            self.logger.error(f"Error updating metrics: {str(e)}")
    
    @with_error_recovery
    async def update_heartbeat(self) -> None:
        """Update plugin heartbeat."""
        self._state["last_heartbeat"] = datetime.now()
        
        # Check for errors
        if self._state["error_count"] > 0:
            self._handle_errors()
    
    def _handle_errors(self) -> None:
        """Handle accumulated errors."""
        if self._state["error_count"] >= 3:
            self.logger.warning("Too many errors, attempting recovery")
            self._state["retry_count"] += 1
            
            if self._state["retry_count"] >= 3:
                self.logger.error("Recovery failed, marking plugin as failed")
                self._state["status"] = "failed"
            else:
                self._state["error_count"] = 0
                self._state["status"] = "active"
    
    def get_status(self) -> Dict[str, Any]:
        """Get plugin status.
        
        Returns:
            Dict[str, Any]: Plugin status information
        """
        return {
            "name": self.metadata.name,
            "version": self.metadata.version,
            "status": self._state["status"],
            "last_heartbeat": self._state["last_heartbeat"].isoformat(),
            "error_count": self._state["error_count"],
            "retry_count": self._state["retry_count"],
            "score": self.metadata.score
        } 