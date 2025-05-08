"""
Plugin Manager
Manages the lifecycle and execution of plugins.
"""

import logging
import asyncio
from typing import Dict, Any, List, Optional, Type
from datetime import datetime
from pathlib import Path
import json
from injector import inject, singleton

from core.base import BaseComponent, ComponentMetadata, ComponentState
from core.plugin.interfaces import IPlugin, IPluginManager
from core.plugin.dependency_manager import DependencyManager
from core.service_locator import ServiceLocator
from core.error_handling import ErrorHandler

@singleton
class PluginManager(IPluginManager, BaseComponent):
    """Manages the lifecycle and execution of plugins."""
    
    @inject
    def __init__(
        self,
        dependency_manager: DependencyManager,
        service_locator: ServiceLocator,
        error_handler: ErrorHandler
    ):
        """Initialize the plugin manager.
        
        Args:
            dependency_manager: The dependency manager instance
            service_locator: The service locator instance
            error_handler: The error handler instance
        """
        metadata = ComponentMetadata(
            name="PluginManager",
            version="1.0.0",
            description="Plugin management system",
            author="Panion Team",
            created_at=datetime.now(),
            updated_at=datetime.now(),
            dependencies={},
            config_schema={}
        )
        super().__init__(metadata)
        
        self.logger = logging.getLogger(__name__)
        self.dependency_manager = dependency_manager
        self.service_locator = service_locator
        self.error_handler = error_handler
        
        self.plugins: Dict[str, IPlugin] = {}
        self.plugin_states: Dict[str, ComponentState] = {}
        self.plugin_metrics: Dict[str, Dict[str, Any]] = {}
    
    async def initialize(self) -> None:
        """Initialize the plugin manager."""
        self.logger.info("Initializing plugin manager")
        self._state = ComponentState.INITIALIZING
        try:
            # Register self as a service
            self.service_locator.register_service("plugin_manager", self)
            
            # Import and register plugin classes
            from plugins.echo_agent import EchoAgent
            
            # Register the plugin class first
            self.service_locator.register_service("plugin.class.echo_agent", EchoAgent)
            
            # Create and initialize plugin instance
            plugin = EchoAgent()
            await plugin.initialize()
            
            # Store plugin instance
            self.plugins["echo_agent"] = plugin
            self.plugin_states["echo_agent"] = ComponentState.ACTIVE  # Plugin is initialized, so it's active
            self.plugin_metrics["echo_agent"] = {
                'load_time': datetime.now(),
                'execution_count': 0,
                'error_count': 0,
                'last_error': None
            }
            
            # Register plugin instance with a different service ID
            self.service_locator.register_service("plugin.instance.echo_agent", plugin)
            
            self._state = ComponentState.ACTIVE
            self.logger.info(f"Plugin manager initialized with {len(self.plugins)} plugins")
            
        except Exception as e:
            await self.error_handler.handle_error(e, {"context": "plugin_manager_initialize"})
            raise
    
    async def start(self) -> None:
        """Start the plugin manager."""
        self.logger.info("Starting plugin manager")
        self._start_time = datetime.now()
        self._state = ComponentState.ACTIVE
        
        # Start all plugins
        for plugin_id, plugin in self.plugins.items():
            try:
                await plugin.start()
                self.plugin_states[plugin_id] = ComponentState.ACTIVE
            except Exception as e:
                self.logger.error(f"Error starting plugin {plugin_id}: {e}")
                self.plugin_states[plugin_id] = ComponentState.ERROR
    
    async def stop(self) -> None:
        """Stop the plugin manager."""
        self.logger.info("Stopping plugin manager")
        self._state = ComponentState.STOPPING
        
        # Stop all plugins
        for plugin_id, plugin in self.plugins.items():
            try:
                await plugin.stop()
                self.plugin_states[plugin_id] = ComponentState.STOPPED
            except Exception as e:
                self.logger.error(f"Error stopping plugin {plugin_id}: {e}")
        
        self._state = ComponentState.STOPPED
    
    async def pause(self) -> None:
        """Pause the plugin manager."""
        self.logger.info("Pausing plugin manager")
        self._state = ComponentState.PAUSED
        
        # Pause all plugins
        for plugin_id, plugin in self.plugins.items():
            try:
                await plugin.pause()
                self.plugin_states[plugin_id] = ComponentState.PAUSED
            except Exception as e:
                self.logger.error(f"Error pausing plugin {plugin_id}: {e}")
    
    async def resume(self) -> None:
        """Resume the plugin manager."""
        self.logger.info("Resuming plugin manager")
        self._state = ComponentState.ACTIVE
        
        # Resume all plugins
        for plugin_id, plugin in self.plugins.items():
            try:
                await plugin.resume()
                self.plugin_states[plugin_id] = ComponentState.ACTIVE
            except Exception as e:
                self.logger.error(f"Error resuming plugin {plugin_id}: {e}")
    
    async def update(self) -> None:
        """Update the plugin manager state."""
        if self._state == ComponentState.ACTIVE:
            try:
                # Update all plugins
                for plugin_id, plugin in self.plugins.items():
                    try:
                        await plugin.update()
                    except Exception as e:
                        self.logger.error(f"Error updating plugin {plugin_id}: {e}")
                        self.plugin_states[plugin_id] = ComponentState.ERROR
            except Exception as e:
                await self.error_handler.handle_error(e, {"context": "plugin_manager_update"})
    
    async def load_plugin(self, plugin_id: str, config: Dict[str, Any]) -> bool:
        """Load a plugin.
        
        Args:
            plugin_id: Plugin identifier
            config: Plugin configuration
            
        Returns:
            bool: Whether loading was successful
        """
        try:
            # Check if plugin already loaded
            if plugin_id in self.plugins:
                self.logger.warning(f"Plugin {plugin_id} already loaded")
                return False
            
            # Create plugin instance
            plugin = await self.dependency_manager.create_plugin(plugin_id, config)
            if not plugin:
                self.logger.error(f"Failed to create plugin {plugin_id}")
                return False
            
            # Initialize plugin
            await plugin.initialize()
            
            # Store plugin
            self.plugins[plugin_id] = plugin
            self.plugin_states[plugin_id] = ComponentState.INITIALIZED
            self.plugin_metrics[plugin_id] = {
                'load_time': datetime.now(),
                'execution_count': 0,
                'error_count': 0,
                'last_error': None
            }
            
            # Register plugin service
            await self.service_locator.register_service(f"plugin.{plugin_id}", plugin)
            
            self.logger.info(f"Plugin {plugin_id} loaded successfully")
            return True
            
        except Exception as e:
            self.logger.error(f"Error loading plugin {plugin_id}: {e}")
            return False
    
    async def unload_plugin(self, plugin_id: str) -> bool:
        """Unload a plugin.
        
        Args:
            plugin_id: Plugin identifier
            
        Returns:
            bool: Whether unloading was successful
        """
        try:
            # Check if plugin exists
            if plugin_id not in self.plugins:
                self.logger.warning(f"Plugin {plugin_id} not found")
                return False
            
            # Stop plugin
            plugin = self.plugins[plugin_id]
            await plugin.stop()
            
            # Remove plugin
            del self.plugins[plugin_id]
            del self.plugin_states[plugin_id]
            del self.plugin_metrics[plugin_id]
            
            # Unregister plugin service
            await self.service_locator.unregister_service(f"plugin.{plugin_id}")
            
            self.logger.info(f"Plugin {plugin_id} unloaded successfully")
            return True
            
        except Exception as e:
            self.logger.error(f"Error unloading plugin {plugin_id}: {e}")
            return False
    
    async def get_plugin(self, plugin_id: str) -> Optional[IPlugin]:
        """Get a plugin instance.
        
        Args:
            plugin_id: Plugin identifier
            
        Returns:
            Optional[IPlugin]: Plugin instance if found
        """
        return self.plugins.get(plugin_id)
    
    async def get_plugin_state(self, plugin_id: str) -> Optional[ComponentState]:
        """Get a plugin's state.
        
        Args:
            plugin_id: Plugin identifier
            
        Returns:
            Optional[ComponentState]: Plugin state if found
        """
        return self.plugin_states.get(plugin_id)
    
    async def get_plugin_metrics(self, plugin_id: str) -> Optional[Dict[str, Any]]:
        """Get a plugin's metrics.
        
        Args:
            plugin_id: Plugin identifier
            
        Returns:
            Optional[Dict[str, Any]]: Plugin metrics if found
        """
        return self.plugin_metrics.get(plugin_id)
    
    async def update_metrics(self) -> None:
        """Update plugin metrics."""
        try:
            for plugin_id, plugin in self.plugins.items():
                try:
                    metrics = await plugin.get_metrics()
                    if metrics:
                        self.plugin_metrics[plugin_id].update(metrics)
                except Exception as e:
                    self.logger.error(f"Error updating metrics for plugin {plugin_id}: {e}")
        except Exception as e:
            self.logger.error(f"Error updating plugin metrics: {e}")
    
    async def get_status(self) -> Dict[str, Any]:
        """Get the current status of the plugin manager.
        
        Returns:
            Dict[str, Any]: Status information including state and metrics
        """
        try:
            return {
                'state': self._state.value,
                'plugin_count': len(self.plugins),
                'active_plugins': len([p for p in self.plugin_states.values() if p == ComponentState.ACTIVE]),
                'metrics': self.plugin_metrics
            }
        except Exception as e:
            self.logger.error(f"Error getting plugin manager status: {e}")
            return {'state': 'error', 'error': str(e)}
    
    async def register_plugin(self, plugin_id: str, plugin_class: Type[IPlugin]) -> None:
        """Register a plugin class."""
        try:
            self.logger.info(f"Registering plugin: {plugin_id}")
            
            # Register plugin class
            self.service_locator.register_service(plugin_id, plugin_class)
            
            # Register plugin metrics
            self.service_locator.register_service(
                f"{plugin_id}_metrics",
                {
                    "status": "registered",
                    "last_updated": datetime.now().isoformat()
                }
            )
            
            self.logger.info(f"Plugin {plugin_id} registered successfully")
            
        except Exception as e:
            self.logger.error(f"Error registering plugin {plugin_id}: {str(e)}")
            raise
    
    async def unregister_plugin(self, plugin_name: str) -> None:
        """Unregister a plugin.
        
        Args:
            plugin_name: Name of the plugin to unregister
        """
        try:
            if plugin_name not in self.plugins:
                self.logger.warning(f"Plugin {plugin_name} not found")
                return
            
            # Stop plugin if running
            plugin = self.plugins[plugin_name]
            if self.plugin_states[plugin_name] == ComponentState.ACTIVE:
                await plugin.stop()
            
            # Remove plugin
            del self.plugins[plugin_name]
            del self.plugin_states[plugin_name]
            del self.plugin_metrics[plugin_name]
            
            # Unregister plugin service
            await self.service_locator.unregister_service(f"plugin.{plugin_name}")
            
            self.logger.info(f"Plugin {plugin_name} unregistered successfully")
            
        except Exception as e:
            self.logger.error(f"Error unregistering plugin {plugin_name}: {e}")
            raise  # Re-raise to match interface behavior
    
    async def list_plugins(self) -> List[str]:
        """List all registered plugins.
        
        Returns:
            List[str]: List of plugin identifiers
        """
        try:
            return list(self.plugins.keys())
        except Exception as e:
            self.logger.error(f"Error listing plugins: {e}")
            return [] 