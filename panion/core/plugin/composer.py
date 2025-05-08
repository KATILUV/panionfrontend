"""
Plugin Composer
Handles dynamic plugin composition and loading.
"""

import logging
import importlib
from typing import Dict, Any, Optional
from pathlib import Path

from .base import BasePlugin
from .utils.security import safe_exec, CodeSecurityError
from core.panion_errors import PluginError

logger = logging.getLogger(__name__)

class PluginComposer:
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    def compose_plugin(self, plugin_code: str, metadata: Dict[str, Any]) -> BasePlugin:
        """
        Compose a plugin from code and metadata.
        
        Args:
            plugin_code: The plugin code to execute
            metadata: Plugin metadata
            
        Returns:
            Composed plugin instance
            
        Raises:
            PluginError: If plugin composition fails
        """
        try:
            # Create module for plugin
            spec = importlib.util.spec_from_loader("plugin", loader=None)
            module = importlib.util.module_from_spec(spec)
            
            # Execute plugin code safely
            try:
                safe_exec(plugin_code, module.__dict__)
            except CodeSecurityError as e:
                self.logger.error(f"Security error composing plugin: {e}")
                raise PluginError(f"Plugin code failed security validation: {str(e)}")
            
            # Find plugin class
            plugin_class = None
            for name, obj in module.__dict__.items():
                if (isinstance(obj, type) and 
                    issubclass(obj, BasePlugin) and 
                    obj != BasePlugin):
                    plugin_class = obj
                    break
            
            if not plugin_class:
                raise PluginError("No valid plugin class found in code")
            
            # Create plugin instance
            return plugin_class(**metadata)
            
        except Exception as e:
            self.logger.error(f"Error composing plugin: {e}")
            raise PluginError(f"Plugin composition failed: {str(e)}")

# Create singleton instance
plugin_composer = PluginComposer() 