"""
Plugin Discovery System
Handles automatic discovery, versioning, and dependency management of plugins.
"""

import ast
import importlib
import logging
import os
import pkgutil
import re
import sys
from pathlib import Path
from typing import Dict, List, Set, Optional, Any, Tuple
from dataclasses import dataclass, field
import json
from datetime import datetime
import semver

from .base import BasePlugin, PluginMetadata
from ..error_handling import error_handler, with_error_recovery
from ..shared_state import shared_state

@dataclass
class PluginInfo:
    """Information about a discovered plugin."""
    name: str
    version: str
    description: str
    author: str
    capabilities: Set[str] = field(default_factory=set)
    dependencies: Dict[str, str] = field(default_factory=dict)  # name -> version
    path: Path = field(default_factory=Path)
    metadata: Dict[str, Any] = field(default_factory=dict)
    last_modified: datetime = field(default_factory=datetime.now)
    is_enabled: bool = True

class PluginDiscovery:
    """Handles plugin discovery and management."""
    
    def __init__(self):
        """Initialize plugin discovery system."""
        self.logger = logging.getLogger("PluginDiscovery")
        self._setup_logging()
        
        # Plugin registry
        self._plugins: Dict[str, PluginInfo] = {}
        
        # Version constraints
        self._version_constraints: Dict[str, str] = {}
        
        # Initialize discovery
        self._load_version_constraints()
        
        # Register with shared state
        shared_state.register_component("plugin_discovery", self)
    
    def _setup_logging(self) -> None:
        """Setup discovery logging."""
        log_file = Path("logs") / "plugin_discovery.log"
        log_file.parent.mkdir(exist_ok=True)
        
        handler = logging.FileHandler(log_file)
        handler.setFormatter(logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        ))
        self.logger.addHandler(handler)
    
    def _load_version_constraints(self) -> None:
        """Load version constraints from config."""
        try:
            config_file = Path("config") / "version_constraints.json"
            if config_file.exists():
                with open(config_file) as f:
                    self._version_constraints = json.load(f)
                    
        except Exception as e:
            self.logger.error(f"Failed to load version constraints: {str(e)}")
    
    @with_error_recovery
    def discover_plugins(self, plugin_dir: Optional[Path] = None) -> Dict[str, PluginInfo]:
        """Discover plugins in the specified directory.
        
        Args:
            plugin_dir: Directory to search for plugins
            
        Returns:
            Dict[str, PluginInfo]: Dictionary of discovered plugins
        """
        try:
            if plugin_dir is None:
                plugin_dir = Path("plugins")
            
            if not plugin_dir.exists():
                self.logger.warning(f"Plugin directory {plugin_dir} does not exist")
                return {}
            
            # Clear existing plugins
            self._plugins.clear()
            
            # Discover plugins
            for module_info in pkgutil.iter_modules([str(plugin_dir)]):
                if module_info.name.startswith("_"):
                    continue
                
                try:
                    # Import module
                    module = importlib.import_module(f"plugins.{module_info.name}")
                    
                    # Extract plugin info
                    plugin_info = self._extract_plugin_info(module, module_info)
                    if plugin_info:
                        self._plugins[plugin_info.name] = plugin_info
                        
                except Exception as e:
                    self.logger.error(f"Failed to discover plugin {module_info.name}: {str(e)}")
            
            return self._plugins
            
        except Exception as e:
            self.logger.error(f"Failed to discover plugins: {str(e)}")
            return {}
    
    def _extract_plugin_info(self, module: Any, module_info: pkgutil.ModuleInfo) -> Optional[PluginInfo]:
        """Extract plugin information from module.
        
        Args:
            module: Python module
            module_info: Module information
            
        Returns:
            Optional[PluginInfo]: Plugin information if found
        """
        try:
            # Find plugin class
            plugin_class = None
            for name, obj in module.__dict__.items():
                if (isinstance(obj, type) and 
                    issubclass(obj, BasePlugin) and 
                    obj != BasePlugin):
                    plugin_class = obj
                    break
            
            if not plugin_class:
                return None
            
            # Get plugin metadata
            metadata = getattr(plugin_class, "metadata", PluginMetadata())
            
            # Create plugin info
            plugin_info = PluginInfo(
                name=metadata.name,
                version=metadata.version,
                description=metadata.description,
                author=metadata.author,
                capabilities=set(metadata.capabilities),
                dependencies=metadata.dependencies,
                path=Path(module_info.module_finder.path) / f"{module_info.name}.py",
                metadata=metadata.metadata,
                last_modified=datetime.fromtimestamp(
                    os.path.getmtime(Path(module_info.module_finder.path) / f"{module_info.name}.py")
                )
            )
            
            return plugin_info
            
        except Exception as e:
            self.logger.error(f"Failed to extract plugin info: {str(e)}")
            return None
    
    def get_plugin_info(self, name: str) -> Optional[PluginInfo]:
        """Get information about a plugin.
        
        Args:
            name: Plugin name
            
        Returns:
            Optional[PluginInfo]: Plugin information if found
        """
        return self._plugins.get(name)
    
    def get_plugin_dependencies(self, name: str) -> Dict[str, str]:
        """Get plugin dependencies.
        
        Args:
            name: Plugin name
            
        Returns:
            Dict[str, str]: Plugin dependencies
        """
        plugin_info = self.get_plugin_info(name)
        if not plugin_info:
            return {}
        
        return plugin_info.dependencies
    
    def check_dependencies(self, name: str) -> Tuple[bool, List[str]]:
        """Check if plugin dependencies are satisfied.
        
        Args:
            name: Plugin name
            
        Returns:
            Tuple[bool, List[str]]: (satisfied, missing_dependencies)
        """
        plugin_info = self.get_plugin_info(name)
        if not plugin_info:
            return False, [f"Plugin {name} not found"]
        
        missing = []
        for dep_name, dep_version in plugin_info.dependencies.items():
            # Check if dependency exists
            dep_info = self.get_plugin_info(dep_name)
            if not dep_info:
                missing.append(f"Dependency {dep_name} not found")
                continue
            
            # Check version compatibility
            if not self._check_version_compatibility(dep_info.version, dep_version):
                missing.append(
                    f"Dependency {dep_name} version {dep_info.version} "
                    f"does not satisfy requirement {dep_version}"
                )
        
        return len(missing) == 0, missing
    
    def _check_version_compatibility(self, version: str, constraint: str) -> bool:
        """Check if version satisfies constraint.
        
        Args:
            version: Version to check
            constraint: Version constraint
            
        Returns:
            bool: True if compatible
        """
        try:
            return semver.VersionInfo.parse(version).match(constraint)
        except Exception:
            return False
    
    def get_plugin_versions(self) -> Dict[str, str]:
        """Get versions of all plugins.
        
        Returns:
            Dict[str, str]: Plugin versions
        """
        return {
            name: info.version
            for name, info in self._plugins.items()
        }
    
    def get_plugin_capabilities(self) -> Dict[str, Set[str]]:
        """Get capabilities of all plugins.
        
        Returns:
            Dict[str, Set[str]]: Plugin capabilities
        """
        return {
            name: info.capabilities
            for name, info in self._plugins.items()
        }
    
    def find_plugins_by_capability(self, capability: str) -> List[str]:
        """Find plugins that provide a capability.
        
        Args:
            capability: Capability to search for
            
        Returns:
            List[str]: List of plugin names
        """
        return [
            name
            for name, info in self._plugins.items()
            if capability in info.capabilities
        ]
    
    def validate_plugin(self, name: str) -> Tuple[bool, List[str]]:
        """Validate a plugin.
        
        Args:
            name: Plugin name
            
        Returns:
            Tuple[bool, List[str]]: (valid, issues)
        """
        plugin_info = self.get_plugin_info(name)
        if not plugin_info:
            return False, [f"Plugin {name} not found"]
        
        issues = []
        
        # Check version format
        try:
            semver.VersionInfo.parse(plugin_info.version)
        except Exception:
            issues.append(f"Invalid version format: {plugin_info.version}")
        
        # Check dependencies
        deps_satisfied, missing_deps = self.check_dependencies(name)
        if not deps_satisfied:
            issues.extend(missing_deps)
        
        # Check capabilities
        if not plugin_info.capabilities:
            issues.append("No capabilities defined")
        
        return len(issues) == 0, issues
    
    def get_plugin_status(self) -> Dict[str, Dict[str, Any]]:
        """Get status of all plugins.
        
        Returns:
            Dict[str, Dict[str, Any]]: Plugin status
        """
        status = {}
        for name, info in self._plugins.items():
            is_valid, issues = self.validate_plugin(name)
            deps_satisfied, missing_deps = self.check_dependencies(name)
            
            status[name] = {
                "version": info.version,
                "enabled": info.is_enabled,
                "valid": is_valid,
                "issues": issues,
                "dependencies_satisfied": deps_satisfied,
                "missing_dependencies": missing_deps,
                "capabilities": list(info.capabilities),
                "last_modified": info.last_modified.isoformat()
            }
        
        return status

# Create global plugin discovery instance
plugin_discovery = PluginDiscovery() 