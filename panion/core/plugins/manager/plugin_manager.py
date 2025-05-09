"""
Consolidated Plugin Manager Module

This module provides a unified manager for all plugins in the system.
It consolidates functionality from various existing plugin managers:
- core/plugin_manager.py
- core/plugin/manager.py

This is the central orchestrator of the consolidated plugin system.
"""

import os
import logging
import inspect
import importlib
import time
from typing import Dict, Any, Optional, List, Type, Tuple, Set, Union
from pathlib import Path
from asyncio import Lock

from ..base.plugin_base import BasePlugin, PluginMetadata, PluginResult

logger = logging.getLogger(__name__)

class PluginManager:
    """
    Unified plugin manager for the consolidated plugin system.
    
    This class serves as the central point for plugin management, including:
    - Registration and discovery
    - Lifecycle management
    - Execution
    - Dependency resolution
    
    It implements the singleton pattern to ensure a single system-wide instance.
    """
    
    # Singleton instance
    _instance = None
    _initialized = False
    
    @classmethod
    def get_instance(cls) -> 'PluginManager':
        """Get the singleton instance of the plugin manager.
        
        Returns:
            The PluginManager singleton instance.
        """
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    def __init__(self):
        """Initialize the plugin manager."""
        # Only initialize once (singleton pattern)
        if PluginManager._initialized:
            return
        
        # Plugin registry
        self._plugins: Dict[str, BasePlugin] = {}
        self._plugin_classes: Dict[str, Type[BasePlugin]] = {}
        self._metadata: Dict[str, PluginMetadata] = {}
        
        # Plugin discovery paths
        self._plugin_dirs: List[str] = []
        
        # Plugin dependencies
        self._dependencies: Dict[str, Set[str]] = {}
        self._dependents: Dict[str, Set[str]] = {}
        
        # Plugin metrics
        self._execution_times: Dict[str, List[float]] = {}
        self._execution_counts: Dict[str, int] = {}
        self._error_counts: Dict[str, int] = {}
        
        # Concurrency control
        self._execution_lock = Lock()
        
        # Set as initialized
        PluginManager._initialized = True
        
        logger.info("Plugin manager initialized")
    
    async def register_plugin_dir(self, plugin_dir: str) -> List[str]:
        """Register a directory for plugin discovery.
        
        Args:
            plugin_dir: Directory containing plugins.
            
        Returns:
            List of discovered plugin IDs.
        """
        plugin_dir_path = Path(plugin_dir)
        if not plugin_dir_path.exists():
            logger.warning(f"Plugin directory {plugin_dir} does not exist")
            return []
            
        if str(plugin_dir_path) not in self._plugin_dirs:
            self._plugin_dirs.append(str(plugin_dir_path))
            
        # Scan for plugins
        plugin_files = list(plugin_dir_path.glob("*.py"))
        plugin_ids = []
        
        for plugin_file in plugin_files:
            try:
                # Import module
                module_name = plugin_file.stem
                spec = importlib.util.spec_from_file_location(
                    module_name, str(plugin_file)
                )
                module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(module)
                
                # Find plugin classes
                for _, obj in inspect.getmembers(module):
                    if BasePlugin.is_plugin(obj):
                        # Create instance and register
                        plugin_id = f"{module_name}.{obj.__name__}"
                        self._plugin_classes[plugin_id] = obj
                        plugin_ids.append(plugin_id)
                        logger.info(f"Discovered plugin {plugin_id}")
            except Exception as e:
                logger.error(f"Error discovering plugin {plugin_file}: {e}")
                
        return plugin_ids
    
    async def scan_for_new_plugins(self) -> List[str]:
        """Scan registered directories for new plugins.
        
        Returns:
            List of newly discovered plugin IDs.
        """
        new_plugin_ids = []
        for plugin_dir in self._plugin_dirs:
            plugin_ids = await self.register_plugin_dir(plugin_dir)
            for plugin_id in plugin_ids:
                if plugin_id not in self._plugins and plugin_id not in self._metadata:
                    new_plugin_ids.append(plugin_id)
        return new_plugin_ids
    
    async def register_plugin(self, plugin_id: str, metadata: Union[PluginMetadata, Dict[str, Any]]) -> bool:
        """Register a plugin with the manager.
        
        Args:
            plugin_id: Unique plugin identifier.
            metadata: Plugin metadata.
            
        Returns:
            True if registration succeeded, False otherwise.
        """
        try:
            # Check if already registered
            if plugin_id in self._metadata:
                logger.warning(f"Plugin {plugin_id} already registered")
                return False
                
            # Store metadata
            self._metadata[plugin_id] = metadata
            
            # Update dependency tracking
            dependencies = metadata.get("dependencies", [])
            self._dependencies[plugin_id] = set(dependencies)
            
            # Update dependents tracking
            for dep in dependencies:
                if dep not in self._dependents:
                    self._dependents[dep] = set()
                self._dependents[dep].add(plugin_id)
                
            logger.info(f"Registered plugin {plugin_id}")
            return True
        except Exception as e:
            logger.error(f"Error registering plugin {plugin_id}: {e}")
            return False
    
    async def unregister_plugin(self, plugin_id: str) -> bool:
        """Unregister a plugin from the manager.
        
        Args:
            plugin_id: Plugin ID to unregister.
            
        Returns:
            True if unregistration succeeded, False otherwise.
        """
        try:
            # Check if registered
            if plugin_id not in self._metadata:
                logger.warning(f"Plugin {plugin_id} not registered")
                return False
                
            # Clean up instance if exists
            if plugin_id in self._plugins:
                await self._plugins[plugin_id].cleanup()
                del self._plugins[plugin_id]
                
            # Clean up class if exists
            if plugin_id in self._plugin_classes:
                del self._plugin_classes[plugin_id]
                
            # Clean up dependency tracking
            if plugin_id in self._dependencies:
                del self._dependencies[plugin_id]
                
            # Clean up dependents tracking
            for dep_set in self._dependents.values():
                if plugin_id in dep_set:
                    dep_set.remove(plugin_id)
                    
            # Clean up metadata
            del self._metadata[plugin_id]
            
            logger.info(f"Unregistered plugin {plugin_id}")
            return True
        except Exception as e:
            logger.error(f"Error unregistering plugin {plugin_id}: {e}")
            return False
    
    async def get_plugin_metadata(self, plugin_id: str) -> Optional[PluginMetadata]:
        """Get plugin metadata.
        
        Args:
            plugin_id: Plugin ID.
            
        Returns:
            Plugin metadata if found, None otherwise.
        """
        return self._metadata.get(plugin_id)
    
    async def get_plugin_instance(self, plugin_id: str) -> Optional[BasePlugin]:
        """Get or create a plugin instance.
        
        Args:
            plugin_id: Plugin ID.
            
        Returns:
            Plugin instance if available, None otherwise.
        """
        try:
            # Check if instance already exists
            if plugin_id in self._plugins:
                return self._plugins[plugin_id]
                
            # Check if class is available
            if plugin_id in self._plugin_classes:
                # Create new instance
                plugin_class = self._plugin_classes[plugin_id]
                metadata = self._metadata.get(plugin_id, {})
                plugin_instance = plugin_class(metadata)
                
                # Initialize plugin
                await plugin_instance.initialize()
                
                # Store instance
                self._plugins[plugin_id] = plugin_instance
                
                return plugin_instance
                
            logger.warning(f"No plugin class found for {plugin_id}")
            return None
        except Exception as e:
            logger.error(f"Error creating plugin instance {plugin_id}: {e}")
            return None
    
    async def execute_plugin(self, plugin_id: str, parameters: Dict[str, Any]) -> PluginResult:
        """Execute a plugin with the given parameters.
        
        Args:
            plugin_id: Plugin ID.
            parameters: Execution parameters.
            
        Returns:
            Plugin execution result.
        """
        try:
            # Get plugin instance
            plugin = await self.get_plugin_instance(plugin_id)
            if not plugin:
                return PluginResult(
                    success=False,
                    error=f"Plugin {plugin_id} not found or could not be instantiated",
                )
                
            # Validate parameters
            is_valid, error_msg = plugin.validate_parameters(parameters)
            if not is_valid:
                return PluginResult(
                    success=False,
                    error=f"Invalid parameters: {error_msg}",
                )
                
            # Execute plugin
            async with self._execution_lock:
                # Track execution start time
                start_time = time.time()
                
                # Execute
                result = await plugin.execute(parameters)
                
                # Track execution time
                execution_time = time.time() - start_time
                if plugin_id not in self._execution_times:
                    self._execution_times[plugin_id] = []
                self._execution_times[plugin_id].append(execution_time)
                
                # Track execution count
                if plugin_id not in self._execution_counts:
                    self._execution_counts[plugin_id] = 0
                self._execution_counts[plugin_id] += 1
                
                # Track errors
                if not result.success and plugin_id not in self._error_counts:
                    self._error_counts[plugin_id] = 0
                if not result.success:
                    self._error_counts[plugin_id] += 1
                    
                return result
        except Exception as e:
            logger.error(f"Error executing plugin {plugin_id}: {e}")
            return PluginResult(
                success=False,
                error=f"Error executing plugin: {str(e)}",
            )
    
    async def validate_plugin_parameters(self, plugin_id: str, parameters: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        """Validate plugin parameters.
        
        Args:
            plugin_id: Plugin ID.
            parameters: Parameters to validate.
            
        Returns:
            Tuple of (is_valid, error_message).
        """
        try:
            # Get plugin instance
            plugin = await self.get_plugin_instance(plugin_id)
            if not plugin:
                return False, f"Plugin {plugin_id} not found or could not be instantiated"
                
            # Validate parameters
            return plugin.validate_parameters(parameters)
        except Exception as e:
            logger.error(f"Error validating parameters for plugin {plugin_id}: {e}")
            return False, f"Error validating parameters: {str(e)}"
    
    async def get_plugin_metrics(self, plugin_id: str) -> Dict[str, Any]:
        """Get plugin performance metrics.
        
        Args:
            plugin_id: Plugin ID.
            
        Returns:
            Dictionary of metrics.
        """
        metrics = {
            "execution_count": self._execution_counts.get(plugin_id, 0),
            "error_count": self._error_counts.get(plugin_id, 0),
            "average_execution_time": 0.0,
            "min_execution_time": 0.0,
            "max_execution_time": 0.0,
        }
        
        # Calculate time-based metrics if available
        if plugin_id in self._execution_times and self._execution_times[plugin_id]:
            times = self._execution_times[plugin_id]
            metrics["average_execution_time"] = sum(times) / len(times)
            metrics["min_execution_time"] = min(times)
            metrics["max_execution_time"] = max(times)
            
        return metrics
    
    async def list_plugins(self, filter_criteria: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """List registered plugins.
        
        Args:
            filter_criteria: Optional filter criteria.
            
        Returns:
            List of plugin metadata dictionaries.
        """
        plugins = []
        
        for plugin_id, metadata in self._metadata.items():
            # Skip if doesn't match filter criteria
            if filter_criteria:
                match = True
                for key, value in filter_criteria.items():
                    if key not in metadata or metadata[key] != value:
                        match = False
                        break
                if not match:
                    continue
                    
            # Add metrics and status to metadata
            plugin_info = dict(metadata)
            plugin_info["id"] = plugin_id
            plugin_info["metrics"] = await self.get_plugin_metrics(plugin_id)
            plugin_info["status"] = "active" if plugin_id in self._plugins else "inactive"
            
            plugins.append(plugin_info)
            
        return plugins
    
    async def get_plugin_dependencies(self, plugin_id: str) -> List[str]:
        """Get plugin dependencies.
        
        Args:
            plugin_id: Plugin ID.
            
        Returns:
            List of dependency plugin IDs.
        """
        return list(self._dependencies.get(plugin_id, set()))
    
    async def get_plugin_dependents(self, plugin_id: str) -> List[str]:
        """Get plugins that depend on this plugin.
        
        Args:
            plugin_id: Plugin ID.
            
        Returns:
            List of dependent plugin IDs.
        """
        return list(self._dependents.get(plugin_id, set()))
    
    async def check_compatibility(self, plugin_id: str, target_plugin_id: str) -> bool:
        """Check if two plugins are compatible.
        
        Args:
            plugin_id: Plugin ID.
            target_plugin_id: Target plugin ID.
            
        Returns:
            True if compatible, False otherwise.
        """
        # For now, just check if they have circular dependencies
        deps1 = await self.get_plugin_dependencies(plugin_id)
        deps2 = await self.get_plugin_dependencies(target_plugin_id)
        
        return (
            target_plugin_id not in deps1 and  # Target is not a dependency of plugin
            plugin_id not in deps2  # Plugin is not a dependency of target
        )
        
    async def initialize_plugin(self, plugin_id: str) -> bool:
        """Initialize a plugin.
        
        Args:
            plugin_id: Plugin ID.
            
        Returns:
            True if initialization succeeded, False otherwise.
        """
        try:
            # Get plugin instance (this will initialize it)
            plugin = await self.get_plugin_instance(plugin_id)
            return plugin is not None
        except Exception as e:
            logger.error(f"Error initializing plugin {plugin_id}: {e}")
            return False
    
    async def enable_plugin(self, plugin_id: str) -> bool:
        """Enable a plugin.
        
        Args:
            plugin_id: Plugin ID.
            
        Returns:
            True if enabling succeeded, False otherwise.
        """
        # Same as initialize for now
        return await self.initialize_plugin(plugin_id)
    
    async def disable_plugin(self, plugin_id: str) -> bool:
        """Disable a plugin.
        
        Args:
            plugin_id: Plugin ID.
            
        Returns:
            True if disabling succeeded, False otherwise.
        """
        try:
            # Clean up instance if exists
            if plugin_id in self._plugins:
                await self._plugins[plugin_id].cleanup()
                del self._plugins[plugin_id]
                return True
            return True  # Already disabled
        except Exception as e:
            logger.error(f"Error disabling plugin {plugin_id}: {e}")
            return False
    
    async def cleanup_plugin(self, plugin_id: str) -> bool:
        """Clean up a plugin's resources.
        
        Args:
            plugin_id: Plugin ID.
            
        Returns:
            True if cleanup succeeded, False otherwise.
        """
        # Same as disable for now
        return await self.disable_plugin(plugin_id)