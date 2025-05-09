"""
Consolidated Plugin System Package

This package provides a unified plugin system for Panion.
It consolidates functionality from various existing plugin implementations:
- core/base_plugin.py
- core/plugin_manager.py
- core/plugin/*.py

The consolidated system offers:
- A standardized plugin base class
- Unified interfaces for plugin operations
- Centralized plugin management
- Backward compatibility with legacy implementations
"""

# Import key components
from .base import BasePlugin, PluginMetadata, PluginResult
from .interfaces import IPluginManager, PluginType, PluginState
from .manager import PluginManager
from .exceptions import (
    PluginError, PluginErrorType, PluginNotFoundError,
    PluginValidationError, PluginExecutionError, PluginDependencyError
)

# Import compatibility modules
from .compat import deprecated_plugin_manager, deprecated_core_plugin_manager

__all__ = [
    # Base plugin components
    'BasePlugin',
    'PluginMetadata',
    'PluginResult',
    
    # Interfaces
    'IPluginManager',
    'PluginType',
    'PluginState',
    
    # Management
    'PluginManager',
    
    # Exceptions
    'PluginError',
    'PluginErrorType',
    'PluginNotFoundError',
    'PluginValidationError',
    'PluginExecutionError',
    'PluginDependencyError',
    
    # Compatibility
    'deprecated_plugin_manager',
    'deprecated_core_plugin_manager',
]