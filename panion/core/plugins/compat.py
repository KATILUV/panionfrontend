"""
Plugin System Compatibility Module

This module provides compatibility layers between the old and new plugin systems.
It allows for gradual migration by exposing legacy interfaces that use the new consolidated system.
"""

import logging
import asyncio
from typing import Dict, Any, Optional, List, Type, Tuple, Union

from .manager import PluginManager
from .base import BasePlugin, PluginMetadata, PluginResult
from .exceptions import PluginError, PluginNotFoundError

logger = logging.getLogger(__name__)

# Singleton instance of the new plugin manager
_plugin_manager = None

def deprecated_plugin_manager():
    """
    Legacy-compatible plugin manager.
    
    This function returns a compatibility wrapper around the new plugin manager
    that exposes the legacy interface from core/plugin/manager.py.
    
    Returns:
        A compatibility wrapper object.
    """
    global _plugin_manager
    if _plugin_manager is None:
        _plugin_manager = PluginManager.get_instance()
    
    return LegacyPluginManagerWrapper(_plugin_manager)

def deprecated_core_plugin_manager():
    """
    Legacy-compatible core plugin manager.
    
    This function returns a compatibility wrapper around the new plugin manager
    that exposes the legacy interface from core/plugin_manager.py.
    
    Returns:
        A compatibility wrapper object.
    """
    global _plugin_manager
    if _plugin_manager is None:
        _plugin_manager = PluginManager.get_instance()
    
    return LegacyCorePluginManagerWrapper(_plugin_manager)

class LegacyPluginManagerWrapper:
    """
    Compatibility wrapper for the legacy plugin manager interface.
    
    This class wraps the new plugin manager and exposes methods that match
    the interface of the legacy plugin manager in core/plugin/manager.py.
    """
    
    def __init__(self, plugin_manager):
        """Initialize with a new plugin manager instance."""
        self._plugin_manager = plugin_manager
    
    async def register_plugin(self, plugin_id: str, plugin_data: Dict[str, Any]) -> bool:
        """
        Register a plugin with the manager.
        
        Args:
            plugin_id: Plugin ID.
            plugin_data: Plugin metadata.
            
        Returns:
            Success status.
        """
        return await self._plugin_manager.register_plugin(plugin_id, plugin_data)
    
    async def unregister_plugin(self, plugin_id: str) -> bool:
        """
        Unregister a plugin.
        
        Args:
            plugin_id: Plugin ID.
            
        Returns:
            Success status.
        """
        return await self._plugin_manager.unregister_plugin(plugin_id)
    
    async def execute_plugin(self, plugin_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute a plugin.
        
        Args:
            plugin_id: Plugin ID.
            parameters: Execution parameters.
            
        Returns:
            Execution result.
        """
        result = await self._plugin_manager.execute_plugin(plugin_id, parameters)
        # Convert PluginResult to legacy format
        return {
            "success": result.success,
            "data": result.data if result.success else None,
            "error": result.error if not result.success else None
        }
    
    async def get_plugin_metadata(self, plugin_id: str) -> Dict[str, Any]:
        """
        Get plugin metadata.
        
        Args:
            plugin_id: Plugin ID.
            
        Returns:
            Plugin metadata.
        """
        metadata = await self._plugin_manager.get_plugin_metadata(plugin_id)
        if metadata:
            # Convert to dict if it's a PluginMetadata object
            if isinstance(metadata, PluginMetadata):
                return {
                    "id": metadata.id,
                    "name": metadata.name,
                    "description": metadata.description,
                    "version": metadata.version,
                    "author": metadata.author,
                    "type": metadata.type,
                    "capabilities": metadata.capabilities,
                    "parameters": metadata.parameters,
                    "dependencies": metadata.dependencies,
                    "config": metadata.config
                }
            return metadata
        return {}
    
    async def list_plugins(self) -> List[Dict[str, Any]]:
        """
        List all registered plugins.
        
        Returns:
            List of plugin metadata.
        """
        return await self._plugin_manager.list_plugins()
    
    async def get_plugin_by_capability(self, capability: str) -> List[Dict[str, Any]]:
        """
        Find plugins with a specific capability.
        
        Args:
            capability: Capability to search for.
            
        Returns:
            List of matching plugin metadata.
        """
        plugins = await self._plugin_manager.list_plugins()
        return [
            plugin for plugin in plugins
            if "capabilities" in plugin and capability in plugin["capabilities"]
        ]

class LegacyCorePluginManagerWrapper:
    """
    Compatibility wrapper for the legacy core plugin manager interface.
    
    This class wraps the new plugin manager and exposes methods that match
    the interface of the legacy plugin manager in core/plugin_manager.py.
    """
    
    def __init__(self, plugin_manager):
        """Initialize with a new plugin manager instance."""
        self._plugin_manager = plugin_manager
    
    async def register_plugin(self, plugin_id: str, plugin_data: Dict[str, Any]) -> bool:
        """
        Register a plugin with the manager.
        
        Args:
            plugin_id: Plugin ID.
            plugin_data: Plugin metadata.
            
        Returns:
            Success status.
        """
        # Convert legacy format to new metadata
        metadata = PluginMetadata(
            id=plugin_id,
            name=plugin_data.get("name", plugin_id),
            description=plugin_data.get("description", ""),
            version=plugin_data.get("version", "1.0.0"),
            author=plugin_data.get("author", "unknown"),
            type=plugin_data.get("type", "utility"),
            capabilities=plugin_data.get("capabilities", []),
            parameters=plugin_data.get("parameters", {}),
            dependencies=plugin_data.get("dependencies", []),
            config=plugin_data.get("config", {})
        )
        
        return await self._plugin_manager.register_plugin(plugin_id, metadata)
    
    async def execute_plugin(self, plugin_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute a plugin.
        
        Args:
            plugin_id: Plugin ID.
            parameters: Execution parameters.
            
        Returns:
            Execution result.
        """
        result = await self._plugin_manager.execute_plugin(plugin_id, parameters)
        # Convert PluginResult to legacy format
        return {
            "success": result.success,
            "data": result.data if result.success else None,
            "error": result.error if not result.success else None
        }
    
    async def get_plugin_info(self, plugin_id: str) -> Dict[str, Any]:
        """
        Get plugin information.
        
        Args:
            plugin_id: Plugin ID.
            
        Returns:
            Plugin information.
        """
        metadata = await self._plugin_manager.get_plugin_metadata(plugin_id)
        return metadata.to_dict() if metadata else {}
    
    async def list_all_plugins(self) -> List[str]:
        """
        List all registered plugin IDs.
        
        Returns:
            List of plugin IDs.
        """
        plugins = await self._plugin_manager.list_plugins()
        return [plugin["id"] for plugin in plugins]
    
    async def list_plugins_by_type(self, plugin_type: str) -> List[str]:
        """
        List plugins of a specific type.
        
        Args:
            plugin_type: Plugin type to filter by.
            
        Returns:
            List of matching plugin IDs.
        """
        plugins = await self._plugin_manager.list_plugins({"type": plugin_type})
        return [plugin["id"] for plugin in plugins]
    
    async def find_plugins_by_capability(self, capability: str) -> List[str]:
        """
        Find plugins with a specific capability.
        
        Args:
            capability: Capability to search for.
            
        Returns:
            List of matching plugin IDs.
        """
        plugins = await self._plugin_manager.list_plugins()
        return [
            plugin["id"] for plugin in plugins
            if "capabilities" in plugin and capability in plugin["capabilities"]
        ]