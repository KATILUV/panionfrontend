"""
Plugin Factory
Creates and configures plugin instances.
"""

import logging
from typing import Dict, Any, Optional, Type
from datetime import datetime
from injector import inject, singleton

from core.base import BaseComponent, ComponentMetadata, ComponentState
from core.plugin.interfaces import IPlugin
from core.plugin.dependency_manager import DependencyManager

@singleton
class PluginFactory(BaseComponent):
    """Creates and configures plugin instances."""
    
    @inject
    def __init__(self, dependency_manager: DependencyManager):
        """Initialize the plugin factory.
        
        Args:
            dependency_manager: The dependency manager instance
        """
        metadata = ComponentMetadata(
            name="PluginFactory",
            version="1.0.0",
            description="Plugin creation and configuration system",
            author="Panion Team",
            created_at=datetime.now(),
            updated_at=datetime.now(),
            dependencies={},
            config_schema={}
        )
        super().__init__(metadata)
        
        self.logger = logging.getLogger(__name__)
        self._dependency_manager = dependency_manager
        self.plugin_classes: Dict[str, Type[IPlugin]] = {}
        self.plugin_configs: Dict[str, Dict[str, Any]] = {}
    
    async def initialize(self) -> None:
        """Initialize the plugin factory."""
        self.logger.info("Initializing plugin factory")
        self._state = ComponentState.INITIALIZING
        try:
            self._state = ComponentState.ACTIVE
        except Exception as e:
            self._handle_error(e)
            raise
    
    async def start(self) -> None:
        """Start the plugin factory."""
        self.logger.info("Starting plugin factory")
        self._start_time = datetime.now()
        self._state = ComponentState.ACTIVE
    
    async def stop(self) -> None:
        """Stop the plugin factory."""
        self.logger.info("Stopping plugin factory")
        self._state = ComponentState.STOPPING
        self._state = ComponentState.STOPPED
    
    async def pause(self) -> None:
        """Pause the plugin factory."""
        self.logger.info("Pausing plugin factory")
        self._state = ComponentState.PAUSED
    
    async def resume(self) -> None:
        """Resume the plugin factory."""
        self.logger.info("Resuming plugin factory")
        self._state = ComponentState.ACTIVE
    
    async def update(self) -> None:
        """Update the plugin factory state."""
        if self._state == ComponentState.ACTIVE:
            try:
                pass  # No periodic updates needed
            except Exception as e:
                self._handle_error(e)
    
    def register_plugin_class(self, plugin_id: str, plugin_class: Type[IPlugin]) -> bool:
        """Register a plugin class.
        
        Args:
            plugin_id: Plugin identifier
            plugin_class: Plugin class
            
        Returns:
            bool: Whether registration was successful
        """
        try:
            # Check if plugin class already registered
            if plugin_id in self.plugin_classes:
                self.logger.warning(f"Plugin class {plugin_id} already registered")
                return False
            
            # Register plugin class
            self.plugin_classes[plugin_id] = plugin_class
            self.logger.info(f"Registered plugin class: {plugin_id}")
            return True
            
        except Exception as e:
            self.logger.error(f"Error registering plugin class {plugin_id}: {e}")
            return False
    
    def unregister_plugin_class(self, plugin_id: str) -> bool:
        """Unregister a plugin class.
        
        Args:
            plugin_id: Plugin identifier
            
        Returns:
            bool: Whether unregistration was successful
        """
        try:
            # Check if plugin class exists
            if plugin_id not in self.plugin_classes:
                self.logger.warning(f"Plugin class {plugin_id} not found")
                return False
            
            # Unregister plugin class
            del self.plugin_classes[plugin_id]
            if plugin_id in self.plugin_configs:
                del self.plugin_configs[plugin_id]
            
            self.logger.info(f"Unregistered plugin class: {plugin_id}")
            return True
            
        except Exception as e:
            self.logger.error(f"Error unregistering plugin class {plugin_id}: {e}")
            return False
    
    async def create_plugin(self, plugin_id: str, config: Dict[str, Any]) -> Optional[IPlugin]:
        """Create a plugin instance.
        
        Args:
            plugin_id: Plugin identifier
            config: Plugin configuration
            
        Returns:
            Optional[IPlugin]: Plugin instance if created successfully
        """
        try:
            # Get plugin class
            plugin_class = self.plugin_classes.get(plugin_id)
            if not plugin_class:
                self.logger.error(f"Plugin class not found for {plugin_id}")
                return None
            
            # Create plugin instance
            plugin = plugin_class(config)
            
            # Store configuration
            self.plugin_configs[plugin_id] = config
            
            # Initialize plugin
            await plugin.initialize()
            
            return plugin
            
        except Exception as e:
            self.logger.error(f"Error creating plugin {plugin_id}: {e}")
            return None
    
    def get_plugin_class(self, plugin_id: str) -> Optional[Type[IPlugin]]:
        """Get a plugin class.
        
        Args:
            plugin_id: Plugin identifier
            
        Returns:
            Optional[Type[IPlugin]]: Plugin class if found
        """
        return self.plugin_classes.get(plugin_id)
    
    def get_plugin_config(self, plugin_id: str) -> Optional[Dict[str, Any]]:
        """Get a plugin's configuration.
        
        Args:
            plugin_id: Plugin identifier
            
        Returns:
            Optional[Dict[str, Any]]: Plugin configuration if found
        """
        return self.plugin_configs.get(plugin_id)
    
    async def get_status(self) -> Dict[str, Any]:
        """Get the current status of the plugin factory."""
        return {
            'state': self._state.value,
            'plugin_class_count': len(self.plugin_classes),
            'error_info': self.get_error_info(),
            'uptime': self.uptime
        } 