"""
Plugin Manager Module
Comprehensive plugin management system.

This module consolidates functionality from multiple plugin manager implementations:
- core/plugin_manager.py
- core/plugin/manager.py

It provides a complete plugin management system with support for plugin discovery,
registration, lifecycle management, execution, and dependency handling.
"""

import logging
import asyncio
import importlib
import inspect
import json
import os
import sys
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional, Set, Tuple, Type, Union
import traceback
import time

from ..base.plugin_base import BasePlugin, PluginMetadata, PluginResult
from ..interfaces.plugin_interfaces import (
    IPluginManager, 
    PluginType, 
    PluginState, 
    PluginErrorType
)

# Configure logging
logger = logging.getLogger(__name__)

class PluginError(Exception):
    """Exception raised for plugin-related errors."""
    
    def __init__(
        self, 
        message: str, 
        plugin_id: Optional[str] = None,
        error_type: PluginErrorType = PluginErrorType.EXECUTION,
        details: Optional[Dict[str, Any]] = None
    ):
        """Initialize the error.
        
        Args:
            message: Error message
            plugin_id: ID of the plugin that raised the error
            error_type: Type of error
            details: Additional error details
        """
        self.message = message
        self.plugin_id = plugin_id
        self.error_type = error_type
        self.details = details or {}
        self.timestamp = datetime.now()
        
        super().__init__(self.message)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert error to a dictionary."""
        return {
            "message": self.message,
            "plugin_id": self.plugin_id,
            "error_type": self.error_type.value,
            "timestamp": self.timestamp.isoformat(),
            "details": self.details
        }

class PluginManager(IPluginManager):
    """Comprehensive plugin management system."""
    
    def __init__(self, plugin_dir: Optional[str] = None, config_path: Optional[str] = None):
        """Initialize the plugin manager.
        
        Args:
            plugin_dir: Directory containing plugins (optional)
            config_path: Path to configuration file (optional)
        """
        # Set up logging
        self.logger = logging.getLogger(__name__)
        
        # Plugin storage
        self._plugins: Dict[str, BasePlugin] = {}
        self._metadata: Dict[str, PluginMetadata] = {}
        self._states: Dict[str, PluginState] = {}
        self._plugin_types: Dict[str, PluginType] = {}
        self._instances: Dict[str, BasePlugin] = {}
        
        # Plugin dependencies
        self._dependencies: Dict[str, Set[str]] = {}
        self._dependents: Dict[str, Set[str]] = {}
        
        # Plugin metrics
        self._metrics: Dict[str, Dict[str, Any]] = {}
        self._execution_history: Dict[str, List[Dict[str, Any]]] = {}
        
        # Plugin discovery
        self.plugin_dir = plugin_dir
        if self.plugin_dir:
            self.plugin_dir = Path(self.plugin_dir)
            self.plugin_dir.mkdir(parents=True, exist_ok=True)
        
        # Plugin configuration
        self.config_path = config_path
        self.config = self._load_config() if config_path else {}
        
        # Lock for thread safety
        self._lock = asyncio.Lock()
    
    def _load_config(self) -> Dict[str, Any]:
        """Load plugin manager configuration.
        
        Returns:
            Configuration dictionary
        """
        try:
            config_path = Path(self.config_path)
            if not config_path.exists():
                self.logger.warning(f"Config file not found: {config_path}")
                return {}
                
            with open(config_path, 'r') as f:
                if config_path.suffix == '.json':
                    return json.load(f)
                elif config_path.suffix in ['.yaml', '.yml']:
                    import yaml
                    return yaml.safe_load(f)
                else:
                    self.logger.warning(f"Unsupported config format: {config_path.suffix}")
                    return {}
        except Exception as e:
            self.logger.error(f"Error loading config: {e}")
            return {}
    
    async def discover_plugins(self, plugin_dir: Optional[str] = None) -> List[Dict[str, Any]]:
        """Discover plugins in the specified directory.
        
        Args:
            plugin_dir: Directory to search for plugins (uses self.plugin_dir if None)
            
        Returns:
            List of plugin metadata dictionaries
        """
        plugin_dir = plugin_dir or self.plugin_dir
        if not plugin_dir:
            self.logger.warning("No plugin directory specified")
            return []
            
        plugin_dir = Path(plugin_dir)
        if not plugin_dir.exists():
            self.logger.warning(f"Plugin directory not found: {plugin_dir}")
            return []
            
        discovered = []
        
        # Scan Python files
        for py_file in plugin_dir.glob("**/*.py"):
            if py_file.name.startswith('__'):
                continue
                
            try:
                # Get module path relative to plugin_dir
                rel_path = py_file.relative_to(plugin_dir)
                module_path = '.'.join(rel_path.with_suffix('').parts)
                
                # Import module
                spec = importlib.util.spec_from_file_location(module_path, py_file)
                if not spec or not spec.loader:
                    continue
                    
                module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(module)
                
                # Find plugin classes
                for name, obj in inspect.getmembers(module):
                    if (inspect.isclass(obj) and 
                        issubclass(obj, BasePlugin) and 
                        obj != BasePlugin):
                        
                        # Create plugin instance
                        try:
                            plugin = obj()
                            metadata = plugin.get_metadata()
                            discovered.append({
                                "id": str(uuid.uuid4()),
                                "class_name": obj.__name__,
                                "module_path": module_path,
                                "file_path": str(py_file),
                                "metadata": metadata
                            })
                        except Exception as e:
                            self.logger.warning(f"Error instantiating plugin {name}: {e}")
                
            except Exception as e:
                self.logger.warning(f"Error processing plugin file {py_file}: {e}")
        
        return discovered
    
    async def scan_for_new_plugins(self) -> List[str]:
        """Scan for new plugins.
        
        Returns:
            List of new plugin IDs discovered
        """
        if not self.plugin_dir:
            return []
            
        discovered = await self.discover_plugins()
        new_plugins = []
        
        async with self._lock:
            for plugin_info in discovered:
                plugin_id = plugin_info["id"]
                if plugin_id not in self._metadata:
                    try:
                        # Register plugin
                        metadata = PluginMetadata.from_dict(plugin_info["metadata"])
                        await self.register_plugin(plugin_id, metadata, plugin_info)
                        new_plugins.append(plugin_id)
                    except Exception as e:
                        self.logger.warning(f"Error registering plugin {plugin_id}: {e}")
        
        return new_plugins
    
    async def register_plugin(self, plugin_id: str, metadata: PluginMetadata, 
                               plugin_info: Optional[Dict[str, Any]] = None) -> bool:
        """Register a plugin.
        
        Args:
            plugin_id: Plugin ID
            metadata: Plugin metadata
            plugin_info: Additional plugin information (optional)
            
        Returns:
            True if registration succeeded, False otherwise
        """
        async with self._lock:
            if plugin_id in self._metadata:
                self.logger.warning(f"Plugin already registered: {plugin_id}")
                return False
                
            try:
                # Store metadata
                self._metadata[plugin_id] = metadata
                self._states[plugin_id] = PluginState.UNINITIALIZED
                self._dependencies[plugin_id] = set()
                self._dependents[plugin_id] = set()
                self._metrics[plugin_id] = {
                    "execution_count": 0,
                    "error_count": 0,
                    "avg_execution_time": 0.0,
                    "last_executed": None
                }
                self._execution_history[plugin_id] = []
                
                # Store plugin type if available
                if plugin_info and "plugin_type" in plugin_info:
                    plugin_type = plugin_info["plugin_type"]
                    if isinstance(plugin_type, str):
                        try:
                            self._plugin_types[plugin_id] = PluginType(plugin_type)
                        except ValueError:
                            self._plugin_types[plugin_id] = PluginType.STANDARD
                    elif isinstance(plugin_type, PluginType):
                        self._plugin_types[plugin_id] = plugin_type
                else:
                    self._plugin_types[plugin_id] = PluginType.STANDARD
                
                # Register dependencies
                for dep in metadata.dependencies:
                    self._dependencies[plugin_id].add(dep)
                    if dep in self._dependents:
                        self._dependents[dep].add(plugin_id)
                
                self.logger.info(f"Registered plugin: {plugin_id} ({metadata.name})")
                return True
                
            except Exception as e:
                self.logger.error(f"Error registering plugin {plugin_id}: {e}")
                return False
    
    async def unregister_plugin(self, plugin_id: str) -> bool:
        """Unregister a plugin.
        
        Args:
            plugin_id: Plugin ID
            
        Returns:
            True if unregistration succeeded, False otherwise
        """
        async with self._lock:
            if plugin_id not in self._metadata:
                self.logger.warning(f"Plugin not registered: {plugin_id}")
                return False
                
            try:
                # Check for dependents
                if plugin_id in self._dependents and self._dependents[plugin_id]:
                    dependent_plugins = self._dependents[plugin_id]
                    self.logger.warning(
                        f"Cannot unregister plugin {plugin_id}: "
                        f"It has dependent plugins: {dependent_plugins}"
                    )
                    return False
                
                # Clean up if initialized
                if (plugin_id in self._states and 
                    self._states[plugin_id] != PluginState.UNINITIALIZED):
                    await self.cleanup_plugin(plugin_id)
                
                # Remove from instance storage
                if plugin_id in self._instances:
                    del self._instances[plugin_id]
                
                # Remove from dependency tracking
                for dep in self._dependencies.get(plugin_id, set()):
                    if dep in self._dependents:
                        self._dependents[dep].discard(plugin_id)
                
                # Remove metadata
                del self._metadata[plugin_id]
                if plugin_id in self._states:
                    del self._states[plugin_id]
                if plugin_id in self._dependencies:
                    del self._dependencies[plugin_id]
                if plugin_id in self._dependents:
                    del self._dependents[plugin_id]
                if plugin_id in self._metrics:
                    del self._metrics[plugin_id]
                if plugin_id in self._execution_history:
                    del self._execution_history[plugin_id]
                if plugin_id in self._plugin_types:
                    del self._plugin_types[plugin_id]
                
                self.logger.info(f"Unregistered plugin: {plugin_id}")
                return True
                
            except Exception as e:
                self.logger.error(f"Error unregistering plugin {plugin_id}: {e}")
                return False
    
    async def get_plugin_metadata(self, plugin_id: str) -> Optional[PluginMetadata]:
        """Get plugin metadata.
        
        Args:
            plugin_id: Plugin ID
            
        Returns:
            Plugin metadata if found, None otherwise
        """
        return self._metadata.get(plugin_id)
    
    async def list_plugins(self, filter_criteria: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """List registered plugins.
        
        Args:
            filter_criteria: Optional filter criteria
            
        Returns:
            List of plugin metadata dictionaries
        """
        results = []
        
        for plugin_id, metadata in self._metadata.items():
            # Skip if doesn't match filter criteria
            if filter_criteria:
                # Check metadata fields
                metadata_dict = metadata.to_dict()
                if not all(metadata_dict.get(k) == v for k, v in filter_criteria.items() 
                          if k in metadata_dict):
                    continue
                
                # Check plugin state if specified
                if "state" in filter_criteria and plugin_id in self._states:
                    if self._states[plugin_id].value != filter_criteria["state"]:
                        continue
            
            # Build result
            plugin_info = {
                "id": plugin_id,
                "metadata": metadata.to_dict(),
                "state": self._states.get(plugin_id, PluginState.UNINITIALIZED).value,
                "plugin_type": self._plugin_types.get(plugin_id, PluginType.STANDARD).value,
                "metrics": self._metrics.get(plugin_id, {}),
                "dependencies": list(self._dependencies.get(plugin_id, set())),
                "dependents": list(self._dependents.get(plugin_id, set()))
            }
            
            results.append(plugin_info)
        
        return results
    
    async def execute_plugin(self, plugin_id: str, parameters: Dict[str, Any]) -> PluginResult:
        """Execute a plugin.
        
        Args:
            plugin_id: Plugin ID
            parameters: Execution parameters
            
        Returns:
            Plugin execution result
        """
        if plugin_id not in self._metadata:
            raise PluginError(
                f"Plugin not found: {plugin_id}",
                plugin_id=plugin_id,
                error_type=PluginErrorType.EXECUTION
            )
        
        # Check plugin state
        if plugin_id not in self._states or self._states[plugin_id] != PluginState.ACTIVE:
            # Try to initialize if uninitialized
            if (plugin_id in self._states and 
                self._states[plugin_id] == PluginState.UNINITIALIZED):
                success = await self.initialize_plugin(plugin_id)
                if not success:
                    raise PluginError(
                        f"Failed to initialize plugin: {plugin_id}",
                        plugin_id=plugin_id,
                        error_type=PluginErrorType.INITIALIZATION
                    )
            else:
                raise PluginError(
                    f"Plugin not in active state: {plugin_id}",
                    plugin_id=plugin_id,
                    error_type=PluginErrorType.EXECUTION,
                    details={"state": self._states.get(plugin_id, PluginState.UNINITIALIZED).value}
                )
        
        # Get plugin instance
        plugin = await self.get_plugin_instance(plugin_id)
        if not plugin:
            raise PluginError(
                f"Failed to get plugin instance: {plugin_id}",
                plugin_id=plugin_id,
                error_type=PluginErrorType.EXECUTION
            )
        
        # Validate parameters
        is_valid, error_message = await plugin.validate(parameters)
        if not is_valid:
            raise PluginError(
                f"Invalid parameters: {error_message}",
                plugin_id=plugin_id,
                error_type=PluginErrorType.VALIDATION,
                details={"parameters": parameters}
            )
        
        # Execute plugin
        try:
            start_time = time.time()
            result = await plugin.execute(parameters)
            execution_time = time.time() - start_time
            
            # Update metrics
            self._metrics[plugin_id]["execution_count"] += 1
            self._metrics[plugin_id]["last_executed"] = datetime.now().isoformat()
            
            current_avg = self._metrics[plugin_id]["avg_execution_time"]
            count = self._metrics[plugin_id]["execution_count"]
            self._metrics[plugin_id]["avg_execution_time"] = (
                (current_avg * (count - 1) + execution_time) / count
            )
            
            # Update execution history
            self._execution_history[plugin_id].append({
                "timestamp": datetime.now().isoformat(),
                "parameters": parameters,
                "success": result.success,
                "execution_time": execution_time,
                "error": result.error
            })
            
            # Truncate history if too long
            if len(self._execution_history[plugin_id]) > 100:
                self._execution_history[plugin_id] = self._execution_history[plugin_id][-100:]
            
            # Update plugin metrics
            if not result.success:
                self._metrics[plugin_id]["error_count"] += 1
            
            plugin.log_execution(result.success, execution_time)
            
            return result
            
        except Exception as e:
            # Update metrics
            self._metrics[plugin_id]["execution_count"] += 1
            self._metrics[plugin_id]["error_count"] += 1
            self._metrics[plugin_id]["last_executed"] = datetime.now().isoformat()
            
            # Update execution history
            self._execution_history[plugin_id].append({
                "timestamp": datetime.now().isoformat(),
                "parameters": parameters,
                "success": False,
                "execution_time": time.time() - start_time,
                "error": str(e)
            })
            
            # Log error
            self.logger.error(f"Error executing plugin {plugin_id}: {e}")
            traceback.print_exc()
            
            # Create and return error result
            return PluginResult(
                success=False,
                data={},
                error=str(e),
                warnings=["An exception occurred during execution"],
                metrics={"execution_time": time.time() - start_time},
                execution_time=time.time() - start_time
            )
    
    async def validate_plugin_parameters(self, plugin_id: str, parameters: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        """Validate plugin parameters.
        
        Args:
            plugin_id: Plugin ID
            parameters: Parameters to validate
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        plugin = await self.get_plugin_instance(plugin_id)
        if not plugin:
            return False, f"Plugin not found: {plugin_id}"
            
        return await plugin.validate(parameters)
    
    async def initialize_plugin(self, plugin_id: str) -> bool:
        """Initialize a plugin.
        
        Args:
            plugin_id: Plugin ID
            
        Returns:
            True if initialization succeeded, False otherwise
        """
        if plugin_id not in self._metadata:
            self.logger.warning(f"Plugin not registered: {plugin_id}")
            return False
        
        # Check if already initialized
        if (plugin_id in self._states and 
            self._states[plugin_id] != PluginState.UNINITIALIZED):
            self.logger.info(f"Plugin already initialized: {plugin_id}")
            return True
        
        # Get plugin instance
        try:
            plugin = await self.get_plugin_instance(plugin_id)
            if not plugin:
                self.logger.error(f"Failed to get plugin instance: {plugin_id}")
                return False
            
            # Initialize plugin
            success = await plugin.initialize()
            if success:
                self._states[plugin_id] = PluginState.ACTIVE
                self.logger.info(f"Initialized plugin: {plugin_id}")
            else:
                self._states[plugin_id] = PluginState.ERROR
                self.logger.warning(f"Plugin initialization failed: {plugin_id}")
            
            return success
            
        except Exception as e:
            self._states[plugin_id] = PluginState.ERROR
            self.logger.error(f"Error initializing plugin {plugin_id}: {e}")
            return False
    
    async def enable_plugin(self, plugin_id: str) -> bool:
        """Enable a plugin.
        
        Args:
            plugin_id: Plugin ID
            
        Returns:
            True if enabling succeeded, False otherwise
        """
        if plugin_id not in self._metadata:
            self.logger.warning(f"Plugin not registered: {plugin_id}")
            return False
        
        # Check if already active
        if plugin_id in self._states and self._states[plugin_id] == PluginState.ACTIVE:
            self.logger.info(f"Plugin already active: {plugin_id}")
            return True
        
        # Initialize if necessary
        if (plugin_id in self._states and 
            self._states[plugin_id] == PluginState.UNINITIALIZED):
            success = await self.initialize_plugin(plugin_id)
            if not success:
                return False
        
        # Enable plugin
        self._states[plugin_id] = PluginState.ACTIVE
        self.logger.info(f"Enabled plugin: {plugin_id}")
        return True
    
    async def disable_plugin(self, plugin_id: str) -> bool:
        """Disable a plugin.
        
        Args:
            plugin_id: Plugin ID
            
        Returns:
            True if disabling succeeded, False otherwise
        """
        if plugin_id not in self._metadata:
            self.logger.warning(f"Plugin not registered: {plugin_id}")
            return False
        
        # Check if already disabled
        if plugin_id in self._states and self._states[plugin_id] == PluginState.DISABLED:
            self.logger.info(f"Plugin already disabled: {plugin_id}")
            return True
        
        # Check for dependents
        if plugin_id in self._dependents and self._dependents[plugin_id]:
            active_dependents = []
            for dep in self._dependents[plugin_id]:
                if dep in self._states and self._states[dep] == PluginState.ACTIVE:
                    active_dependents.append(dep)
            
            if active_dependents:
                self.logger.warning(
                    f"Cannot disable plugin {plugin_id}: "
                    f"It has active dependent plugins: {active_dependents}"
                )
                return False
        
        # Disable plugin
        self._states[plugin_id] = PluginState.DISABLED
        self.logger.info(f"Disabled plugin: {plugin_id}")
        return True
    
    async def cleanup_plugin(self, plugin_id: str) -> bool:
        """Clean up a plugin's resources.
        
        Args:
            plugin_id: Plugin ID
            
        Returns:
            True if cleanup succeeded, False otherwise
        """
        if plugin_id not in self._metadata:
            self.logger.warning(f"Plugin not registered: {plugin_id}")
            return False
        
        # Get plugin instance
        plugin = await self.get_plugin_instance(plugin_id)
        if not plugin:
            # No instance to clean up
            return True
        
        try:
            # Call cleanup method
            await plugin.cleanup()
            
            # Update state
            if plugin_id in self._states:
                self._states[plugin_id] = PluginState.UNINITIALIZED
            
            # Remove from instances
            if plugin_id in self._instances:
                del self._instances[plugin_id]
            
            self.logger.info(f"Cleaned up plugin: {plugin_id}")
            return True
            
        except Exception as e:
            self.logger.error(f"Error cleaning up plugin {plugin_id}: {e}")
            return False
    
    async def get_plugin_instance(self, plugin_id: str) -> Optional[BasePlugin]:
        """Get plugin instance.
        
        Args:
            plugin_id: Plugin ID
            
        Returns:
            Plugin instance if found, None otherwise
        """
        # Return cached instance if available
        if plugin_id in self._instances:
            return self._instances[plugin_id]
        
        # Check if registered
        if plugin_id not in self._metadata:
            self.logger.warning(f"Plugin not registered: {plugin_id}")
            return None
        
        # Create new instance
        try:
            # Get plugin class
            plugin_class = await self.get_plugin_class(plugin_id)
            if not plugin_class:
                self.logger.error(f"Failed to get plugin class: {plugin_id}")
                return None
            
            # Instantiate plugin
            plugin = plugin_class()
            
            # Cache instance
            self._instances[plugin_id] = plugin
            
            return plugin
            
        except Exception as e:
            self.logger.error(f"Error getting plugin instance {plugin_id}: {e}")
            return None
    
    async def get_plugin_class(self, plugin_id: str) -> Optional[Type[BasePlugin]]:
        """Get plugin class.
        
        Args:
            plugin_id: Plugin ID
            
        Returns:
            Plugin class if found, None otherwise
        """
        # Implementation would depend on how plugin classes are stored
        # This is a placeholder that would need to be adapted to the actual implementation
        return None
    
    async def get_plugin_dependencies(self, plugin_id: str) -> List[str]:
        """Get plugin dependencies.
        
        Args:
            plugin_id: Plugin ID
            
        Returns:
            List of dependency plugin IDs
        """
        return list(self._dependencies.get(plugin_id, set()))
    
    async def check_compatibility(self, plugin_id: str, target_plugin_id: str) -> bool:
        """Check if two plugins are compatible.
        
        Args:
            plugin_id: Plugin ID
            target_plugin_id: Target plugin ID
            
        Returns:
            True if compatible, False otherwise
        """
        # Check if both plugins are registered
        if plugin_id not in self._metadata or target_plugin_id not in self._metadata:
            return False
        
        # Get compatibility information
        metadata = self._metadata[plugin_id]
        compatibility = metadata.compatibility
        
        # Check compatibility
        if not compatibility:
            # No compatibility constraints
            return True
        
        target_metadata = self._metadata[target_plugin_id]
        
        # Check if target plugin is listed in compatibility
        if target_metadata.name in compatibility:
            version_constraint = compatibility[target_metadata.name]
            # Simple version check for now
            return target_metadata.version == version_constraint
        
        # Not explicitly listed
        return True
    
    async def get_plugin_metrics(self, plugin_id: str) -> Dict[str, Any]:
        """Get plugin performance metrics.
        
        Args:
            plugin_id: Plugin ID
            
        Returns:
            Dictionary of metrics
        """
        if plugin_id not in self._metrics:
            return {}
        
        metrics = self._metrics[plugin_id].copy()
        
        # Add recent execution history (last 5 executions)
        if plugin_id in self._execution_history:
            metrics["recent_executions"] = self._execution_history[plugin_id][-5:]
        
        return metrics