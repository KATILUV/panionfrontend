"""
Plugin Manager
Manages plugin lifecycle, dependencies, and state.
"""

import logging
from pathlib import Path
from typing import Dict, Any, Optional, List, Set
from datetime import datetime
import asyncio
import json

from ..shared_types import IPluginManager
from ..error_handling import error_handler, with_error_recovery
from ..shared_state import shared_state, ComponentState
from .base import BasePlugin, PluginMetadata

class PluginManager(IPluginManager):
    """Manages plugin lifecycle and dependencies."""
    
    def __init__(self):
        """Initialize the plugin manager."""
        self.logger = logging.getLogger("PluginManager")
        self._setup_logging()
        
        # Plugin registry
        self._plugins: Dict[str, BasePlugin] = {}
        self._plugin_states: Dict[str, Dict[str, Any]] = {}
        self._plugin_dependencies: Dict[str, Set[str]] = {}
        
        # Resource tracking
        self._resource_usage: Dict[str, Dict[str, float]] = {}
        self._resource_limits: Dict[str, Dict[str, float]] = {}
        
        # Initialize shared state
        shared_state.register_component("plugin_manager", self)
    
    def _setup_logging(self) -> None:
        """Setup plugin manager logging."""
        log_file = Path("logs") / "plugin_manager.log"
        log_file.parent.mkdir(exist_ok=True)
        
        handler = logging.FileHandler(log_file)
        handler.setFormatter(logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        ))
        self.logger.addHandler(handler)
    
    @with_error_recovery
    def register_plugin(self, plugin_id: str, plugin_data: Dict[str, Any]) -> bool:
        """Register a new plugin.
        
        Args:
            plugin_id: Unique identifier for the plugin
            plugin_data: Plugin configuration data
            
        Returns:
            bool: True if registration was successful
        """
        try:
            if plugin_id in self._plugins:
                self.logger.warning(f"Plugin {plugin_id} is already registered")
                return False
            
            # Create plugin instance
            plugin = self._create_plugin_instance(plugin_id, plugin_data)
            if not plugin:
                return False
            
            # Initialize plugin state
            self._plugin_states[plugin_id] = {
                "status": "registered",
                "last_heartbeat": datetime.now(),
                "error_count": 0,
                "retry_count": 0
            }
            
            # Track dependencies
            self._plugin_dependencies[plugin_id] = set(plugin.metadata.dependencies)
            
            # Initialize resource tracking
            self._resource_usage[plugin_id] = {
                "cpu": 0.0,
                "memory": 0.0,
                "disk": 0.0,
                "network": 0.0
            }
            
            # Store plugin
            self._plugins[plugin_id] = plugin
            
            self.logger.info(f"Plugin {plugin_id} registered successfully")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to register plugin {plugin_id}: {str(e)}")
            return False
    
    def _create_plugin_instance(self, plugin_id: str, plugin_data: Dict[str, Any]) -> Optional[BasePlugin]:
        """Create a plugin instance.
        
        Args:
            plugin_id: Plugin identifier
            plugin_data: Plugin configuration data
            
        Returns:
            Optional[BasePlugin]: Plugin instance if creation was successful
        """
        try:
            # Extract plugin metadata
            metadata = {
                "name": plugin_data.get("name", plugin_id),
                "version": plugin_data.get("version", "1.0.0"),
                "description": plugin_data.get("description", ""),
                "author": plugin_data.get("author", "Unknown"),
                "tags": plugin_data.get("tags", []),
                "dependencies": plugin_data.get("dependencies", [])
            }
            
            # Create plugin instance
            plugin = BasePlugin(**metadata)
            return plugin
            
        except Exception as e:
            self.logger.error(f"Failed to create plugin instance: {str(e)}")
            return None
    
    @with_error_recovery
    def unregister_plugin(self, plugin_id: str) -> bool:
        """Unregister a plugin.
        
        Args:
            plugin_id: Plugin identifier
            
        Returns:
            bool: True if unregistration was successful
        """
        try:
            if plugin_id not in self._plugins:
                self.logger.warning(f"Plugin {plugin_id} is not registered")
                return False
            
            # Cleanup plugin
            plugin = self._plugins[plugin_id]
            if not asyncio.run(plugin.cleanup()):
                self.logger.error(f"Failed to cleanup plugin {plugin_id}")
                return False
            
            # Remove plugin data
            del self._plugins[plugin_id]
            del self._plugin_states[plugin_id]
            del self._plugin_dependencies[plugin_id]
            del self._resource_usage[plugin_id]
            
            self.logger.info(f"Plugin {plugin_id} unregistered successfully")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to unregister plugin {plugin_id}: {str(e)}")
            return False
    
    def get_plugin(self, plugin_id: str) -> Optional[Dict[str, Any]]:
        """Get plugin data.
        
        Args:
            plugin_id: Plugin identifier
            
        Returns:
            Optional[Dict[str, Any]]: Plugin data if found
        """
        try:
            if plugin_id not in self._plugins:
                return None
            
            plugin = self._plugins[plugin_id]
            state = self._plugin_states[plugin_id]
            
            return {
                "metadata": {
                    "name": plugin.metadata.name,
                    "version": plugin.metadata.version,
                    "description": plugin.metadata.description,
                    "author": plugin.metadata.author,
                    "tags": plugin.metadata.tags,
                    "dependencies": plugin.metadata.dependencies,
                    "score": plugin.metadata.score,
                    "last_updated": plugin.metadata.last_updated.isoformat()
                },
                "state": state,
                "resource_usage": self._resource_usage[plugin_id]
            }
            
        except Exception as e:
            self.logger.error(f"Failed to get plugin data for {plugin_id}: {str(e)}")
            return None
    
    @with_error_recovery
    async def initialize_plugin(self, plugin_id: str) -> bool:
        """Initialize a plugin.
        
        Args:
            plugin_id: Plugin identifier
            
        Returns:
            bool: True if initialization was successful
        """
        try:
            if plugin_id not in self._plugins:
                self.logger.error(f"Plugin {plugin_id} not found")
                return False
            
            # Check dependencies
            if not self._check_plugin_dependencies(plugin_id):
                self.logger.error(f"Plugin {plugin_id} dependencies not satisfied")
                return False
            
            # Initialize plugin
            plugin = self._plugins[plugin_id]
            if not await plugin.initialize():
                self.logger.error(f"Failed to initialize plugin {plugin_id}")
                return False
            
            # Update state
            self._plugin_states[plugin_id]["status"] = "active"
            
            self.logger.info(f"Plugin {plugin_id} initialized successfully")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to initialize plugin {plugin_id}: {str(e)}")
            return False
    
    def _check_plugin_dependencies(self, plugin_id: str) -> bool:
        """Check if plugin dependencies are satisfied.
        
        Args:
            plugin_id: Plugin identifier
            
        Returns:
            bool: True if all dependencies are satisfied
        """
        try:
            dependencies = self._plugin_dependencies.get(plugin_id, set())
            
            for dependency in dependencies:
                # Check if dependency is registered
                if dependency not in self._plugins:
                    self.logger.error(f"Dependency {dependency} not found for plugin {plugin_id}")
                    return False
                
                # Check if dependency is active
                dep_state = self._plugin_states.get(dependency, {})
                if dep_state.get("status") != "active":
                    self.logger.error(f"Dependency {dependency} not active for plugin {plugin_id}")
                    return False
            
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to check dependencies for plugin {plugin_id}: {str(e)}")
            return False
    
    @with_error_recovery
    async def update_plugin_heartbeat(self, plugin_id: str) -> None:
        """Update plugin heartbeat.
        
        Args:
            plugin_id: Plugin identifier
        """
        try:
            if plugin_id not in self._plugins:
                return
            
            plugin = self._plugins[plugin_id]
            await plugin.update_heartbeat()
            
            # Update resource usage
            self._update_plugin_resources(plugin_id)
            
        except Exception as e:
            self.logger.error(f"Failed to update heartbeat for plugin {plugin_id}: {str(e)}")
    
    def _update_plugin_resources(self, plugin_id: str) -> None:
        """Update plugin resource usage.
        
        Args:
            plugin_id: Plugin identifier
        """
        try:
            if plugin_id not in self._plugins:
                return
            
            plugin = self._plugins[plugin_id]
            status = plugin.get_status()
            
            # Update resource usage from status
            if "resource_usage" in status:
                self._resource_usage[plugin_id].update(status["resource_usage"])
            
        except Exception as e:
            self.logger.error(f"Failed to update resources for plugin {plugin_id}: {str(e)}")
    
    def get_plugin_status(self, plugin_id: str) -> Optional[Dict[str, Any]]:
        """Get plugin status.
        
        Args:
            plugin_id: Plugin identifier
            
        Returns:
            Optional[Dict[str, Any]]: Plugin status if found
        """
        try:
            if plugin_id not in self._plugins:
                return None
            
            plugin = self._plugins[plugin_id]
            return plugin.get_status()
            
        except Exception as e:
            self.logger.error(f"Failed to get status for plugin {plugin_id}: {str(e)}")
            return None
    
    def get_all_plugins(self) -> List[Dict[str, Any]]:
        """Get all registered plugins.
        
        Returns:
            List[Dict[str, Any]]: List of plugin data
        """
        try:
            return [
                self.get_plugin(plugin_id)
                for plugin_id in self._plugins
            ]
            
        except Exception as e:
            self.logger.error(f"Failed to get all plugins: {str(e)}")
            return []
    
    def get_active_plugins(self) -> List[str]:
        """Get list of active plugins.
        
        Returns:
            List[str]: List of active plugin IDs
        """
        try:
            return [
                plugin_id
                for plugin_id, state in self._plugin_states.items()
                if state.get("status") == "active"
            ]
            
        except Exception as e:
            self.logger.error(f"Failed to get active plugins: {str(e)}")
            return []
    
    def get_plugin_dependencies(self, plugin_id: str) -> Set[str]:
        """Get plugin dependencies.
        
        Args:
            plugin_id: Plugin identifier
            
        Returns:
            Set[str]: Set of dependency IDs
        """
        try:
            return self._plugin_dependencies.get(plugin_id, set())
            
        except Exception as e:
            self.logger.error(f"Failed to get dependencies for plugin {plugin_id}: {str(e)}")
            return set()

# Create global plugin manager instance
plugin_manager = PluginManager() 