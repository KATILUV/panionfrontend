"""
Plugin Utilities Module
Provides common utility functions for the plugin system.

This module consolidates utility functions from various plugin-related implementations
to provide a single source of utility functions for working with plugins.
"""

import importlib
import inspect
import json
import logging
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional, Set, Tuple, Type, Union

from ..base import BasePlugin, PluginMetadata
from ..interfaces import PluginType, PluginState

logger = logging.getLogger(__name__)

def discover_plugins_in_directory(directory: Union[str, Path], recursive: bool = True) -> List[Dict[str, Any]]:
    """Discover plugins in the specified directory.
    
    Args:
        directory: Directory to search for plugins
        recursive: Whether to search recursively in subdirectories
        
    Returns:
        List of plugin information dictionaries, each containing:
        - file_path: Path to the plugin file
        - module_path: Module path to import the plugin
        - class_name: Name of the plugin class
        - class_type: Type of the plugin class
    """
    directory = Path(directory)
    if not directory.exists() or not directory.is_dir():
        logger.warning(f"Directory does not exist or is not a directory: {directory}")
        return []
    
    pattern = "**/*.py" if recursive else "*.py"
    plugin_files = list(directory.glob(pattern))
    
    discovered_plugins = []
    
    for plugin_file in plugin_files:
        if plugin_file.name.startswith("__"):
            continue
        
        try:
            # Create module path
            rel_path = plugin_file.relative_to(directory)
            module_path = ".".join(rel_path.with_suffix("").parts)
            
            # Import module
            spec = importlib.util.spec_from_file_location(module_path, plugin_file)
            if not spec or not spec.loader:
                continue
                
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            
            # Find plugin classes
            for name, obj in inspect.getmembers(module):
                if (inspect.isclass(obj) and 
                    issubclass(obj, BasePlugin) and 
                    obj != BasePlugin):
                    
                    # Determine plugin type
                    plugin_type = PluginType.STANDARD  # Default
                    for type_name in PluginType.__members__:
                        if type_name.lower() in obj.__name__.lower():
                            plugin_type = PluginType[type_name]
                            break
                    
                    # Create plugin info
                    plugin_info = {
                        "file_path": str(plugin_file),
                        "module_path": module_path,
                        "class_name": name,
                        "class_type": obj.__name__,
                        "plugin_type": plugin_type.value,
                        "description": obj.__doc__ or "",
                    }
                    
                    discovered_plugins.append(plugin_info)
            
        except Exception as e:
            logger.warning(f"Error processing plugin file {plugin_file}: {e}")
    
    return discovered_plugins

def load_plugin_class(module_path: str, class_name: str) -> Optional[Type[BasePlugin]]:
    """Load a plugin class from a module path.
    
    Args:
        module_path: Path to the module
        class_name: Name of the class to load
        
    Returns:
        Plugin class if found, None otherwise
    """
    try:
        module = importlib.import_module(module_path)
        plugin_class = getattr(module, class_name, None)
        
        if plugin_class and issubclass(plugin_class, BasePlugin):
            return plugin_class
        else:
            logger.warning(f"Class {class_name} is not a BasePlugin subclass")
            return None
    
    except Exception as e:
        logger.error(f"Error loading plugin class {class_name} from {module_path}: {e}")
        return None

def validate_plugin_compatibility(metadata: PluginMetadata, requirements: Dict[str, str]) -> Tuple[bool, List[str]]:
    """Validate plugin compatibility with requirements.
    
    Args:
        metadata: Plugin metadata
        requirements: Dictionary of requirement keys and values
        
    Returns:
        Tuple of (is_compatible, list_of_incompatibilities)
    """
    incompatibilities = []
    
    # Check version requirements
    if "min_version" in requirements and metadata.version < requirements["min_version"]:
        incompatibilities.append(
            f"Version {metadata.version} is below minimum required version {requirements['min_version']}"
        )
    
    if "max_version" in requirements and metadata.version > requirements["max_version"]:
        incompatibilities.append(
            f"Version {metadata.version} is above maximum supported version {requirements['max_version']}"
        )
    
    # Check required capabilities
    if "required_capabilities" in requirements:
        missing_capabilities = set(requirements["required_capabilities"]) - set(metadata.capabilities)
        if missing_capabilities:
            incompatibilities.append(
                f"Missing required capabilities: {', '.join(missing_capabilities)}"
            )
    
    # Check resource requirements
    if "min_resources" in requirements:
        for resource, min_value in requirements["min_resources"].items():
            if resource not in metadata.resource_requirements or metadata.resource_requirements[resource] < min_value:
                incompatibilities.append(
                    f"Insufficient {resource} resources: "
                    f"has {metadata.resource_requirements.get(resource, 'none')} but requires {min_value}"
                )
    
    return (len(incompatibilities) == 0, incompatibilities)

def export_plugin_metadata(metadata: PluginMetadata, output_path: Union[str, Path]) -> bool:
    """Export plugin metadata to a file.
    
    Args:
        metadata: Plugin metadata to export
        output_path: Path to output file
        
    Returns:
        True if export succeeded, False otherwise
    """
    try:
        output_path = Path(output_path)
        
        # Create directory if it doesn't exist
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Convert metadata to dict
        metadata_dict = metadata.to_dict()
        
        # Write to file
        with open(output_path, 'w') as f:
            if output_path.suffix == '.json':
                json.dump(metadata_dict, f, indent=2)
            elif output_path.suffix in ['.yaml', '.yml']:
                import yaml
                yaml.dump(metadata_dict, f, default_flow_style=False)
            else:
                # Default to JSON
                json.dump(metadata_dict, f, indent=2)
        
        return True
        
    except Exception as e:
        logger.error(f"Error exporting plugin metadata: {e}")
        return False

def import_plugin_metadata(input_path: Union[str, Path]) -> Optional[PluginMetadata]:
    """Import plugin metadata from a file.
    
    Args:
        input_path: Path to input file
        
    Returns:
        Plugin metadata if import succeeded, None otherwise
    """
    try:
        input_path = Path(input_path)
        
        if not input_path.exists():
            logger.warning(f"Input file does not exist: {input_path}")
            return None
        
        # Read from file
        with open(input_path, 'r') as f:
            if input_path.suffix == '.json':
                metadata_dict = json.load(f)
            elif input_path.suffix in ['.yaml', '.yml']:
                import yaml
                metadata_dict = yaml.safe_load(f)
            else:
                # Default to JSON
                metadata_dict = json.load(f)
        
        # Create metadata
        return PluginMetadata.from_dict(metadata_dict)
        
    except Exception as e:
        logger.error(f"Error importing plugin metadata: {e}")
        return None