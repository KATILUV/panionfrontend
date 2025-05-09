"""
Legacy Plugin Manager (core/plugin/manager.py) - Transition Module

DEPRECATED: This module is maintained for backward compatibility only.
Please use the consolidated plugin system in core/plugins/ instead.

This module serves as a transition bridge to the new consolidated plugin system.
"""

import warnings
from typing import Dict, Any, Optional, List

# Import from consolidated plugin system
# Use a relative import to avoid package issues
from ..plugins.compat import deprecated_core_plugin_manager

# Emit deprecation warning
warnings.warn(
    "The legacy core/plugin/manager.py module is deprecated and will be removed in a future version. "
    "Please use the consolidated plugin system in core/plugins/ instead.",
    DeprecationWarning,
    stacklevel=2
)

# Export compatibility interface
async def register_plugin(plugin_id: str, metadata: Dict[str, Any]) -> bool:
    """DEPRECATED: Register a plugin (compatibility method)."""
    return await deprecated_core_plugin_manager.register_plugin(plugin_id, metadata)

async def get_plugin(plugin_id: str) -> Optional[Dict[str, Any]]:
    """DEPRECATED: Get plugin details (compatibility method)."""
    return await deprecated_core_plugin_manager.get_plugin(plugin_id)

async def execute(plugin_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
    """DEPRECATED: Execute a plugin (compatibility method)."""
    return await deprecated_core_plugin_manager.execute(plugin_id, parameters)

# Create a singleton-like instance for direct imports
plugin_manager = deprecated_core_plugin_manager