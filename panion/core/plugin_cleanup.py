"""
Plugin cleanup system for managing and removing old/unused plugins.
"""

import logging
from pathlib import Path
import shutil
from datetime import datetime, timedelta
import json
from typing import Dict, List, Optional

from core.plugin_cache import PluginCache
from core.plugin_common import CleanupStats
from core.service_locator import service_locator

class PluginCleanup:
    """Handles cleanup of old and unused plugins."""
    
    def __init__(self, config_path: str = "config/plugin_cleanup.yaml"):
        """Initialize the plugin cleanup system."""
        self.logger = logging.getLogger(__name__)
        self.config_path = Path(config_path)
        self.config = self._load_config()
        
        # Initialize components
        self.plugin_cache = service_locator.get_service('plugin_cache')
        
        # Cleanup settings
        self._max_versions = 3  # Keep last 3 versions
        self._unused_threshold = 30  # Days before considering a plugin unused
        self._cleanup_threshold = 100  # Maximum number of failed plugins before cleanup
        
    def _load_config(self) -> Dict:
        """Load configuration from file."""
        try:
            if self.config_path.exists():
                with open(self.config_path, 'r') as f:
                    return json.load(f)
            return {}
        except Exception as e:
            self.logger.error(f"Error loading config: {e}")
            return {}
            
    async def cleanup_plugin(self, plugin_name: str) -> CleanupStats:
        """Clean up old versions of a specific plugin."""
        try:
            self.logger.info(f"Cleaning up plugin: {plugin_name}")
            return self.plugin_cache.cleanup_plugin(plugin_name)
        except Exception as e:
            self.logger.error(f"Error cleaning up plugin {plugin_name}: {e}")
            return CleanupStats()
            
    async def cleanup_all_plugins(self) -> Dict[str, CleanupStats]:
        """Clean up all plugins."""
        try:
            self.logger.info("Cleaning up all plugins")
            return self.plugin_cache.cleanup_all_plugins()
        except Exception as e:
            self.logger.error(f"Error cleaning up all plugins: {e}")
            return {}
            
    async def cleanup_failed_plugins(self, failed_plugins: List[str]) -> None:
        """Clean up failed plugins that exceed the threshold."""
        try:
            if len(failed_plugins) > self._cleanup_threshold:
                self.logger.info(f"Cleaning up {len(failed_plugins)} failed plugins")
                
                # Group plugins by goal
                plugins_by_goal = {}
                for plugin_id in failed_plugins:
                    goal_id = plugin_id.split('_')[1]  # Extract goal ID from plugin name
                    if goal_id not in plugins_by_goal:
                        plugins_by_goal[goal_id] = []
                    plugins_by_goal[goal_id].append(plugin_id)
                
                # Keep only the most recent plugin per goal
                for goal_id, plugins in plugins_by_goal.items():
                    # Sort by creation time (assuming plugin_id contains timestamp)
                    plugins.sort(reverse=True)
                    # Keep only the most recent one
                    for plugin_id in plugins[1:]:
                        try:
                            # Remove plugin files
                            plugin_dir = Path('plugins') / plugin_id
                            if plugin_dir.exists():
                                shutil.rmtree(plugin_dir)
                        except Exception as e:
                            self.logger.error(f"Error cleaning up plugin {plugin_id}: {e}")
                
                self.logger.info("Plugin cleanup completed")
                
        except Exception as e:
            self.logger.error(f"Error during plugin cleanup: {e}")

# Create singleton instance
plugin_cleanup = PluginCleanup() 