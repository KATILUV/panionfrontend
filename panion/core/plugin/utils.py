"""
Plugin Utilities
Helper functions for plugin management.
"""

from typing import Dict, Any
from core.panion_errors import PluginError
from core.common_types import PluginErrorType

def validate_plugin_metadata(metadata: Dict[str, Any]) -> None:
    """Validate plugin metadata.
    
    Args:
        metadata: Plugin metadata dictionary
        
    Raises:
        PluginError: If metadata is invalid
    """
    # Check required fields
    required_fields = ['name', 'version', 'description', 'author']
    for field in required_fields:
        if field not in metadata:
            raise PluginError(
                f"Missing required metadata field: {field}",
                PluginErrorType.VALIDATION_ERROR
            )
        if not metadata[field]:
            raise PluginError(
                f"Empty required metadata field: {field}",
                PluginErrorType.VALIDATION_ERROR
            )
    
    # Validate version format (semantic versioning)
    version = metadata['version']
    if not isinstance(version, str):
        raise PluginError(
            "Version must be a string",
            PluginErrorType.VALIDATION_ERROR
        )
    
    # Basic semantic version validation
    parts = version.split('.')
    if len(parts) != 3:
        raise PluginError(
            "Version must follow semantic versioning (e.g. 1.0.0)",
            PluginErrorType.VALIDATION_ERROR
        )
    
    try:
        for part in parts:
            int(part)
    except ValueError:
        raise PluginError(
            "Version parts must be integers",
            PluginErrorType.VALIDATION_ERROR
        )
    
    # Validate dependencies if present
    if 'dependencies' in metadata:
        if not isinstance(metadata['dependencies'], list):
            raise PluginError(
                "Dependencies must be a list",
                PluginErrorType.VALIDATION_ERROR
            )
        for dep in metadata['dependencies']:
            if not isinstance(dep, str):
                raise PluginError(
                    "Dependency names must be strings",
                    PluginErrorType.VALIDATION_ERROR
                )
    
    # Validate config if present
    if 'config' in metadata:
        if not isinstance(metadata['config'], dict):
            raise PluginError(
                "Config must be a dictionary",
                PluginErrorType.VALIDATION_ERROR
            )

def get_plugin_class_name(plugin_dir: str) -> str:
    """Get the plugin class name from the plugin directory.
    
    Args:
        plugin_dir: Path to the plugin directory
        
    Returns:
        str: Plugin class name
        
    Raises:
        PluginError: If plugin class cannot be found
    """
    import os
    import importlib.util
    
    # Look for main.py or plugin.py
    for filename in ['main.py', 'plugin.py']:
        file_path = os.path.join(plugin_dir, filename)
        if os.path.exists(file_path):
            try:
                spec = importlib.util.spec_from_file_location("plugin_module", file_path)
                if spec is None or spec.loader is None:
                    raise PluginError(
                        f"Could not load plugin module from {file_path}",
                        PluginErrorType.LOAD_ERROR
                    )
                
                module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(module)
                
                # Find the first class that inherits from Plugin
                for name, obj in module.__dict__.items():
                    if isinstance(obj, type) and obj.__module__ == module.__name__:
                        return name
                
            except Exception as e:
                raise PluginError(
                    f"Error loading plugin module: {str(e)}",
                    PluginErrorType.LOAD_ERROR
                )
    
    raise PluginError(
        "No plugin class found in plugin directory",
        PluginErrorType.LOAD_ERROR
    ) 