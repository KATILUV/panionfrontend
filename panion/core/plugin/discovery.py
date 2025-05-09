"""
Plugin Discovery System

This module provides functionality for automatically discovering plugins
in specified directories, making it easier to extend the system with
new plugins without manual registration.
"""

import importlib
import inspect
import logging
import os
import sys
from pathlib import Path
from typing import Dict, List, Optional, Set, Type, Any, Tuple

from .base import BasePlugin

logger = logging.getLogger(__name__)

class PluginDiscovery:
    """System for discovering and loading plugins from directories."""
    
    def __init__(self):
        """Initialize the plugin discovery system."""
        self._plugin_directories: List[Path] = []
        self._discovered_plugins: Dict[str, Type[BasePlugin]] = {}
        self._loaded_modules: Set[str] = set()
        
    def add_plugin_directory(self, directory_path: str) -> bool:
        """Add a directory to search for plugins.
        
        Args:
            directory_path: Path to the directory to search for plugins.
            
        Returns:
            bool: True if the directory was added, False otherwise.
        """
        try:
            path = Path(directory_path).resolve()
            if not path.exists():
                logger.warning(f"Plugin directory does not exist: {path}")
                return False
                
            if not path.is_dir():
                logger.warning(f"Plugin path is not a directory: {path}")
                return False
                
            if path in self._plugin_directories:
                logger.info(f"Plugin directory already added: {path}")
                return False
                
            self._plugin_directories.append(path)
            logger.info(f"Added plugin directory: {path}")
            return True
        except Exception as e:
            logger.error(f"Error adding plugin directory: {str(e)}")
            return False
            
    def remove_plugin_directory(self, directory_path: str) -> bool:
        """Remove a directory from the plugin search paths.
        
        Args:
            directory_path: Path to the directory to remove.
            
        Returns:
            bool: True if the directory was removed, False otherwise.
        """
        try:
            path = Path(directory_path).resolve()
            if path in self._plugin_directories:
                self._plugin_directories.remove(path)
                logger.info(f"Removed plugin directory: {path}")
                return True
                
            logger.warning(f"Plugin directory not found: {path}")
            return False
        except Exception as e:
            logger.error(f"Error removing plugin directory: {str(e)}")
            return False
            
    def discover_plugins(self, reload: bool = False) -> Dict[str, Type[BasePlugin]]:
        """Discover all plugins in the registered directories.
        
        Args:
            reload: If True, rediscover plugins even if they've been loaded before.
            
        Returns:
            Dict[str, Type[BasePlugin]]: Dictionary of discovered plugin classes.
        """
        if reload:
            self._discovered_plugins = {}
            self._loaded_modules = set()
            
        for directory in self._plugin_directories:
            self._discover_in_directory(directory)
            
        return self._discovered_plugins
        
    def get_plugin_class(self, plugin_name: str) -> Optional[Type[BasePlugin]]:
        """Get a discovered plugin class by name.
        
        Args:
            plugin_name: Name of the plugin to retrieve.
            
        Returns:
            Optional[Type[BasePlugin]]: The plugin class if found, None otherwise.
        """
        return self._discovered_plugins.get(plugin_name)
        
    def get_all_plugin_classes(self) -> Dict[str, Type[BasePlugin]]:
        """Get all discovered plugin classes.
        
        Returns:
            Dict[str, Type[BasePlugin]]: Dictionary of all discovered plugin classes.
        """
        return self._discovered_plugins.copy()
        
    def _discover_in_directory(self, directory: Path) -> None:
        """Discover plugins in a specific directory.
        
        Args:
            directory: Directory to search for plugins.
        """
        try:
            # Add the directory to the Python path if not already there
            directory_str = str(directory)
            if directory_str not in sys.path:
                sys.path.append(directory_str)
                
            # Find Python files in the directory
            for file_path in directory.glob("**/*.py"):
                if file_path.name.startswith("__"):
                    continue
                    
                rel_path = file_path.relative_to(directory)
                module_path = str(rel_path).replace(os.sep, ".").replace(".py", "")
                
                # Skip modules we've already loaded
                if module_path in self._loaded_modules and module_path not in self._discovered_plugins:
                    continue
                    
                self._load_plugins_from_module(module_path)
                
        except Exception as e:
            logger.error(f"Error discovering plugins in directory {directory}: {str(e)}")
            
    def _load_plugins_from_module(self, module_path: str) -> None:
        """Load plugins from a specific module.
        
        Args:
            module_path: Import path of the module to load.
        """
        try:
            # Import the module
            module = importlib.import_module(module_path)
            self._loaded_modules.add(module_path)
            
            # Find plugin classes in the module
            for name, obj in inspect.getmembers(module, inspect.isclass):
                if self._is_valid_plugin_class(obj):
                    plugin_name = getattr(obj, "PLUGIN_NAME", obj.__name__)
                    self._discovered_plugins[plugin_name] = obj
                    logger.info(f"Discovered plugin: {plugin_name} in {module_path}")
                    
        except ImportError as e:
            logger.warning(f"Could not import module {module_path}: {str(e)}")
        except Exception as e:
            logger.error(f"Error loading plugins from module {module_path}: {str(e)}")
            
    def _is_valid_plugin_class(self, obj: Any) -> bool:
        """Check if an object is a valid plugin class.
        
        Args:
            obj: Object to check.
            
        Returns:
            bool: True if the object is a valid plugin class, False otherwise.
        """
        if not inspect.isclass(obj):
            return False
            
        # Check if it's a subclass of BasePlugin but not BasePlugin itself
        return (issubclass(obj, BasePlugin) and 
                obj is not BasePlugin and
                not obj.__name__.startswith("_"))
                
    def instantiate_plugins(self) -> Dict[str, BasePlugin]:
        """Instantiate all discovered plugins.
        
        Returns:
            Dict[str, BasePlugin]: Dictionary of instantiated plugins.
        """
        instantiated_plugins = {}
        
        for name, plugin_class in self._discovered_plugins.items():
            try:
                logger.info(f"Instantiating plugin: {name}")
                plugin = plugin_class()
                instantiated_plugins[name] = plugin
            except Exception as e:
                logger.error(f"Error instantiating plugin {name}: {str(e)}")
                
        return instantiated_plugins

    def discover_and_instantiate(self, directory_paths: List[str]) -> Tuple[Dict[str, Type[BasePlugin]], Dict[str, BasePlugin]]:
        """Discover and instantiate plugins from multiple directories.
        
        Args:
            directory_paths: List of directory paths to search for plugins.
            
        Returns:
            Tuple[Dict[str, Type[BasePlugin]], Dict[str, BasePlugin]]: 
                Tuple of (discovered plugin classes, instantiated plugins).
        """
        # Add all directories
        for path in directory_paths:
            self.add_plugin_directory(path)
            
        # Discover plugins
        discovered = self.discover_plugins()
        
        # Instantiate plugins
        instantiated = self.instantiate_plugins()
        
        return discovered, instantiated

# Global instance for convenience
plugin_discovery = PluginDiscovery()