"""
Plugin System Compatibility Module

This module provides compatibility layers between the old and new plugin systems.
It allows for gradual migration by exposing legacy interfaces that use the new consolidated system.

Key Components:
1. LegacyPluginAdapter - Adapts legacy plugins to work with the new BasePlugin interface
2. LegacyPluginManagerWrapper - Wraps the new plugin manager with the legacy interface
3. LegacyCorePluginManagerWrapper - Wraps the new plugin manager with the core legacy interface
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

class LegacyPluginAdapter(BasePlugin):
    """
    Adapter for legacy plugin implementations to the new BasePlugin interface.
    
    This allows legacy plugins to be used with the new plugin system without
    requiring their code to be rewritten.
    """
    
    def __init__(self, legacy_plugin, plugin_id: str, plugin_type: str = "utility"):
        """
        Initialize with a legacy plugin instance.
        
        Args:
            legacy_plugin: The legacy plugin instance to adapt.
            plugin_id: A unique identifier for the plugin.
            plugin_type: The type of plugin (default: "utility").
        """
        # Create metadata from legacy plugin attributes
        name = getattr(legacy_plugin, "name", plugin_id)
        description = getattr(legacy_plugin, "description", f"Legacy plugin: {name}")
        version = getattr(legacy_plugin, "version", "1.0.0")
        author = getattr(legacy_plugin, "author", "Unknown")
        capabilities = getattr(legacy_plugin, "capabilities", [])
        
        metadata = PluginMetadata(
            id=plugin_id,
            name=name,
            description=description,
            version=version,
            author=author,
            type=plugin_type,
            capabilities=capabilities
        )
        
        super().__init__(metadata)
        self.legacy_plugin = legacy_plugin
    
    async def initialize(self) -> PluginResult:
        """
        Initialize the legacy plugin.
        
        Returns:
            PluginResult with initialization status.
        """
        try:
            # Call initialize if it exists
            if hasattr(self.legacy_plugin, "initialize"):
                if asyncio.iscoroutinefunction(self.legacy_plugin.initialize):
                    result = await self.legacy_plugin.initialize()
                else:
                    result = self.legacy_plugin.initialize()
                
                # Handle various return types
                if isinstance(result, bool):
                    return PluginResult(
                        success=result,
                        message="Legacy plugin initialization complete" if result else "Legacy plugin initialization failed"
                    )
                elif isinstance(result, dict):
                    success = result.get("success", True)
                    message = result.get("message", "Legacy plugin initialization complete")
                    return PluginResult(
                        success=success,
                        message=message,
                        data=result
                    )
                else:
                    return PluginResult(
                        success=True,
                        message="Legacy plugin initialization complete",
                        data={"result": result}
                    )
            else:
                # No initialize method
                return PluginResult(
                    success=True,
                    message="Legacy plugin has no initialization method"
                )
        except Exception as e:
            logger.error(f"Error initializing legacy plugin {self.id}: {str(e)}")
            return PluginResult(
                success=False,
                message=f"Error initializing legacy plugin: {str(e)}",
                error=str(e)
            )
    
    async def execute(self, parameters: Dict[str, Any]) -> PluginResult:
        """
        Execute the legacy plugin.
        
        Args:
            parameters: Execution parameters.
            
        Returns:
            PluginResult with execution status.
        """
        try:
            # Handle different execution methods
            if "method" in parameters:
                method_name = parameters["method"]
                method_args = parameters.get("args", {})
                
                if hasattr(self.legacy_plugin, method_name):
                    method = getattr(self.legacy_plugin, method_name)
                    
                    if asyncio.iscoroutinefunction(method):
                        result = await method(**method_args)
                    else:
                        result = method(**method_args)
                    
                    # Handle various return types
                    if isinstance(result, bool):
                        return PluginResult(
                            success=result,
                            message=f"Method {method_name} execution complete",
                            data={"result": result}
                        )
                    elif isinstance(result, dict):
                        success = result.get("success", True)
                        message = result.get("message", f"Method {method_name} execution complete")
                        return PluginResult(
                            success=success,
                            message=message,
                            data=result
                        )
                    else:
                        return PluginResult(
                            success=True,
                            message=f"Method {method_name} execution complete",
                            data={"result": result}
                        )
                else:
                    return PluginResult(
                        success=False,
                        message=f"Method {method_name} not found in legacy plugin",
                        error=f"Method {method_name} not found"
                    )
            # Use the execute method if no specific method is specified
            elif hasattr(self.legacy_plugin, "execute"):
                if asyncio.iscoroutinefunction(self.legacy_plugin.execute):
                    result = await self.legacy_plugin.execute(parameters)
                else:
                    result = self.legacy_plugin.execute(parameters)
                
                # Handle various return types
                if isinstance(result, bool):
                    return PluginResult(
                        success=result,
                        message="Legacy plugin execution complete" if result else "Legacy plugin execution failed"
                    )
                elif isinstance(result, dict):
                    success = result.get("success", True)
                    message = result.get("message", "Legacy plugin execution complete")
                    return PluginResult(
                        success=success,
                        message=message,
                        data=result
                    )
                else:
                    return PluginResult(
                        success=True,
                        message="Legacy plugin execution complete",
                        data={"result": result}
                    )
            else:
                return PluginResult(
                    success=False,
                    message="Legacy plugin has no execute method and no specific method was requested",
                    error="No execute method available"
                )
        except Exception as e:
            logger.error(f"Error executing legacy plugin {self.id}: {str(e)}")
            return PluginResult(
                success=False,
                message=f"Error executing legacy plugin: {str(e)}",
                error=str(e)
            )
    
    async def cleanup(self) -> PluginResult:
        """
        Clean up the legacy plugin.
        
        Returns:
            PluginResult with cleanup status.
        """
        try:
            # Call cleanup if it exists
            if hasattr(self.legacy_plugin, "cleanup"):
                if asyncio.iscoroutinefunction(self.legacy_plugin.cleanup):
                    result = await self.legacy_plugin.cleanup()
                else:
                    result = self.legacy_plugin.cleanup()
                
                # Handle various return types
                if isinstance(result, bool):
                    return PluginResult(
                        success=result,
                        message="Legacy plugin cleanup complete" if result else "Legacy plugin cleanup failed"
                    )
                elif isinstance(result, dict):
                    success = result.get("success", True)
                    message = result.get("message", "Legacy plugin cleanup complete")
                    return PluginResult(
                        success=success,
                        message=message,
                        data=result
                    )
                else:
                    return PluginResult(
                        success=True,
                        message="Legacy plugin cleanup complete",
                        data={"result": result}
                    )
            else:
                # No cleanup method
                return PluginResult(
                    success=True,
                    message="Legacy plugin has no cleanup method"
                )
        except Exception as e:
            logger.error(f"Error cleaning up legacy plugin {self.id}: {str(e)}")
            return PluginResult(
                success=False,
                message=f"Error cleaning up legacy plugin: {str(e)}",
                error=str(e)
            )

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