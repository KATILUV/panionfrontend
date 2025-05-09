"""
Consolidated Plugin System

This module provides a comprehensive plugin system for the Panion platform.
It consolidates functionality from multiple previous implementations into a 
coherent and well-organized structure.

Key components:
- Base plugin definitions
- Plugin interfaces
- Plugin management
- Plugin utilities
- Plugin templates

Design principles:
1. Separation of concerns
2. Clear interfaces
3. Comprehensive error handling
4. Scalable architecture
"""

from .base import BasePlugin, PluginMetadata, PluginResult
from .interfaces import (
    IPluginManager, IPluginDiscovery, IPluginFactory, IPluginRegistry,
    IPluginExecutor, IPluginLifecycle, PluginType, PluginState, PluginErrorType
)
from .manager import PluginManager, PluginError

# Create a singleton instance
plugin_manager = PluginManager()

__all__ = [
    # Base classes
    'BasePlugin', 'PluginMetadata', 'PluginResult',
    
    # Interfaces
    'IPluginManager', 'IPluginDiscovery', 'IPluginFactory', 'IPluginRegistry',
    'IPluginExecutor', 'IPluginLifecycle', 'PluginType', 'PluginState', 'PluginErrorType',
    
    # Manager
    'PluginManager', 'PluginError',
    
    # Singleton
    'plugin_manager'
]