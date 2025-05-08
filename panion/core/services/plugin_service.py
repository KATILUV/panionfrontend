"""
Plugin Service
Handles plugin lifecycle management and execution.
"""

import asyncio
import logging
import yaml
import os
import importlib.util
import sys
from pathlib import Path
from typing import Dict, Any, Optional, List, Set
from ..plugin.base import BasePlugin
from ..plugin.types import PluginState, PluginError, PluginErrorType, PluginMetadata

class PluginService:
    """Service for managing plugins."""
    
    def __init__(self, plugin_dir: str = "plugins"):
        """Initialize plugin service."""
        self.plugin_dir = Path(plugin_dir)
        self.plugins: Dict[str, BasePlugin] = {}
        self.logger = logging.getLogger("plugin_service")
    
    async def load_plugins(self) -> None:
        """Load all plugins from the plugin directory."""
        if not self.plugin_dir.exists():
            self.logger.warning(f"Plugin directory {self.plugin_dir} does not exist")
            return
        
        for plugin_path in self.plugin_dir.iterdir():
            if not plugin_path.is_dir():
                continue
            
            try:
                metadata = await self._load_plugin_metadata(plugin_path)
                plugin = await self._load_plugin_module(plugin_path, metadata)
                self.plugins[plugin.plugin_id] = plugin
                self.logger.info(f"Loaded plugin {plugin.name} v{plugin.version}")
            except Exception as e:
                self.logger.error(f"Failed to load plugin from {plugin_path}: {e}")
    
    async def _load_plugin_metadata(self, plugin_path: Path) -> PluginMetadata:
        """Load plugin metadata from metadata.yaml."""
        metadata_path = plugin_path / "metadata.yaml"
        if not metadata_path.exists():
            raise PluginError("metadata.yaml not found", PluginErrorType.NOT_FOUND)
        
        try:
            with open(metadata_path) as f:
                data = yaml.safe_load(f)
            
            return PluginMetadata(
                name=data["name"],
                version=data["version"],
                description=data["description"],
                author=data["author"],
                dependencies=data.get("dependencies"),
                security_level=data.get("security_level", "low"),
                rate_limit=data.get("rate_limit"),
                config_schema=data.get("config_schema")
            )
        except Exception as e:
            raise PluginError(f"Failed to load metadata: {e}", PluginErrorType.VALIDATION_ERROR)
    
    async def _load_plugin_module(self, plugin_path: Path, metadata: PluginMetadata) -> BasePlugin:
        """Load plugin module and create plugin instance."""
        plugin_file = plugin_path / "plugin.py"
        if not plugin_file.exists():
            raise PluginError("plugin.py not found", PluginErrorType.NOT_FOUND)
        
        try:
            spec = importlib.util.spec_from_file_location(metadata.name, plugin_file)
            if spec is None or spec.loader is None:
                raise PluginError("Failed to load plugin module", PluginErrorType.VALIDATION_ERROR)
            
            module = importlib.util.module_from_spec(spec)
            sys.modules[metadata.name] = module
            spec.loader.exec_module(module)
            
            plugin_class = getattr(module, "Plugin")
            plugin = plugin_class(
                plugin_id=metadata.name,
                name=metadata.name,
                version=metadata.version,
                dependencies=metadata.dependencies
            )
            
            return plugin
        except Exception as e:
            raise PluginError(f"Failed to load plugin module: {e}", PluginErrorType.VALIDATION_ERROR)
    
    async def start_plugins(self) -> None:
        """Start all loaded plugins."""
        for plugin_id, plugin in self.plugins.items():
            try:
                await plugin.initialize()
                await plugin.start()
                self.logger.info(f"Started plugin {plugin.name}")
            except Exception as e:
                self.logger.error(f"Failed to start plugin {plugin.name}: {e}")
    
    async def stop_plugins(self) -> None:
        """Stop all running plugins."""
        for plugin_id, plugin in self.plugins.items():
            try:
                await plugin.stop()
                self.logger.info(f"Stopped plugin {plugin.name}")
            except Exception as e:
                self.logger.error(f"Failed to stop plugin {plugin.name}: {e}")
    
    async def cleanup_plugins(self) -> None:
        """Cleanup all plugins."""
        for plugin_id, plugin in self.plugins.items():
            try:
                await plugin.cleanup()
                self.logger.info(f"Cleaned up plugin {plugin.name}")
            except Exception as e:
                self.logger.error(f"Failed to cleanup plugin {plugin.name}: {e}")
    
    async def execute_plugin(self, plugin_id: str, command: str, args: Optional[Dict[str, Any]] = None) -> Any:
        """Execute a command on a plugin."""
        plugin = self.plugins.get(plugin_id)
        if not plugin:
            raise PluginError(f"Plugin {plugin_id} not found", PluginErrorType.NOT_FOUND)
        
        try:
            return await plugin.execute(command, args or {})
        except Exception as e:
            self.logger.error(f"Failed to execute command {command} on plugin {plugin_id}: {e}")
            raise
    
    def get_plugin_state(self, plugin_id: str) -> Optional[PluginState]:
        """Get the state of a plugin."""
        plugin = self.plugins.get(plugin_id)
        return plugin.get_state() if plugin else None
    
    def get_plugin_metrics(self, plugin_id: str) -> Optional[Dict[str, Any]]:
        """Get metrics for a plugin."""
        plugin = self.plugins.get(plugin_id)
        return plugin.get_metrics() if plugin else None
    
    def get_loaded_plugins(self) -> List[str]:
        """Get list of loaded plugin IDs."""
        return list(self.plugins.keys()) 