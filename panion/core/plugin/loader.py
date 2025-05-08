"""
Plugin Loader
Unified plugin loading system for Panion.
"""

import os
import sys
import importlib
import logging
from typing import Dict, List, Optional, Type, Any, Tuple
from datetime import datetime
from pathlib import Path
import yaml
import json
import semver

from core.plugin.base import BasePlugin
from core.plugin.types import PluginInfo, PluginMetadata, PluginState
from core.panion_errors import PluginError, PluginErrorType
from core.logging_config import get_logger, LogTimer
from core.config import plugin_config

class PluginLoader:
    """Unified plugin loading system."""
    
    def __init__(self):
        """Initialize the plugin loader."""
        self.logger = logging.getLogger(__name__)
        self._max_load_attempts = plugin_config.max_retries
        self._retry_delay = plugin_config.retry_delay
        self._required_metadata_fields = {
            'name': str,
            'version': str,
            'description': str,
            'author': str,
            'dependencies': dict,
            'python_version': str,
            'entry_point': str,
            'type': str,
            'tags': list
        }
        self._min_python_version = '3.8'
        self._max_python_version = '3.11'
    
    async def discover_plugins(self, plugin_dir: str) -> List[Tuple[str, Type[BasePlugin]]]:
        """Discover and import all plugins in the specified directory."""
        plugins = []
        
        # Add plugin directory to Python path
        if plugin_dir not in sys.path:
            sys.path.append(plugin_dir)
            
        # Walk through plugin directory
        for root, _, files in os.walk(plugin_dir):
            for file in files:
                if file == "plugin.py":
                    try:
                        # Get plugin directory name as plugin ID
                        plugin_id = os.path.basename(os.path.dirname(os.path.join(root, file)))
                        
                        # Import plugin module
                        module_path = os.path.join(root, file)
                        spec = importlib.util.spec_from_file_location(plugin_id, module_path)
                        if spec and spec.loader:
                            module = importlib.util.module_from_spec(spec)
                            spec.loader.exec_module(module)
                            
                            # Find plugin class
                            for attr_name in dir(module):
                                attr = getattr(module, attr_name)
                                if (isinstance(attr, type) and 
                                    issubclass(attr, BasePlugin) and 
                                    attr != BasePlugin):
                                    plugins.append((plugin_id, attr))
                                    break
                                    
                    except Exception as e:
                        self.logger.error(f"Error discovering plugin in {file}: {e}")
                        continue
                        
        return plugins
    
    async def load_metadata(self, plugin_dir: str) -> Optional[PluginMetadata]:
        """Load plugin metadata from metadata.yaml."""
        try:
            metadata_path = os.path.join(plugin_dir, 'metadata.yaml')
            with open(metadata_path, 'r') as f:
                metadata_dict = yaml.safe_load(f)
                
            # Validate required fields
            for field, field_type in self._required_metadata_fields.items():
                if field not in metadata_dict:
                    raise PluginError(f"Missing required field: {field}", PluginErrorType.VALIDATION_ERROR)
                if not isinstance(metadata_dict[field], field_type):
                    raise PluginError(f"Invalid type for {field}", PluginErrorType.VALIDATION_ERROR)
            
            # Validate version format
            try:
                semver.parse(metadata_dict['version'])
            except ValueError:
                raise PluginError(f"Invalid version format: {metadata_dict['version']}", PluginErrorType.VALIDATION_ERROR)
            
            # Validate Python version
            py_version = metadata_dict['python_version']
            if not (self._min_python_version <= py_version <= self._max_python_version):
                raise PluginError(
                    f"Python version {py_version} not supported. Must be between {self._min_python_version} and {self._max_python_version}",
                    PluginErrorType.VALIDATION_ERROR
                )
            
            # Convert dependencies to new format if needed
            if 'dependencies' in metadata_dict:
                if isinstance(metadata_dict['dependencies'], dict):
                    plugin_deps = {k: v for k, v in metadata_dict['dependencies'].items() if k.startswith('plugin:')}
                    package_deps = {k: v for k, v in metadata_dict['dependencies'].items() if not k.startswith('plugin:')}
                    metadata_dict['dependencies'] = {
                        'plugins': plugin_deps,
                        'packages': package_deps
                    }
            
            return PluginMetadata(**metadata_dict)
            
        except Exception as e:
            self.logger.error(f"Error loading metadata: {e}")
            return None
    
    async def load_plugin_module(self, plugin_dir: str) -> Optional[object]:
        """Load plugin module from plugin.py."""
        try:
            plugin_path = os.path.join(plugin_dir, 'plugin.py')
            spec = importlib.util.spec_from_file_location("plugin_module", plugin_path)
            if spec is None or spec.loader is None:
                return None
                
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            return module
            
        except Exception as e:
            self.logger.error(f"Error loading plugin module: {e}")
            return None
    
    def find_plugin_class(self, module: object) -> Optional[Type[BasePlugin]]:
        """Find the plugin class in a module."""
        try:
            for item_name in dir(module):
                item = getattr(module, item_name)
                if isinstance(item, type) and issubclass(item, BasePlugin) and item != BasePlugin:
                    return item
            return None
            
        except Exception as e:
            self.logger.error(f"Error finding plugin class: {e}")
            return None
    
    async def initialize_plugin(self, plugin: BasePlugin, plugin_id: str) -> None:
        """Initialize a plugin instance."""
        try:
            # Update state
            plugin.state = PluginState.LOADING
            
            # Initialize plugin
            await plugin.initialize()
            
            # Update state
            plugin.state = PluginState.LOADED
            self.logger.info(f"Plugin {plugin_id} initialized successfully")
            
        except Exception as e:
            plugin.state = PluginState.ERROR
            raise PluginError(f"Failed to initialize plugin {plugin_id}: {e}", PluginErrorType.INIT_ERROR)
    
    async def validate_plugin(self, plugin: BasePlugin) -> bool:
        """Validate a plugin's functionality."""
        try:
            # Basic validation
            if not plugin.metadata:
                return False
            if not plugin.metadata.name:
                return False
            if not plugin.metadata.version:
                return False
            
            # Validate entry point
            if not os.path.exists(plugin.metadata.entry_point):
                return False
            
            return True
            
        except Exception as e:
            self.logger.error(f"Error validating plugin: {e}")
            return False 