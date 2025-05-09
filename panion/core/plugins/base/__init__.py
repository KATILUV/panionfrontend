"""
Base Plugin Module

This module provides the foundation for the consolidated plugin system.
It exports the essential base classes and types for creating plugins.
"""

from .plugin_base import BasePlugin, PluginMetadata, PluginResult

__all__ = [
    'BasePlugin',
    'PluginMetadata',
    'PluginResult',
]