"""
Legacy Base Plugin - Transition Module

DEPRECATED: This module is maintained for backward compatibility only.
Please use the consolidated plugin system in core/plugins/ instead.

This module serves as a transition bridge to the new consolidated plugin system.
"""

import warnings
from typing import Dict, Any, Optional
from abc import ABC, abstractmethod

# Import from consolidated plugin system
# Use a relative import to avoid package issues
from .plugins.base import BasePlugin as ConsolidatedBasePlugin

# Emit deprecation warning
warnings.warn(
    "The legacy base_plugin.py module is deprecated and will be removed in a future version. "
    "Please use the consolidated plugin system in core/plugins/ instead.",
    DeprecationWarning,
    stacklevel=2
)

# Compatibility class
class BasePlugin(ABC):
    """
    DEPRECATED: Legacy base plugin class maintained for compatibility.
    Please use core.plugins.base.BasePlugin instead.
    """
    
    def __init__(self):
        """Initialize the base plugin."""
        # Emit deprecation warning
        warnings.warn(
            "BasePlugin in base_plugin.py is deprecated. "
            "Please use core.plugins.base.BasePlugin instead.",
            DeprecationWarning,
            stacklevel=2
        )
        
    @abstractmethod
    async def execute(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """
        DEPRECATED: Execute the plugin's main functionality.
        This method must be implemented by all plugin subclasses.
        """
        raise NotImplementedError("Plugin subclasses must implement execute method")
        
    def validate_parameters(self, parameters: Dict[str, Any]) -> bool:
        """
        DEPRECATED: Validate the input parameters.
        """
        return True