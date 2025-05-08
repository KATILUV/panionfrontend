"""
Plugin Manager Plugin
Provides plugin management functionality as a plugin.
"""

from typing import Dict, Any, Optional, List, TYPE_CHECKING
import logging
from datetime import datetime

from core.plugin.interfaces import IPluginManager
from core.plugin.types import Plugin, PluginMetadata, PluginState
from core.panion_errors import PluginError, ErrorSeverity
from core.utils import with_connection_pool, cache_result
from core.base import BaseComponent, ComponentMetadata, ComponentState
from core.logging_config import get_logger, LogTimer
from core.config import plugin_config, system_config
from core.events import event_bus, Event, EventType
from core.base import BasePlugin

logger = logging.getLogger(__name__)

class PluginManagerPlugin(BasePlugin):
    """Plugin that provides plugin management functionality."""
    
    def __init__(self, plugin_manager: IPluginManager):
        """Initialize the plugin manager plugin.
        
        Args:
            plugin_manager: The plugin manager instance
        """
        metadata = PluginMetadata(
            name="plugin_manager",
            version="1.0.0",
            description="Plugin management functionality",
            author="Panion Team",
            dependencies={},
            python_version=">=3.9",
            entry_point="plugin_manager_plugin.py",
            type="system",
            tags=["system", "plugin", "management"]
        )
        super().__init__(metadata)
        
        self._plugin_manager = plugin_manager
        self.logger = logging.getLogger(__name__)
        
    async def execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute plugin functionality.
        
        Args:
            input_data: Input data for the plugin
            
        Returns:
            Dict containing the execution results
        """
        command = input_data.get("command")
        if not command:
            raise ValueError("No command specified")
            
        if command == "list_plugins":
            plugins = await self._plugin_manager.list_plugins()
            return {"plugins": plugins}
            
        elif command == "get_plugin":
            plugin_name = input_data.get("plugin_name")
            if not plugin_name:
                raise ValueError("No plugin name specified")
            plugin = await self._plugin_manager.get_plugin(plugin_name)
            return {"plugin": plugin.to_dict() if plugin else None}
            
        elif command == "register_plugin":
            plugin_data = input_data.get("plugin_data")
            if not plugin_data:
                raise ValueError("No plugin data specified")
            await self._plugin_manager.register_plugin(plugin_data)
            return {"status": "success"}
            
        elif command == "unregister_plugin":
            plugin_name = input_data.get("plugin_name")
            if not plugin_name:
                raise ValueError("No plugin name specified")
            await self._plugin_manager.unregister_plugin(plugin_name)
            return {"status": "success"}
            
        else:
            raise ValueError(f"Unknown command: {command}")

    async def _handle_register_plugin(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Handle plugin registration."""
        plugin = request.get('plugin')
        version = request.get('version', '1.0.0')
        dependencies = request.get('dependencies')

        if not plugin:
            raise ValueError("Missing plugin")

        success = await self._plugin_manager.register_plugin(
            plugin=plugin,
            version=version,
            dependencies=dependencies
        )

        return {
            'success': True,
            'message': f"Registered plugin: {plugin.name}",
            'version': version,
            'dependencies': dependencies
        }

    async def _handle_add_plugin_test(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Handle adding a plugin test."""
        plugin_name = request.get('plugin_name')
        test_case = request.get('test_case')

        if not plugin_name or not test_case:
            raise ValueError("Missing required parameters")

        success = await self._plugin_manager.add_plugin_test(plugin_name, test_case)

        return {
            'success': True,
            'message': f"Added test for plugin: {plugin_name}",
            'test_id': test_case['id']
        }

    async def _handle_run_plugin_tests(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Handle running plugin tests."""
        plugin_name = request.get('plugin_name')

        if not plugin_name:
            raise ValueError("Missing plugin_name")

        results = await self._plugin_manager.run_plugin_tests(plugin_name)

        return {
            'success': True,
            'message': f"Completed tests for plugin: {plugin_name}",
            'results': results
        }

    async def _handle_get_plugin_info(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Handle getting plugin information."""
        plugin_name = request.get('plugin_name')

        if not plugin_name:
            raise ValueError("Missing plugin_name")

        info = await self._plugin_manager.get_plugin_info(plugin_name)

        return {
            'success': True,
            'message': f"Retrieved info for plugin: {plugin_name}",
            'info': info
        }

    async def _handle_get_all_plugins(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Handle getting information about all plugins."""
        plugins = await self._plugin_manager.get_all_plugins()

        return {
            'success': True,
            'message': f"Retrieved info for {len(plugins)} plugins",
            'plugins': plugins
        }

    async def _handle_update_plugin(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Handle plugin updates."""
        plugin_name = request.get('plugin_name')
        new_version = request.get('new_version')
        update_dependencies = request.get('update_dependencies', False)

        if not plugin_name or not new_version:
            raise ValueError("Missing required parameters")

        success = await self._plugin_manager.update_plugin(
            plugin_name=plugin_name,
            new_version=new_version,
            update_dependencies=update_dependencies
        )

        return {
            'success': True,
            'message': f"Updated plugin: {plugin_name} to version {new_version}",
            'update_dependencies': update_dependencies
        }

    async def _handle_get_plugin_dependencies(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Handle getting plugin dependencies."""
        plugin_name = request.get('plugin_name')

        if not plugin_name:
            raise ValueError("Missing plugin_name")

        dependencies = await self._plugin_manager.get_plugin_dependencies(plugin_name)

        return {
            'success': True,
            'message': f"Retrieved dependencies for plugin: {plugin_name}",
            'dependencies': dependencies
        }

# Create singleton instance
plugin_manager_plugin = PluginManagerPlugin() 