"""
Plugin Validator
Validates plugin metadata and dependencies.
"""

import logging
import importlib
import pkg_resources
from typing import Dict, Any, List, Optional, Set
from pathlib import Path
import yaml
from .types import PluginError, PluginErrorType, PluginMetadata, PluginDependencies

class PluginValidator:
    """Validates plugin metadata and dependencies."""
    
    def __init__(self):
        """Initialize validator."""
        self.logger = logging.getLogger("plugin_validator")
    
    async def validate_plugin(self, plugin_path: Path) -> PluginMetadata:
        """Validate plugin directory and metadata."""
        try:
            # Validate plugin directory structure
            await self._validate_plugin_dir(plugin_path)
            
            # Validate metadata
            metadata = await self._validate_metadata(plugin_path)
            
            # Validate dependencies
            await self._validate_dependencies(metadata.dependencies)
            
            return metadata
        except Exception as e:
            raise PluginError(f"Plugin validation failed: {e}", PluginErrorType.VALIDATION_ERROR)
    
    async def _validate_plugin_dir(self, plugin_path: Path) -> None:
        """Validate plugin directory structure."""
        if not plugin_path.exists():
            raise PluginError(f"Plugin directory {plugin_path} does not exist", PluginErrorType.NOT_FOUND)
        
        if not plugin_path.is_dir():
            raise PluginError(f"{plugin_path} is not a directory", PluginErrorType.VALIDATION_ERROR)
        
        required_files = ["metadata.yaml", "plugin.py"]
        for file in required_files:
            if not (plugin_path / file).exists():
                raise PluginError(f"Required file {file} not found", PluginErrorType.VALIDATION_ERROR)
    
    async def _validate_metadata(self, plugin_path: Path) -> PluginMetadata:
        """Validate plugin metadata."""
        metadata_path = plugin_path / "metadata.yaml"
        try:
            with open(metadata_path) as f:
                data = yaml.safe_load(f)
            
            required_fields = ["name", "version", "description", "author"]
            for field in required_fields:
                if field not in data:
                    raise PluginError(f"Missing required field: {field}", PluginErrorType.VALIDATION_ERROR)
            
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
            raise PluginError(f"Failed to validate metadata: {e}", PluginErrorType.VALIDATION_ERROR)
    
    async def _validate_dependencies(self, dependencies: Optional[PluginDependencies]) -> None:
        """Validate plugin dependencies."""
        if not dependencies:
            return
        
        # Validate package dependencies
        for package, version in dependencies.packages.items():
            try:
                pkg_resources.require(f"{package}{version}")
            except pkg_resources.VersionConflict as e:
                raise PluginError(f"Package version conflict: {e}", PluginErrorType.DEPENDENCY_ERROR)
            except pkg_resources.DistributionNotFound as e:
                raise PluginError(f"Package not found: {e}", PluginErrorType.DEPENDENCY_ERROR)
    
    async def validate_plugin_file(self, plugin_path: Path) -> None:
        """Validate plugin.py file."""
        plugin_file = plugin_path / "plugin.py"
        if not plugin_file.exists():
            raise PluginError("plugin.py not found", PluginErrorType.NOT_FOUND)
        
        try:
            spec = importlib.util.spec_from_file_location("plugin", plugin_file)
            if spec is None or spec.loader is None:
                raise PluginError("Failed to load plugin module", PluginErrorType.VALIDATION_ERROR)
            
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            
            if not hasattr(module, "Plugin"):
                raise PluginError("Plugin class not found", PluginErrorType.VALIDATION_ERROR)
            
            plugin_class = getattr(module, "Plugin")
            if not issubclass(plugin_class, BasePlugin):
                raise PluginError("Plugin class must inherit from BasePlugin", PluginErrorType.VALIDATION_ERROR)
        except Exception as e:
            raise PluginError(f"Failed to validate plugin file: {e}", PluginErrorType.VALIDATION_ERROR)
    
    async def validate_metadata_file(self, metadata_path: Path) -> PluginMetadata:
        """Validate metadata.yaml file."""
        if not metadata_path.exists():
            raise PluginError("metadata.yaml not found", PluginErrorType.NOT_FOUND)
        
        try:
            with open(metadata_path) as f:
                data = yaml.safe_load(f)
            
            required_fields = ["name", "version", "description", "author"]
            for field in required_fields:
                if field not in data:
                    raise PluginError(f"Missing required field: {field}", PluginErrorType.VALIDATION_ERROR)
            
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
            raise PluginError(f"Failed to validate metadata file: {e}", PluginErrorType.VALIDATION_ERROR) 