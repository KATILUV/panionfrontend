"""
Plugin Update System
Handles plugin updates, rollbacks, and version management.
"""

import logging
import os
import shutil
import tempfile
from pathlib import Path
from typing import Dict, List, Set, Optional, Any, Tuple
from dataclasses import dataclass, field
import json
from datetime import datetime
import semver
import hashlib
import zipfile
import requests
from concurrent.futures import ThreadPoolExecutor

from .base import BasePlugin, PluginMetadata
from .discovery import PluginDiscovery, PluginInfo
from ..error_handling import error_handler, with_error_recovery
from ..shared_state import shared_state

@dataclass
class UpdateInfo:
    """Information about a plugin update."""
    plugin_name: str
    current_version: str
    target_version: str
    update_url: str
    checksum: str
    release_notes: str
    dependencies: Dict[str, str] = field(default_factory=dict)
    requires_restart: bool = False
    timestamp: datetime = field(default_factory=datetime.now)

@dataclass
class UpdateHistory:
    """History of plugin updates."""
    plugin_name: str
    version: str
    previous_version: str
    update_type: str  # "update" or "rollback"
    timestamp: datetime
    success: bool
    error_message: Optional[str] = None
    backup_path: Optional[Path] = None

class PluginUpdater:
    """Handles plugin updates and rollbacks."""
    
    def __init__(self):
        """Initialize plugin updater."""
        self.logger = logging.getLogger("PluginUpdater")
        self._setup_logging()
        
        # Get plugin discovery instance
        self._discovery = shared_state.get_component("plugin_discovery")
        if not self._discovery:
            raise RuntimeError("Plugin discovery system not available")
        
        # Update registry
        self._updates: Dict[str, UpdateInfo] = {}
        
        # Update history
        self._history: List[UpdateHistory] = []
        
        # Backup directory
        self._backup_dir = Path("backups") / "plugins"
        self._backup_dir.mkdir(parents=True, exist_ok=True)
        
        # Register with shared state
        shared_state.register_component("plugin_updater", self)
    
    def _setup_logging(self) -> None:
        """Setup updater logging."""
        log_file = Path("logs") / "plugin_updater.log"
        log_file.parent.mkdir(exist_ok=True)
        
        handler = logging.FileHandler(log_file)
        handler.setFormatter(logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        ))
        self.logger.addHandler(handler)
    
    @with_error_recovery
    def check_for_updates(self, plugin_name: str) -> Optional[UpdateInfo]:
        """Check for available updates for a plugin.
        
        Args:
            plugin_name: Name of the plugin to check
            
        Returns:
            Optional[UpdateInfo]: Update information if available
        """
        try:
            # Get current plugin info
            plugin_info = self._discovery.get_plugin_info(plugin_name)
            if not plugin_info:
                self.logger.error(f"Plugin {plugin_name} not found")
                return None
            
            # Check update registry
            if plugin_name in self._updates:
                update_info = self._updates[plugin_name]
                if semver.compare(update_info.target_version, plugin_info.version) > 0:
                    return update_info
            
            # TODO: Check remote update server
            # This would typically involve:
            # 1. Querying a plugin registry server
            # 2. Checking version compatibility
            # 3. Downloading update metadata
            
            return None
            
        except Exception as e:
            self.logger.error(f"Failed to check for updates: {str(e)}")
            return None
    
    @with_error_recovery
    def update_plugin(self, plugin_name: str, update_info: UpdateInfo) -> bool:
        """Update a plugin to a new version.
        
        Args:
            plugin_name: Name of the plugin to update
            update_info: Update information
            
        Returns:
            bool: True if update successful
        """
        try:
            # Get current plugin info
            plugin_info = self._discovery.get_plugin_info(plugin_name)
            if not plugin_info:
                self.logger.error(f"Plugin {plugin_name} not found")
                return False
            
            # Create backup
            backup_path = self._create_backup(plugin_info)
            if not backup_path:
                return False
            
            # Download update
            update_path = self._download_update(update_info)
            if not update_path:
                return False
            
            # Verify update
            if not self._verify_update(update_path, update_info.checksum):
                self.logger.error("Update verification failed")
                return False
            
            # Install update
            if not self._install_update(update_path, plugin_info):
                self.logger.error("Update installation failed")
                self._restore_backup(backup_path, plugin_info)
                return False
            
            # Record update in history
            self._record_update(
                plugin_name,
                update_info.target_version,
                plugin_info.version,
                "update",
                True,
                backup_path=backup_path
            )
            
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to update plugin: {str(e)}")
            return False
    
    @with_error_recovery
    def rollback_plugin(self, plugin_name: str) -> bool:
        """Rollback a plugin to its previous version.
        
        Args:
            plugin_name: Name of the plugin to rollback
            
        Returns:
            bool: True if rollback successful
        """
        try:
            # Get plugin info
            plugin_info = self._discovery.get_plugin_info(plugin_name)
            if not plugin_info:
                self.logger.error(f"Plugin {plugin_name} not found")
                return False
            
            # Find last successful update
            last_update = None
            for update in reversed(self._history):
                if (update.plugin_name == plugin_name and 
                    update.success and 
                    update.update_type == "update"):
                    last_update = update
                    break
            
            if not last_update or not last_update.backup_path:
                self.logger.error("No backup found for rollback")
                return False
            
            # Restore backup
            if not self._restore_backup(last_update.backup_path, plugin_info):
                self.logger.error("Rollback failed")
                return False
            
            # Record rollback in history
            self._record_update(
                plugin_name,
                last_update.previous_version,
                plugin_info.version,
                "rollback",
                True
            )
            
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to rollback plugin: {str(e)}")
            return False
    
    def _create_backup(self, plugin_info: PluginInfo) -> Optional[Path]:
        """Create a backup of a plugin.
        
        Args:
            plugin_info: Plugin information
            
        Returns:
            Optional[Path]: Backup path if successful
        """
        try:
            # Create backup directory
            backup_path = self._backup_dir / f"{plugin_info.name}_{plugin_info.version}"
            backup_path.mkdir(parents=True, exist_ok=True)
            
            # Copy plugin files
            shutil.copytree(
                plugin_info.path.parent,
                backup_path / plugin_info.name,
                dirs_exist_ok=True
            )
            
            return backup_path
            
        except Exception as e:
            self.logger.error(f"Failed to create backup: {str(e)}")
            return None
    
    def _restore_backup(self, backup_path: Path, plugin_info: PluginInfo) -> bool:
        """Restore a plugin from backup.
        
        Args:
            backup_path: Path to backup
            plugin_info: Plugin information
            
        Returns:
            bool: True if restore successful
        """
        try:
            # Remove current plugin
            shutil.rmtree(plugin_info.path.parent, ignore_errors=True)
            
            # Restore from backup
            shutil.copytree(
                backup_path / plugin_info.name,
                plugin_info.path.parent,
                dirs_exist_ok=True
            )
            
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to restore backup: {str(e)}")
            return False
    
    def _download_update(self, update_info: UpdateInfo) -> Optional[Path]:
        """Download a plugin update.
        
        Args:
            update_info: Update information
            
        Returns:
            Optional[Path]: Path to downloaded update if successful
        """
        try:
            # Create temporary directory
            with tempfile.TemporaryDirectory() as temp_dir:
                # Download update
                response = requests.get(update_info.update_url, stream=True)
                response.raise_for_status()
                
                # Save update
                update_path = Path(temp_dir) / "update.zip"
                with open(update_path, "wb") as f:
                    for chunk in response.iter_content(chunk_size=8192):
                        f.write(chunk)
                
                return update_path
            
        except Exception as e:
            self.logger.error(f"Failed to download update: {str(e)}")
            return None
    
    def _verify_update(self, update_path: Path, checksum: str) -> bool:
        """Verify downloaded update.
        
        Args:
            update_path: Path to update
            checksum: Expected checksum
            
        Returns:
            bool: True if verification successful
        """
        try:
            # Calculate checksum
            sha256 = hashlib.sha256()
            with open(update_path, "rb") as f:
                for chunk in iter(lambda: f.read(8192), b""):
                    sha256.update(chunk)
            
            return sha256.hexdigest() == checksum
            
        except Exception as e:
            self.logger.error(f"Failed to verify update: {str(e)}")
            return False
    
    def _install_update(self, update_path: Path, plugin_info: PluginInfo) -> bool:
        """Install a plugin update.
        
        Args:
            update_path: Path to update
            plugin_info: Plugin information
            
        Returns:
            bool: True if installation successful
        """
        try:
            # Extract update
            with zipfile.ZipFile(update_path) as zip_file:
                zip_file.extractall(plugin_info.path.parent)
            
            # Reload plugin
            self._discovery.discover_plugins()
            
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to install update: {str(e)}")
            return False
    
    def _record_update(
        self,
        plugin_name: str,
        version: str,
        previous_version: str,
        update_type: str,
        success: bool,
        error_message: Optional[str] = None,
        backup_path: Optional[Path] = None
    ) -> None:
        """Record an update in history.
        
        Args:
            plugin_name: Plugin name
            version: New version
            previous_version: Previous version
            update_type: Type of update
            success: Whether update was successful
            error_message: Error message if any
            backup_path: Path to backup if any
        """
        self._history.append(UpdateHistory(
            plugin_name=plugin_name,
            version=version,
            previous_version=previous_version,
            update_type=update_type,
            timestamp=datetime.now(),
            success=success,
            error_message=error_message,
            backup_path=backup_path
        ))
    
    def get_update_history(self, plugin_name: Optional[str] = None) -> List[UpdateHistory]:
        """Get update history.
        
        Args:
            plugin_name: Optional plugin name to filter by
            
        Returns:
            List[UpdateHistory]: Update history
        """
        if plugin_name:
            return [
                update for update in self._history
                if update.plugin_name == plugin_name
            ]
        return self._history
    
    def get_available_updates(self) -> Dict[str, UpdateInfo]:
        """Get available updates for all plugins.
        
        Returns:
            Dict[str, UpdateInfo]: Available updates
        """
        updates = {}
        for plugin_name in self._discovery._plugins:
            update_info = self.check_for_updates(plugin_name)
            if update_info:
                updates[plugin_name] = update_info
        return updates

# Create global plugin updater instance
plugin_updater = PluginUpdater() 