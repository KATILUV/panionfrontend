"""
Plugin Templates Package

This package contains templates for different types of plugins that extend
the BasePlugin with specialized functionality.
"""

from .basic_plugin import BasicPlugin
from .service_plugin import ServicePlugin
from .utility_plugin import UtilityPlugin

__all__ = ['BasicPlugin', 'ServicePlugin', 'UtilityPlugin']