"""
Plugin System Compatibility Module

This module provides compatibility with older versions of the plugin system.
It maps the new consolidated API to the old interfaces to maintain backward compatibility.

IMPORTANT: This module is for transition purposes only and will be removed in a future version.
New code should use the consolidated plugin system directly.
"""

import logging
from typing import Dict, Any, Optional, List

# Import the consolidated plugin system
from .manager.plugin_manager import PluginManager

logger = logging.getLogger(__name__)

class DeprecatedPluginManager:
    """Compatibility wrapper for the old plugin_manager.py interface."""
    
    def __init__(self):
        """Initialize the compatibility wrapper."""
        logger.warning(
            "DeprecatedPluginManager is being used. This is a compatibility layer "
            "that will be removed in a future version. Please migrate to the "
            "consolidated plugin system in core/plugins/."
        )
        # Get a reference to the central plugin manager
        self._plugin_manager = PluginManager.get_instance()
        
    async def register_plugin(self, plugin_id: str, plugin_data: Dict[str, Any]) -> bool:
        """Register a plugin (compatibility method).
        
        Args:
            plugin_id: Plugin ID
            plugin_data: Plugin data
            
        Returns:
            True if registration succeeded, False otherwise
        """
        try:
            # Convert the old format to the new format
            metadata = {
                "id": plugin_id,
                "name": plugin_data.get("name", plugin_id),
                "description": plugin_data.get("description", ""),
                "version": plugin_data.get("version", "1.0.0"),
                "author": plugin_data.get("author", "Unknown"),
                "license": plugin_data.get("license", ""),
                "type": plugin_data.get("type", "standard"),
                "capabilities": plugin_data.get("capabilities", []),
                "parameters": plugin_data.get("parameters", {}),
                "dependencies": plugin_data.get("dependencies", []),
                "config": plugin_data.get("config", {})
            }
            return await self._plugin_manager.register_plugin(plugin_id, metadata)
        except Exception as e:
            logger.error(f"Error in compat register_plugin: {e}")
            return False
        
    async def unregister_plugin(self, plugin_id: str) -> bool:
        """Unregister a plugin (compatibility method).
        
        Args:
            plugin_id: Plugin ID
            
        Returns:
            True if unregistration succeeded, False otherwise
        """
        try:
            return await self._plugin_manager.unregister_plugin(plugin_id)
        except Exception as e:
            logger.error(f"Error in compat unregister_plugin: {e}")
            return False
        
    async def execute_plugin(self, plugin_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a plugin (compatibility method).
        
        Args:
            plugin_id: Plugin ID
            parameters: Execution parameters
            
        Returns:
            Plugin execution result dictionary
        """
        try:
            result = await self._plugin_manager.execute_plugin(plugin_id, parameters)
            return result.data if result else {}
        except Exception as e:
            logger.error(f"Error in compat execute_plugin: {e}")
            return {"error": str(e), "success": False}
        
    async def list_plugins(self) -> List[Dict[str, Any]]:
        """List registered plugins (compatibility method).
        
        Returns:
            List of plugin dictionaries
        """
        try:
            plugins = await self._plugin_manager.list_plugins()
            # Convert to the old format
            return [
                {
                    "id": plugin.get("id", ""),
                    "name": plugin.get("name", ""),
                    "description": plugin.get("description", ""),
                    "version": plugin.get("version", ""),
                    "author": plugin.get("author", ""),
                    "type": plugin.get("type", "standard"),
                    "capabilities": plugin.get("capabilities", []),
                    "status": plugin.get("status", "active")
                }
                for plugin in plugins
            ]
        except Exception as e:
            logger.error(f"Error in compat list_plugins: {e}")
            return []
        
    async def get_plugin_metadata(self, plugin_id: str) -> Optional[Dict[str, Any]]:
        """Get plugin metadata (compatibility method).
        
        Args:
            plugin_id: Plugin ID
            
        Returns:
            Plugin metadata dictionary if found, None otherwise
        """
        try:
            metadata = await self._plugin_manager.get_plugin_metadata(plugin_id)
            if not metadata:
                return None
                
            # Convert to the old format
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
        except Exception as e:
            logger.error(f"Error in compat get_plugin_metadata: {e}")
            return None

class DeprecatedCorePluginManager:
    """Compatibility wrapper for the old plugin/manager.py interface."""
    
    def __init__(self):
        """Initialize the compatibility wrapper."""
        logger.warning(
            "DeprecatedCorePluginManager is being used. This is a compatibility layer "
            "that will be removed in a future version. Please migrate to the "
            "consolidated plugin system in core/plugins/."
        )
        # Get a reference to the central plugin manager
        self._plugin_manager = PluginManager.get_instance()
        
    async def register_plugin(self, plugin_id: str, metadata: Dict[str, Any]) -> bool:
        """Register a plugin (compatibility method).
        
        Args:
            plugin_id: Plugin ID
            metadata: Plugin metadata
            
        Returns:
            True if registration succeeded, False otherwise
        """
        try:
            # Ensure the metadata has the correct format expected by the consolidated system
            formatted_metadata = {
                "id": plugin_id,
                "name": metadata.get("name", plugin_id),
                "description": metadata.get("description", ""),
                "version": metadata.get("version", "1.0.0"),
                "author": metadata.get("author", "Unknown"),
                "license": metadata.get("license", ""),
                "type": metadata.get("type", "standard"),
                "capabilities": metadata.get("capabilities", []),
                "parameters": metadata.get("parameters", {}),
                "dependencies": metadata.get("dependencies", []),
                "config": metadata.get("config", {})
            }
            
            return await self._plugin_manager.register_plugin(plugin_id, formatted_metadata)
        except Exception as e:
            logger.error(f"Error in compat core register_plugin: {e}")
            return False
        
    async def get_plugin(self, plugin_id: str) -> Optional[Dict[str, Any]]:
        """Get plugin details (compatibility method).
        
        Args:
            plugin_id: Plugin ID
            
        Returns:
            Plugin details dictionary if found, None otherwise
        """
        try:
            metadata = await self._plugin_manager.get_plugin_metadata(plugin_id)
            if not metadata:
                return None
                
            # Convert to the format expected by the old interface
            return {
                "id": metadata.id,
                "name": metadata.name,
                "description": metadata.description,
                "version": metadata.version,
                "author": metadata.author,
                "type": metadata.type,
                "capabilities": metadata.capabilities,
                "parameters": metadata.parameters,
                "status": "active"  # Assuming active by default
            }
        except Exception as e:
            logger.error(f"Error in compat core get_plugin: {e}")
            return None
        
    async def execute(self, plugin_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a plugin (compatibility method).
        
        Args:
            plugin_id: Plugin ID
            parameters: Execution parameters
            
        Returns:
            Plugin execution result dictionary
        """
        try:
            result = await self._plugin_manager.execute_plugin(plugin_id, parameters)
            return result.data if result else {}
        except Exception as e:
            logger.error(f"Error in compat core execute: {e}")
            return {"error": str(e), "success": False}

# Create singleton-like instances for direct imports
deprecated_plugin_manager = DeprecatedPluginManager()
deprecated_core_plugin_manager = DeprecatedCorePluginManager()