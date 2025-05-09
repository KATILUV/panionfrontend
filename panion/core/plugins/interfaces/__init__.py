"""
Plugin Interfaces Module

This module contains interface definitions for the plugin system.
These interfaces define the contracts that plugin components must follow.
"""

from .plugin_interfaces import IPluginManager, PluginType, PluginState

__all__ = [
    'IPluginManager',
    'PluginType',
    'PluginState',
]