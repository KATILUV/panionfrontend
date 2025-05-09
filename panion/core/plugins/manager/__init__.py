"""
Plugin Manager Module

This module provides centralized management for plugins in the system.
It exports the main manager class and related types.
"""

from .plugin_manager import PluginManager
from ..exceptions import PluginError

__all__ = [
    'PluginManager',
    'PluginError',
]