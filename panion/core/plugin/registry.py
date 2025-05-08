"""
Plugin Registry
Handles plugin registration and discovery.
"""

import os
import logging
from typing import Dict, List, Optional, Set, Type
from datetime import datetime

from .types import PluginState, PluginMetadata, PluginErrorType
from core.panion_errors import PluginError, ServiceError
from core.service_locator import service_locator
from core.dependency_resolver import dependency_resolver
from core.plugin.base import BasePlugin

class PluginRegistry:
    """Handles plugin registration and discovery."""
    
    def __init__(self):
        """Initialize the plugin registry."""
        self.logger = logging.getLogger(__name__)
        self._plugins: Dict[str, BasePlugin] = {}
        self._plugin_classes: Dict[str, Type[BasePlugin]] = {}
        self._plugin_dependencies: Dict[str, List[str]] = {}
        self._plugin_states: Dict[str, PluginState] = {}
        self._plugin_errors: Dict[str, List[str]] = {}
        self._plugin_load_times: Dict[str, datetime] = {}
        self._plugin_init_times: Dict[str, datetime] = {}
        
        # Register with service locator
        service_locator.register_service('plugin_registry', self)
        
        # Register dependencies
        dependency_resolver.register_dependency('plugin_registry', [])
    
    def register_plugin(
        self,
        name: str,
        plugin_class: Type[BasePlugin],
        dependencies: Optional[List[str]] = None
    ) -> None:
        """Register a plugin class.
        
        Args:
            name: Plugin name
            plugin_class: Plugin class to register
            dependencies: List of plugin dependencies (optional)
            
        Raises:
            PluginError: If plugin registration fails
        """
        try:
            if name in self._plugin_classes:
                raise PluginError(
                    f"Plugin {name} already registered",
                    PluginErrorType.VALIDATION_ERROR
                )
            
            self._plugin_classes[name] = plugin_class
            self._plugin_dependencies[name] = dependencies or []
            self._plugin_states[name] = PluginState.UNLOADED
            self._plugin_errors[name] = []
            self._plugin_load_times[name] = datetime.now()
            
            self.logger.info(f"Registered plugin class: {name}")
        except Exception as e:
            self.logger.error(f"Failed to register plugin {name}: {str(e)}")
            raise PluginError(str(e), PluginErrorType.VALIDATION_ERROR)
    
    def unregister_plugin(self, name: str) -> None:
        """Unregister a plugin.
        
        Args:
            name: Plugin name
            
        Raises:
            PluginError: If plugin unregistration fails
        """
        try:
            if name not in self._plugin_classes:
                raise PluginError(
                    f"Plugin {name} not registered",
                    PluginErrorType.VALIDATION_ERROR
                )
            
            # Remove plugin from all collections
            self._plugin_classes.pop(name, None)
            self._plugin_dependencies.pop(name, None)
            self._plugin_states.pop(name, None)
            self._plugin_errors.pop(name, None)
            self._plugin_load_times.pop(name, None)
            self._plugin_init_times.pop(name, None)
            self._plugins.pop(name, None)
            
            self.logger.info(f"Unregistered plugin: {name}")
        except Exception as e:
            self.logger.error(f"Failed to unregister plugin {name}: {str(e)}")
            raise PluginError(str(e), PluginErrorType.VALIDATION_ERROR)
    
    def get_plugin_class(self, name: str) -> Optional[Type[BasePlugin]]:
        """Get a registered plugin class.
        
        Args:
            name: Plugin name
            
        Returns:
            Optional[Type[BasePlugin]]: Plugin class if found, None otherwise
        """
        return self._plugin_classes.get(name)
    
    def get_plugin_dependencies(self, name: str) -> List[str]:
        """Get plugin dependencies.
        
        Args:
            name: Plugin name
            
        Returns:
            List[str]: List of dependency names
        """
        return self._plugin_dependencies.get(name, [])
    
    def get_plugin_state(self, name: str) -> Optional[PluginState]:
        """Get plugin state.
        
        Args:
            name: Plugin name
            
        Returns:
            Optional[PluginState]: Plugin state if found, None otherwise
        """
        return self._plugin_states.get(name)
    
    def get_plugin_errors(self, name: str) -> List[str]:
        """Get plugin errors.
        
        Args:
            name: Plugin name
            
        Returns:
            List[str]: List of error messages
        """
        return self._plugin_errors.get(name, [])
    
    def get_plugin_load_time(self, name: str) -> Optional[datetime]:
        """Get plugin load time.
        
        Args:
            name: Plugin name
            
        Returns:
            Optional[datetime]: Plugin load time if found, None otherwise
        """
        return self._plugin_load_times.get(name)
    
    def get_plugin_init_time(self, name: str) -> Optional[datetime]:
        """Get plugin initialization time.
        
        Args:
            name: Plugin name
            
        Returns:
            Optional[datetime]: Plugin initialization time if found, None otherwise
        """
        return self._plugin_init_times.get(name)
    
    def get_registered_plugins(self) -> List[str]:
        """Get all registered plugin names.
        
        Returns:
            List[str]: List of registered plugin names
        """
        return list(self._plugin_classes.keys())
    
    def get_plugins_by_state(self, state: PluginState) -> List[str]:
        """Get plugins in a specific state.
        
        Args:
            state: Plugin state
            
        Returns:
            List[str]: List of plugin names in the specified state
        """
        return [
            name for name, plugin_state in self._plugin_states.items()
            if plugin_state == state
        ]
    
    def get_active_plugins(self) -> List[str]:
        """Get all active plugins.
        
        Returns:
            List[str]: List of active plugin names
        """
        return self.get_plugins_by_state(PluginState.STARTED)
    
    def get_error_plugins(self) -> List[str]:
        """Get all plugins in error state.
        
        Returns:
            List[str]: List of plugin names in error state
        """
        return self.get_plugins_by_state(PluginState.ERROR)

# Create singleton instance
plugin_registry = PluginRegistry() 